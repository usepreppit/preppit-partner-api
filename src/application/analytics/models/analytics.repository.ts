import { inject, injectable } from 'inversify';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import {
    OverviewMetrics,
    CandidatePerformanceOverview,
    PracticeSessionMetrics,
    AtRiskCandidatesData
} from '../analytics.service';

@injectable()
export class AnalyticsRepository {
    constructor(
        @inject('PartnerCandidateModel') private partnerCandidateModel: Model<any>,
        @inject('ActivityModel') private activityModel: Model<any>
    ) {}

    async getOverviewMetrics(partner_id: string): Promise<OverviewMetrics> {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Total candidates onboarded
        const totalCandidates = await this.partnerCandidateModel.countDocuments({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            is_paid_for: true
        });

        // Active candidates this month (practiced at least once)
        const activeCandidatesThisMonth = await this.activityModel.aggregate([
            {
                $lookup: {
                    from: 'partnercandidates',
                    localField: 'user_id',
                    foreignField: 'candidate_id',
                    as: 'partnerCandidate'
                }
            },
            { $unwind: '$partnerCandidate' },
            {
                $match: {
                    'partnerCandidate.partner_id': new mongoose.Types.ObjectId(partner_id),
                    'partnerCandidate.is_paid_for': true,
                    activity_type: 'practice_session',
                    createdAt: { $gte: startOfMonth }
                }
            },
            {
                $group: {
                    _id: '$user_id'
                }
            },
            { $count: 'total' }
        ]);

        // Practice sessions and minutes in last 30 days
        const practiceStats = await this.activityModel.aggregate([
            {
                $lookup: {
                    from: 'partnercandidates',
                    localField: 'user_id',
                    foreignField: 'candidate_id',
                    as: 'partnerCandidate'
                }
            },
            { $unwind: '$partnerCandidate' },
            {
                $match: {
                    'partnerCandidate.partner_id': new mongoose.Types.ObjectId(partner_id),
                    'partnerCandidate.is_paid_for': true,
                    activity_type: 'practice_session',
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: null,
                    total_sessions: { $sum: 1 },
                    total_minutes: { $sum: '$duration_minutes' }
                }
            }
        ]);

        const stats = practiceStats[0] || { total_sessions: 0, total_minutes: 0 };
        const activeThisMonth = activeCandidatesThisMonth[0]?.total || 0;

        return {
            total_candidates_onboarded: totalCandidates,
            active_candidates_this_month: activeThisMonth,
            total_practice_sessions_30_days: stats.total_sessions,
            total_practice_minutes_used: stats.total_minutes || 0,
            average_practice_per_candidate: totalCandidates > 0 
                ? Math.round((stats.total_minutes || 0) / totalCandidates) 
                : 0
        };
    }

    async getCandidatePerformanceOverview(
        partner_id: string,
        limit: number
    ): Promise<CandidatePerformanceOverview> {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Top performing candidates
        const topPerformers = await this.activityModel.aggregate([
            {
                $lookup: {
                    from: 'partnercandidates',
                    localField: 'user_id',
                    foreignField: 'candidate_id',
                    as: 'partnerCandidate'
                }
            },
            { $unwind: '$partnerCandidate' },
            {
                $match: {
                    'partnerCandidate.partner_id': new mongoose.Types.ObjectId(partner_id),
                    'partnerCandidate.is_paid_for': true,
                    activity_type: 'practice_session'
                }
            },
            {
                $group: {
                    _id: '$user_id',
                    total_sessions: { $sum: 1 },
                    total_minutes: { $sum: '$duration_minutes' },
                    average_score: { $avg: '$score' },
                    last_practice_date: { $max: '$createdAt' },
                    practice_dates: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }
                }
            },
            {
                $addFields: {
                    consistency_score: { $size: '$practice_dates' }
                }
            },
            { $sort: { consistency_score: -1, average_score: -1, total_sessions: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    candidate_id: '$_id',
                    name: { $concat: ['$user.firstname', ' ', { $ifNull: ['$user.lastname', ''] }] },
                    email: '$user.email',
                    total_sessions: 1,
                    total_minutes: 1,
                    average_score: { $round: ['$average_score', 2] },
                    consistency_score: 1,
                    last_practice_date: 1
                }
            }
        ]);

