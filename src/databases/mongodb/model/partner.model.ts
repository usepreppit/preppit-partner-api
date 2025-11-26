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
  // Onboarding fields
  organization_name?: string;
  contact_person_name?: string;
  contact_email?: string;
  contact_phone?: string;
  country?: string;
  timezone?: string;
  organization_logo?: string;
  preferred_currency?: 'USD' | 'CAD' | 'NGN' | 'GBP' | 'EUR';
  exam_types?: ('PEBC_OSCE' | 'IELTS' | 'PLAB' | 'USMLE' | 'NCLEX')[];
  createdAt?: Date;
  updatedAt?: Date;
}
