// Purpose: Types for the Admin entity

export interface IAdmin {
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
    password: string;
    profile_picture?: string;
    profile_picture_url?: string;
    account_type: 'admin';
    role?: string; // admin role (e.g., super_admin, admin, etc.)
    permissions?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export type AdminCreateDTO = Omit<IAdmin, 'id' | 'createdAt' | 'updatedAt'>;
export type AdminResponseDTO = Omit<IAdmin, 'password' | 'verification_token' | 'reset_token'>;
