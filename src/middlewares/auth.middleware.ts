// src/core/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUser } from './../application/users/types/user.types';
import { UserModel } from './../application/users/models/user.model';
import { ApiError } from '../helpers/error.helper';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            curr_user?: IUser;
        }
    }
}

export const authMiddleware = async (req: Request, _: Response, next: NextFunction) => {
    try {
        // 1. Get token from headers
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1]; // Bearer <token>

        if (!token) {
            throw new ApiError(401, 'Authentication required');
        }

        // 2. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            user_id: string;
            email: string;
            iat: number;
            exp: number;
        };

        // 3. Get user from database
        const user = await UserModel.findById(decoded.user_id)
            .select('-password') // Exclude sensitive data
            .populate('subscriptions')
            .lean();

        if (!user) {
            throw new ApiError(401, 'User not found');
        }
        
        // 4. Attach user to request
        req.curr_user = user;
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
