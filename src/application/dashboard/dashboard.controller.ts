import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';
import { Logger } from '../../startup/logger';
import { ApiResponse } from '../../helpers/response.helper';

@injectable()
export class DashboardController {
    constructor(
        @inject(DashboardService) private readonly dashboardService: DashboardService,
        @inject(Logger) private readonly logger: Logger
    ) {}
 
    async PersonalAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id as string;
            try {
                const profile_analytics = await this.dashboardService.GetProfileAnalytics(user_id);

                ApiResponse.ok(profile_analytics, 'Dashboard profile analytics').send(res);
            } catch (error) {
                this.logger.error('Error getting user dashboard analytics', error);
                next(error);
            };

        } catch (error) {
            next(error);
        }
    }

    async RecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id as string;
            const recent_activities = await this.dashboardService.GetRecentActivities(user_id);
            ApiResponse.ok(recent_activities, 'Dashboard recent activities').send(res);
        } catch (error) {
            next(error);
        }
    }

    
    async PerformanceProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id as string;
            try {
                const performance_progress = await this.dashboardService.GetPerformanceProgress(user_id);

                ApiResponse.ok(performance_progress, 'Dashboard performance progress').send(res);
            } catch (error) {
                this.logger.error('Error fetching performance progress', error);
                next(error);
            };
            
        } catch (error) {
            next(error);
        }
    }

    async PracticeTime(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user_id = req.curr_user?._id as string;
            try {
                const recent_activities = await this.dashboardService.GetPracticeTimeAnalytics(user_id);

                ApiResponse.ok(recent_activities, 'Dashboard recent activities').send(res);
            } catch (error) {
                this.logger.error('Error fetching recent activities', error);
                next(error);
            };
            
        } catch (error) {
            next(error);
        }
    }
}