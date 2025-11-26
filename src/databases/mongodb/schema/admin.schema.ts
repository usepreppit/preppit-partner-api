import { Schema, model } from 'mongoose';
import { IAdmin } from '../model/admin.model';

const schema = new Schema<IAdmin>(
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
      enum: ['admin'],
      default: 'admin',
      required: true,
    },
    role: {
      type: String,
      default: 'admin',
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster email lookups
schema.index({ email: 1 });

export default model<IAdmin>('Admin', schema);
