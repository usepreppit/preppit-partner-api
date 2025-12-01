import { validator } from '../helpers/validator.helper';

export const validate_change_password = (data: any, callback: Function) => {
    const rules = {
        old_password: 'required|string',
        new_password: 'required|string|min:6',
        confirm_new_password: 'required|string|same:new_password'
    };

    const customMessages = {
        'required.old_password': 'Old password is required',
        'string.old_password': 'Old password must be a string',
        'required.new_password': 'New password is required',
        'string.new_password': 'New password must be a string',
        'min.new_password': 'New password must be at least 6 characters',
        'required.confirm_new_password': 'Confirm new password is required',
        'string.confirm_new_password': 'Confirm new password must be a string',
        'same.confirm_new_password': 'Confirm new password must match new password'
    };

    validator(data, rules, customMessages, callback);
};

export const validate_update_profile = (data: any, callback: Function) => {
    const rules: any = {
        firstname: 'string|min:2|max:50',
        lastname: 'string|min:2|max:50',
        phone_number: 'string',
        country: 'string|max:100',
        organization_name: 'string|max:200',
        contact_person_name: 'string|max:100',
        contact_email: 'email',
        contact_phone: 'string',
        timezone: 'string',
        preferred_currency: 'string|in:USD,CAD,NGN,GBP,EUR'
    };

    const customMessages = {
        'string.firstname': 'First name must be a string',
        'min.firstname': 'First name must be at least 2 characters',
        'max.firstname': 'First name cannot exceed 50 characters',
        'string.lastname': 'Last name must be a string',
        'min.lastname': 'Last name must be at least 2 characters',
        'max.lastname': 'Last name cannot exceed 50 characters',
        'string.phone_number': 'Phone number must be a string',
        'string.country': 'Country must be a string',
        'max.country': 'Country cannot exceed 100 characters',
        'string.organization_name': 'Organization name must be a string',
        'max.organization_name': 'Organization name cannot exceed 200 characters',
        'string.contact_person_name': 'Contact person name must be a string',
        'max.contact_person_name': 'Contact person name cannot exceed 100 characters',
        'email.contact_email': 'Contact email must be a valid email address',
        'string.contact_phone': 'Contact phone must be a string',
        'string.timezone': 'Timezone must be a string',
        'string.preferred_currency': 'Preferred currency must be a string',
        'in.preferred_currency': 'Preferred currency must be one of: USD, CAD, NGN, GBP, EUR'
    };

    validator(data, rules, customMessages, callback);
};
