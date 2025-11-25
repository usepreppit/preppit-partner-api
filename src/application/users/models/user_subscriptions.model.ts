import mongoose, { Document } from 'mongoose';
import { IUser } from '../types/user.types';
import { IPayments } from '../../payments/models/payments.models';
import { IPaymentPlans } from '../../payments/models/payment_plans.model';

export interface IUserSubscriptions extends Document {
    user_id: mongoose.Schema.Types.ObjectId | IUser;
    subscription_plan_id?: mongoose.Schema.Types.ObjectId | IPaymentPlans;
    subscription_payment_id?: mongoose.Schema.Types.ObjectId | IPayments;
    subscription_type?: string; // e.g., 'topup', 'plan'
    createdAt?: Date;
    updatedAt?: Date;
}

const UserSubscriptions = new mongoose.Schema<IUserSubscriptions>({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    subscription_plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentPlans' },
    subscription_payment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payments' },
    subscription_type: { type: String, enum: ['topup', 'plan'], default: 'plan' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const UserSubscriptionsModel = mongoose.model<IUserSubscriptions>('UserSubscriptions', UserSubscriptions);