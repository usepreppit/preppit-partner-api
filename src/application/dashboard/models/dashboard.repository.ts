import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { IPartner } from '../../users/types/partner.types';
import { IPractice } from '../../practice/models/practice.model';
import { IPartnerCandidate } from '../../../databases/mongodb/model/partner_candidate.model';

@injectable()
export class DashboardRepository {
    constructor(
        @inject('PartnerModel') private partnerModel: Model<IPartner>,
        @inject('PracticeModel') private practiceModel: Model<IPractice>,
        @inject('UserModel') private userModel: Model<any>,
        @inject('PartnerCandidateModel') private partnerCandidateModel: Model<IPartnerCandidate>,
    ) {}

    async getTotalCandidatesForPartner(partner_id: string): Promise<number> {
        const count = await this.partnerCandidateModel.countDocuments({ 
            partner_id: new mongoose.Types.ObjectId(partner_id)
        });
        return count;
    }

    async getCompletedSessionsThisMonth(partner_id: string): Promise<number> {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Get all candidate IDs for this partner
        const partnerCandidates = await this.partnerCandidateModel.find({ 
            partner_id: new mongoose.Types.ObjectId(partner_id) 
        }).select('candidate_id');
        
        const candidateIds = partnerCandidates.map(pc => pc.candidate_id);

        const count = await this.practiceModel.countDocuments({
            userId: { $in: candidateIds },
            status: 'finished',
            completedAt: { $gte: startOfMonth }
        });

        return count;
    }

    async getCompletedSessionsAllTime(partner_id: string): Promise<number> {
        // Get all candidate IDs for this partner
        const partnerCandidates = await this.partnerCandidateModel.find({ 
            partner_id: new mongoose.Types.ObjectId(partner_id) 
        }).select('candidate_id');
        
        const candidateIds = partnerCandidates.map(pc => pc.candidate_id);

        const count = await this.practiceModel.countDocuments({
            userId: { $in: candidateIds },
            status: 'finished'
        });

        return count;
    }

    async getAverageCandidateScore(partner_id: string): Promise<number> {
        // Get all candidate IDs for this partner
        const partnerCandidates = await this.partnerCandidateModel.find({ 
            partner_id: new mongoose.Types.ObjectId(partner_id) 
        }).select('candidate_id');
        
        const candidateIds = partnerCandidates.map(pc => pc.candidate_id);

        const result = await this.practiceModel.aggregate([
            { $match: { userId: { $in: candidateIds }, status: 'finished', score: { $exists: true, $ne: null } } },
            { $group: { _id: null, avgScore: { $avg: { $toDouble: '$score' } } } }
        ]);

        return result.length > 0 ? Math.round(result[0].avgScore * 10) / 10 : 0;
    }

    async getTotalRevenue(partner_id: string): Promise<number> {
        // Get all candidate IDs for this partner
        const partnerCandidates = await this.partnerCandidateModel.find({ 
            partner_id: new mongoose.Types.ObjectId(partner_id) 
        }).select('candidate_id');
        
        const candidateIds = partnerCandidates.map(pc => pc.candidate_id);

        const result = await this.practiceModel.aggregate([
            { $match: { userId: { $in: candidateIds }, practiceCost: { $exists: true, $ne: null } } },
            { $group: { _id: null, totalRevenue: { $sum: { $toDouble: '$practiceCost' } } } }
        ]);

        return result.length > 0 ? result[0].totalRevenue : 0;
    }

    async getPracticeSessionsStats(partner_id: string): Promise<{ purchased: number; utilized: number }> {
        // Get all candidate IDs for this partner
        const partnerCandidates = await this.partnerCandidateModel.find({ 
            partner_id: new mongoose.Types.ObjectId(partner_id) 
        }).select('candidate_id');
        
        const candidateIds = partnerCandidates.map(pc => pc.candidate_id);

        const totalPurchased = await this.practiceModel.countDocuments({ userId: { $in: candidateIds } });
        const totalUtilized = await this.practiceModel.countDocuments({ userId: { $in: candidateIds }, status: 'finished' });

        return { purchased: totalPurchased, utilized: totalUtilized };
    }

    async getPracticeSessionsTaken(partner_id: string): Promise<{ total: number; this_month: number; this_week: number }> {
        // Get all candidate IDs for this partner
        const partnerCandidates = await this.partnerCandidateModel.find({ 
            partner_id: new mongoose.Types.ObjectId(partner_id) 
        }).select('candidate_id');
        
        const candidateIds = partnerCandidates.map(pc => pc.candidate_id);

        const total = await this.practiceModel.countDocuments({ userId: { $in: candidateIds }, status: 'finished' });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const this_month = await this.practiceModel.countDocuments({
            userId: { $in: candidateIds },
            status: 'finished',
            completedAt: { $gte: startOfMonth }
        });

        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const this_week = await this.practiceModel.countDocuments({
            userId: { $in: candidateIds },
            status: 'finished',
            completedAt: { $gte: startOfWeek }
        });

        return { total, this_month, this_week };
    }

