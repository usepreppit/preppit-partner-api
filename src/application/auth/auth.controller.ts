import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';

@injectable()
export class AuthController {
    constructor(
        @inject(AuthService) private readonly authService: AuthService,
        @inject(Logger) private readonly logger: Logger
    ) {}

    async Login(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { email, password } = req.body;

            try {
                const { token } = await this.authService.Login(email, password);
                ApiResponse.ok({ token }, 'Login successful').send(res);
            } catch (error) {
                this.logger.error('Error fetching users', error);
                next(error);
            };

        } catch (error) {
            next(error);
        }
    }

    async Register(req: Request, res: Response, next: NextFunction): Promise<void> {
        const user_details = req.body;
        try {
            const newUser = await this.authService.CreateUser(user_details);
            ApiResponse.ok(newUser, 'user registration successful').send(res);
        } catch (error) {
            this.logger.error('Error Creating new user', error);
            next(error);
        }
    }

    async VerifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        const email = req.query.email as string;
        const token = req.query.verify_token as string;
        try {
            const verify_email = await this.authService.VerifyEmail(email, token);
            ApiResponse.ok(verify_email, 'Email successfully verified.').send(res);
        } catch (error) {
            this.logger.error('Error verifying email', error);
            next(error);
        }
    }

    async ResendVerificationEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { email } = req.body;
        try {
            await this.authService.ResendVerificationEmail(email);
            ApiResponse.ok(null, 'Verification email sent successfully').send(res);
        } catch (error) {
            this.logger.error('Error resending verification email', error);
            next(error);
        }
    }

    async SocialLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
        const channel = req.body.channel as string;
        const code = req.body.code as string;
        const redirect_uri = req.body.redirect_uri as string;

        if (!channel || !code) {
            this.logger.error('Channel or code not provided for social login');
            ApiResponse.badRequest('Channel and code are required').send(res);
        }
        try {
            const logged_user = await this.authService.SocialLogin(channel, code, redirect_uri);
            ApiResponse.ok(logged_user, 'Login successful').send(res);
        } catch (error) {
            this.logger.error('Error fetching users', error);
            next(error);
        }
    }

    async SocialRegister(req: Request, res: Response, next: NextFunction): Promise<void> {
        const channel = req.body.channel as string;
        const code = req.body.code as string;
        const redirect_uri = req.body.redirect_uri as string;


        if (!channel || !code) {
            this.logger.error('Channel or code not provided for social registration');
            ApiResponse.badRequest('Channel and code are required').send(res);
        }

        try {
            const newUser = await this.authService.SocialRegister(channel, code, redirect_uri);
            ApiResponse.ok(newUser, 'user registration successful').send(res);
        } catch (error) {
            this.logger.error('Error Creating new user', error);
            next(error);
        }
    }

    async ForgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { email } = req.body;
        try {
            await this.authService.ForgotPassword(email);
            res.json({ message: 'Password reset link sent to email' });
        } catch (error) {
            this.logger.error('Error sending password reset link', error);
            next(error);
        }
    }

    async ResetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { email, password } = req.body;
        try {
            await this.authService.ResetPassword(email, password);
            res.json({ message: 'Password reset successful' });
        } catch (error) {
            this.logger.error('Error resetting password', error);
            next(error);
        }
    }
}