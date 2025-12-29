// Purpose: Mongoose schema for Partner-Candidate relationship

import mongoose, { Schema } from 'mongoose';
import { IPartnerCandidate } from '../model/partner_candidate.model';

const PartnerCandidateSchema: Schema = new Schema(
    {
        partner_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        candidate_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        batch_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CandidateBatch',
            required: false, // Optional - candidates without batch are unpaid
            index: true
        },
        is_paid_for: {
            type: Boolean,
            default: false
        },
        invite_status: {
            type: String,
            enum: ['pending', 'accepted', 'expired'],
            default: 'pending'
        },
        user_first_enrollment: {
            type: Boolean,
            default: false
        },
        invite_sent_at: {
            type: Date,
            default: Date.now
        },
        invite_accepted_at: {
            type: Date
        }
    },
    {
        timestamps: true
    }
);

// Compound unique index: Same candidate cannot be in same batch twice
// Sparse index allows multiple null batch_id values
PartnerCandidateSchema.index({ candidate_id: 1, batch_id: 1 }, { unique: true, sparse: true });

// Index for querying candidates by partner
PartnerCandidateSchema.index({ partner_id: 1, candidate_id: 1 });

export default mongoose.model<IPartnerCandidate>('PartnerCandidate', PartnerCandidateSchema);
