import { inject, injectable } from 'inversify';
import { Logger } from './../../startup/logger';
import { ApiError, ValidationError } from '../../helpers/error.helper';
import { Request } from 'express';
import { AdminRepository } from './../users/models/admin.repository';
import { PartnerRepository } from './../users/models/partner.repository';
import { ExamsRepository } from '../exams/models/exams.repository';
import { comparePasswords, hashPassword } from '../../helpers/password.helper';
import { uploadToCFBucket } from '../../helpers/upload_to_s3.helper';
import mongoose from 'mongoose';


@injectable()
export class ProfileService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
        @inject(AdminRepository) private readonly adminRepository: AdminRepository,
        @inject(PartnerRepository) private readonly partnerRepository: PartnerRepository,
        @inject(ExamsRepository) private readonly examsRepository: ExamsRepository,
    ) {}

	// Helper method to get user and account type
	private async getUserWithAccountType(user_id: string, account_type?: 'admin' | 'partner') {
		let curr_user: any = null;
		let userAccountType: 'admin' | 'partner';

		if (account_type === 'admin') {
			curr_user = await this.adminRepository.findById(user_id);
			userAccountType = 'admin';
		} else if (account_type === 'partner') {
			curr_user = await this.partnerRepository.findById(user_id);
			userAccountType = 'partner';
		} else {
			throw new ValidationError("Invalid account type. Must be 'admin' or 'partner'");
		}

		return { user: curr_user, accountType: userAccountType };
	}

	async GetProfile(user_id: string, account_type?: 'admin' | 'partner') {
		try {
			const { user, accountType } = await this.getUserWithAccountType(user_id, account_type);
			
			if(!user) {
				throw new ValidationError("Invalid user");
			}

			// For partners, include onboarding status
			if (accountType === 'partner') {
				const onboardingStatus = this.checkOnboardingCompletion(user);
				
				return {
					...user,
					account_type: accountType,
					onboarding_status: {
						is_completed: user.is_onboarding_completed || false,
						completed_at: user.onboarding_completed_at,
						missing_fields: onboardingStatus.missing_fields,
						completion_percentage: onboardingStatus.completion_percentage
					}
				};
			}

			return {
				...user,
				account_type: accountType
			};
		} catch (error) {
			this.logger.error(`Error fetching user profile: ${error}`);
			throw new ApiError(400, 'Error fetching user profile', error);
		}
	}

	// Helper method to check onboarding completion status
	private checkOnboardingCompletion(partner: any) {
		const requiredFields = [
			'organization_name',
			'contact_person_name',
			'contact_email',
			'contact_phone',
			'country',
			'timezone',
			'preferred_currency',
			'exam_types'
		];

		const missing_fields: string[] = [];
		
		requiredFields.forEach(field => {
			if (!partner[field] || (Array.isArray(partner[field]) && partner[field].length === 0)) {
				missing_fields.push(field);
			}
		});

		const completion_percentage = Math.round(
			((requiredFields.length - missing_fields.length) / requiredFields.length) * 100
		);

		return {
			missing_fields,
			completion_percentage
		};
	}

	async ChangePassword(user_id: string, old_password: string, new_password: string, account_type?: 'admin' | 'partner') {
		try {
			let curr_user: any = null;
			
			// Get user from appropriate table
			if (account_type === 'admin') {
				curr_user = await this.adminRepository.findById(user_id, '+password');
			} else if (account_type === 'partner') {
				curr_user = await this.partnerRepository.findById(user_id, '+password');
			} else {
				throw new ValidationError("Invalid account type. Must be 'admin' or 'partner'");
			}
			
			if(!curr_user) {
				throw new ValidationError("Invalid user");
			}

			//check if the current user password matches the old password entered
			const compare_passwords = await comparePasswords(old_password, curr_user.password);

			console.log("compare_passwords", compare_passwords);
			if (!compare_passwords) throw new ValidationError("Old password does not match Entered password");


			//Set the new password
			const hash_new_pass = await hashPassword(new_password);
			
			// Update password in appropriate table
			if (account_type === 'admin') {
				await this.adminRepository.updateById(user_id, { password: hash_new_pass });
			} else {
				await this.partnerRepository.updateById(user_id, { password: hash_new_pass });
			}

			return { message: 'Password updated successfully' };
		} catch (error) {
			this.logger.error(`Error Changing user password: ${error}`);
			throw new ApiError(400, 'Error Changing user password', error);
		}
	}

	async UpdateProfile(user_id: string, user_details: any, account_type?: 'admin' | 'partner') {
		try {
			let curr_user: any = null;
			
			// Get user from appropriate table
			if (account_type === 'admin') {
				curr_user = await this.adminRepository.findById(user_id);
			} else if (account_type === 'partner') {
				curr_user = await this.partnerRepository.findById(user_id);
			} else {
				throw new ValidationError("Invalid account type. Must be 'admin' or 'partner'");
			}

			if(!curr_user) {
				throw new ValidationError("Invalid user");
			}

			// Whitelist allowed fields for profile update
			const allowedFields = [
				'firstname',
				'lastname',
				'phone_number',
				'country',
				'organization_name',
				'contact_person_name',
				'contact_email',
				'contact_phone',
				'timezone',
				'preferred_currency'
			];

			// Filter only allowed fields from user_details
			const sanitizedDetails: any = {};
			for (const field of allowedFields) {
				if (user_details[field] !== undefined) {
					sanitizedDetails[field] = user_details[field];
				}
			}

			// Ensure we have at least one field to update
			if (Object.keys(sanitizedDetails).length === 0) {
				throw new ValidationError('No valid fields provided for update');
			}

			// Update profile in appropriate table
			if (account_type === 'admin') {
				await this.adminRepository.updateById(user_id, sanitizedDetails);
			} else {
				await this.partnerRepository.updateById(user_id, sanitizedDetails);
			}

			// Get updated user data
			const updatedUser = account_type === 'admin' 
				? await this.adminRepository.findById(user_id)
				: await this.partnerRepository.findById(user_id);

			return { 
				message: 'Profile updated successfully',
				user: {
					_id: updatedUser._id,
					firstname: updatedUser.firstname,
					lastname: updatedUser.lastname,
					email: updatedUser.email,
					phone_number: updatedUser.phone_number,
					country: updatedUser.country,
					organization_name: updatedUser.organization_name,
					contact_person_name: updatedUser.contact_person_name,
					contact_email: updatedUser.contact_email,
					contact_phone: updatedUser.contact_phone,
					timezone: updatedUser.timezone,
					preferred_currency: updatedUser.preferred_currency
				}
			};
		} catch (error) {
			this.logger.error(`Error Updating user profile: ${error}`);
			throw new ApiError(400, 'Error Updating user profile', error);
		}
	}

	async UpdateProfilePicture(user_id: string, req: Request, account_type?: 'admin' | 'partner') {
		try {
			let curr_user: any = null;
			
			// Get user from appropriate table
			if (account_type === 'admin') {
				curr_user = await this.adminRepository.findById(user_id);
			} else if (account_type === 'partner') {
				curr_user = await this.partnerRepository.findById(user_id);
			} else {
				throw new ValidationError("Invalid account type. Must be 'admin' or 'partner'");
			}
			if(!curr_user) {
				throw new ValidationError("Invalid user");
			}
			//upload profile picture to cloudflare r2
			const upload_profile = await uploadToCFBucket(req, 'profile_picture', {}, "public", "");

			console.log("upload_profile", upload_profile);

			// const get_profile_picture = await fetchFromCFbucket(upload_profile.document_key, 63072000);
			// console.log("get_profile_picture", get_profile_picture);
			const profile_picture = upload_profile.document_url;
			console.log("profile_picture", profile_picture);
			//check if the current user password matches the old password entered
			// Update profile picture in appropriate table
			if (account_type === 'admin') {
				await this.adminRepository.updateById(user_id, { profile_picture });
			} else if (account_type === 'partner') {
				await this.partnerRepository.updateById(user_id, { profile_picture });
			} else {
				throw new ValidationError("Invalid account type. Must be 'admin' or 'partner'");
			}

			return { message: 'Profile picture updated successfully', profile_picture };
		} catch (error) {
			this.logger.error(`Error Updating user profile picture: ${error}`);
			throw new ApiError(400, 'Error Updating user profile picture', error);
		}
	}

	async RemoveProfilePicture(user_id: string, account_type?: 'admin' | 'partner') {
		try {
			let curr_user: any = null;
			
			// Get user from appropriate table
			if (account_type === 'admin') {
				curr_user = await this.adminRepository.findById(user_id);
			} else if (account_type === 'partner') {
				curr_user = await this.partnerRepository.findById(user_id);
			} else {
				throw new ValidationError("Invalid account type. Must be 'admin' or 'partner'");
			}

			if(!curr_user) {
				throw new ValidationError("Invalid user");
			}

			//check if the current user password matches the old password entered
			// Remove profile picture in appropriate table
			if (account_type === 'admin') {
				await this.adminRepository.updateById(user_id, { profile_picture_url: '' });
			} else if (account_type === 'partner') {
				await this.partnerRepository.updateById(user_id, { profile_picture_url: '' });
			} else {
				throw new ValidationError("Invalid account type. Must be 'admin' or 'partner'");
			}

		return { message: 'Profile picture removed successfully' };
	} catch (error) {
		this.logger.error(`Error Removing user profile picture: ${error}`);
		throw new ApiError(400, 'Error Removing user profile picture', error);
	}
}

