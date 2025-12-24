import { inject, injectable } from 'inversify';
import { UserRepository } from '../users/models/user.repository';
import { AdminRepository } from '../users/models/admin.repository';
import { PartnerRepository } from '../users/models/partner.repository';
import { Logger } from './../../startup/logger';
import { IUser } from '../users/types/user.types';
import { IAdmin } from '../users/types/admin.types';
import { IPartner } from '../users/types/partner.types';
import { comparePasswords, hashPassword } from './../../helpers/password.helper';
import jwt from 'jsonwebtoken';
import { ApiError } from '../../helpers/error.helper';
import { PostmarkEmailService } from './../../helpers/email/postmark.helper';
import { randomBytes } from 'crypto';
import { getTokens } from './../../helpers/thirdparty/googleapis.helper';
import { postmarkTemplates } from '../../templates/postmark.templates';

// export interface SocialDetails {
// 	firstname: string;
// 	lastname: string;
// 	email: string;
// 	meta_data: object;
// 	business_name: string;
// }

@injectable()
export class AuthService {
    constructor(
		@inject(UserRepository) private readonly userRepository: UserRepository,
		@inject(AdminRepository) private readonly adminRepository: AdminRepository,
		@inject(PartnerRepository) private readonly partnerRepository: PartnerRepository,
		@inject(PostmarkEmailService) private readonly emailService: PostmarkEmailService,
		@inject(Logger) private readonly logger: Logger
    ) {} 

	// Helper method to determine account type based on email
	private getAccountType(email: string): 'admin' | 'partner' {
		return email.toLowerCase().endsWith('@usepreppit.com') ? 'admin' : 'partner';
	}

	//User Login
    async Login(email: string, password: string): Promise<{ token: string; accountType: 'admin' | 'partner' }> {
		try {
			const accountType = this.getAccountType(email);
			let user: IAdmin | IPartner | null = null;

			// Check the appropriate table based on email domain
			if (accountType === 'admin') {
				user = await this.adminRepository.findByEmail(email, true);
			} else {
				user = await this.partnerRepository.findByEmail(email, true);
			}

			if (!user) {
				this.logger.warn(`Login attempt for non-existent email: ${email}`);
				throw new ApiError(401, 'Invalid credentials');
			}

			//check if the user account is already activated
			if (user.is_active == false) {
				this.logger.warn(`Login attempt for inactive email: ${email}`);
				throw new ApiError(401, 'Account not activated, please proceed to verify your email, check your email or spambox for the verification link');
			}

			//all checks out email is found compare password
			const passwordMatch = await comparePasswords(password, user.password);
			if (!passwordMatch) {
				this.logger.warn(`Invalid password attempt for user: ${user._id}`);
				throw new ApiError(401, 'Invalid credentials, please check your email and password');
			}

			//JWT generate for the user
			const token = this.generateToken(user, accountType); 
			return { token, accountType };
		} catch (error) {
			this.logger.error(`Login failed for ${email}: ${error}`);
			throw new ApiError(400, 'Invalid credentials, please check your email or password', error);
		}
    }

