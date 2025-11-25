import mongoose, { Document } from 'mongoose';
import { IUser } from '../../users/types/user.types';

export interface IReferrals extends Document {
    user_id: mongoose.Schema.Types.ObjectId | IUser;
    referrer_id: mongoose.Schema.Types.ObjectId | IUser;
    createdAt?: Date;
    updatedAt?: Date;
}

const Referrals = new mongoose.Schema<IReferrals>({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referrer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const ReferralsModel = mongoose.model<IReferrals>('Referrals', Referrals);