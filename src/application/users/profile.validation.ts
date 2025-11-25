// import { ValidationError } from '../../helpers/error.helper';
import { validator, sendError } from '../../helpers/validator.helper';
import { Request, Response, NextFunction } from 'express';


interface IntValidationError {
    errors: Record<string, string[]>;
}

export const validate_change_password = (req: Request, res: Response, next: NextFunction) => {
    const validationRule = {
        old_password: "required|string",
        new_password: "required|string",
        confirm_new_password: "required|same:new_pasword"
    };
    validator(req.body, validationRule, {}, (err: IntValidationError, status: boolean) => {
        if (!status) {
            sendError(res, err);
        } else {
            next();
        }
    });
};

export const validate_register = (req: Request, res: Response, next: NextFunction) => {
    const validationRule = {
        firstname: "required|string",
        lastname: "required|string",
        business_name: "required|string",
        email: "required|string|email|check_exists:User,email",
        phone: "check_exists:User,phone",
        password: "required|string|min:6",
    };
    validator(req.body, validationRule, {}, (err: IntValidationError, status: boolean) => {
        if (!status) {
            sendError(res, err);
        } else {
            next();
        }
    });
};