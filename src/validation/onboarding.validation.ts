import { validator, sendError } from '../helpers/validator.helper';
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

interface IntValidationError {
    errors: Record<string, string[]>;
}

export const validate_complete_onboarding = (req: Request, res: Response, next: NextFunction) => {
	const validationRule = {
		organization_name: "required|string|min:2|max:100",
		contact_person_name: "required|string|min:2|max:100",
		contact_email: "required|email",
		contact_phone: "required|string",
		country: "required|string",
		timezone: "required|string",
		organization_logo: "string", // optional
		preferred_currency: "required|string|in:USD,CAD,NGN,GBP,EUR",
		exam_types: "required|array",
	};
	
	validator(req.body, validationRule, {}, (err: IntValidationError, status: boolean) => {
		if (!status) {
			sendError(res, err);
			return;
		}
		
		// Validate exam_types array contains valid ObjectIds
		const examTypes = req.body.exam_types;
		
		if (examTypes && Array.isArray(examTypes)) {
			if (examTypes.length === 0) {
				sendError(res, {
					errors: {
						exam_types: ['At least one exam must be selected']
					}
				});
				return;
			}
			
			// Validate each exam ID is a valid ObjectId
			const invalidIds = examTypes.filter((id: string) => !mongoose.Types.ObjectId.isValid(id));
			if (invalidIds.length > 0) {
				sendError(res, {
					errors: {
						exam_types: [`Invalid exam ID format: ${invalidIds.join(', ')}. Please select exams from the available list.`]
					}
				});
				return;
			}
		}
		
		next();
	});
};

export const validate_save_onboarding_progress = (req: Request, res: Response, next: NextFunction) => {
	// For progress saving, all fields are optional but must be valid if provided
	const validationRule = {
		organization_name: "string|min:2|max:100",
		contact_person_name: "string|min:2|max:100",
		contact_email: "email",
		contact_phone: "string",
		country: "string",
		timezone: "string",
		organization_logo: "string",
		preferred_currency: "string|in:USD,CAD,NGN,GBP,EUR",
		exam_types: "array",
	};
	
	validator(req.body, validationRule, {}, (err: IntValidationError, status: boolean) => {
		if (!status) {
			sendError(res, err);
			return;
		}
		
		// Validate exam_types ObjectIds if provided
		const examTypes = req.body.exam_types;
		
		if (examTypes && Array.isArray(examTypes) && examTypes.length > 0) {
			const invalidIds = examTypes.filter((id: string) => !mongoose.Types.ObjectId.isValid(id));
			if (invalidIds.length > 0) {
				sendError(res, {
					errors: {
						exam_types: [`Invalid exam ID format: ${invalidIds.join(', ')}. Please select exams from the available list.`]
					}
				});
				return;
			}
		}
		
		// Ensure at least one field is provided
		const allowedFields = [
			'organization_name',
			'contact_person_name',
			'contact_email',
			'contact_phone',
			'country',
			'timezone',
			'organization_logo',
			'preferred_currency',
			'exam_types'
		];
		
		const hasAtLeastOneField = allowedFields.some(field => req.body[field] !== undefined);
		
		if (!hasAtLeastOneField) {
			sendError(res, {
				errors: {
					general: ['At least one onboarding field must be provided']
				}
			});
			return;
		}
		
		next();
	});
};
