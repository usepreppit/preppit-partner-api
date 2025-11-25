// src/core/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUser } from './../application/users/types/user.types';
// import { UserModel } from './../application/users/models/user.model';
import { ApiError } from '../helpers/error.helper';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            curr_user?: IUser;
        }
    }
}

export const practiceAuthMiddleware = async (req: Request, _: Response, next: NextFunction) => {
    try {
        // check if curr_user is already set
        if (!req.curr_user) {
            throw new ApiError(401, 'User not authenticated');
        }

        console.log('User in practiceAuthMiddleware:', req.curr_user);

        if (req.curr_user.user_first_enrollment == false) {
            throw new ApiError(403, `Oops! Looks like you haven't joined any exam, Please join an exam to access practice features.`);
        }

        //get the user's subscription (cast to any because IUser doesn't declare subscriptions)
        const user_subscription = (req.curr_user as any)?.subscriptions;
        if (!user_subscription || user_subscription.length === 0) {
            throw new ApiError(403, 'No active subscription found');
        }

        // Check if any subscription is active
        const now = new Date();
        const hasActiveSubscription = user_subscription.some((sub: any) => {
            const expiryDate = new Date(sub.subscription_end_date);
            return expiryDate > now;
        });

        if (!hasActiveSubscription) {
            throw new ApiError(403, 'Subscription expired. Please renew to access practice features.');
        }
        
        next();
    } catch (error) {
        // Handle specific JWT errors
        if (error instanceof jwt.TokenExpiredError) {
            return next(new ApiError(401, 'Session expired'));
        }
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new ApiError(401, 'Invalid token'));
        }
        next(error);
    }
};