	async CreateUser(user: IUser | IAdmin | IPartner): Promise<Omit<IUser | IAdmin | IPartner, 'password'>> {
		try {
			// hash the password first
			const hashedPassword = await hashPassword(user.password); //hash the password from the password helper
			user.password = hashedPassword; //update the user password with the hashed password

			const accountType = this.getAccountType(user.email);
			const base_url = process.env.SENDING_URL; //frontend URL
			
			// Generate a unique verification token for this user
			const verify_token = randomBytes(32).toString('hex');
			const activation_url = `verify-email?email=${user.email}&verify_token=${verify_token}`;
			const verification_url = `${base_url}/${activation_url}`;

			//update the save record with the verification token
			user.verification_token = verify_token;

			let create_new_user: IAdmin | IPartner;

			// Create user in appropriate table based on email domain
			if (accountType === 'admin') {
				const adminData = {
					...user,
					account_type: 'admin' as const,
				};
				create_new_user = await this.adminRepository.create(adminData);
			} else {
				const partnerData = {
					...user,
					account_type: 'partner' as const,
				};
				create_new_user = await this.partnerRepository.create(partnerData);
			}

			if(!create_new_user._id) {
				throw new Error(`Couldn't create user at this time, please try again later.`);
			}

			// Only handle referrals for partners (if needed)
			// if(referrer_code && accountType === 'partner') {
			// 	const get_referrer_details = await this.partnerRepository.findSinglePartnerByFilter({ referral_code: referrer_code });
			// 	if(get_referrer_details) {
			// 		await this.referralRepository.createNewReferralRecord(create_new_user._id as string, get_referrer_details._id as string);
			// 	}
			// }

			//return the user without the password
			Reflect.deleteProperty(user, 'password');
			user.verification_url = verification_url; //temporary fix should 

			//Send Account Creation Email
			console.log("Postmark Template ID:", postmarkTemplates.ACTIVATE_ACCOUNT);
			await this.emailService.sendTemplateEmail(
				postmarkTemplates.ACTIVATE_ACCOUNT, //Postmark Template ID for Verify Account
				user.email,
				{ firstname: user.firstname, email: user.email, base_url: base_url, verification_url, activation_url: activation_url }
			);

			this.logger.info(`New user created with email: ${user.email}`);
			Reflect.deleteProperty(user, 'verification_url');
			return user;
		} catch (error) {
			this.logger.error(`Error creating user: ${error}`);
			throw new ApiError(400, 'User creation failed', error);
		}
	}

	async VerifyEmail(email: string, hash: string): Promise<void> {
		try {
			const accountType = this.getAccountType(email);
			let user: IAdmin | IPartner | null = null;

			// Check the appropriate table based on email domain
			if (accountType === 'admin') {
				user = await this.adminRepository.findByEmail(email, true);
			} else {
				user = await this.partnerRepository.findByEmail(email, true);
			}


			if (!user) {
				throw new ApiError(500, 'User not found, Please use the link sent to your email.');
			}

			
			//check if the user account is already activated
			if (user.is_active == true) {
				throw new ApiError(400, 'Account already activated, please proceed to Login');
			}


			//compare the token sent with the hash
			if (hash !== user.verification_token) {
				throw new ApiError(400, 'Invalid token, Please use the link sent to your email.');
			} else {
				//update the user email_verified field
				if (!user._id) {
					throw new Error('User ID is undefined');
				}

				if (accountType === 'admin') {
					await this.adminRepository.updateById(user._id.toString(), { is_active: true });
				} else {
					await this.partnerRepository.updateById(user._id.toString(), { is_active: true, partner_status: 'active' });
				}
			}

			//send email to the user
			await this.emailService.sendTemplateEmail(
				postmarkTemplates.WELCOME_EMAIL, //Postmark Template ID for Welcome Email
				user.email,
				{ firstname: user.firstname, lastname: user.lastname, base_url: process.env.SENDING_URL, email: user.email }
			);

			return Promise.resolve();
		} catch (error) {
			this.logger.error(`Error verifying email: ${error}`);
			throw new ApiError(400, 'Error verifying email', error);
		}
	}

