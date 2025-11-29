import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IUser } from '../../users/types/user.types';
import { ICandidateBatch } from '../../../databases/mongodb/model/candidate_batch.model';
import { IPartnerCandidate } from '../../../databases/mongodb/model/partner_candidate.model';
import { CandidateWithBatch, BatchWithCandidateCount } from '../types/candidates.types';

@injectable()
export class CandidatesRepository {
    constructor(
        @inject('UserModel') private userModel: Model<IUser>,
        @inject('CandidateBatchModel') private candidateBatchModel: Model<ICandidateBatch>,
        @inject('PartnerCandidateModel') private partnerCandidateModel: Model<IPartnerCandidate>,
        @inject('SeatModel') private seatModel: Model<any>,
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
    ): Promise<{ user: IUser; partnerCandidate: IPartnerCandidate }> {
        // Check if user already exists
        let user = await this.userModel.findOne({ email }).lean();
        
        // Create user if doesn't exist
        if (!user) {
            const newUser = await this.userModel.create({
                firstname,
                lastname,
                email,
                is_active: true,
                is_onboarding_completed: false,
                password: '' // Will be set when user accepts invite
            });
            user = newUser.toObject();
        }

        // Create partner-candidate relationship
        const partnerCandidate = await this.partnerCandidateModel.create({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            candidate_id: user._id,
            batch_id: new mongoose.Types.ObjectId(batch_id),
            is_paid_for: false,
            invite_status: 'pending',
            invite_sent_at: new Date()
        });

        return { user: user as IUser, partnerCandidate };
    }

    async checkPartnerCandidateExists(
        partner_id: string,
        batch_id: string,
        email: string
    ): Promise<boolean> {
        const user = await this.userModel.findOne({ email }).lean();
        if (!user) return false;

        const relationship = await this.partnerCandidateModel.findOne({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            candidate_id: user._id,
            batch_id: new mongoose.Types.ObjectId(batch_id)
        }).lean();

        return !!relationship;
    }

    async checkMultiplePartnerCandidatesExist(
        partner_id: string,
        batch_id: string,
        emails: string[]
    ): Promise<Map<string, boolean>> {
        // Get all users with these emails
        const users = await this.userModel.find(
            { email: { $in: emails } },
            { email: 1, _id: 1 }
        ).lean();

        const userMap = new Map(users.map(u => [u.email, u._id]));
        const candidateIds = Array.from(userMap.values());

        // Get existing relationships
        const relationships = await this.partnerCandidateModel.find({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            candidate_id: { $in: candidateIds },
            batch_id: new mongoose.Types.ObjectId(batch_id)
        }).lean();

        const relationshipSet = new Set(
            relationships.map(r => r.candidate_id.toString())
        );

        // Map emails to existence in this partner-batch combination
        const result = new Map<string, boolean>();
        for (const email of emails) {
            const userId = userMap.get(email);
            result.set(email, userId ? relationshipSet.has(userId.toString()) : false);
        }

        return result;
    }

