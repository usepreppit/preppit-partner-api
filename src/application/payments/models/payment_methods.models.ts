import mongoose, { Schema, Document } from 'mongoose';


export interface IPaymentMethod extends Document {
    id?: string | number;
    user_id: string;
    payment_channel: string;
    payment_customer_id: string;
    status: string;
    user_details: mongoose.Schema.Types.ObjectId;
    payment_customer_details: any;
    authorization_status?: string; // authorized, declined, pending
    payment_currency?: string; // Default is 'USD'
    payment_method_metadata?: any; // Additional metadata for the payment method
    createdAt?: Date;
    updatedAt?: Date;
}

const IPaymentMethodSchema = new Schema<IPaymentMethod>({
    user_id: { type: String, required: true },
    payment_channel: { type: String, required: true },
    payment_customer_id: { type: String, required: true },
    status: { type: String, required: true },
    user_details: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel' },
    payment_customer_details: { type: Object, required: true },
    authorization_status: { type: String, default: 'authorized' }, // authorized, declined, pending
    payment_currency: { type: String, default: 'USD' }, // Default is 'USD'
    payment_method_metadata: { type: Object, default: {} }, // Additional metadata for the payment method
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const PaymentMethodModel = mongoose.model<IPaymentMethod>('PaymentMethod', IPaymentMethodSchema);
