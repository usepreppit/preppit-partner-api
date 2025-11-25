export class ApiError extends Error {
    constructor (
        public statusCode: number,
        public message: string,
        public details?: any
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            success: false,
            statusCode: this.statusCode,
            message: this.message,
            details: this.details
        };
        
    }
}


// Specific error types
export class ValidationError extends ApiError {
    constructor(details: any) {
        super(412, 'Validation failed', details);
    }
}

export class AuthenticationError extends ApiError {
    constructor() {
        super(401, 'Authentication required');
    }
}

export class NotFoundError extends ApiError {
    constructor(resource: string) {
        super(404, `${resource}`);
    }
}