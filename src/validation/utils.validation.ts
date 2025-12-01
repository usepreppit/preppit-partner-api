import { validator } from '../helpers/validator.helper';

export const validate_send_feedback = (data: any, callback: Function) => {
    const rules = {
        subject: 'required|string|min:3|max:200',
        message: 'required|string|min:10|max:5000'
    };

    const customMessages = {
        'required.subject': 'Subject is required',
        'string.subject': 'Subject must be a string',
        'min.subject': 'Subject must be at least 3 characters',
        'max.subject': 'Subject cannot exceed 200 characters',
        'required.message': 'Message is required',
        'string.message': 'Message must be a string',
        'min.message': 'Message must be at least 10 characters',
        'max.message': 'Message cannot exceed 5000 characters'
    };

    validator(data, rules, customMessages, callback);
};
