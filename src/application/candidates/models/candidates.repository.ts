import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IUser } from '../../users/types/user.types';
import { ICandidateBatch } from '../../../databases/mongodb/model/candidate_batch.model';
import { CandidateWithBatch, BatchWithCandidateCount } from '../types/candidates.types';

@injectable()
export class CandidatesRepository {
    constructor(
        @inject('UserModel') private userModel: Model<IUser>,
        @inject('CandidateBatchModel') private candidateBatchModel: Model<ICandidateBatch>,
    ) {}

    async createBatch(partner_id: string, batch_name: string): Promise<ICandidateBatch> {
        const batch = await this.candidateBatchModel.create({
            batch_name,
            partner_id: new mongoose.Types.ObjectId(partner_id)
        });
        return batch;
    }

    async getBatchById(batch_id: string): Promise<ICandidateBatch | null> {
        return await this.candidateBatchModel.findById(batch_id).lean();
    }

    async getBatchesByPartnerId(partner_id: string): Promise<BatchWithCandidateCount[]> {
        const batches = await this.candidateBatchModel.aggregate([
            { $match: { partner_id: new mongoose.Types.ObjectId(partner_id) } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'batch_id',
                    as: 'candidates'
                }
            },
            {
                $project: {
                    _id: 1,
                    batch_name: 1,
                    partner_id: 1,
                    created_at: 1,
                    updated_at: 1,
                    candidate_count: { $size: '$candidates' }
                }
            },
            { $sort: { created_at: -1 } }
        ]);

        return batches;
    }

    async createCandidate(
        partner_id: string,
        batch_id: string,
        firstname: string,
        lastname: string,
        email: string
    ): Promise<IUser> {
        const candidate = await this.userModel.create({
            firstname,
            lastname,
            email,
            partner_id: new mongoose.Types.ObjectId(partner_id),
            batch_id: new mongoose.Types.ObjectId(batch_id),
            is_active: true,
            is_onboarding_completed: false
        });
        return candidate;
    }

    async getCandidatesByPartnerId(partner_id: string): Promise<CandidateWithBatch[]> {
        const candidates = await this.userModel.aggregate([
            { $match: { partner_id: new mongoose.Types.ObjectId(partner_id) } },
            {
                $lookup: {
                    from: 'candidatebatches',
                    localField: 'batch_id',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            {
                $unwind: {
                    path: '$batch',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    firstname: 1,
                    lastname: 1,
                    email: 1,
                    batch_id: 1,
                    batch_name: '$batch.batch_name',
                    is_active: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        return candidates;
    }

    async getCandidatesByPartnerIdPaginated(
        partner_id: string,
        page: number,
        limit: number
    ): Promise<CandidateWithBatch[]> {
        const skip = (page - 1) * limit;

        const candidates = await this.userModel.aggregate([
            { $match: { partner_id: new mongoose.Types.ObjectId(partner_id) } },
            {
                $lookup: {
                    from: 'candidatebatches',
                    localField: 'batch_id',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            {
                $unwind: {
                    path: '$batch',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    firstname: 1,
                    lastname: 1,
                    email: 1,
                    batch_id: 1,
                    batch_name: '$batch.batch_name',
                    is_active: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        return candidates;
    }

    async checkCandidateExists(email: string, partner_id: string): Promise<boolean> {
        const count = await this.userModel.countDocuments({
            email,
            partner_id: new mongoose.Types.ObjectId(partner_id)
        });
        return count > 0;
    }

    async getCandidateCountByPartnerId(partner_id: string): Promise<number> {
        return await this.userModel.countDocuments({
            partner_id: new mongoose.Types.ObjectId(partner_id)
        });
    }

    async getBatchCountByPartnerId(partner_id: string): Promise<number> {
        return await this.candidateBatchModel.countDocuments({
            partner_id: new mongoose.Types.ObjectId(partner_id)
        });
    }

    async getAllBatchesByPartnerId(partner_id: string): Promise<ICandidateBatch[]> {
        return await this.candidateBatchModel.find({
            partner_id: new mongoose.Types.ObjectId(partner_id)
        })
        .sort({ created_at: -1 })
        .lean();
    }
}
