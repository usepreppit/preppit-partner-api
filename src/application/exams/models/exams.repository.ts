import { inject, injectable } from 'inversify';
import mongoose, { Model } from 'mongoose';
import { IExam } from './exams.model';
import { IExamScenarios } from './exam_scenarios.model';
import { IExamEnrollment } from './exam_enrollment.model';
import { IPractice } from 'src/application/practice/models/practice.model';
import { IExamSubscriptions } from './exam_subscriptions.model';

interface IGroupedExamScenarios {
  _id: string; // document_url
  scenarios: IExamScenarios[];
}

// type ExamWithScenarios = IExam & {
//   exam_scenarios: IExamScenarios[];
//   exam_scenario_count: number;
// };

@injectable()
export class ExamsRepository {
    constructor(
        @inject('ExamModel') private examModel: Model<IExam>,
        @inject('ExamScenariosModel') private examScenariosModel: Model<IExamScenarios>,
        @inject('ExamEnrollmentModel') private examEnrollmentModel: Model<IExam>,
        @inject('PracticeModel') private practiceModel: Model<IPractice>,
        @inject('ExamSubscriptionsModel') private examSubscriptionsModel: Model<IExamSubscriptions>,

    ) {}

    async createExam(examData: Partial<IExam>): Promise<IExam> {
        const exam = new this.examModel(examData);
        return await exam.save();
    }

    async getExams(filter: Record<string, any> = {}, page: number = 1, limit: number = 20): Promise<{ 
        exams: any[]; 
        pagination: { 
            current_page: number; 
            per_page: number; 
            total: number; 
            total_pages: number; 
            has_next: boolean; 
            has_previous: boolean; 
        } 
    }> {
        const skip = (page - 1) * limit;
        
        const [exams, total] = await Promise.all([
            this.examModel.aggregate([
                { $match: filter },
                {
                    $lookup: {
                        from: "examenrollments",
                        localField: "_id",
                        foreignField: "examId",
                        as: "enrollments"
                    }
                },
                {
                    $lookup: {
                        from: "examscenarios",
                        localField: "_id",
                        foreignField: "examId",
                        as: "scenarios"
                    }
                },
                {
                    $addFields: {
                        studentsJoined: { $size: "$enrollments" },
                        scenarioCount: { $size: "$scenarios" }
                    }
                },
                {
                    $project: {
                        enrollments: 0,
                        scenarios: 0
                    }
                },
                { $skip: skip },
                { $limit: limit }
            ]).exec(),
            this.examModel.countDocuments(filter)
        ]);

        const total_pages = Math.ceil(total / limit);

        return {
            exams,
            pagination: {
                current_page: page,
                per_page: limit,
                total,
                total_pages,
                has_next: page < total_pages,
                has_previous: page > 1
            }
        };
    }

    async getMyExams(userId: string): Promise<IExam[]> {
        return await this.examEnrollmentModel.find({ userId: new mongoose.Types.ObjectId(userId) }).populate("userId")
            .populate({
                path: "exams",
                populate: { path: "exam_scenario_count" },
            })
            .lean().exec();
    }

    async getUserExamEnrollment(userId: string, examId: string): Promise<any> {
        return await this.examEnrollmentModel.findOne({ userId: new mongoose.Types.ObjectId(userId), examId: new mongoose.Types.ObjectId(examId) }).exec();
    }


