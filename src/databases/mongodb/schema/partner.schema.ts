import { Schema, model } from 'mongoose';
import { IPartner } from '../model/partner.model';

const schema = new Schema<IPartner>(
  {
    username: {
      type: String,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
    },
    phone_number: {
      type: String,
    },
    country_phone_code: {
      type: String,
    },
    business_name: {
      type: String,
    },
    is_active: {
      type: Boolean,
      default: false,
    },
    verification_token: {
      type: String,
      select: false,
    },
    reset_token: {
      type: String,
      select: false,
    },
    profile_picture: {
      type: String,
    },
    profile_picture_url: {
      type: String,
    },
    account_type: {
      type: String,
      enum: ['partner'],
      default: 'partner',
      required: true,
    },
    partner_status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'pending',
    },
    is_onboarding_completed: {
      type: Boolean,
      default: false,
    },
    onboarding_completed_at: {
      type: Date,
    },
    // Onboarding fields
    organization_name: {
      type: String,
    },
    contact_person_name: {
      type: String,
    },
    contact_email: {
      type: String,
    },
    contact_phone: {
      type: String,
    },
    country: {
      type: String,
    },
    timezone: {
      type: String,
    },
    organization_logo: {
      type: String,
    },
    preferred_currency: {
      type: String,
      enum: ['USD', 'CAD', 'NGN', 'GBP', 'EUR'],
    },
    exam_types: [{
      type: String,
      enum: ['PEBC_OSCE', 'IELTS', 'PLAB', 'USMLE', 'NCLEX'],
    }],
  },
  {
    timestamps: true,
  }
);

// Index for faster email lookups
schema.index({ email: 1 });

export default model<IPartner>('Partner', schema);
