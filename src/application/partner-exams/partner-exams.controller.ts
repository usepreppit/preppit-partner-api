import { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'inversify';
import { PartnerExamsService } from './partner-exams.service';
import { ApiResponse } from '../../helpers/response.helper';
import { Logger } from '../../startup/logger';
import { ApiError } from '../../helpers/error.helper';

@injectable()
export class PartnerExamsController {
    constructor(
        @inject('PartnerExamsService') private partnerExamsService: PartnerExamsService,
        @inject(Logger) private logger: Logger
    ) {}

    async GetPartnerExams(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = (req as any).user?.userId as string;
            if (!partner_id) {
                throw new ApiError(401, 'Unauthorized: Partner ID not found');
            }
            
            const { page = '1', limit = '20', search = '' } = req.query;
            
            const exams = await this.partnerExamsService.getPartnerExams(
                partner_id,
                parseInt(page as string),
                parseInt(limit as string),
                search as string
            );
            
            ApiResponse.ok(
                exams,
                'Partner exams retrieved successfully'
            ).send(res);
        } catch (error) {
            this.logger.error('Error in GetPartnerExams:', error);
            next(error);
        }
    }

    async GetExamDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = (req as any).user?.userId as string;
            if (!partner_id) {
                throw new ApiError(401, 'Unauthorized: Partner ID not found');
            }
            
            const { exam_id } = req.params;
            if (!exam_id) {
                throw new ApiError(400, 'Exam ID is required');
            }
            
            const examDetails = await this.partnerExamsService.getExamDetails(
                partner_id,
                exam_id
            );
            
            ApiResponse.ok(
                examDetails,
                'Exam details retrieved successfully'
            ).send(res);
        } catch (error) {
            this.logger.error('Error in GetExamDetails:', error);
            next(error);
        }
    }

    async GetExamQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = (req as any).user?.userId as string;
            if (!partner_id) {
                throw new ApiError(401, 'Unauthorized: Partner ID not found');
            }
            
            const { exam_id } = req.params;
            if (!exam_id) {
                throw new ApiError(400, 'Exam ID is required');
            }
            const { page = '1', limit = '50', scenario_id = '' } = req.query;
            
            const questions = await this.partnerExamsService.getExamQuestions(
                partner_id,
                exam_id,
                parseInt(page as string),
                parseInt(limit as string),
                scenario_id as string
            );
            
            ApiResponse.ok(
                questions,
                'Exam questions retrieved successfully'
            ).send(res);
        } catch (error) {
            this.logger.error('Error in GetExamQuestions:', error);
            next(error);
        }
    }

    async GetExamSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = (req as any).user?.userId as string;
            if (!partner_id) {
                throw new ApiError(401, 'Unauthorized: Partner ID not found');
            }
            
            const { exam_id } = req.params;
            if (!exam_id) {
                throw new ApiError(400, 'Exam ID is required');
            }
            const { 
                page = '1', 
                limit = '20', 
                candidate_id = '',
                status = '',
                start_date = '',
                end_date = ''
            } = req.query;
            
            const sessions = await this.partnerExamsService.getExamSessions(
                partner_id,
                exam_id,
                parseInt(page as string),
                parseInt(limit as string),
                {
                    candidate_id: candidate_id as string,
                    status: status as string,
                    start_date: start_date as string,
                    end_date: end_date as string
                }
            );
            
            ApiResponse.ok(
                sessions,
                'Exam sessions retrieved successfully'
            ).send(res);
        } catch (error) {
            this.logger.error('Error in GetExamSessions:', error);
            next(error);
        }
    }

    async GetSessionDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = (req as any).user?.userId as string;
            if (!partner_id) {
                throw new ApiError(401, 'Unauthorized: Partner ID not found');
            }
            
            const { exam_id, session_id } = req.params;
            if (!exam_id || !session_id) {
                throw new ApiError(400, 'Exam ID and Session ID are required');
            }
            
            const sessionDetails = await this.partnerExamsService.getSessionDetails(
                partner_id,
                exam_id,
                session_id
            );
            
            ApiResponse.ok(
                sessionDetails,
                'Session details retrieved successfully'
            ).send(res);
        } catch (error) {
            this.logger.error('Error in GetSessionDetails:', error);
            next(error);
        }
    }

    async GetExamScenarios(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = (req as any).user?.userId as string;
            if (!partner_id) {
                throw new ApiError(401, 'Unauthorized: Partner ID not found');
            }
            
            const { exam_id } = req.params;
            if (!exam_id) {
                throw new ApiError(400, 'Exam ID is required');
            }
            
            const scenarios = await this.partnerExamsService.getExamScenarios(
                partner_id,
                exam_id
            );
            
            ApiResponse.ok(
                scenarios,
                'Exam scenarios retrieved successfully'
            ).send(res);
        } catch (error) {
            this.logger.error('Error in GetExamScenarios:', error);
            next(error);
        }
    }
}
