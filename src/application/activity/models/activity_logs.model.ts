import { Schema, model, Document, Types } from 'mongoose';

export interface IUserActivityLog extends Document {
    userId?: Types.ObjectId;
    category?: string;
    description: string;
    action?: string;
    details?: any;
    createdAt: Date;
}

const UserActivityLogSchema = new Schema<IUserActivityLog>({
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    category: { type: String, default: 'general' },
    description: { type: String, required: true },
    action: { type: String },
    details: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
});

export const UserActivityLogModel = model<IUserActivityLog>('UserActivityLogs', UserActivityLogSchema);