    async getFeedbackTrends(partner_id: string): Promise<{ positive: number; neutral: number; negative: number; average_rating: number }> {
        // Get all candidate IDs for this partner
        const partnerCandidates = await this.partnerCandidateModel.find({ 
            partner_id: new mongoose.Types.ObjectId(partner_id) 
        }).select('candidate_id');
        
        const candidateIds = partnerCandidates.map(pc => pc.candidate_id);

        const sessions = await this.practiceModel.find({
            userId: { $in: candidateIds },
            status: 'finished',
            'evaluation.feedback_rating': { $exists: true }
        }).select('evaluation');

        let positive = 0, neutral = 0, negative = 0, totalRating = 0, ratingCount = 0;

        sessions.forEach(session => {
            const rating = session.evaluation?.feedback_rating || 0;
            if (rating >= 4) positive++;
            else if (rating >= 2.5) neutral++;
            else if (rating > 0) negative++;
            
            if (rating > 0) {
                totalRating += rating;
                ratingCount++;
            }
        });

        return {
            positive,
            neutral,
            negative,
            average_rating: ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0
        };
    }

    async getPopularExamTypes(partner_id: string): Promise<Array<{ exam_type: string; session_count: number }>> {
        // Get all candidate IDs for this partner
        const partnerCandidates = await this.partnerCandidateModel.find({ 
            partner_id: new mongoose.Types.ObjectId(partner_id) 
        }).select('candidate_id');
        
        const candidateIds = partnerCandidates.map(pc => pc.candidate_id);

        const result = await this.practiceModel.aggregate([
            { $match: { userId: { $in: candidateIds }, examId: { $exists: true } } },
            { $lookup: { from: 'exams', localField: 'examId', foreignField: '_id', as: 'exam' } },
            { $unwind: '$exam' },
            { $group: { _id: '$exam.exam_type', session_count: { $sum: 1 } } },
            { $sort: { session_count: -1 } },
            { $limit: 5 }
        ]);

        return result.map(r => ({ exam_type: r._id || 'Unknown', session_count: r.session_count }));
    }

    async getPartnerNextStepsStatus(partner_id: string): Promise<any> {
        return await this.partnerModel.findById(partner_id)
            .select('has_added_candidates first_candidate_added_at payment_method_setup payment_method_setup_at')
            .lean();
    }

    async getCandidatePaymentStats(partner_id: string): Promise<{ paid: number; pending: number }> {
        const paidCount = await this.partnerCandidateModel.countDocuments({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            is_paid_for: true
        });

        const pendingCount = await this.partnerCandidateModel.countDocuments({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            is_paid_for: false
        });

        return { paid: paidCount, pending: pendingCount };
    }

    async getCandidateInviteStats(partner_id: string): Promise<{ accepted: number; pending: number; expired: number }> {
        const acceptedCount = await this.partnerCandidateModel.countDocuments({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            invite_status: 'accepted'
        });

        const pendingCount = await this.partnerCandidateModel.countDocuments({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            invite_status: 'pending'
        });

        const expiredCount = await this.partnerCandidateModel.countDocuments({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            invite_status: 'expired'
        });

        return { accepted: acceptedCount, pending: pendingCount, expired: expiredCount };
    }

    async getRecentActivities(partner_id: string, limit: number = 10): Promise<any[]> {
        // Get all candidate IDs for this partner
        const partnerCandidates = await this.partnerCandidateModel.find({ 
            partner_id: new mongoose.Types.ObjectId(partner_id) 
        }).select('candidate_id');
        
        const candidateIds = partnerCandidates.map(pc => pc.candidate_id);

        // Get candidate details
        const candidates = await this.userModel.find({ 
            _id: { $in: candidateIds }
        }).select('_id firstname lastname');
        
        const candidateMap = new Map(candidates.map(c => [c._id.toString(), `${c.firstname} ${c.lastname}`]));

        const recentSessions = await this.practiceModel.find({
            userId: { $in: candidateIds },
            status: 'finished'
        })
        .sort({ completedAt: -1 })
        .limit(limit)
        .populate('examId', 'exam_name exam_type')
        .lean();

        return recentSessions.map(session => ({
            id: session._id,
            type: 'session_completed',
            description: `${candidateMap.get(session.userId.toString())} completed a practice session`,
            timestamp: session.completedAt,
            metadata: {
                exam: session.examId,
                score: session.score,
                duration: session.timeSpentMinutes
            }
        }));
    }
}
