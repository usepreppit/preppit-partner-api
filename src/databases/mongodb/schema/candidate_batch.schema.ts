import { Schema, model } from 'mongoose';
import { ICandidateBatch } from '../model/candidate_batch.model';

const CandidateBatchSchema = new Schema<ICandidateBatch>(
    {
        batch_name: {
            type: String,
            required: true,
            trim: true
        },
        partner_id: {
            type: Schema.Types.ObjectId,
            ref: 'Partner',
            required: true,
            index: true
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// Compound index for partner_id and batch_name to ensure unique batch names per partner
CandidateBatchSchema.index({ partner_id: 1, batch_name: 1 }, { unique: true });

export const CandidateBatchModel = model<ICandidateBatch>('CandidateBatch', CandidateBatchSchema);