	async ResendVerificationEmail(email: string): Promise<void> {
		try {
			const accountType = this.getAccountType(email);
			let user: IAdmin | IPartner | null = null;

			// Check the appropriate table based on email domain
			if (accountType === 'admin') {
				user = await this.adminRepository.findByEmail(email, true);
			} else {
				user = await this.partnerRepository.findByEmail(email, true);
			}

			if (!user) {
				throw new ApiError(404, 'User not found with this email address');
			}

			// Check if the user account is already activated
			if (user.is_active === true) {
				throw new ApiError(400, 'Account already activated, please proceed to login');
			}

			// Generate new verification token
			const verify_token = randomBytes(32).toString('hex');
			const base_url = process.env.SENDING_URL;
			const activation_url = `verify-email?email=${user.email}&verify_token=${verify_token}`;
			const verification_url = `${base_url}/${activation_url}`;

			// Update the verification token
			if (accountType === 'admin') {
				await this.adminRepository.updateById(user._id!.toString(), { verification_token: verify_token });
			} else {
				await this.partnerRepository.updateById(user._id!.toString(), { verification_token: verify_token });
			}

			// Send verification email
			await this.emailService.sendTemplateEmail(
				postmarkTemplates.ACTIVATE_ACCOUNT,
				user.email,
				{ 
					firstname: user.firstname, 
					email: user.email, 
					base_url: base_url, 
					verification_url, 
					activation_url: activation_url 
				}
			);

			this.logger.info(`Verification email resent to: ${user.email}`);
			return Promise.resolve();
		} catch (error) {
			this.logger.error(`Error resending verification email: ${error}`);
			throw new ApiError(400, 'Error resending verification email', error);
		}
	}

	//social login
	async SocialLogin(channel: string, code: string, redirect_uri: string): Promise<{ token: string; accountType: 'admin' | 'partner' }> {
		try {
			let user_data: any;
			let accountType: 'admin' | 'partner';
			switch (channel) {
				case 'google':
					const user_token_and_profile = await getTokens(code, redirect_uri);
					if (!user_token_and_profile) {
						throw new ApiError(400, 'Invalid Authentication Code or Error retrieving access token');
					}

					accountType = this.getAccountType(user_token_and_profile.email);
					
					// Check the appropriate table based on email domain
					if (accountType === 'admin') {
						const admin = await this.adminRepository.findByEmail(user_token_and_profile.email, true);
						if (!admin) {
							throw new ApiError(400, 'User not found, please register first');
						}
						user_data = admin;
					} else {
						const partner = await this.partnerRepository.findByEmail(user_token_and_profile.email, true);
						if (!partner) {
							throw new ApiError(400, 'User not found, please register first');
						}
						user_data = partner;
					}

					break;
				default:
					this.logger.warn(`Invalid channel: ${channel}`);
					throw new ApiError(400, 'Invalid channel');
			}

			//generate token for the user
			const token = this.generateToken(user_data, accountType);
			return { token, accountType };
		} catch (error) {
			this.logger.error(`Login failed for ${channel}: ${error}`);
			throw new ApiError(400, 'Auth Failed', error);
		}
	}

	//social register
	async SocialRegister(channel: string, code: string, redirect_uri: string): Promise<any> {
		try {
			let user_data: any;
			let accountType: 'admin' | 'partner' = 'partner'; // default to partner
			switch (channel) {
				case 'google':
					//get the token from the code
					const user_token_and_profile = await getTokens(code, redirect_uri);

					if (!user_token_and_profile) {
						throw new ApiError(400, 'Invalid Authentication Code or Error retrieving access token');
					}

					accountType = this.getAccountType(user_token_and_profile.email);
					
					//check if the user already exists in the appropriate table
					let checkExistingUser: IAdmin | IPartner | null = null;
					if (accountType === 'admin') {
						checkExistingUser = await this.adminRepository.findByEmail(user_token_and_profile.email, true);
					} else {
						checkExistingUser = await this.partnerRepository.findByEmail(user_token_and_profile.email, true);
					}

				if (checkExistingUser) {
					//if user exists, return the user data
					user_data = checkExistingUser;
				} else {
					//user does not exist, create a new user
					const userData = {
						firstname: user_token_and_profile.name.split(' ')[0],
						lastname: user_token_and_profile.name.split(' ')[1] || '',
						email: user_token_and_profile.email,
						password: randomBytes(32).toString('hex'), //use a random password for OAuth users
						is_active: true, //set the user as active
					};						let newUser: IAdmin | IPartner;
						if (accountType === 'admin') {
							newUser = await this.adminRepository.create({
								...userData,
								account_type: 'admin' as const,
							});
						} else {
							newUser = await this.partnerRepository.create({
								...userData,
								account_type: 'partner' as const,
							});
						}

						if (!newUser._id) {
							throw new Error(`Couldn't create user at this time, please try again later.`);
						}

						user_data = newUser;

						//send welcome email to the user
						await this.emailService.sendTemplateEmail(
							postmarkTemplates.WELCOME_EMAIL, //Postmark Template ID for Welcome Email
							user_data.email,
							{ firstname: user_data.firstname, lastname: user_data.lastname, base_url: process.env.SENDING_URL, email: user_data.email }
						);
					}					
					
					break;
				default:
					this.logger.warn(`Invalid channel: ${channel}`);
					break;
			}

			//create a token for the user
			const token = this.generateToken(user_data, accountType);
			return { token, accountType };
		} catch (error) {
			this.logger.error(`Error creating user: ${error}`);
			throw new ApiError(400, 'User creation failed', error);
		}
	}

