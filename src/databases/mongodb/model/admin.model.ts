import { Document } from 'mongoose';

export interface IAdmin extends Document {
  username?: string;
  email: string;
  password: string;
  firstname: string;
  lastname?: string;
  phone_number?: string;
  country_phone_code?: string;
  is_active: boolean;
  verification_token?: string;
  reset_token?: string;
  profile_picture?: string;
  profile_picture_url?: string;
  account_type: 'admin';
  role?: string; // admin role (e.g., super_admin, admin, etc.)
  permissions?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
