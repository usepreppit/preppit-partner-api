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
  },
  {
    timestamps: true,
  }
);

// Index for faster email lookups
schema.index({ email: 1 });

export default model<IPartner>('Partner', schema);
