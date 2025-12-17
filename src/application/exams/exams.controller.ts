import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { ExamsService } from './exams.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';

@injectable()
export class ExamsController {
    constructor(
        @inject(ExamsService) private readonly examService: ExamsService,
        @inject(Logger) private readonly logger: Logger
    ) {}

    async GetExams(req: Request, res: Response, next: NextFunction): Promise<void> {
        const query = req.query;
        try {
            // Extract pagination parameters
            const page = parseInt(query.page as string) || 1;
            const limit = parseInt(query.limit as string) || 20;
            
            // Remove pagination params from filter
            const { page: _, limit: __, ...filterQuery } = query;
            const filter = filterQuery ? JSON.parse(JSON.stringify(filterQuery)) : {};
            
            const result = await this.examService.GetExams(filter, page, limit);
            ApiResponse.ok(result, 'Exams fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching exams', error);
            next(error);
        }
    }

    async GetMyExams(req: Request, res: Response, next: NextFunction): Promise<void> {
        const userId = req.curr_user?._id as string;
        try {
            const exams = await this.examService.GetMyExams(userId);
            ApiResponse.ok(exams, 'My exams fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching my exams', error);
            next(error);
        }
    }

    async GetExamAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
        const examId = req.params.id as string;
        const userId = req.curr_user?._id as string;
        try {
            const analytics = await this.examService.GetExamAnalytics(userId, examId);
            ApiResponse.ok(analytics, 'Exam analytics fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching exam analytics', error);
            next(error);
        }
    }

    async GetExamById(req: Request, res: Response, next: NextFunction): Promise<void> {
        const examId = req.params.id as string;
        try {
            const exam = await this.examService.GetExamById(examId);
            if (!exam) {
                ApiResponse.notFound('Exam not found').send(res);
            }
            ApiResponse.ok(exam, 'Exam fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching exam by ID', error);
            next(error);
        }
    }

    async JoinExam(req: Request, res: Response, next: NextFunction): Promise<void> {
        const examId = req.params.id as string;
        const userId = req.curr_user?._id as string;
        const { exam_date, daily_practice_frequency } = req.body;
        try {
            const user_details = req.curr_user as any;

            
            // Logic to join the exam, e.g., updating the exam status or adding the user to the exam participants
            const joinExam = await this.examService.JoinExam(examId, userId, { exam_date, daily_practice_frequency }, user_details);
            if (!joinExam) {
                ApiResponse.forbidden('Exam not found or already joined').send(res);
                return;
            }
            ApiResponse.ok(joinExam, 'Joined exam successfully').send(res);
        } catch (error) {
            this.logger.error('Error joining exam', error);
            next(error);
        }
    }

    async GetExamScenarios(req: Request, res: Response, next: NextFunction): Promise<any> {
        const examId = req.params.id as string;
        const with_user_progress = req.query.with_user_progress == "true" ? true : false;
        const userId = req.curr_user?._id as string;
        const account_type = req.account_type;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        
        try {
            const get_exam_scenarios = await this.examService.GetExamScenarios(examId, userId, with_user_progress, account_type, page, limit);
            ApiResponse.ok(get_exam_scenarios, 'Exam scenarios Fetched').send(res);
        } catch (error) {
            this.logger.error('Error getting exam scenarios', error);
            next(error);
        }
    }

    async GetExamScenarioById(req: Request, res: Response, next: NextFunction): Promise<any> {
        const examId = req.params.id as string;
        const scenarioId = req.params.scenario_id as string || null;
        const userId = req.curr_user?._id as string;
        const account_type = req.account_type;
        try {
            const get_exam_scenario = await this.examService.GetExamScenarioById(examId, userId, scenarioId, account_type);
            ApiResponse.ok(get_exam_scenario, 'Exam scenario Fetched').send(res);
        } catch (error) {
            this.logger.error('Error getting exam scenario by ID', error);
            next(error);
        }
    }

    async CreateExam(req: Request, res: Response, next: NextFunction): Promise<void> {
        const examData = req.body;
        try {
            const newExam = await this.examService.CreateExam(examData);
            ApiResponse.created(newExam, 'Exam created successfully').send(res);
        } catch (error) {
            this.logger.error('Error creating exam', error);
            next(error);
        }
    }

    async AddExamScenarios(req: Request, res: Response, next: NextFunction): Promise<void> {
        const examId = req.params.id as string;
        const data = req.body; // Expecting an array of scenarios in the request body

        console.log('Request body data:', data);
        try {
            const addedScenarios = await this.examService.AddExamScenarios(examId, data);
            ApiResponse.created(addedScenarios, 'Exam scenarios added successfully').send(res);
        } catch (error) {
            this.logger.error('Error adding exam scenarios', error);
            next(error);
        }
    }

    async GetExamSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
        const examId = req.params.id as string;
        try {
            const subscriptions = await this.examService.GetExamSubscriptions(examId);
            ApiResponse.ok(subscriptions, 'Exam subscriptions fetched successfully').send(res);
        } catch (error) {
            this.logger.error('Error fetching exam subscriptions', error);
            next(error);
        }
    }

    async CreateExamSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
        const examId = req.params.id as string;
        const subscriptionData = req.body;
        try {
            const newSubscription = await this.examService.CreateExamSubscription(examId, subscriptionData);
            ApiResponse.created(newSubscription, 'Exam subscription created successfully').send(res);
        } catch (error) {
            this.logger.error('Error creating exam subscription', error);
            next(error);
        }
    }

    async UploadReferenceFile(req: Request, res: Response, next: NextFunction): Promise<void> {
        const examId = req.params.id as string;
        const scenarioId = req.params.scenario_id as string;
        const { reference_name } = req.body;
        
        try {
            const uploadedReference = await this.examService.UploadReferenceFile(examId, scenarioId, req, reference_name);
            ApiResponse.created(uploadedReference, 'Reference file uploaded successfully').send(res);
        } catch (error) {
            this.logger.error('Error uploading reference file', error);
            next(error);
        }
    }

    async UpdateExamScenario(req: Request, res: Response, next: NextFunction): Promise<void> {
        const examId = req.params.id as string;
        const scenarioId = req.params.scenario_id as string;
        const updateData = req.body;
        const account_type = req.account_type;
        
        try {
            const updatedScenario = await this.examService.UpdateExamScenario(examId, scenarioId, updateData, account_type);
            ApiResponse.ok(updatedScenario, 'Exam scenario updated successfully').send(res);
        } catch (error) {
            this.logger.error('Error updating exam scenario', error);
            next(error);
        }
    }
}