import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../helpers/error.helper';

export const errorHandler = (err: Error | ApiError, _: Request, res: Response, next: NextFunction): Response | any  => {
    if (res.headersSent) {
        return next(err);
    }

    res.header('Content-Type', 'application/json');
    // Handle known API errors
    if (err instanceof ApiError) {
        console.log("got here", err);
        return res.status(err.statusCode).json(err.toJSON());
    }

    // Handle validation errors (using Zod example)
    if (err.name === 'ZodError' && 'issues' in err) {
        console.log("got here", err);
            const details = (err as any).issues.map((issue: any) => ({
                path: issue.path.join('.'),
                message: issue.message
            }));
            
            return res.status(400).json({
                success: false,
                error: {
                    code: 400,
                    message: 'Validation failed',
                    details
                }
            });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: {
                code: 401,
                message: 'Invalid token'
            }
        });
    }

    // Handle unexpected errors
    console.error(err);
        res.status(500).json({
            success: false,
            error: {
                code: 500,
                message: 'Internal server error',
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
            }
        });
};