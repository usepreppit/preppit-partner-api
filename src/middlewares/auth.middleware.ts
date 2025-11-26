// src/core/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IAdmin } from './../application/users/types/admin.types';
import { IPartner } from './../application/users/types/partner.types';
import AdminModel from './../databases/mongodb/schema/admin.schema';
import PartnerModel from './../databases/mongodb/schema/partner.schema';
import { ApiError } from '../helpers/error.helper';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            curr_user?: IAdmin | IPartner;
            account_type?: 'admin' | 'partner';
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
            account_type?: 'admin' | 'partner';
            iat: number;
            exp: number;
        };

        // 3. Get user from the appropriate database based on account_type
        let user: any = null;
        let accountType: 'admin' | 'partner';

        if (decoded.account_type === 'admin') {
            user = await AdminModel.findById(decoded.user_id)
                .select('-password')
                .lean();
            accountType = 'admin';
        } else if (decoded.account_type === 'partner') {
            user = await PartnerModel.findById(decoded.user_id)
                .select('-password')
                .lean();
            accountType = 'partner';
        } else {
            // No account_type in token - invalid token format
            throw new ApiError(401, 'Invalid token format');
        }

        if (!user) {
            throw new ApiError(401, 'User not found');
        }
        
        // 4. Attach user and account type to request
        req.curr_user = user;
        req.account_type = accountType;
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
