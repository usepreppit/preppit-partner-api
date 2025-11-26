// Purpose: Types for the Partner entity

export interface IPartner {
    _id?: string | number;
    firstname: string;
    lastname?: string;
    email: string;
    country_phone_code?: string;
    phone_number?: string;
    business_name?: string;
    is_active: boolean;
    verification_token?: string;
    verification_url?: string;
    reset_token?: string;
    password: string;
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

export type PartnerCreateDTO = Omit<IPartner, 'id' | 'createdAt' | 'updatedAt'>;
export type PartnerResponseDTO = Omit<IPartner, 'password' | 'verification_token' | 'reset_token'>;

export interface PartnerOnboardingDTO {
    organization_name: string;
    contact_person_name: string;
    contact_email: string;
    contact_phone: string;
    country: string;
    timezone: string;
    organization_logo?: string;
    preferred_currency: 'USD' | 'CAD' | 'NGN' | 'GBP' | 'EUR';
    exam_types: ('PEBC_OSCE' | 'IELTS' | 'PLAB' | 'USMLE' | 'NCLEX')[];
}
