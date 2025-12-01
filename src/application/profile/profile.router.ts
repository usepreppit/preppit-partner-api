import { Router } from 'express';
import { container } from '../../startup/di/container';
import { ProfileController } from './profile.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireOnboardingIncomplete } from '../../middlewares/onboarding.middleware';
import { validate_complete_onboarding, validate_save_onboarding_progress } from '../../validation/onboarding.validation';
import { validate_change_password, validate_update_profile } from '../../validation/profile.validation';
import { sendError } from '../../helpers/validator.helper';

const route = Router();
route.use(authMiddleware);
const profileController = container.get<ProfileController>(ProfileController);

export default (app: Router) => {
    app.use('/profile', route);
    route.get('/', profileController.GetProfile.bind(profileController));
    
    route.post(
        '/change_password',
        (req, res, next) => {
            validate_change_password(req.body, (err: any, status: boolean) => {
                if (!status) {
                    return sendError(res, err);
                }
                next();
            });
        },
        profileController.ChangePassword.bind(profileController)
    );
    
    route.put(
        '/update_profile',
        (req, res, next) => {
            validate_update_profile(req.body, (err: any, status: boolean) => {
                if (!status) {
                    return sendError(res, err);
                }
                next();
            });
        },
        profileController.UpdateProfile.bind(profileController)
    );
    
    route.post('/update_profile_picture', profileController.UpdateProfilePicture.bind(profileController));
    route.delete('/remove_profile_picture', profileController.RemoveProfilePicture.bind(profileController));
    
    // Onboarding routes - only accessible to partners who haven't completed onboarding
    route.put(
        '/onboarding', 
        requireOnboardingIncomplete, 
        validate_save_onboarding_progress,
        profileController.SaveOnboardingProgress.bind(profileController)
    );
    
    route.post(
        '/complete_onboarding', 
        requireOnboardingIncomplete, 
        validate_complete_onboarding,
        profileController.CompleteOnboarding.bind(profileController)
    );
};
