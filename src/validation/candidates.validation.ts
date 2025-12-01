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
    const rules = {
        batch_id: 'string', // Optional - candidates without batch are unpaid
        firstname: 'required|string|min:2|max:50',
        lastname: 'required|string|min:2|max:50',
        email: 'required|email'
    };

    const customMessages = {
        'string.batch_id': 'Batch ID must be a string',
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