        // Least active candidates (paid candidates with low activity)
        const leastActive = await this.partnerCandidateModel.aggregate([
            {
                $match: {
                    partner_id: new mongoose.Types.ObjectId(partner_id),
                    is_paid_for: true
                }
            },
            {
                $lookup: {
                    from: 'activities',
                    let: { candidate_id: '$candidate_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$user_id', '$$candidate_id'] },
                                activity_type: 'practice_session'
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                total_sessions: { $sum: 1 },
                                total_minutes: { $sum: '$duration_minutes' },
                                last_practice: { $max: '$createdAt' }
                            }
                        }
                    ],
                    as: 'activity'
                }
            },
            {
                $addFields: {
                    activity: { $arrayElemAt: ['$activity', 0] },
                    total_sessions: { $ifNull: [{ $arrayElemAt: ['$activity.total_sessions', 0] }, 0] },
                    total_minutes: { $ifNull: [{ $arrayElemAt: ['$activity.total_minutes', 0] }, 0] },
                    last_practice_date: { $arrayElemAt: ['$activity.last_practice', 0] }
                }
            },
            {
                $addFields: {
                    days_since_last_practice: {
                        $cond: {
                            if: '$last_practice_date',
                            then: {
                                $dateDiff: {
                                    startDate: '$last_practice_date',
                                    endDate: new Date(),
                                    unit: 'day'
                                }
                            },
                            else: 999
                        }
                    }
                }
            },
            {
                $match: {
                    $or: [
                        { days_since_last_practice: { $gte: 7 } },
                        { total_minutes: { $lt: 10 } }
                    ]
                }
            },
            { $sort: { days_since_last_practice: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'users',
                    localField: 'candidate_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    candidate_id: '$candidate_id',
                    name: { $concat: ['$user.firstname', ' ', { $ifNull: ['$user.lastname', ''] }] },
                    email: '$user.email',
                    total_sessions: 1,
                    total_minutes: 1,
                    last_practice_date: 1,
                    days_since_last_practice: 1
                }
            }
        ]);

        // Engagement rate
        const totalPaidCandidates = await this.partnerCandidateModel.countDocuments({
            partner_id: new mongoose.Types.ObjectId(partner_id),
            is_paid_for: true
        });

        const activeLast7Days = await this.activityModel.aggregate([
            {
                $match: {
                    activity_type: 'practice_session',
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $lookup: {
                    from: 'partnercandidates',
                    localField: 'user_id',
                    foreignField: 'candidate_id',
                    as: 'partnerCandidate'
                }
            },
            { $unwind: '$partnerCandidate' },
            {
                $match: {
                    'partnerCandidate.partner_id': new mongoose.Types.ObjectId(partner_id),
                    'partnerCandidate.is_paid_for': true
                }
            },
            {
                $group: {
                    _id: '$user_id'
                }
            },
            { $count: 'total' }
        ]);

        const activeCount = activeLast7Days[0]?.total || 0;

        return {
            top_performing_candidates: topPerformers,
            least_active_candidates: leastActive,
            engagement_rate: {
                total_candidates: totalPaidCandidates,
                active_last_7_days: activeCount,
                percentage: totalPaidCandidates > 0 
                    ? Math.round((activeCount / totalPaidCandidates) * 100) 
                    : 0
            }
        };
    }

    async getPracticeSessionMetrics(
        partner_id: string,
        period: string
    ): Promise<PracticeSessionMetrics> {
        const now = new Date();
        let startDate: Date;
        let dateFormat: string;
        let groupBy: any;

        switch (period) {
            case 'daily':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                dateFormat = '%Y-%m-%d';
                groupBy = { $dateToString: { format: dateFormat, date: '$createdAt' } };
                break;
            case 'weekly':
                startDate = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
                groupBy = {
                    $concat: [
                        { $toString: { $year: '$createdAt' } },
                        '-W',
                        { $toString: { $week: '$createdAt' } }
                    ]
                };
                break;
            case 'monthly':
                startDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
                dateFormat = '%Y-%m';
                groupBy = { $dateToString: { format: dateFormat, date: '$createdAt' } };
                break;
            default:
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                dateFormat = '%Y-%m-%d';
                groupBy = { $dateToString: { format: dateFormat, date: '$createdAt' } };
        }

        // Total sessions and average
        const totalStats = await this.activityModel.aggregate([
            {
                $lookup: {
                    from: 'partnercandidates',
                    localField: 'user_id',
                    foreignField: 'candidate_id',
                    as: 'partnerCandidate'
                }
            },
            { $unwind: '$partnerCandidate' },
            {
                $match: {
                    'partnerCandidate.partner_id': new mongoose.Types.ObjectId(partner_id),
                    'partnerCandidate.is_paid_for': true,
                    activity_type: 'practice_session'
                }
            },
            {
                $group: {
                    _id: null,
                    total_sessions: { $sum: 1 },
                    unique_candidates: { $addToSet: '$user_id' }
                }
            }
        ]);

        const stats = totalStats[0] || { total_sessions: 0, unique_candidates: [] };
        const uniqueCandidatesCount = stats.unique_candidates?.length || 0;

        // Trendline
        const trendline = await this.activityModel.aggregate([
            {
                $lookup: {
                    from: 'partnercandidates',
                    localField: 'user_id',
                    foreignField: 'candidate_id',
                    as: 'partnerCandidate'
                }
            },
            { $unwind: '$partnerCandidate' },
            {
                $match: {
                    'partnerCandidate.partner_id': new mongoose.Types.ObjectId(partner_id),
                    'partnerCandidate.is_paid_for': true,
                    activity_type: 'practice_session',
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: groupBy,
                    sessions: { $sum: 1 },
                    unique_candidates: { $addToSet: '$user_id' }
                }
            },
            {
                $project: {
                    date: '$_id',
                    sessions: 1,
                    unique_candidates: { $size: '$unique_candidates' }
                }
            },
            { $sort: { date: 1 } }
        ]);

        // Peak practice hours
        const peakHours = await this.activityModel.aggregate([
            {
                $lookup: {
                    from: 'partnercandidates',
                    localField: 'user_id',
                    foreignField: 'candidate_id',
                    as: 'partnerCandidate'
                }
            },
            { $unwind: '$partnerCandidate' },
            {
                $match: {
                    'partnerCandidate.partner_id': new mongoose.Types.ObjectId(partner_id),
                    'partnerCandidate.is_paid_for': true,
                    activity_type: 'practice_session'
                }
            },
            {
                $group: {
                    _id: { $hour: '$createdAt' },
                    sessions: { $sum: 1 }
                }
            },
            { $sort: { sessions: -1 } },
            { $limit: 10 },
            {
                $project: {
                    hour: '$_id',
                    sessions: 1,
                    label: {
                        $concat: [
                            { $toString: '$_id' },
                            ':00 - ',
                            { $toString: { $add: ['$_id', 1] } },
                            ':00'
                        ]
                    }
                }
            }
        ]);

        return {
            total_sessions_completed: stats.total_sessions,
            average_sessions_per_candidate: uniqueCandidatesCount > 0 
                ? Math.round((stats.total_sessions / uniqueCandidatesCount) * 10) / 10 
                : 0,
            session_completion_trendline: trendline,
            peak_practice_hours: peakHours
        };
    }

    async getAtRiskCandidates(
        partner_id: string,
        page: number,
        limit: number
    ): Promise<AtRiskCandidatesData> {
        const skip = (page - 1) * limit;
        const now = new Date();

        const pipeline: any[] = [
            {
                $match: {
                    partner_id: new mongoose.Types.ObjectId(partner_id),
                    is_paid_for: true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'candidate_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $lookup: {
                    from: 'candidatebatches',
                    localField: 'batch_id',
                    foreignField: '_id',
                    as: 'batch'
                }
            },
            {
                $lookup: {
                    from: 'activities',
                    let: { candidate_id: '$candidate_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$user_id', '$$candidate_id'] },
                                activity_type: 'practice_session'
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                total_sessions: { $sum: 1 },
                                average_score: { $avg: '$score' },
                                last_practice: { $max: '$createdAt' },
                                low_score_count: {
                                    $sum: {
                                        $cond: [{ $lt: ['$score', 50] }, 1, 0]
                                    }
                                }
                            }
                        }
                    ],
                    as: 'activity_stats'
                }
            },
            {
                $addFields: {
                    batch_name: { $arrayElemAt: ['$batch.batch_name', 0] },
                    activity: { $arrayElemAt: ['$activity_stats', 0] }
                }
            },
            {
                $addFields: {
                    total_sessions: { $ifNull: ['$activity.total_sessions', 0] },
                    average_score: { $ifNull: ['$activity.average_score', 0] },
                    last_practice_date: '$activity.last_practice',
                    low_score_count: { $ifNull: ['$activity.low_score_count', 0] }
                }
            },
            {
                $addFields: {
                    days_since_last_practice: {
                        $cond: {
                            if: '$last_practice_date',
                            then: {
                                $dateDiff: {
                                    startDate: '$last_practice_date',
                                    endDate: now,
                                    unit: 'day'
                                }
                            },
                            else: 999
                        }
                    }
                }
            },
            {
                $addFields: {
                    risk_factors: {
                        $filter: {
                            input: [
                                {
                                    $cond: [
                                        { $gte: ['$days_since_last_practice', 14] },
                                        'No practice in 14+ days',
                                        null
                                    ]
                                },
                                {
                                    $cond: [
                                        {
                                            $and: [
                                                { $gte: ['$days_since_last_practice', 7] },
                                                { $lt: ['$days_since_last_practice', 14] }
                                            ]
                                        },
                                        'No practice in 7-14 days',
                                        null
                                    ]
                                },
                                {
                                    $cond: [
                                        { $lt: ['$average_score', 50] },
                                        'Consistently low scores (<50%)',
                                        null
                                    ]
                                },
                                {
                                    $cond: [
                                        { $gte: ['$low_score_count', 3] },
                                        'Multiple low-scoring sessions',
                                        null
                                    ]
                                },
                                {
                                    $cond: [
                                        { $eq: ['$total_sessions', 0] },
                                        'No practice sessions',
                                        null
                                    ]
                                }
                            ],
                            as: 'factor',
                            cond: { $ne: ['$$factor', null] }
                        }
                    }
                }
            },
            {
                $match: {
                    $expr: { $gt: [{ $size: '$risk_factors' }, 0] }
                }
            },
            {
                $project: {
                    candidate_id: '$candidate_id',
                    name: { $concat: ['$user.firstname', ' ', { $ifNull: ['$user.lastname', ''] }] },
                    email: '$user.email',
                    batch_name: { $ifNull: ['$batch_name', 'No batch assigned'] },
                    risk_factors: 1,
                    days_since_last_practice: 1,
                    total_sessions: 1,
                    average_score: { $round: ['$average_score', 2] },
                    incomplete_modules: 0, // TODO: Calculate based on actual module completion data
                    last_practice_date: 1
                }
            },
            { $sort: { days_since_last_practice: -1, average_score: 1 } }
        ];

        // Get total count
        const countPipeline = [...pipeline, { $count: 'total' }];
        const countResult = await this.partnerCandidateModel.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        // Get paginated results
        const candidates = await this.partnerCandidateModel.aggregate([
            ...pipeline,
            { $skip: skip },
            { $limit: limit }
        ]);

        return {
            candidates,
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit)
        };
    }
}
