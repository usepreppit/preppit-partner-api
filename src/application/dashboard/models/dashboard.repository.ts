import { inject, injectable } from 'inversify';import { inject, injectable } from 'inversify';

import { Model } from 'mongoose';import mongoose, { Model } from 'mongoose';

import mongoose from 'mongoose';import { IPractice, PracticeStatus } from '../../practice/models/practice.model';

import { IPartner } from '../../users/types/partner.types';import { IUserActivityLog } from '../../activity/models/activity_logs.model';

import { IPractice } from '../../practice/models/practice.model';

@injectable()

@injectable()export class DashboardRepository {

export class DashboardRepository {    constructor(

    constructor(        @inject('PracticeModel') private practiceModel: Model<Partial<IPractice>>,

        @inject('PartnerModel') private partnerModel: Model<IPartner>,        @inject('UserActivityLogModel') private activityLogModel: Model<IUserActivityLog>,

        @inject('PracticeModel') private practiceModel: Model<IPractice>,    ) {}

        @inject('UserModel') private userModel: Model<any>,

    ) {}    async getProfileAnalytics(userId: string): Promise<{ totalHours: number; totalCompleted: number; averageScore: number }> {

        const [stats] = await this.practiceModel.aggregate([

    // ==================== KEY METRICS ====================            { $match: { userId: new mongoose.Types.ObjectId(userId) } },

                {

    async getTotalCandidatesForPartner(partner_id: string): Promise<number> {                $facet: {

        // Count users/candidates associated with this partner                    totalTime: [

        // Assuming there's a partner_id field in users collection                        {

        const count = await this.userModel.countDocuments({                             $group: {

            partner_id: new mongoose.Types.ObjectId(partner_id),                                _id: null,

            account_type: { $ne: 'admin' } // Exclude admins                                totalMinutes: { $sum: { $ifNull: ["$timeSpentMinutes", 0] } },

        });                                totalSeconds: { $sum: { $ifNull: ["$timeSpentSeconds", 0] } },

        return count;                            },

    }                        },

                        {

    async getCompletedSessionsThisMonth(partner_id: string): Promise<number> {                            $addFields: {

        const startOfMonth = new Date();                                totalHours: {

        startOfMonth.setDate(1);                                    $divide: [

        startOfMonth.setHours(0, 0, 0, 0);                                        { $add: ["$totalMinutes", { $divide: ["$totalSeconds", 60] }] },

                                        60,

        // Get all candidates for this partner                                    ],

        const candidates = await this.userModel.find({                                 },

            partner_id: new mongoose.Types.ObjectId(partner_id)                             },

        }).select('_id');                        },

                                { $project: { _id: 0, totalHours: 1 } },

        const candidateIds = candidates.map(c => c._id);                    ],

                    scenariosCompleted: [

        const count = await this.practiceModel.countDocuments({                        { $match: { status: PracticeStatus.FINISHED } },

            userId: { $in: candidateIds },                        { $count: "count" },

            status: 'finished',                    ],

            completedAt: { $gte: startOfMonth }                    averageScore: [

        });                        { $match: { score: { $exists: true } } },

                        {

        return count;                            $group: {

    }                                _id: null,

                                avgScore: { $avg: { $toDouble: "$score" } },

    async getCompletedSessionsAllTime(partner_id: string): Promise<number> {                            },

        const candidates = await this.userModel.find({                         },

            partner_id: new mongoose.Types.ObjectId(partner_id)                         { $project: { _id: 0, avgScore: 1 } },

        }).select('_id');                    ],

                        },

        const candidateIds = candidates.map(c => c._id);            },

        ]);

        const count = await this.practiceModel.countDocuments({

            userId: { $in: candidateIds },

            status: 'finished'        return {

        });            totalHours: stats.totalTime?.[0]?.totalHours || 0,

            totalCompleted: stats.scenariosCompleted?.[0]?.count || 0,

        return count;            averageScore: stats.averageScore?.[0]?.avgScore ? Math.round(stats.averageScore[0].avgScore * 10) / 10 : 0,

    }        };

    }

    async getAverageCandidateScore(partner_id: string): Promise<number> {

        const candidates = await this.userModel.find({     async getRecentActivities(userId: string, limit = 5) {

            partner_id: new mongoose.Types.ObjectId(partner_id)         console.log(userId.toString(), limit);

        }).select('_id');        // const db = mongoose.connection;

                // return await db.collection('useractivitylogs').find({ userId: "68a5c147c4e1f9f21667b786" }).sort({ createdAt: -1 }).limit(limit).toArray();

        const candidateIds = candidates.map(c => c._id);

        // const logEntry = {

        const result = await this.practiceModel.aggregate([        //     userId: userId,

            {        //     category: 'general',

                $match: {        //     description: 'fetching recent activities',

                    userId: { $in: candidateIds },        //     action: 'fetch_activities',

                    status: 'finished',        //     details: { limit: limit }

                    score: { $exists: true, $ne: null }        // };

                }

            },        // return await this.activityLogModel.create(logEntry);

            {

                $group: {        return await this.activityLogModel

                    _id: null,            .find({ userId: new mongoose.Types.ObjectId(userId) })

                    avgScore: { $avg: { $toDouble: '$score' } }            .sort({ createdAt: -1 })

                }            .limit(limit)

            }            .lean()

        ]);            .exec();

    }

        return result.length > 0 ? Math.round(result[0].avgScore * 10) / 10 : 0;

    }    async getUserStreaks(userId: string) {

        const practices = await this.practiceModel.find({

    // ==================== FINANCE METRICS ====================                userId: new mongoose.Types.ObjectId(userId),

                status: PracticeStatus.FINISHED,

    async getTotalRevenue(partner_id: string): Promise<number> {            })

        const candidates = await this.userModel.find({             .sort({ completedAt: -1 })

            partner_id: new mongoose.Types.ObjectId(partner_id)             .limit(50) // only need recent practices

        }).select('_id');            .select("completedAt");

        

        const candidateIds = candidates.map(c => c._id);

        if (!practices.length) return 0;

        const result = await this.practiceModel.aggregate([

            {        let streak = 0;

                $match: {

                    userId: { $in: candidateIds },        let expectedDate = new Date() as any;

                    practiceCost: { $exists: true, $ne: null }        expectedDate.setDate(expectedDate.getDate() - 1);

                }        let expectedDateStr = expectedDate.toISOString().split("T")[0];

            },

            {        for (const practice of practices) {

                $group: {            const date = practice.completedAt?.toISOString().split("T")[0];

                    _id: null,            if (!date) continue;

                    totalRevenue: { $sum: { $toDouble: '$practiceCost' } }

                }            if (date === expectedDateStr) {

            }                streak++;

        ]);                // move expected date 1 day back

                expectedDate.setDate(expectedDate.getDate() - 1);

        return result.length > 0 ? result[0].totalRevenue : 0;                expectedDateStr = expectedDate.toISOString().split("T")[0];

    }            } else if (date > expectedDateStr) {

                // if practice is ahead of expectedDate, skip

    async getPracticeSessionsStats(partner_id: string): Promise<{ purchased: number; utilized: number }> {                continue;

        const candidates = await this.userModel.find({             } else {

            partner_id: new mongoose.Types.ObjectId(partner_id)                 break; // streak broken

        }).select('_id');            }

                }

        const candidateIds = candidates.map(c => c._id);

        console.log(streak)

        const totalPurchased = await this.practiceModel.countDocuments({        return streak;

            userId: { $in: candidateIds }    }

        });

    async getPerformanceProgress(userId: string) {

        const totalUtilized = await this.practiceModel.countDocuments({        const today = new Date();

            userId: { $in: candidateIds },        const sevenDaysAgo = new Date();

            status: 'finished'        sevenDaysAgo.setDate(today.getDate() - 6); // include today → 7 total

        });

        const result = await this.practiceModel.aggregate([

        return {            {

            purchased: totalPurchased,                $match: {

            utilized: totalUtilized                    userId: new mongoose.Types.ObjectId(userId),

        };                    status: PracticeStatus.FINISHED,

    }                    completedAt: { $gte: sevenDaysAgo },

                },

    // ==================== PRACTICE METRICS ====================            },

            {

    async getPracticeSessionsTaken(partner_id: string): Promise<{ total: number; this_month: number; this_week: number }> {                $group: {

        const candidates = await this.userModel.find({                     _id: {

            partner_id: new mongoose.Types.ObjectId(partner_id)                         $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },

        }).select('_id');                    },

                            totalTimeMinutes: {

        const candidateIds = candidates.map(c => c._id);                        $sum: {

                            $add: [

        const total = await this.practiceModel.countDocuments({                                { $ifNull: [{ $toDouble: "$timeSpentMinutes" }, 0] },

            userId: { $in: candidateIds },                                { $divide: [

            status: 'finished'                                    { $ifNull: [{ $toDouble: "$timeSpentSeconds" }, 0] }, 60

        });                                ] }

                            ],

        const startOfMonth = new Date();                        },

        startOfMonth.setDate(1);                    },

        startOfMonth.setHours(0, 0, 0, 0);                    avgScore: { $avg: "$evaluation.score" },

                    count: { $sum: 1 },

        const this_month = await this.practiceModel.countDocuments({                },

            userId: { $in: candidateIds },            },

            status: 'finished',            { $sort: { _id: 1 } },

            completedAt: { $gte: startOfMonth }        ]);

        });

        // Ensure all 7 days are represented in the map

        const startOfWeek = new Date();        const map: Record<string, { practice_count: number; total_time: number; average_score: number }> = {};

        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());        for (let i = 0; i < 7; i++) {

        startOfWeek.setHours(0, 0, 0, 0);            const day = new Date(sevenDaysAgo);

            day.setDate(sevenDaysAgo.getDate() + i);

        const this_week = await this.practiceModel.countDocuments({            const key = day.toISOString().split("T")[0] as string;

            userId: { $in: candidateIds },            map[key] = { practice_count: 0, total_time: 0, average_score: 0 };

            status: 'finished',        }

            completedAt: { $gte: startOfWeek }

        });        result.forEach((r) => {

            map[r._id] = {

        return { total, this_month, this_week };                practice_count: r.count,

    }                total_time: r.totalTimeMinutes,

                average_score: r.avgScore || 0,

    async getFeedbackTrends(partner_id: string): Promise<{ positive: number; neutral: number; negative: number; average_rating: number }> {            };

        const candidates = await this.userModel.find({         });

            partner_id: new mongoose.Types.ObjectId(partner_id) 

        }).select('_id');        return map;

            }

        const candidateIds = candidates.map(c => c._id);

    async getPracticeTimeAnalytics(userId: string, weeks = 4) {

        // Assuming feedback is stored in evaluation.feedback_rating or similar        const today = new Date();

        const sessions = await this.practiceModel.find({        const startDate = new Date();

            userId: { $in: candidateIds },        startDate.setDate(today.getDate() - weeks * 7); // go back N weeks

            status: 'finished',

            'evaluation.feedback_rating': { $exists: true }        const result = await this.practiceModel.aggregate([

        }).select('evaluation');            {

                $match: {

        let positive = 0;                    userId: new mongoose.Types.ObjectId(userId),

        let neutral = 0;                    status: PracticeStatus.FINISHED,

        let negative = 0;                    completedAt: { $gte: startDate },

        let totalRating = 0;                },

        let ratingCount = 0;            },

            {

        sessions.forEach(session => {                $group: {

            const rating = session.evaluation?.feedback_rating || 0;                    _id: {

            if (rating >= 4) positive++;                        year: { $isoWeekYear: "$completedAt" },

            else if (rating >= 2.5) neutral++;                        week: { $isoWeek: "$completedAt" },

            else if (rating > 0) negative++;                    },

                                totalTimeMinutes: {

            if (rating > 0) {                        $sum: {

                totalRating += rating;                            $add: [

                ratingCount++;                                { $ifNull: [{ $toDouble: "$timeSpentMinutes" }, 0] },

            }                                { $divide: [

        });                                    { $ifNull: [{ $toDouble: "$timeSpentSeconds" }, 0] }, 60

                                ] }

        return {                            ],

            positive,                        },

            neutral,                    },

            negative,                    count: { $sum: 1 },

            average_rating: ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0                },

        };            },

    }            { $sort: { "_id.year": 1, "_id.week": 1 } },

        ]);

    async getPopularExamTypes(partner_id: string): Promise<Array<{ exam_type: string; session_count: number }>> {

        const candidates = await this.userModel.find({         return result.map((r: any) => ({

            partner_id: new mongoose.Types.ObjectId(partner_id)             year: r._id.year,

        }).select('_id');            week: r._id.week,

                    totalHours: r.totalTimeMinutes / 60,

        const candidateIds = candidates.map(c => c._id);            sessions: r.count,

        }));

        const result = await this.practiceModel.aggregate([    }

            {    

                $match: {}
                    userId: { $in: candidateIds },
                    examId: { $exists: true }
                }
            },
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'exam'
                }
            },
            {
                $unwind: '$exam'
            },
            {
                $group: {
                    _id: '$exam.exam_type',
                    session_count: { $sum: 1 }
                }
            },
            {
                $sort: { session_count: -1 }
            },
            {
                $limit: 5
            }
        ]);

        return result.map(r => ({
            exam_type: r._id || 'Unknown',
            session_count: r.session_count
        }));
    }

    // ==================== NEXT STEPS ====================

    async getPartnerNextStepsStatus(partner_id: string): Promise<IPartner | null> {
        return await this.partnerModel.findById(partner_id).select('has_added_candidates first_candidate_added_at payment_method_setup payment_method_setup_at').lean();
    }

    // ==================== RECENT ACTIVITIES ====================

    async getRecentActivities(partner_id: string, limit: number = 10): Promise<any[]> {
        const candidates = await this.userModel.find({ 
            partner_id: new mongoose.Types.ObjectId(partner_id) 
        }).select('_id firstname lastname');
        
        const candidateIds = candidates.map(c => c._id);
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
