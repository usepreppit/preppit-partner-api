// import { ValidationError } from '../../helpers/error.helper';
import { validator, sendError } from '../helpers/validator.helper';
import { Request, Response, NextFunction } from 'express';
import AdminModel from '../databases/mongodb/schema/admin.schema';
import PartnerModel from '../databases/mongodb/schema/partner.schema';


interface IntValidationError {
    errors: Record<string, string[]>;
}

// Helper function to check if email exists in Admin or Partner table
const checkEmailExists = async (email: string): Promise<boolean> => {
	const isAdmin = email.toLowerCase().endsWith('@usepreppit.com');
	
	if (isAdmin) {
		const adminExists = await AdminModel.findOne({ email });
		return !!adminExists;
	} else {
		const partnerExists = await PartnerModel.findOne({ email });
		return !!partnerExists;
	}
};

export const validate_login = (req: Request, res: Response, next: NextFunction) => {
	const validationRule = {
		email: "required|string|email",
		password: "required|string",
	};
	validator(req.body, validationRule, {}, (err: IntValidationError, status: boolean) => {
		if (!status) {
			sendError(res, err);
		} else {
			next();
		}
	});
};

export const validate_register = async (req: Request, res: Response, next: NextFunction) => {
	const validationRule = {
		firstname: "required|string",
		lastname: "string",
		email: "required|string|email",
		password: "required|string|min:6",
	};
	
	validator(req.body, validationRule, {}, async (err: IntValidationError, status: boolean) => {
		if (!status) {
			sendError(res, err);
			return;
		}
		
		// Check if email already exists in the appropriate table
		try {
			const emailExists = await checkEmailExists(req.body.email);
			if (emailExists) {
				sendError(res, {
					errors: {
						email: ['Email has already been taken, please proceed to login.']
					}
				});
				return;
			}
			next();
		} catch (error) {
			sendError(res, {
				errors: {
					email: ['An error occurred while validating email.']
				}
			});
		}
	});
};

export const validate_phone_and_email = (req: Request, res: Response, next: NextFunction) => {
	const validationRule = {
		email: "required|string|email|userparam_available:email",
		phone: "required|string|userparam_available:phone",
	};
	validator(req.body, validationRule, {}, (err: IntValidationError, status: boolean) => {
		if (!status) {
			sendError(res, err);
		} else {
			next();
		}
	});
};

export const validate_otp = (req: Request, res: Response, next: NextFunction) => {
	const validationRule = {
		email: "required|string|email",
		verify_token: "required|string",
		otp_code: "required",
	};
	validator(req.body, validationRule, {}, (err: IntValidationError, status: boolean) => {
		if (!status) {
			sendError(res, err);
		} else {
			next();
		}
	});
};

export const validate_forgot_password = (req: Request, res: Response, next: NextFunction) => {
	const validationRule = {
		email: "required|string|email",
	};
	validator(req.body, validationRule, {}, (err: IntValidationError, status: boolean) => {
		if (!status) {
			sendError(res, err);
		} else {
			next();
		}
	});
};

export const validate_reset_password = (req: Request, res: Response, next: NextFunction) => {
	const validationRule = {
		email: "required|string|email",
		password: "required|string",
		reset_token: "required|string",
		// confirm_password: "required|string|same:password",
	};
	validator(req.body, validationRule, {}, (err: IntValidationError, status: boolean) => {
		if (!status) {
			sendError(res, err);
		} else {
			next();
		}
	});
};
