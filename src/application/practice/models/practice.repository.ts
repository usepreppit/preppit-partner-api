import { inject, injectable } from 'inversify';
import mongoose, { Model } from 'mongoose';
import { IPractice } from './practice.model';
import { IExamScenarios } from '../../exams/models/exam_scenarios.model';
import { IPracticeLogs } from './practice_logs.model';


type PracticeStats = {
    totalMinutes: number;
    totalSessions: number;
};

@injectable()
export class PracticeRepository {
    constructor(
        @inject('PracticeModel') private practiceModel: Model<IPractice>,
        @inject('ExamScenariosModel') private examScenariosModel: Model<IExamScenarios>,
        @inject('PracticeLogsModel') private practiceLogsModel: Model<IPracticeLogs>,
    ) {}

    async getUserPracticeSessions(userId: string): Promise<IPractice[]> {
        const practice_sessions =  await this.practiceModel.find({ userId, scenarioId: { $type: 'objectId' }  }).populate("examId").populate({ path: "scenarioId" }).sort({ createdAt: -1 }).exec();
        return practice_sessions.filter(s => s.scenarioId && typeof s.scenarioId === 'object');
    }

    async getPracticeSessionById(practiceId: string): Promise<IPractice | null> {
        return await this.practiceModel.findById(practiceId).exec();
    }

    async getPracticeSessionDetailsById(practiceId: string): Promise<any> {
        const result = await this.practiceLogsModel.findOne({ practice_id: new mongoose.Types.ObjectId(practiceId) }).populate({
            path: 'practice_id',
            select: 'status score timeSpentMinutes timeSpentSeconds completedAt createdAt updatedAt', // select only what you need
            populate: {
                path: 'scenarioId',
                model: 'ExamScenario',
                select: 'question_details available_references reference_check image_check document_url page_number provider createdAt updatedAt'
            }
        })
        .select('practice_log practice_id').lean().exec();

        console.log('result', result);

        if (!result) return null;

        const practiceDoc = result.practice_id as IPractice | mongoose.Types.ObjectId;

        let scenario: IExamScenarios | null = null;
        if (typeof practiceDoc === 'object' && 'scenarioId' in practiceDoc) {
            // TypeScript now knows it's an IPractice
            const scenarioDoc = (practiceDoc as any).scenarioId;
            scenario = scenarioDoc ? (scenarioDoc as IExamScenarios) : null;
        }

        return {
            practice_log: result.practice_log,
            practice_id: typeof practiceDoc === 'object' ? (practiceDoc as IPractice) : null,
            scenario
        };
    }

    
    async getPracticeLogFromPracticeId(practiceId: string): Promise<IPracticeLogs | null> {
        const practice_logs = await this.practiceLogsModel.findOne({ practice_id: new mongoose.Types.ObjectId(practiceId) }).populate('practice_id').exec();
        return practice_logs;
    }

    async updatePracticeSessionById(practiceId: string, updateData: Partial<IPractice>): Promise<IPractice | null> {
        return await this.practiceModel.findByIdAndUpdate(practiceId, updateData, { new: true }).exec();
    }

    async savePracticeLogs(practiceId: string, logs: any): Promise<void> {
        const practice_log = { practice_id: new mongoose.Types.ObjectId(practiceId), practice_log: logs }; 
        await this.practiceLogsModel.findOneAndUpdate({ practice_id: practiceId }, { $set: practice_log }, { upsert: true, new: true }).exec();
    }
    
    async getPracticeScenario(scenarioId: string): Promise<IExamScenarios | null> {
        return await this.examScenariosModel.findById(scenarioId).exec();
    }

    async getPracticeScenarioByFilter(filter: Record<string, any>): Promise<IExamScenarios | null> {
        return await this.examScenariosModel.findOne(filter).exec();
    }

    async createPracticeSession(userId: string, examId: string, scenarioId: string): Promise<IPractice> {
        const practice_data = { userId: new mongoose.Types.ObjectId(userId), examId: new mongoose.Types.ObjectId(examId), scenarioId: new mongoose.Types.ObjectId(scenarioId) };
        return await this.practiceModel.create(practice_data);
    }

    async GetPracticeUsageAnalytics(userId: string, start_date: Date, end_date: Date): Promise<PracticeStats> {
        // Logic to fetch practice usage analytics for the user between start_date and end_date
        console.log('Fetching practice usage analytics for user:', userId, 'from', start_date, 'to', end_date);
        const result = await this.practiceModel.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    createdAt: { $gte: start_date, $lte: end_date }
                }
            },
            {
                $group: {
                    _id: null,
                    totalMinutes: { $sum: "$timeSpentMinutes" },
                    totalSessions: { $sum: 1 }
                }
            }
        ]);

        return result.length > 0 ? result[0] : { totalMinutes: 0, totalSessions: 0 };
    }

    async getExcludedPracticeScenarios(examId: string, excludedScenarioIds: string[]): Promise<IExamScenarios | null> {
        const examObjectId = new mongoose.Types.ObjectId(examId);
        const filter: Record<string, any> = { examId:  examObjectId};

        if (excludedScenarioIds.length > 0) {
            filter['_id'] = { $nin: excludedScenarioIds };
        }

        return await this.examScenariosModel.findOne(filter).exec();
    }

    async evaluatePracticeAnswers(userId: string, examId: string, scenarioId: string, answers: Record<string, any>): Promise<{ score: number, total: number, correctAnswers: Record<string, any> } | null> {
        // Logic to evaluate practice answers
        console.log('Evaluating answers for user:', userId, 'exam:', examId, 'scenario:', scenarioId, 'answers:', answers);
        return null;
    }
}