import mongoose, { Document } from 'mongoose';
import { IUser } from '../../users/types/user.types';
import { IPayments } from '../../payments/models/payments.models';
import { IPaymentPlans } from '../../payments/models/payment_plans.model';

export interface ISubscriptions extends Document {
    user_id: mongoose.Schema.Types.ObjectId | IUser;
    subscription_plan_id?: mongoose.Schema.Types.ObjectId | IPaymentPlans;
    subscription_payment_id?: mongoose.Schema.Types.ObjectId | IPayments;
    subscription_type?: string; // e.g., 'topup', 'plan'
    subscription_start_date?: Date;
    subscription_end_date?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

const Subscriptions = new mongoose.Schema<ISubscriptions>({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    subscription_plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentPlans' },
    subscription_payment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payments' },
    subscription_type: { type: String, enum: ['topup', 'subscription'], default: 'subscription' },
    subscription_start_date: { type: Date, default: Date.now },
    subscription_end_date: { type: Date, default: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, //Default should be 30 days from start date
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const SubscriptionsModel = mongoose.model<ISubscriptions>('Subscriptions', Subscriptions);