	//forgot password
	async ForgotPassword(email: string): Promise<void> {
		try {
			const accountType = this.getAccountType(email);
			let user: IAdmin | IPartner | null = null;

			// Check the appropriate table based on email domain
			if (accountType === 'admin') {
				user = await this.adminRepository.findByEmail(email, true);
			} else {
				user = await this.partnerRepository.findByEmail(email, true);
			}

			if (!user) {
				return Promise.resolve(); //to prevent email enumeration
			}

			//Generate unique reset token for this request
			const reset_token = randomBytes(32).toString('hex');

			//update the save record with the verification token
			user.reset_token = reset_token;
			if (!user._id) {
				throw new ApiError(400, 'User ID is undefined');
			}

			if (accountType === 'admin') {
				await this.adminRepository.updateById(user._id.toString(), { reset_token });
			} else {
				await this.partnerRepository.updateById(user._id.toString(), { reset_token });
			}

			//send email to the user
			await this.emailService.sendTemplateEmail(
				postmarkTemplates.RESET_PASSWORD, //Postmark Template ID for Password Reset
				user.email,
				{ firstname: user.firstname, email: user.email, /*reset_url*/ }
			);

			return Promise.resolve();
		} catch (error) {
			this.logger.error(`Error sending password reset email: ${error}`);
			throw new ApiError(400, 'Error sending password reset email', error);
		}
	}

	async ResendPasswordReset(email: string): Promise<void> {
		try {
			const user = await this.userRepository.findByEmail(email, true);
		if (!user) {
			throw new Error('User not found');
		}

		// const sending_url = process.env.API_URL;
		// Generate unique reset token for this request
		const reset_token = randomBytes(32).toString('hex');
		// const reset_url = `${sending_url}/reset_password?email=${user.email}&reset_token=${reset_token}`;			//update the save record with the verification token
			user.reset_token = reset_token;
			if (!user._id) {
				throw new Error('User ID is undefined');
			}
			await this.userRepository.updateById(user._id.toString(), { reset_token });

			//send email to the user
			// await this.emailService.sendTemplateEmail(
			// 	MailTrapTemplates.PASSWORD_RESET,
			// 	newUser.email,
			// 	{ firstname: newUser.firstname, email: newUser.email, reset_url }
			// );

			return Promise.resolve();
		} catch (error) {
			this.logger.error(`Error resending password reset email: ${error}`);
			throw new ApiError(400, 'Error resending password reset email', error);
		}
	}

