// features/users/models/user.model.ts
import { Schema, model } from 'mongoose';
import { IUser } from '../types/user.types';

const userSchema = new Schema<IUser>({
    firstname: { type: String, required: true },
    lastname: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    country_phone_code: { type: String },
    phone_number: { type: String },
    is_active: { type: Boolean, default: false },
    user_currency: { type: String, default: 'USD' },
    user_currency_symbol: { type: String, default: '$' },
    verification_token: { type: String },
    verification_url: { type: String }, //temporary fix should be removed later
    reset_token: { type: String },
    is_onboarding_completed: { type: Boolean, default: false },
    referral_code: { type: String, unique: true, index: true, sparse: true },
    user_first_enrollment: { type: Boolean, default: false },
    profile_picture_url: { type: String },
    user_balance_seconds: { type: Number, default: 0 },
    google_id: { type: String },
    linkedin_id: { type: String },
    partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', index: true },
    batch_id: { type: Schema.Types.ObjectId, ref: 'CandidateBatch', index: true },
    is_paid_for: { type: Boolean, default: false },
    invite_status: { 
        type: String, 
        enum: ['pending', 'accepted', 'expired'], 
        default: 'pending' 
    },
    invite_sent_at: { type: Date },
    invite_accepted_at: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});


userSchema.virtual('transactions', {
    ref: 'Transactions',
    localField: '_id',
    foreignField: 'user_id',
});

userSchema.virtual('subscriptions', {
    ref: 'Subscriptions',
    localField: '_id',
    foreignField: 'user_id',
});

userSchema.virtual('exam_enrollments', {
    ref: 'ExamEnrollment',
    localField: '_id',
    foreignField: 'userId',
});

userSchema.virtual('payments', {
    ref: 'PaymentMethod',
    localField: '_id',
    foreignField: 'user_id',
});

userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

export const UserModel = model<IUser>('User', userSchema);