    async getExamAnalytics(userId: string, examId: string): Promise<any> {
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const examObjectId = new mongoose.Types.ObjectId(examId);

        const result = await this.practiceModel.aggregate([
            { $match: { examId: examObjectId, status: "finished" } },

            {
                $facet: {
                    userStats: [
                        { $match: { userId: userObjectId } },
                        {
                            $group: {
                                _id: "$userId",
                                avgScore: { $avg: "$score" },
                                uniqueScenarios: { $addToSet: "$scenarioId" },
                            },
                        },
                        {
                            $addFields: {
                                completedScenarios: { $size: "$uniqueScenarios" },
                            },
                        },
                    ],

                        // ✅ Rankings (only users with at least 1 completed scenario)
                    rankings: [
                        {
                            $group: {
                                _id: "$userId",
                                avgScore: { $avg: "$score" },
                                uniqueScenarios: { $addToSet: "$scenarioId" },
                            },
                        },
                        {
                            $addFields: {
                                completedScenarios: { $size: "$uniqueScenarios" },
                            },
                        },
                        { $match: { completedScenarios: { $gt: 0 } } }, // Only consider users who have completed at least one scenario
                        { $sort: { avgScore: -1 } },
                        {
                            $group: {
                                _id: null,
                                users: { $push: "$_id" },
                            },
                        },
                    ],

                    totalScenarios: [
                        {
                            $lookup: {
                                from: "examscenarios", // collection name for ExamScenariosModel
                                let: { examId: examObjectId },
                                pipeline: [
                                    { $match: { $expr: { $eq: ["$examId", "$$examId"] } } },
                                    { $count: "count" },
                                ],
                                as: "scenarios",
                            },
                        },
                        { $unwind: { path: "$scenarios", preserveNullAndEmptyArrays: true } },
                        { $project: { total: "$scenarios.count" } },
                    ],
                },
            },
            {
                $project: {
                    userStats: { $arrayElemAt: ["$userStats", 0] },
                    rankings: { $arrayElemAt: ["$rankings.users", 0] },
                    totalScenarios: { $arrayElemAt: ["$totalScenarios.total", 0] },
                },
            },
            {
                $addFields: {
                    rank: {
                        $cond: [
                            { $isArray: "$rankings" },
                            { $add: [{ $indexOfArray: ["$rankings", userObjectId] }, 1] },
                            0,
                        ],
                    },
                    totalUsers: { $size: { $ifNull: ["$rankings", []] } },
                    completedScenarios: "$userStats.completedScenarios",
                    avgScore: "$userStats.avgScore",
                    progress: {
                        $cond: [
                            { $gt: ["$totalScenarios", 0] },
                            {
                                $multiply: [
                                    {
                                        $divide: ["$userStats.completedScenarios", "$totalScenarios"],
                                    },
                                    100,
                                ],
                            },
                            0,
                        ],
                    },
                },
            },
            {
                $project: {
                    userStats: 0,
                    rankings: 0,
                },
            },
        ]);

        return result[0] || {
            avgScore: 0,
            rank: 0,
            totalUsers: 0,
            completedScenarios: 0,
            progress: 0,
        };
    }

    async getExamById(id: string): Promise<IExam | null> {
        return await this.examModel.findById(id).exec();
    }

