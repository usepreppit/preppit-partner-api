import mongoose, { Document } from 'mongoose';
import { IUser } from '../../users/types/user.types';
import { IPayments } from '../../payments/models/payments.models';
import { IPaymentPlans } from '../../payments/models/payment_plans.model';

export interface ISubscriptions extends Document {
    user_id: mongoose.Schema.Types.ObjectId | IUser;
    subscription_plan_id?: mongoose.Schema.Types.ObjectId | IPaymentPlans;
    subscription_payment_id?: mongoose.Schema.Types.ObjectId | IPayments;
    subscription_type?: string; // e.g., 'topup', 'plan', 'partner'
    subscription_start_date?: Date;
    subscription_end_date?: Date;
    is_active?: boolean; // Whether subscription is currently active
    daily_sessions?: number; // Sessions this subscription provides per day
    last_session_allocation?: Date; // Last time sessions were allocated from this subscription
    // Partner-related fields
    partner_id?: mongoose.Schema.Types.ObjectId | IUser; // Partner who provided this subscription
    batch_id?: mongoose.Schema.Types.ObjectId; // Batch the user was added to
    seat_subscription_id?: mongoose.Schema.Types.ObjectId; // Reference to partner's seat subscription
    createdAt?: Date;
    updatedAt?: Date;
}

const Subscriptions = new mongoose.Schema<ISubscriptions>({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subscription_plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentPlans' },
    subscription_payment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payments' },
    subscription_type: { type: String, enum: ['topup', 'subscription', 'partner'], default: 'subscription' },
    subscription_start_date: { type: Date, default: Date.now },
    subscription_end_date: { type: Date, default: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, //Default should be 30 days from start date
    is_active: { type: Boolean, default: true },
    daily_sessions: { type: Number, default: 0 }, // Number of sessions per day this subscription provides
    last_session_allocation: { type: Date }, // Last time sessions were allocated
    // Partner-related fields
    partner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // Partner who provided subscription
    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'CandidateBatch', index: true }, // Batch user was added to
    seat_subscription_id: { type: mongoose.Schema.Types.ObjectId, ref: 'SeatSubscription' }, // Partner's seat subscription
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const SubscriptionsModel = mongoose.model<ISubscriptions>('Subscriptions', Subscriptions);