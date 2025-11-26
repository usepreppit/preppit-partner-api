import { Document } from 'mongoose';

export interface IPartner extends Document {
  username?: string;
  email: string;
  password: string;
  firstname: string;
  lastname?: string;
  phone_number?: string;
  country_phone_code?: string;
  business_name?: string;
  is_active: boolean;
  verification_token?: string;
  reset_token?: string;
  profile_picture?: string;
  profile_picture_url?: string;
  account_type: 'partner';
  partner_status?: string; // active, pending, suspended
  is_onboarding_completed?: boolean;
  onboarding_completed_at?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
