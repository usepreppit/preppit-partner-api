import mongoose, { Document } from 'mongoose';


export interface IPaymentPlans extends Document {
    plan_name: string;
    plan_seconds: number;
    plan_minutes: number;
    currency_usd: string;
    amount_usd: number;
    is_preferred: boolean;
    currency_cad: string;
    amount_cad: number;
    plan_practice_unit?: string;
    description?: string;
    is_active?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const PaymentPlansSchema = new mongoose.Schema<IPaymentPlans>({
    plan_name: { type: String, required: true, unique: true, index: true },
    plan_seconds: { type: Number, required: true },
    plan_minutes: { type: Number, required: true },
    currency_usd: { type: String, default: 'USD' },
    amount_usd: { type: Number, required: true },
    currency_cad: { type: String, default: 'CAD' },
    amount_cad: { type: Number, required: true },
    is_preferred: { type: Boolean, default: false },
    plan_practice_unit: { type: String, default: 'stations' },
    description: { type: String, default: '' },
    is_active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const PaymentPlansModel = mongoose.model<IPaymentPlans>('PaymentPlans', PaymentPlansSchema);


