import mongoose, { Document } from 'mongoose';
import { IReferrals } from './referrals.model';

export interface IReferralPayouts extends Document {
    referral_id: mongoose.Schema.Types.ObjectId | IReferrals;
    amount: number;
    payout_amount: number;
    payout_status?: string;
    payout_date?: Date;
    payout_method?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const ReferralPayouts = new mongoose.Schema<IReferralPayouts>({
    referral_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralPayouts' },
    amount: { type: Number },
    payout_amount: { type: Number },
    payout_status: { type: String },
    payout_date: { type: Date },
    payout_method: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const ReferralPayoutsModel = mongoose.model<IReferralPayouts>('ReferralPayouts', ReferralPayouts);