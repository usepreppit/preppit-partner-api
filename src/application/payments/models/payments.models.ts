import mongoose, { Document } from 'mongoose';
import { IUser } from '../../users/types/user.types';
import { IPaymentPlans } from './payment_plans.model';

export interface IPayments extends Document {
    user_id: mongoose.Schema.Types.ObjectId | IUser;
    payment_plan_id?: mongoose.Schema.Types.ObjectId | IPaymentPlans;
    transaction_type: 'credit' | 'debit';
    transaction_channel?: string;
    amount: number;
    currency: string;
    payment_processor?: string;
    payment_processor_customer_id?: string;
    payment_processor_payment_id?: string;
    payment_status?: string;
    payment_method?: string;
    payment_reference?: string;
    description: string;
    transaction_details?: any;
    createdAt?: Date;
    updatedAt?: Date;
}

const Payments = new mongoose.Schema<IPayments>({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payment_plan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentPlans' },
    transaction_type: { type: String, enum: ['credit', 'debit'], required: true },
    transaction_channel: { type: String },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    transaction_details: { type: Object },
    currency: { type: String, default: 'USD' },
    payment_processor: { type: String, default: 'stripe' },
    payment_processor_customer_id: { type: String },
    payment_processor_payment_id: { type: String },
    payment_status: { type: String, default: 'pending' },
    payment_method: { type: String },
    payment_reference: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const PaymentsModel = mongoose.model<IPayments>('Payments', Payments);
