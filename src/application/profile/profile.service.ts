import { inject, injectable } from 'inversify';
import { Logger } from './../../startup/logger';
import { ApiError, ValidationError } from '../../helpers/error.helper';
import { Request } from 'express';
import { UserRepository } from './../users/models/user.repository';
import { comparePasswords, hashPassword } from '../../helpers/password.helper';
import { uploadToCFBucket } from '../../helpers/upload_to_s3.helper';


@injectable()
export class ProfileService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
        @inject(UserRepository) private readonly userRepository: UserRepository,
    ) {}

	async ChangePassword(user_id: string, old_password: string, new_password: string) {
		try {
			const curr_user = await this.userRepository.findById(user_id, '+password');
			if(!curr_user) {
				throw new ValidationError("Invalid user");
			}

			//check if the current user password matches the old password entered
			const compare_passwords = await comparePasswords(old_password, curr_user.password);

			console.log("compare_passwords", compare_passwords);
			if (!compare_passwords) throw new ValidationError("Old password does not match Entered password");


			//Set the new password
			const hash_new_pass = await hashPassword(new_password);
			const update_password = await this.userRepository.updateById(user_id, { password: hash_new_pass });

			return update_password;
		} catch (error) {
			this.logger.error(`Error Changing user password: ${error}`);
			throw new ApiError(400, 'Error Changing user password', error);
		}
	}

	async UpdateProfile(user_id: string, user_details: object) {
		try {
			const curr_user = await this.userRepository.findById(user_id);

			if(!curr_user) {
				throw new ValidationError("Invalid user");
			}

			//check if the current user password matches the old password entered
			const update_profile = await this.userRepository.updateById(user_id, user_details);
			return update_profile;
		} catch (error) {
			this.logger.error(`Error Updating user profile: ${error}`);
			throw new ApiError(400, 'Error Updating user profile', error);
		}
	}

	async UpdateProfilePicture(user_id: string, req: Request) {
		try {
			const curr_user = await this.userRepository.findById(user_id);
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
			const update_profile_picture = await this.userRepository.updateById(user_id, { profile_picture });

			return update_profile_picture;
		} catch (error) {
			this.logger.error(`Error Updating user profile picture: ${error}`);
			throw new ApiError(400, 'Error Updating user profile picture', error);
		}
	}

	async RemoveProfilePicture(user_id: string) {
		try {
			const curr_user = await this.userRepository.findById(user_id);

			if(!curr_user) {
				throw new ValidationError("Invalid user");
			}

			//check if the current user password matches the old password entered
			const update_profile_picture = await this.userRepository.updateById(user_id, { profile_picture_url: '' });
			return update_profile_picture;
		} catch (error) {
			this.logger.error(`Error Removing user profile picture: ${error}`);
			throw new ApiError(400, 'Error Removing user profile picture', error);
		}
	}
}