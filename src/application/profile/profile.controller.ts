import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { ProfileService } from './profile.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';

@injectable()
export class ProfileController {
    constructor(
        @inject(ProfileService) private readonly profileService: ProfileService,
        @inject(Logger) private readonly logger: Logger
    ) {}

    async GetProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            const account_type = req.account_type;
            try {
                const curr_user = await this.profileService.GetProfile(user_id, account_type);
                ApiResponse.ok(curr_user, 'User profile retrieved successfully').send(res);
            } catch (error) {
                this.logger.error('Error fetching user profile', error);
                next(error);
            }
        } catch (error) {
            next(error);
        }
    }
 
    async ChangePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            const account_type = req.account_type;
            const { old_password, new_password } = req.body;
            try {
                const curr_user = await this.profileService.ChangePassword(user_id, old_password, new_password, account_type);

                ApiResponse.ok(curr_user, 'user password updated successfully').send(res);
            } catch (error) {
                this.logger.error('Error updating user password', error);
                next(error);
            };

        } catch (error) {
            next(error);
        }
    }

    async UpdateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            const account_type = req.account_type;
            // const { firstname, lastname, business_name, business_about, business_country } = req.body;
            try {
                const curr_user = await this.profileService.UpdateProfile(user_id, req.body, account_type);
                ApiResponse.ok(curr_user, 'user profile updated successfully').send(res);
            } catch (error) {
                this.logger.error('Error updating user profile', error);
                next(error);
            };
        } catch (error) {
            next(error);
        }
    }

    async UpdateProfilePicture(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            const account_type = req.account_type;
            try {
                const curr_user = await this.profileService.UpdateProfilePicture(user_id, req, account_type);

                ApiResponse.ok(curr_user, 'user profile picture updated successfully').send(res);
            } catch (error) {
                this.logger.error('Error updating user profile picture', error);
                next(error);
            };

        } catch (error) {
            next(error);
        }
    }

    async RemoveProfilePicture(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            const account_type = req.account_type;
            try {
                const curr_user = await this.profileService.RemoveProfilePicture(user_id, account_type);
                ApiResponse.ok(curr_user, 'user profile picture removed successfully').send(res);
            } catch (error) {
                this.logger.error('Error removing user profile picture', error);
                next(error);
            };

        } catch (error) {
            next(error);
        }
    }

    async CompleteOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            const account_type = req.account_type;
            const onboardingData = req.body;
            
            try {
                const result = await this.profileService.CompleteOnboarding(user_id, onboardingData, account_type);
                ApiResponse.ok(result, 'Onboarding completed successfully').send(res);
            } catch (error) {
                this.logger.error('Error completing onboarding', error);
                next(error);
            }
        } catch (error) {
            next(error);
        }
    }

    async SaveOnboardingProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            const account_type = req.account_type;
            const progressData = req.body;
            
            try {
                const result = await this.profileService.SaveOnboardingProgress(user_id, progressData, account_type);
                ApiResponse.ok(result, 'Onboarding progress saved successfully').send(res);
            } catch (error) {
                this.logger.error('Error saving onboarding progress', error);
                next(error);
            }
        } catch (error) {
            next(error);
        }
    }
}
