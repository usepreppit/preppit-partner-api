import { Router } from 'express';
import { container } from '../../startup/di/container';
import { ProfileController } from './profile.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const route = Router();
route.use(authMiddleware);
const profileController = container.get<ProfileController>(ProfileController);

export default (app: Router) => {
    app.use('/profile', route);
    route.get('/', profileController.GetProfile.bind(profileController));
    route.post('/change_password', profileController.ChangePassword.bind(profileController));
    route.put('/update_profile', profileController.UpdateProfile.bind(profileController));
    route.post('/update_profile_picture', profileController.UpdateProfilePicture.bind(profileController));
    route.delete('/remove_profile_picture', profileController.RemoveProfilePicture.bind(profileController));
};
