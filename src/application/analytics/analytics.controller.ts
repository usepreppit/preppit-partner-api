import { Request, Response, NextFunction } from 'express';
import { inject, injectable } from 'inversify';
import { AnalyticsService } from './analytics.service';
import { ApiResponse } from '../../helpers/response.helper';
import { Logger } from '../../startup/logger';

@injectable()
export class AnalyticsController {
    constructor(
        @inject('AnalyticsService') private analyticsService: AnalyticsService,
        @inject(Logger) private logger: Logger
    ) {}

    async GetOverviewMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = (req as any).user?.userId as string;
            const metrics = await this.analyticsService.getOverviewMetrics(partner_id);
            
            ApiResponse.ok(
                metrics,
                'Overview metrics retrieved successfully'
            ).send(res);
        } catch (error) {
            this.logger.error('Error in GetOverviewMetrics:', error);
            next(error);
        }
    }

    async GetCandidatePerformanceOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = (req as any).user?.userId as string;
            const { limit = '10' } = req.query;
            
            const performance = await this.analyticsService.getCandidatePerformanceOverview(
                partner_id,
                parseInt(limit as string)
            );
            
            ApiResponse.ok(
                performance,
                'Candidate performance overview retrieved successfully'
            ).send(res);
        } catch (error) {
            this.logger.error('Error in GetCandidatePerformanceOverview:', error);
            next(error);
        }
    }

    async GetPracticeSessionMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = (req as any).user?.userId as string;
            const { period = 'weekly' } = req.query; // daily, weekly, monthly
            
            const metrics = await this.analyticsService.getPracticeSessionMetrics(
                partner_id,
                period as string
            );
            
            ApiResponse.ok(
                metrics,
                'Practice session metrics retrieved successfully'
            ).send(res);
        } catch (error) {
            this.logger.error('Error in GetPracticeSessionMetrics:', error);
            next(error);
        }
    }

    async GetAtRiskCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const partner_id = (req as any).user?.userId as string;
            const { page = '1', limit = '20' } = req.query;
            
            const atRiskData = await this.analyticsService.getAtRiskCandidates(
                partner_id,
                parseInt(page as string),
                parseInt(limit as string)
            );
            
            ApiResponse.ok(
                atRiskData,
                'At-risk candidates retrieved successfully'
            ).send(res);
        } catch (error) {
            this.logger.error('Error in GetAtRiskCandidates:', error);
            next(error);
        }
    }
}
