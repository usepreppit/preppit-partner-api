import { inject, injectable } from 'inversify';
import { Logger } from './../../startup/logger';
import { ApiError, ValidationError } from '../../helpers/error.helper';
import { Request } from 'express';
import { UserRepository } from './../users/models/user.repository';
import { AdminRepository } from './../users/models/admin.repository';
import { PartnerRepository } from './../users/models/partner.repository';
import { comparePasswords, hashPassword } from '../../helpers/password.helper';
import { uploadToCFBucket } from '../../helpers/upload_to_s3.helper';


@injectable()
export class ProfileService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
        @inject(UserRepository) private readonly userRepository: UserRepository,
        @inject(AdminRepository) private readonly adminRepository: AdminRepository,
        @inject(PartnerRepository) private readonly partnerRepository: PartnerRepository,
    ) {}

	// Helper method to get user and account type
	private async getUserWithAccountType(user_id: string, account_type?: 'user' | 'admin' | 'partner') {
		let curr_user: any = null;
		let userAccountType: 'user' | 'admin' | 'partner' = 'user';

		if (account_type === 'admin') {
			curr_user = await this.adminRepository.findById(user_id);
			userAccountType = 'admin';
		} else if (account_type === 'partner') {
			curr_user = await this.partnerRepository.findById(user_id);
			userAccountType = 'partner';
		} else {
			curr_user = await this.userRepository.findById(user_id);
			userAccountType = 'user';
		}

		return { user: curr_user, accountType: userAccountType };
	}

	async GetProfile(user_id: string, account_type?: 'user' | 'admin' | 'partner') {
		try {
			const { user, accountType } = await this.getUserWithAccountType(user_id, account_type);
			
			if(!user) {
				throw new ValidationError("Invalid user");
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

	async ChangePassword(user_id: string, old_password: string, new_password: string, account_type?: 'user' | 'admin' | 'partner') {
		try {
			let curr_user: any = null;
			
			// Get user from appropriate table
			if (account_type === 'admin') {
				curr_user = await this.adminRepository.findById(user_id, '+password');
			} else if (account_type === 'partner') {
				curr_user = await this.partnerRepository.findById(user_id, '+password');
			} else {
				curr_user = await this.userRepository.findById(user_id, '+password');
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
			} else if (account_type === 'partner') {
				await this.partnerRepository.updateById(user_id, { password: hash_new_pass });
			} else {
				await this.userRepository.updateById(user_id, { password: hash_new_pass });
			}

			return { message: 'Password updated successfully' };
		} catch (error) {
			this.logger.error(`Error Changing user password: ${error}`);
			throw new ApiError(400, 'Error Changing user password', error);
		}
	}

	async UpdateProfile(user_id: string, user_details: object, account_type?: 'user' | 'admin' | 'partner') {
		try {
			let curr_user: any = null;
			
			// Get user from appropriate table
			if (account_type === 'admin') {
				curr_user = await this.adminRepository.findById(user_id);
			} else if (account_type === 'partner') {
				curr_user = await this.partnerRepository.findById(user_id);
			} else {
				curr_user = await this.userRepository.findById(user_id);
			}

			if(!curr_user) {
				throw new ValidationError("Invalid user");
			}

			//check if the current user password matches the old password entered
			// Update profile in appropriate table
			if (account_type === 'admin') {
				await this.adminRepository.updateById(user_id, user_details);
			} else if (account_type === 'partner') {
				await this.partnerRepository.updateById(user_id, user_details);
			} else {
				await this.userRepository.updateById(user_id, user_details);
			}

			return { message: 'Profile updated successfully' };
		} catch (error) {
			this.logger.error(`Error Updating user profile: ${error}`);
			throw new ApiError(400, 'Error Updating user profile', error);
		}
	}

	async UpdateProfilePicture(user_id: string, req: Request, account_type?: 'user' | 'admin' | 'partner') {
		try {
			let curr_user: any = null;
			
			// Get user from appropriate table
			if (account_type === 'admin') {
				curr_user = await this.adminRepository.findById(user_id);
			} else if (account_type === 'partner') {
				curr_user = await this.partnerRepository.findById(user_id);
			} else {
				curr_user = await this.userRepository.findById(user_id);
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
				await this.userRepository.updateById(user_id, { profile_picture });
			}

			return { message: 'Profile picture updated successfully', profile_picture };
		} catch (error) {
			this.logger.error(`Error Updating user profile picture: ${error}`);
			throw new ApiError(400, 'Error Updating user profile picture', error);
		}
	}

	async RemoveProfilePicture(user_id: string, account_type?: 'user' | 'admin' | 'partner') {
		try {
			let curr_user: any = null;
			
			// Get user from appropriate table
			if (account_type === 'admin') {
				curr_user = await this.adminRepository.findById(user_id);
			} else if (account_type === 'partner') {
				curr_user = await this.partnerRepository.findById(user_id);
			} else {
				curr_user = await this.userRepository.findById(user_id);
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
				await this.userRepository.updateById(user_id, { profile_picture_url: '' });
			}

			return { message: 'Profile picture removed successfully' };
		} catch (error) {
			this.logger.error(`Error Removing user profile picture: ${error}`);
			throw new ApiError(400, 'Error Removing user profile picture', error);
		}
	}
}