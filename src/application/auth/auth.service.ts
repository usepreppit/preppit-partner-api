import { inject, injectable } from 'inversify';
import { UserRepository } from '../users/models/user.repository';
import { Logger } from './../../startup/logger';
import { IUser } from '../users/types/user.types';
import { comparePasswords, hashPassword } from './../../helpers/password.helper';
import jwt from 'jsonwebtoken';
import { ApiError } from '../../helpers/error.helper';
import { PostmarkEmailService } from './../../helpers/email/postmark.helper';
import { randomBytes } from 'crypto';
import { getTokens } from './../../helpers/thirdparty/googleapis.helper';
import { ReferralsRepository } from '../referrals/models/referrals.repository';
import { postmarkTemplates } from '../../templates/postmark.templates';

const salt = randomBytes(32).toString('hex');

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
		@inject(ReferralsRepository) private readonly referralRepository: ReferralsRepository,
		@inject(PostmarkEmailService) private readonly emailService: PostmarkEmailService,
		@inject(Logger) private readonly logger: Logger
    ) {} 

	//User Login
    async Login(email: string, password: string): Promise<{ token: string; }> {
		try {
			const user = await this.userRepository.findByEmail(email, true);

			if (!user) {
				this.logger.warn(`Login attempt for non-existent email: ${email}`);
				// throw new NotFoundError('Invalid credentials');
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
			const token = this.generateToken(user); 
			return { token };
		} catch (error) {
			this.logger.error(`Login failed for ${email}: ${error}`);
			throw new ApiError(400, 'Auth Failed', error);
		}
    }

	async CreateUser(user: IUser, referrer_code: string | undefined): Promise<Omit<IUser, 'password'>> {
		try {
			console.log(referrer_code);
			// hash the password first
			const hashedPassword = await hashPassword(user.password); //hash the password from the password helper
			user.password = hashedPassword; //update the user password with the hashed password



			// const sending_url = process.env.SENDING_URL; //frontend URl, Need Samuel to provide Link for the Sending URL
			const api_url = process.env.API_URL; //backend URL
			

			// return the verification token and send mail
			const verify_token = salt;
			const activation_url = `api/auth/verify_email?email=${user.email}&verify_token=${verify_token}`;
			const verification_url = `${api_url}/${activation_url}`;

			//update the save record with the verification token
			user.verification_token = verify_token;
			const referral_code = await this.generateReferralCode();
			user.referral_code = referral_code;

			const create_new_user = await this.userRepository.create(user);

			if(!create_new_user._id) {
				throw new Error(`Couldn't create user at this time, please try again later.`);
			}

			if(referrer_code) {//Some referred the user
				const get_referrer_details = await this.userRepository.findSingleUserByFilter({ referral_code: referrer_code });
				if(get_referrer_details) {
					//We were able to get a user record, save it into the referrers
					await this.referralRepository.createNewReferralRecord(create_new_user._id as string, get_referrer_details._id as string);
				}
			}

			//return the user without the password
			Reflect.deleteProperty(user, 'password');
			user.verification_url = verification_url; //temporary fix should 

			//Send Account Creation Email
			await this.emailService.sendTemplateEmail(
				postmarkTemplates.ACTIVATE_ACCOUNT, //Postmark Template ID for Verify Account
				user.email,
				{ firstname: user.firstname, email: user.email, base_url: api_url, verification_url, activation_url: activation_url }
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
			const user = await this.userRepository.findByEmail(email, true);
			if (!user) {
				throw new ApiError(500, 'User not found, Please use the link sent to your email.');
			}

			
			//check if the user account is already activated
			if (user.is_active == true) {
				throw new ApiError(400, 'Account already activated, please proceed to Login');
			}


			//compare the token sent with the hash
			if (hash !== user.verification_token) {
				console.log(hash, user.verification_token);
				throw new ApiError(400, 'Invalid token, Please use the link sent to your email.');
			} else {
				//update the user email_verified field
				if (!user._id) {
					throw new Error('User ID is undefined');
				}
				await this.userRepository.updateById(user._id.toString(), { is_active: true });
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

	//social login
	async SocialLogin(channel: string, code: string, redirect_uri: string): Promise<{ token: string }> {
		try {
			let user_data: any;
			switch (channel) {
				case 'google':
					const user_token_and_profile = await getTokens(code, redirect_uri);
					if (!user_token_and_profile) {
						throw new ApiError(400, 'Invalid Authentication Code or Error retrieving access token');
					}

					const user = await this.userRepository.findByEmail(user_token_and_profile.email, true);
					if (!user) {
						throw new ApiError(400, 'User not found, please register first');
					}

					user_data = user;
					break;
				default:
					this.logger.warn(`Invalid channel: ${channel}`);
					throw new ApiError(400, 'Invalid channel');
			}

			//generate token for the user
			const token = this.generateToken(user_data);
			return { token };
		} catch (error) {
			this.logger.error(`Login failed for ${channel}: ${error}`);
			throw new ApiError(400, 'Auth Failed', error);
		}
	}

	//social register
	async SocialRegister(channel: string, code: string, redirect_uri: string): Promise<any> {
		try {
			let user_data: any;
			switch (channel) {
				case 'google':
					//get the token from the code
					const user_token_and_profile = await getTokens(code, redirect_uri);

					if (!user_token_and_profile) {
						throw new ApiError(400, 'Invalid Authentication Code or Error retrieving access token');
					}
					
					//check if the user already exists
					const checkExistingUser = await this.userRepository.findByEmail(user_token_and_profile.email, true);
					if (checkExistingUser) {
						//if user exists, return the user data
						user_data = checkExistingUser;
					} else {
						//user does not exist, create a new user with a new referral code
						const referral_code = await this.generateReferralCode();

						const newUser = await this.userRepository.create({
							firstname: user_token_and_profile.name.split(' ')[0],
							lastname: user_token_and_profile.name.split(' ')[1] || '',
							email: user_token_and_profile.email,
							password: salt, //use a random salt as password
							is_active: true, //set the user as active
							referral_code: referral_code
						});

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
			const token = this.generateToken(user_data);
			return { token };
		} catch (error) {
			this.logger.error(`Error creating user: ${error}`);
			throw new ApiError(400, 'User creation failed', error);
		}
	}

	//forgot password
	async ForgotPassword(email: string): Promise<void> {
		try {
			const user = await this.userRepository.findByEmail(email, true);
			if (!user) {
				throw new Error('User not found');
			}

			//send email to the user
			const reset_token = salt;
			// const sending_url = process.env.SENDING_URL;
			// const reset_url = `${sending_url}/reset_password?email=${user.email}&reset_token=${reset_token}`;

			//update the save record with the verification token
			user.reset_token = reset_token;
			if (!user._id) {
				throw new Error('User ID is undefined');
			}
			await this.userRepository.updateById(user._id.toString(), { reset_token });

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
			const reset_token = salt;
			// const reset_url = `${sending_url}/reset_password?email=${user.email}&reset_token=${reset_token}`;

			//update the save record with the verification token
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
			const user = await this.userRepository.findByEmail(email, true);
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
			await this.userRepository.updateById(user_id, { password: user.password });

			//send email to the user
		} catch (error) {
			this.logger.error(`Error resetting password: ${error}`);
			throw new ApiError(400, 'Error resetting password', error);
		}
	}

	//jwt token generation
	private generateToken(user: IUser): string {
		if (!process.env.JWT_SECRET) {
			throw new ApiError(500, 'JWT secret not configured');
		}

		return jwt.sign(
			{
				sub: user._id, // Add custom claims as needed
				user_id: user._id,
				email: user.email,
			},
			process.env.JWT_SECRET!,
			{
				expiresIn: process.env.JWT_EXPIRES_IN ? parseInt(process.env.JWT_EXPIRES_IN) : '24h',
				issuer: process.env.JWT_ISSUER || 'usepreppit'
			}
		);
	}

	private async generateReferralCode(): Promise<string> {
		let code: string;
		let exists = true;

		while (exists) {
			code = `PPT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
			const existingUser = await this.userRepository.findSingleUserByFilter({ referral_code: code });
			if (!existingUser) {
				exists = false;
				return code;
			}
		}

		throw new Error('Failed to generate unique referral code');
	}
}