    async getCandidatesByPartnerId(partner_id: string): Promise<CandidateWithBatch[]> {
        const candidates = await this.partnerCandidateModel.aggregate([
            { $match: { partner_id: new mongoose.Types.ObjectId(partner_id) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'candidate_id',
                    foreignField: '_id',
                    as: 'candidate'
                }
            },
            {
                $unwind: '$candidate'
            },
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
                    _id: '$candidate._id',
                    firstname: '$candidate.firstname',
                    lastname: '$candidate.lastname',
                    email: '$candidate.email',
                    batch_id: '$batch_id',
                    batch_name: '$batch.batch_name',
                    is_active: '$candidate.is_active',
                    is_paid_for: '$is_paid_for',
                    invite_status: '$invite_status',
                    invite_sent_at: '$invite_sent_at',
                    invite_accepted_at: '$invite_accepted_at',
                    partner_candidate_id: '$_id',
                    createdAt: '$createdAt',
                    updatedAt: '$updatedAt'
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

        const candidates = await this.partnerCandidateModel.aggregate([
            { $match: { partner_id: new mongoose.Types.ObjectId(partner_id) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'candidate_id',
                    foreignField: '_id',
                    as: 'candidate'
                }
            },
            {
                $unwind: '$candidate'
            },
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
                    _id: '$candidate._id',
                    firstname: '$candidate.firstname',
                    lastname: '$candidate.lastname',
                    email: '$candidate.email',
                    batch_id: '$batch_id',
                    batch_name: '$batch.batch_name',
                    is_active: '$candidate.is_active',
                    is_paid_for: '$is_paid_for',
                    invite_status: '$invite_status',
                    invite_sent_at: '$invite_sent_at',
                    invite_accepted_at: '$invite_accepted_at',
                    partner_candidate_id: '$_id',
                    createdAt: '$createdAt',
                    updatedAt: '$updatedAt'
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]);

        return candidates;
    }

    async checkCandidateExists(email: string): Promise<boolean> {
        const count = await this.userModel.countDocuments({
            email,
        });
        return count > 0;
    }

    async checkMultipleCandidatesExist(emails: string[]): Promise<Set<string>> {
        const existingCandidates = await this.userModel.find(
            { email: { $in: emails } },
            { email: 1, _id: 0 }
        ).lean();
        
        return new Set(existingCandidates.map(c => c.email));
    }

    async createCandidatesBulk(
        candidatesData: Array<{
            partner_id: string;
            batch_id: string;
            firstname: string;
            lastname: string;
            email: string;
        }>
    ): Promise<Array<{ user: IUser; partnerCandidate: IPartnerCandidate }>> {
        // Get unique emails
        const emails = [...new Set(candidatesData.map(d => d.email))];
        
        // Find existing users
        const existingUsers = await this.userModel.find(
            { email: { $in: emails } }
        ).lean();
        
        const existingUserMap = new Map(existingUsers.map(u => [u.email, u]));
        
        // Separate into existing and new users
        const newUserData: Array<{
            firstname: string;
            lastname: string;
            email: string;
            is_active: boolean;
            is_onboarding_completed: boolean;
            password: string;
        }> = [];
        
        for (const data of candidatesData) {
            if (!existingUserMap.has(data.email)) {
                newUserData.push({
                    firstname: data.firstname,
                    lastname: data.lastname,
                    email: data.email,
                    is_active: true,
                    is_onboarding_completed: false,
                    password: '' // Will be set when user accepts invite
                });
            }
        }
        
        // Bulk create new users
        let createdUsers: any[] = [];
        if (newUserData.length > 0) {
            createdUsers = await this.userModel.insertMany(newUserData, { ordered: false });
            // Add to map
            for (const user of createdUsers) {
                existingUserMap.set(user.email, user.toObject ? user.toObject() : user);
            }
        }
        
        // Create partner-candidate relationships
        const partnerCandidateData = candidatesData.map(data => {
            const user = existingUserMap.get(data.email);
            return {
                partner_id: new mongoose.Types.ObjectId(data.partner_id),
                candidate_id: user!._id,
                batch_id: new mongoose.Types.ObjectId(data.batch_id),
                is_paid_for: false,
                invite_status: 'pending' as const,
                invite_sent_at: new Date()
            };
        });
        
        const partnerCandidates = await this.partnerCandidateModel.insertMany(
            partnerCandidateData,
            { ordered: false }
        );
        
        // Combine results
        return candidatesData.map((data, index) => {
            const user = existingUserMap.get(data.email)!;
            const partnerCandidate = partnerCandidates[index]!;
            return {
                user: user as IUser,
                partnerCandidate: (partnerCandidate.toObject ? partnerCandidate.toObject() : partnerCandidate) as IPartnerCandidate
            };
        });
    }

    async getCandidateCountByPartnerId(partner_id: string): Promise<number> {
        return await this.partnerCandidateModel.countDocuments({
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

    async updateCandidatePaymentStatus(
        partner_id: string,
        candidate_id: string,
        is_paid_for: boolean
    ): Promise<IPartnerCandidate | null> {
        return await this.partnerCandidateModel.findOneAndUpdate(
            {
                partner_id: new mongoose.Types.ObjectId(partner_id),
                candidate_id: new mongoose.Types.ObjectId(candidate_id)
            },
            { is_paid_for },
            { new: true }
        ).lean();
    }

    async updateCandidateInviteStatus(
        partner_candidate_id: string,
        invite_status: 'pending' | 'accepted' | 'expired'
    ): Promise<IPartnerCandidate | null> {
        const updateData: any = { invite_status };
        
        if (invite_status === 'accepted') {
            updateData.invite_accepted_at = new Date();
        }

        return await this.partnerCandidateModel.findByIdAndUpdate(
            partner_candidate_id,
            updateData,
            { new: true }
        ).lean();
    }

    async getCandidateById(candidate_id: string): Promise<IUser | null> {
        return await this.userModel.findById(candidate_id).lean();
    }

    async getCandidatesByIds(candidate_ids: string[]): Promise<IUser[]> {
        return await this.userModel.find({
            _id: { $in: candidate_ids.map(id => new mongoose.Types.ObjectId(id)) }
        }).lean();
    }

    async getPartnerCandidateById(partner_candidate_id: string): Promise<IPartnerCandidate | null> {
        return await this.partnerCandidateModel.findById(partner_candidate_id).lean();
    }

    async getPartnerCandidateByIds(
        partner_id: string,
        candidate_id: string
    ): Promise<IPartnerCandidate | null> {
        return await this.partnerCandidateModel.findOne({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            candidate_id: new mongoose.Types.ObjectId(candidate_id)
        }).lean();
    }

    async getUnpaidCandidatesCountByBatch(
        partner_id: string,
        batch_id: string
    ): Promise<number> {
        return await this.partnerCandidateModel.countDocuments({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            batch_id: new mongoose.Types.ObjectId(batch_id),
            is_paid_for: false
        });
    }

    async getUnpaidCandidatesByBatch(
        partner_id: string,
        batch_id: string
    ): Promise<IPartnerCandidate[]> {
        return await this.partnerCandidateModel.find({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            batch_id: new mongoose.Types.ObjectId(batch_id),
            is_paid_for: false
        }).lean();
    }

    async getSeatByBatch(partner_id: string, batch_id: string): Promise<any | null> {
        return await this.seatModel.findOne({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            batch_id: new mongoose.Types.ObjectId(batch_id),
            is_active: true
        }).lean();
    }

    async deactivateSeatByBatch(partner_id: string, batch_id: string): Promise<any | null> {
        return await this.seatModel.findOneAndUpdate(
            { partner_id: new mongoose.Types.ObjectId(partner_id), batch_id: new mongoose.Types.ObjectId(batch_id), is_active: true },
            { is_active: false },
            { new: true }
        ).lean();
    }

    async createSeat(
        partner_id: string,
        batch_id: string,
        seat_count: number,
        sessions_per_day: 3 | 5 | 10 | -1,
        start_date: Date,
        end_date: Date,
        auto_renew_interval_days: number = 30
    ): Promise<any> {
        const seat = await this.seatModel.create({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            batch_id: new mongoose.Types.ObjectId(batch_id),
            seat_count,
            seats_assigned: 0,
            sessions_per_day,
            start_date,
            end_date,
            auto_renew_interval_days,
            is_active: true
        });
        return seat;
    }

    async incrementSeatsAssigned(seat_id: string, incrementBy: number = 1): Promise<any> {
        return await this.seatModel.findByIdAndUpdate(seat_id, { $inc: { seats_assigned: incrementBy } }, { new: true }).lean();
    }

    async getAllSeatsByPartnerId(partner_id: string): Promise<any[]> {
        const seats = await this.seatModel.aggregate([
            {
                $match: {
                    partner_id: new mongoose.Types.ObjectId(partner_id)
                }
            },
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
                $lookup: {
                    from: 'partnercandidates',
                    let: { batch_id: '$batch_id', partner_id: '$partner_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$batch_id', '$$batch_id'] },
                                        { $eq: ['$partner_id', '$$partner_id'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'candidates'
                }
            },
            {
                $addFields: {
                    total_candidates: { $size: '$candidates' },
                    paid_candidates: {
                        $size: {
                            $filter: {
                                input: '$candidates',
                                as: 'candidate',
                                cond: { $eq: ['$$candidate.is_paid_for', true] }
                            }
                        }
                    },
                    unpaid_candidates: {
                        $size: {
                            $filter: {
                                input: '$candidates',
                                as: 'candidate',
                                cond: { $eq: ['$$candidate.is_paid_for', false] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    partner_id: 1,
                    batch_id: 1,
                    batch_name: '$batch.batch_name',
                    seat_count: 1,
                    seats_assigned: 1,
                    seats_available: { $subtract: ['$seat_count', '$seats_assigned'] },
                    sessions_per_day: 1,
                    start_date: 1,
                    end_date: 1,
                    auto_renew_interval_days: 1,
                    is_active: 1,
                    total_candidates: 1,
                    paid_candidates: 1,
                    unpaid_candidates: 1,
                    created_at: 1,
                    updated_at: 1
                }
            },
            {
                $sort: { created_at: -1 }
            }
        ]);

        return seats;
    }

    async getSeatById(seat_id: string): Promise<any | null> {
        const seats = await this.seatModel.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(seat_id)
                }
            },
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
                $lookup: {
                    from: 'partnercandidates',
                    let: { batch_id: '$batch_id', partner_id: '$partner_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$batch_id', '$$batch_id'] },
                                        { $eq: ['$partner_id', '$$partner_id'] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'candidates'
                }
            },
            {
                $addFields: {
                    total_candidates: { $size: '$candidates' },
                    paid_candidates: {
                        $size: {
                            $filter: {
                                input: '$candidates',
                                as: 'candidate',
                                cond: { $eq: ['$$candidate.is_paid_for', true] }
                            }
                        }
                    },
                    unpaid_candidates: {
                        $size: {
                            $filter: {
                                input: '$candidates',
                                as: 'candidate',
                                cond: { $eq: ['$$candidate.is_paid_for', false] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    partner_id: 1,
                    batch_id: 1,
                    batch_name: '$batch.batch_name',
                    seat_count: 1,
                    seats_assigned: 1,
                    seats_available: { $subtract: ['$seat_count', '$seats_assigned'] },
                    sessions_per_day: 1,
                    start_date: 1,
                    end_date: 1,
                    auto_renew_interval_days: 1,
                    is_active: 1,
                    total_candidates: 1,
                    paid_candidates: 1,
                    unpaid_candidates: 1,
                    created_at: 1,
                    updated_at: 1
                }
            }
        ]);

        return seats.length > 0 ? seats[0] : null;
    }
}