async CompleteOnboarding(user_id: string, onboardingData: any, account_type?: 'admin' | 'partner') {
	try {
		// Only partners can complete onboarding
		if (account_type !== 'partner') {
			throw new ValidationError("Onboarding is only available for partner accounts");
		}

		const curr_partner = await this.partnerRepository.findById(user_id);

		if (!curr_partner) {
			throw new ValidationError("Invalid partner");
		}

		// Check if already completed
		if (curr_partner.is_onboarding_completed) {
			throw new ValidationError("Onboarding has already been completed");
		}

		// Validate all required fields are present
		const requiredFields = [
			'organization_name',
			'contact_person_name',
			'contact_email',
			'contact_phone',
			'country',
			'timezone',
			'preferred_currency',
			'exam_types'
		];

		const missingFields = requiredFields.filter(field => {
			const value = onboardingData[field];
			return !value || (Array.isArray(value) && value.length === 0);
		});

		if (missingFields.length > 0) {
			throw new ValidationError(
				`Cannot complete onboarding. Missing required fields: ${missingFields.join(', ')}`
			);
		}

		// Validate exam_types - ensure all exam IDs exist in the database
		if (onboardingData.exam_types && Array.isArray(onboardingData.exam_types)) {
			// Validate that exam_types is not empty
			if (onboardingData.exam_types.length === 0) {
				throw new ValidationError('At least one exam must be selected');
			}

			// Convert to ObjectIds and validate format
			const examIds = onboardingData.exam_types.map((id: string) => {
				if (!mongoose.Types.ObjectId.isValid(id)) {
					throw new ValidationError(`Invalid exam ID format: ${id}`);
				}
				return new mongoose.Types.ObjectId(id);
			});
			
			// Query database to verify exams exist
			const result = await this.examsRepository.getExams({ _id: { $in: examIds } }, 1, 100);
			const exams = result.exams;
			
			if (exams.length !== examIds.length) {
				const foundIds = exams.map((exam: any) => exam._id.toString());
				const missingIds = onboardingData.exam_types.filter((id: string) => !foundIds.includes(id));
				throw new ValidationError(
					`Invalid exam IDs: ${missingIds.join(', ')}. Please select valid exams from the available list.`
				);
			}

			// Convert back to ObjectIds for storage
			onboardingData.exam_types = examIds;
		}

		// Update partner with onboarding data and mark as complete
		await this.partnerRepository.updateById(user_id, { 
			organization_name: onboardingData.organization_name,
			contact_person_name: onboardingData.contact_person_name,
			contact_email: onboardingData.contact_email,
			contact_phone: onboardingData.contact_phone,
			country: onboardingData.country,
			timezone: onboardingData.timezone,
			organization_logo: onboardingData.organization_logo || '',
			preferred_currency: onboardingData.preferred_currency,
			exam_types: onboardingData.exam_types,
			is_onboarding_completed: true,
			onboarding_completed_at: new Date(),
			partner_status: 'active' // Activate partner after onboarding
		});

		return { 
			message: 'Onboarding completed successfully',
			is_onboarding_completed: true,
			onboarding_completed_at: new Date()
		};
	} catch (error) {
		this.logger.error(`Error completing onboarding: ${error}`);
		throw new ApiError(400, 'Error completing onboarding', error);
	}
}

