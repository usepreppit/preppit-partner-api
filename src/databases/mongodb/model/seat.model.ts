import mongoose from 'mongoose';

export interface ISeat extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    partner_id: mongoose.Types.ObjectId;
    batch_id: mongoose.Types.ObjectId;
    seat_count: number; // number of seats purchased
    seats_assigned: number; // number assigned so far
    start_date: Date;
    end_date: Date;
    auto_renew_interval_days: number; // default 30
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}
