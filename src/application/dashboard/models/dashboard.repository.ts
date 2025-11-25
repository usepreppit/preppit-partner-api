import { inject, injectable } from 'inversify';
import mongoose, { Model } from 'mongoose';
import { IPractice, PracticeStatus } from '../../practice/models/practice.model';
import { IUserActivityLog } from '../../activity/models/activity_logs.model';

@injectable()
export class DashboardRepository {
    constructor(
        @inject('PracticeModel') private practiceModel: Model<Partial<IPractice>>,
        @inject('UserActivityLogModel') private activityLogModel: Model<IUserActivityLog>,
    ) {}

    async getProfileAnalytics(userId: string): Promise<{ totalHours: number; totalCompleted: number; averageScore: number }> {
        const [stats] = await this.practiceModel.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            {
                $facet: {
                    totalTime: [
                        {
                            $group: {
                                _id: null,
                                totalMinutes: { $sum: { $ifNull: ["$timeSpentMinutes", 0] } },
                                totalSeconds: { $sum: { $ifNull: ["$timeSpentSeconds", 0] } },
                            },
                        },
                        {
                            $addFields: {
                                totalHours: {
                                    $divide: [
                                        { $add: ["$totalMinutes", { $divide: ["$totalSeconds", 60] }] },
                                        60,
                                    ],
                                },
                            },
                        },
                        { $project: { _id: 0, totalHours: 1 } },
                    ],
                    scenariosCompleted: [
                        { $match: { status: PracticeStatus.FINISHED } },
                        { $count: "count" },
                    ],
                    averageScore: [
                        { $match: { score: { $exists: true } } },
                        {
                            $group: {
                                _id: null,
                                avgScore: { $avg: { $toDouble: "$score" } },
                            },
                        },
                        { $project: { _id: 0, avgScore: 1 } },
                    ],
                },
            },
        ]);


        return {
            totalHours: stats.totalTime?.[0]?.totalHours || 0,
            totalCompleted: stats.scenariosCompleted?.[0]?.count || 0,
            averageScore: stats.averageScore?.[0]?.avgScore ? Math.round(stats.averageScore[0].avgScore * 10) / 10 : 0,
        };
    }

    async getRecentActivities(userId: string, limit = 5) {
        console.log(userId.toString(), limit);
        // const db = mongoose.connection;
        // return await db.collection('useractivitylogs').find({ userId: "68a5c147c4e1f9f21667b786" }).sort({ createdAt: -1 }).limit(limit).toArray();

        // const logEntry = {
        //     userId: userId,
        //     category: 'general',
        //     description: 'fetching recent activities',
        //     action: 'fetch_activities',
        //     details: { limit: limit }
        // };

        // return await this.activityLogModel.create(logEntry);

        return await this.activityLogModel
            .find({ userId: new mongoose.Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
            .exec();
    }

    async getUserStreaks(userId: string) {
        const practices = await this.practiceModel.find({
                userId: new mongoose.Types.ObjectId(userId),
                status: PracticeStatus.FINISHED,
            })
            .sort({ completedAt: -1 })
            .limit(50) // only need recent practices
            .select("completedAt");


        if (!practices.length) return 0;

        let streak = 0;

        let expectedDate = new Date() as any;
        expectedDate.setDate(expectedDate.getDate() - 1);
        let expectedDateStr = expectedDate.toISOString().split("T")[0];

        for (const practice of practices) {
            const date = practice.completedAt?.toISOString().split("T")[0];
            if (!date) continue;

            if (date === expectedDateStr) {
                streak++;
                // move expected date 1 day back
                expectedDate.setDate(expectedDate.getDate() - 1);
                expectedDateStr = expectedDate.toISOString().split("T")[0];
            } else if (date > expectedDateStr) {
                // if practice is ahead of expectedDate, skip
                continue;
            } else {
                break; // streak broken
            }
        }

        console.log(streak)
        return streak;
    }

    async getPerformanceProgress(userId: string) {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 6); // include today → 7 total

        const result = await this.practiceModel.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    status: PracticeStatus.FINISHED,
                    completedAt: { $gte: sevenDaysAgo },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$completedAt" },
                    },
                    totalTimeMinutes: {
                        $sum: {
                            $add: [
                                { $ifNull: [{ $toDouble: "$timeSpentMinutes" }, 0] },
                                { $divide: [
                                    { $ifNull: [{ $toDouble: "$timeSpentSeconds" }, 0] }, 60
                                ] }
                            ],
                        },
                    },
                    avgScore: { $avg: "$evaluation.score" },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Ensure all 7 days are represented in the map
        const map: Record<string, { practice_count: number; total_time: number; average_score: number }> = {};
        for (let i = 0; i < 7; i++) {
            const day = new Date(sevenDaysAgo);
            day.setDate(sevenDaysAgo.getDate() + i);
            const key = day.toISOString().split("T")[0] as string;
            map[key] = { practice_count: 0, total_time: 0, average_score: 0 };
        }

        result.forEach((r) => {
            map[r._id] = {
                practice_count: r.count,
                total_time: r.totalTimeMinutes,
                average_score: r.avgScore || 0,
            };
        });

        return map;
    }

    async getPracticeTimeAnalytics(userId: string, weeks = 4) {
        const today = new Date();
        const startDate = new Date();
        startDate.setDate(today.getDate() - weeks * 7); // go back N weeks

        const result = await this.practiceModel.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    status: PracticeStatus.FINISHED,
                    completedAt: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: {
                        year: { $isoWeekYear: "$completedAt" },
                        week: { $isoWeek: "$completedAt" },
                    },
                    totalTimeMinutes: {
                        $sum: {
                            $add: [
                                { $ifNull: [{ $toDouble: "$timeSpentMinutes" }, 0] },
                                { $divide: [
                                    { $ifNull: [{ $toDouble: "$timeSpentSeconds" }, 0] }, 60
                                ] }
                            ],
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.year": 1, "_id.week": 1 } },
        ]);

        return result.map((r: any) => ({
            year: r._id.year,
            week: r._id.week,
            totalHours: r.totalTimeMinutes / 60,
            sessions: r.count,
        }));
    }
    
}