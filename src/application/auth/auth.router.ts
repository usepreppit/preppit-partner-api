import { Router } from 'express';
import { container } from './../../startup/di/container';
import { AuthController } from './auth.controller';
import { validate_register, validate_login } from '../../validation/auth.validation';

const route = Router();
const authController = container.get<AuthController>(AuthController);

export default (app: Router) => {
    app.use('/auth', route);

    route.post('/register', validate_register, authController.Register.bind(authController));
    route.post('/login', validate_login, authController.Login.bind(authController));
    route.post('/social_login', authController.SocialLogin.bind(authController));
    route.get('/verify_email', authController.VerifyEmail.bind(authController));
    route.post('/social_register', authController.SocialRegister.bind(authController));
    route.post('/forgot_password', authController.ForgotPassword.bind(authController));
    route.post('/reset_password', authController.ResetPassword.bind(authController));

};
