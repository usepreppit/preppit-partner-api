// Purpose: Types for the User entity. to ensure that the user object is consistent throughout the application.

export interface IUser {
    _id?: string | number;
    firstname: string;
    lastname?: string;
    email: string;
    country_phone_code?: string;
    phone_number?: string;
    is_active: boolean;
    verification_token?: string;
    verification_url?: string;
    reset_token?: string;
    user_currency_symbol?: string;
    password: string;
    user_currency?: string;
    profile_picture?: string;
    is_onboarding_completed?: boolean;
    referral_code?: string;
    user_first_enrollment?: boolean;
    profile_picture_url?: string;
    user_balance_seconds?: number;
    google_id?: string;
    linkedin_id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    comparePassword?: (candidatePassword: string) => Promise<boolean>;
}
  
export type UserCreateDTO = Omit<IUser, 'id' | 'createdAt'>;
export type UserResponseDTO = Omit<IUser, 'password'>;
  