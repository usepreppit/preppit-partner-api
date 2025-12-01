import { validator } from '../helpers/validator.helper';

export const validate_create_batch = (data: any, callback: Function) => {
    const rules = {
        batch_name: 'required|string|min:2|max:100'
    };

    const customMessages = {
        'required.batch_name': 'Batch name is required',
        'string.batch_name': 'Batch name must be a string',
        'min.batch_name': 'Batch name must be at least 2 characters',
        'max.batch_name': 'Batch name cannot exceed 100 characters'
    };

    validator(data, rules, customMessages, callback);
};

export const validate_create_candidate = (data: any, callback: Function) => {
    // Build rules dynamically - only validate batch_id if it's provided
    const rules: any = {
        firstname: 'required|string|min:2|max:50',
        lastname: 'required|string|min:2|max:50',
        email: 'required|email'
    };

    // Only add batch_id validation if it's present in the request
    if (data.batch_id !== undefined && data.batch_id !== null && data.batch_id !== '') {
        rules.batch_id = 'string';
    }

    const customMessages = {
        'string.batch_id': 'Batch ID must be a valid string',
        'required.firstname': 'First name is required',
        'min.firstname': 'First name must be at least 2 characters',
        'max.firstname': 'First name cannot exceed 50 characters',
        'required.lastname': 'Last name is required',
        'min.lastname': 'Last name must be at least 2 characters',
        'max.lastname': 'Last name cannot exceed 50 characters',
        'required.email': 'Email is required',
        'email.email': 'Please provide a valid email address'
    };

    validator(data, rules, customMessages, callback);
};

export const validate_assign_candidates_to_batch = (data: any, callback: Function) => {
    const rules = {
        batch_id: 'required|string',
        candidate_ids: 'required|array',
        'candidate_ids.*': 'string'
    };

    const customMessages = {
        'required.batch_id': 'Batch ID is required',
        'string.batch_id': 'Batch ID must be a string',
        'required.candidate_ids': 'Candidate IDs are required',
        'array.candidate_ids': 'Candidate IDs must be an array',
        'string.candidate_ids.*': 'Each candidate ID must be a string'
    };

    validator(data, rules, customMessages, callback);
};
