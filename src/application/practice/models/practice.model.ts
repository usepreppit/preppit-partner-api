import mongoose, { Document, Types } from 'mongoose';

export enum PracticeStatus {
    STARTED = "started",
    FINISHED = "finished",
    UNCOMPLETED = "uncompleted",
}

export interface IPractice extends Document {
    userId: Types.ObjectId;
    examId?: Types.ObjectId;
    scenarioId?: Types.ObjectId;
    status?: PracticeStatus;
    timeSpentMinutes?: number;
    timeSpentSeconds?: number;
    score?: number;
    practiceCost?: number;
    evaluation?: any;
    analysis?: any;
    analysis_full?: any;
    assistant: string;
    completedAt?: Date;
    createdAt: Date
    updatedAt: Date
}

const PracticeSchema = new mongoose.Schema<IPractice>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
    scenarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamScenario' },
    status: { type: String, enum: Object.values(PracticeStatus), default: PracticeStatus.STARTED },
    timeSpentMinutes: { type: String },
    timeSpentSeconds: { type: String },
    score: { type: String },
    practiceCost: { type: String },
    evaluation: { type: Object, default: {} },
    analysis: { type: Object, default: {} },
    analysis_full: { type: Object, default: {} },
    assistant: { type: String, default: 'vapi' },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export const PracticeModel = mongoose.model<IPractice>('Practice', PracticeSchema);
