import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { PracticeService } from './practice.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';

@injectable()
export class PracticeController {
    constructor(
        @inject(PracticeService) private readonly practiceService: PracticeService,
        @inject(Logger) private readonly logger: Logger
    ) {}

    async GetScenario(req: Request, res: Response, next: NextFunction): Promise<void> {
        const userId = req.curr_user?._id as string;
        const examId = req.body.exam_id as string;
        const scenarioId = req.query.scenario_id as string || null;
        try {
            // Logic to start practice, e.g., fetching practice exams or scenarios
            const practiceExams = await this.practiceService.GetScenario(userId, examId, scenarioId);
            ApiResponse.ok(practiceExams, 'Practice started successfully').send(res);
        } catch (error) {
            this.logger.error('Error starting practice', error);
            next(error);
        }
    }

    async GetPracticeById(req: Request, res: Response, next: NextFunction): Promise<void> {
        const practiceId = req.params.practice_id as string;
        try {
            const practiceSession = await this.practiceService.GetPracticeById(practiceId);
            ApiResponse.ok(practiceSession, 'Practice session fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching practice session', error);
            next(error);
        }
    }

    async GetPracticeDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
        const practiceId = req.params.practice_id as string;
        try {
            const practiceDetails = await this.practiceService.GetPracticeDetails(practiceId);
            ApiResponse.ok(practiceDetails, 'Practice details fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching practice details', error);
            next(error);
        }
    }

    async StartPractice(req: Request, res: Response, next: NextFunction): Promise<void> {
        const userId = req.curr_user?._id as string;
        const examId = req.body.exam_id as string;
        const scenarioId = req.body.scenario as string;
        try {
            const practiceSession = await this.practiceService.StartPractice(userId, examId, scenarioId);
            ApiResponse.ok(practiceSession, 'Practice started successfully').send(res);
        } catch (error) {
            this.logger.error('Error starting practice', error);
            next(error);
        }
    }

    async GetPracticeHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
        const userId = req.curr_user?._id as string;
        try {
            const practiceHistory = await this.practiceService.GetPracticeHistory(userId);
            ApiResponse.ok(practiceHistory, 'Practice history fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching practice history', error);
            next(error);
        }
    }

    async GetPracticeUsageAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id?.toString() as string;
            console.log('user_id', user_id);
            // Parse end_date into a Date object
            const end_date = req.query.end_date ? new Date(req.query.end_date as string) : new Date();

            // Clone and add 30 days
            const thirty_days_ago = new Date(end_date);
            thirty_days_ago.setDate(end_date.getDate() - 30);
            const start_date = req.query.start_date ? new Date(req.query.start_date as string) : thirty_days_ago;

            const usage_analytics = await this.practiceService.GetPracticeUsageAnalytics(user_id, start_date, end_date);
            ApiResponse.ok(usage_analytics, 'User usage analytics fetched successfully').send(res);
        } catch (error) {
            next(error);
        }
    }

    async GetPracticeEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
        const practiceId = req.params.practice_id as string;
        try {
            const evaluationResult = await this.practiceService.GetPracticeEvaluation(practiceId);
            ApiResponse.ok(evaluationResult, 'Practice evaluation fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching practice evaluation', error);
            next(error);
        }
    }

    async EvaluateUserPractice(req: Request, res: Response, next: NextFunction): Promise<any> {
        const practiceId = req.params.practice_id as string;
        try {
            const evaluationResult = await this.practiceService.EvaluateUserPractice(practiceId);
            ApiResponse.ok(evaluationResult, 'User practice evaluated successfully').send(res);
        } catch (error) {
            this.logger.error('Error evaluating user practice', error);
            next(error);
        }
    }

    async EvaluatePractice(req: Request, res: Response, next: NextFunction): Promise<void> {
        const practiceId = req.params.practice_id as string;
        const response = req.body;

        console.log('practiceId', practiceId);
        try {
            const evaluationResult = await this.practiceService.EvaluatePractice(practiceId, response);
            ApiResponse.ok(evaluationResult, 'Practice evaluated successfully').send(res);
        } catch (error) {
            this.logger.error('Error evaluating practice', error);
            next(error);
        }
    }
}