import mongoose from 'mongoose';

export interface ICandidateBatch extends mongoose.Document {
    _id: mongoose.Types.ObjectId;
    batch_name: string;
    partner_id: mongoose.Types.ObjectId;
    created_at: Date;
    updated_at: Date;
}