    async getExamScenarios(examId: string): Promise<IExamScenarios[] | null> {
        const examObjectId = new mongoose.Types.ObjectId(examId);

        const scenarios = await this.examScenariosModel.aggregate([
            {
                $match: { examId: examObjectId }
            },
            {
                $lookup: {
                    from: "practices", // collection name for PracticeModel
                    let: { scenarioId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$scenarioId", "$$scenarioId"]
                                }
                            }
                        }
                    ],
                    as: "userPractice"
                }
            },
            {
                $addFields: {
                    totalPersons: { $size: { $setUnion: ["$userPractice.userId", []] } },
                    avgScore: {
                        $cond: [
                            { $gt: [{ $size: "$userPractice" }, 0] },
                            { $avg: "$userPractice.score" },
                            0
                        ]
                    }
                }
            },
            {
                $project: {
                    question_details: 1,
                    document_url: 1,
                    page_number: 1,
                    examId: 1,
                    totalPersons: 1,
                    avgScore: 1
                }
            }
        ]);
        return scenarios;
    }

    async getExamScenariosWithProgress(examId: string, userId: string): Promise<IExamScenarios[] | null> {
        const examObjectId = new mongoose.Types.ObjectId(examId);
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const scenarios = await this.examScenariosModel.aggregate([
            {
                $match: { examId: examObjectId }
            },
            {
                $lookup: {
                    from: "practices",              // collection name for PracticeModel
                    let: { scenarioId: "$_id" },
                    pipeline: [
                        { 
                            $match: { 
                                $expr: { 
                                    $and: [
                                        { $eq: ["$scenarioId", "$$scenarioId"] },
                                        { $eq: ["$userId", userObjectId] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "userPractice"
                }
            },
            {
                $addFields: {
                    attempted: { $gt: [ { $size: "$userPractice" }, 0 ] }, // true if user has practiced
                    lastAttempt: { $arrayElemAt: ["$userPractice", -1] }, // optional: show last attempt doc
                    totalPersons: { $size: { $setUnion: ["$userPractice.userId", []] } },
                    avgScore: {
                        $cond: [
                            { $gt: [{ $size: "$userPractice" }, 0] },
                            { $avg: "$userPractice.score" },
                            0
                        ]
                    }
                }
            },
            {
                $project: {
                    question_details: 1,
                    document_url: 1,
                    page_number: 1,
                    attempted: 1,
                    lastAttempt: 1,
                    examId: 1,
                    totalPersons: 1,
                    avgScore: 1
                }
            },
        ]);

        return scenarios;
    }

    async getExamScenarioById(examId: string, scenarioId: string | null): Promise<IExamScenarios | null> {
        const filter: Record<string, any> = { examId: new mongoose.Types.ObjectId(examId) };
        if (scenarioId) {
            filter['_id'] = new mongoose.Types.ObjectId(scenarioId);
        } else {
            // If no scenarioId is provided, return a random scenario from the exam
            // filter['_id'] = { $exists: true }; // This is redundant but shows intent
            const count = await this.examScenariosModel.countDocuments(filter);
            const random = Math.floor(Math.random() * count);
            return await this.examScenariosModel.findOne(filter).skip(random).exec();
        }
        return await this.examScenariosModel.findOne(filter).exec();
    }

    async getExamScenarioByFilter(filter: Record<string, any> = {}): Promise<IExamScenarios | null> {
        return await this.examScenariosModel.findOne(filter).exec();
    }

    async getExamSubscriptions(examId: string): Promise<IExamSubscriptions[] | null> {
        return await this.examSubscriptionsModel.find({ examId: new mongoose.Types.ObjectId(examId) }).exec();
    }

    async createExamSubscription(subscriptionData: Partial<IExamSubscriptions>): Promise<IExamSubscriptions> {
        const subscription = new this.examSubscriptionsModel(subscriptionData);
        return await subscription.save();
    }

    async getMedicationsOnTableExams(): Promise<IExamScenarios | null> {
        return await this.examScenariosModel.findOne({ "question_details.medications_on_table": { $ne: null }, $or: [ {"question_details.medications_page_data": { $exists: false }}, { "question_details.medications_page_data": false   }] }).exec();
    }

    async updateExamScenario(scenarioId: string, updateData: any): Promise<IExamScenarios | null> {
        const scenario_id_object = new mongoose.Types.ObjectId(scenarioId);
        return await this.examScenariosModel.findByIdAndUpdate(scenario_id_object, updateData, { new: true }).exec();
    }

    async getAllMedicationsOnTableExams(): Promise<IGroupedExamScenarios[] | null> {
        return await this.examScenariosModel.aggregate([
            {
                $match: {
                    "question_details.medications_on_table": { $ne: null },
                    "question_details.medications_page_data": { $exists: false }
                }
            },
            {
                $group: {
                    _id: "$document_url", 
                    scenarios: { $push: "$$ROOT" } 
                }
            },
            { $limit: 1 } 
        ]).exec();
        // return await this.examScenariosModel.find({ "question_details.medications_on_table": { $ne: null }, "question_details.medications_page_data": { $exists: false }  }).exec();
    }

    async EnrollUserInExam(enrollmentData: Partial<IExamEnrollment>): Promise<IExam> {
        const enrollment = new this.examEnrollmentModel(enrollmentData);
        return await enrollment.save();
    }

    async BulkSaveExamScenarios(scenarios: Partial<IExamScenarios>[]): Promise<Partial<IExamScenarios>[]> {
        //bulk write exam scenarios
        return await this.examScenariosModel.insertMany(scenarios);
    }
}