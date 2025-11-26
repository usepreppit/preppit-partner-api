// src/middlewares/onboarding.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../helpers/error.helper';

/**
 * Middleware to ensure partners have completed onboarding before accessing protected routes
 * This should be used after authMiddleware to ensure req.curr_user and req.account_type are available
 */
export const requireOnboardingComplete = async (req: Request, _: Response, next: NextFunction) => {
    try {
        // Only check onboarding for partners
        if (req.account_type !== 'partner') {
            return next();
        }

        const partner = req.curr_user as any;

        if (!partner) {
            throw new ApiError(401, 'Authentication required');
        }

        // Check if partner has completed onboarding
        if (!partner.is_onboarding_completed) {
            throw new ApiError(403, 'Onboarding incomplete. Please complete your onboarding process before accessing this resource.');
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to ensure partners have NOT completed onboarding
 * Useful for onboarding-specific routes that should only be accessible during onboarding
 */
export const requireOnboardingIncomplete = async (req: Request, _: Response, next: NextFunction) => {
    try {
        // Only check for partners
        if (req.account_type !== 'partner') {
            throw new ApiError(403, 'This route is only accessible to partners during onboarding');
        }

        const partner = req.curr_user as any;

        if (!partner) {
            throw new ApiError(401, 'Authentication required');
        }

        // Check if partner has already completed onboarding
        if (partner.is_onboarding_completed) {
            throw new ApiError(403, 'Onboarding already completed. This resource is no longer accessible.');
        }

        next();
    } catch (error) {
        next(error);
    }
};
