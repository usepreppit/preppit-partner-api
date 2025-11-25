import mongoose, { Document } from 'mongoose';
import { IPractice } from './practice.model';

export interface IPracticeLogs extends Document {
    practice_id: mongoose.Schema.Types.ObjectId | IPractice;
    practice_log: object;
    channel?: string;
    createdAt: Date
    updatedAt: Date
}

const PracticeLogs = new mongoose.Schema<IPracticeLogs>({
    practice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Practice' },
    practice_log: { type: Object, required: true },
    channel: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const PracticeLogsModel = mongoose.model<IPracticeLogs>('PracticeLogs', PracticeLogs);