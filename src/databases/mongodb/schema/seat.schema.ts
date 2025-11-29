import { Schema, model } from 'mongoose';
import { ISeat } from '../model/seat.model';

const SeatSchema = new Schema<ISeat>(
    {
        partner_id: { type: Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
        batch_id: { type: Schema.Types.ObjectId, ref: 'CandidateBatch', required: true, index: true },
        seat_count: { type: Number, required: true },
        seats_assigned: { type: Number, default: 0 },
        sessions_per_day: { type: Number, required: true, enum: [3, 5, 10, -1] }, // -1 = unlimited
        start_date: { type: Date, required: true },
        end_date: { type: Date, required: true },
        auto_renew_interval_days: { type: Number, default: 30 },
        is_active: { type: Boolean, default: true }
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

// Ensure one active seat record per batch (you can have historical records if needed)
SeatSchema.index({ batch_id: 1, partner_id: 1 }, { unique: true });

export const SeatModel = model<ISeat>('Seat', SeatSchema);
