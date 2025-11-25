import mongoose, { Document } from 'mongoose';
import { IUser } from '../../users/types/user.types';

export interface ITransactions extends Document {
    user_id: mongoose.Schema.Types.ObjectId | IUser;
    transaction_type: 'credit' | 'debit';
    transaction_channel?: string;
    amount: number;
    currency: string;
    description: string;
    transaction_details?: any;
    createdAt?: Date;
    updatedAt?: Date;
}

const Transactions = new mongoose.Schema<ITransactions>({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    transaction_type: { type: String, enum: ['credit', 'debit'], required: true },
    transaction_channel: { type: String },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    transaction_details: { type: Object },
    currency: { type: String, default: 'USD' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const TransactionsModel = mongoose.model<ITransactions>('Transactions', Transactions);