	//reset password
	async ResetPassword(email: string, password: string): Promise<void> {
		try {
			const accountType = this.getAccountType(email);
			let user: IAdmin | IPartner | null = null;

			// Check the appropriate table based on email domain
			if (accountType === 'admin') {
				user = await this.adminRepository.findByEmail(email, true);
			} else {
				user = await this.partnerRepository.findByEmail(email, true);
			}

			if (!user) {
				throw new Error('User not found');
			}

			//hash the password first
			const hashedPassword = await hashPassword(password);
			user.password = hashedPassword; //update the user password with the hashed password
			//convert user id to string
			if (!user._id) {
				throw new Error('User ID is undefined');
			}
			const user_id = user._id.toString();

			if (accountType === 'admin') {
				await this.adminRepository.updateById(user_id, { password: user.password });
			} else {
				await this.partnerRepository.updateById(user_id, { password: user.password });
			}

			//send email to the user
		} catch (error) {
			this.logger.error(`Error resetting password: ${error}`);
			throw new ApiError(400, 'Error resetting password', error);
		}
	}

	//jwt token generation
	private generateToken(user: IUser | IAdmin | IPartner, accountType: 'admin' | 'partner'): string {
		if (!process.env.JWT_SECRET) {
			throw new ApiError(500, 'JWT secret not configured');
		}

		return jwt.sign(
			{
				sub: user._id, // Add custom claims as needed
				user_id: user._id,
				email: user.email,
				account_type: accountType,
			},
			process.env.JWT_SECRET!,
			{
				expiresIn: process.env.JWT_EXPIRES_IN ? parseInt(process.env.JWT_EXPIRES_IN) : '24h',
				issuer: process.env.JWT_ISSUER || 'usepreppit'
			}
		);
	}

	async verifyCandidateToken(email: string, token: string): Promise<any> {
		try {
			// Find user by email with verification_token
			const user = await this.userRepository.findByEmail(email, false);
			
			if (!user) {
				throw new ApiError(400, 'Invalid email or token');
			}

			// Verify token matches
			if (user.verification_token !== token) {
				throw new ApiError(400, 'Invalid email or token');
			}

			// Check if user already has a password set
			if (user.password && user.password !== '') {
				throw new ApiError(400, 'Account already activated');
			}

			// Return candidate profile without sensitive information
			return {
				_id: user._id,
				firstname: user.firstname,
				lastname: user.lastname,
				email: user.email,
				profile_picture_url: user.profile_picture_url,
				invite_status: user.invite_status,
				createdAt: user.createdAt
			};
		} catch (error: any) {
			if (error instanceof ApiError) {
				throw error;
			}
			this.logger.error('Error verifying candidate token:', error);
			throw new ApiError(500, 'Failed to verify candidate token');
		}
	}

	async setCandidatePassword(email: string, token: string, password: string): Promise<any> {
		try {
			// Find user by email with password field
			const user = await this.userRepository.findByEmail(email, true);
			
			if (!user) {
				throw new ApiError(400, 'Invalid email or token');
			}

			// Verify token matches
			if (user.verification_token !== token) {
				throw new ApiError(400, 'Invalid email or token');
			}

			// Check if user already has a password set
			if (user.password && user.password !== '') {
				throw new ApiError(400, 'Account already activated');
			}

			// Validate password strength
			if (password.length < 8) {
				throw new ApiError(400, 'Password must be at least 8 characters long');
			}

			// Hash the password
			const hashedPassword = await hashPassword(password);

			// Update user with new password and mark account as active
			await this.userRepository.updateById(user._id!.toString(), {
				password: hashedPassword,
				is_active: true,
				invite_status: 'accepted',
				invite_accepted_at: new Date(),
				verification_token: undefined // Clear the token after use
			});

			this.logger.info(`Candidate password set and account activated: ${user.email}`);

			return {
				message: 'Password set successfully',
				email: user.email,
				is_active: true
			};
		} catch (error: any) {
			if (error instanceof ApiError) {
				throw error;
			}
			this.logger.error('Error setting candidate password:', error);
			throw new ApiError(500, 'Failed to set candidate password');
		}
	}
}