async SaveOnboardingProgress(user_id: string, progressData: any, account_type?: 'admin' | 'partner') {
	try {
		// Only partners can save onboarding progress
		if (account_type !== 'partner') {
			throw new ValidationError("Onboarding is only available for partner accounts");
		}

		const curr_partner = await this.partnerRepository.findById(user_id);

		if (!curr_partner) {
			throw new ValidationError("Invalid partner");
		}

		// Check if already completed
		if (curr_partner.is_onboarding_completed) {
			throw new ValidationError("Onboarding has already been completed. Cannot save progress.");
		}

		// Build update object with only provided fields
		const updateData: any = {};
		
		const allowedFields = [
			'organization_name',
			'contact_person_name',
			'contact_email',
			'contact_phone',
			'country',
			'timezone',
			'organization_logo',
			'preferred_currency',
			'exam_types'
		];

		// Only update fields that are provided in progressData
		allowedFields.forEach(field => {
			if (progressData[field] !== undefined && progressData[field] !== null) {
				updateData[field] = progressData[field];
			}
		});

		if (Object.keys(updateData).length === 0) {
			throw new ValidationError("No valid onboarding fields provided to save");
		}

		// Update partner with progress data (without marking as complete)
		await this.partnerRepository.updateById(user_id, updateData);

		// Get updated partner to calculate new completion status
		const updated_partner = await this.partnerRepository.findById(user_id);
		const onboardingStatus = this.checkOnboardingCompletion(updated_partner);

		return { 
			message: 'Onboarding progress saved successfully',
			fields_saved: Object.keys(updateData),
			onboarding_status: {
				is_completed: false,
				missing_fields: onboardingStatus.missing_fields,
				completion_percentage: onboardingStatus.completion_percentage
			}
		};
	} catch (error) {
		this.logger.error(`Error saving onboarding progress: ${error}`);
		throw new ApiError(400, 'Error saving onboarding progress', error);
	}
}
}

