import mongoose, { Document, Types } from 'mongoose';

//Different payment plans for different exams
export interface IExamSubscriptions extends Document {
    examId: Types.ObjectId;
    subscription_name: string;
    subscription_seconds: number;
    subscription_minutes: number;
    estimated_practice_count: string;
    is_preferred: boolean;
    currency: string;
    amount: number;
    subscription_practice_unit?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const ExamSubscriptionsSchema = new mongoose.Schema<IExamSubscriptions>({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    subscription_name: { type: String, required: true },
    subscription_seconds: { type: Number, required: true },
    subscription_minutes: { type: Number, required: true },
    estimated_practice_count: { type: String, required: true },
    is_preferred: { type: Boolean, default: false },
    currency: { type: String, default: 'USD' },
    amount: { type: Number, default: 0 },
    subscription_practice_unit: { type: String, default: 'stations' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});



export const ExamSubscriptionsModel = mongoose.model<IExamSubscriptions>('ExamSubscriptions', ExamSubscriptionsSchema);
