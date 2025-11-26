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
	) { }

	async GetPartnerDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const partner_id = req.curr_user?._id?.toString() as string;
			const account_type = req.account_type;

			try {
				const dashboardData = await this.dashboardService.GetPartnerDashboard(partner_id, account_type);
				ApiResponse.ok(dashboardData, 'Dashboard data fetched successfully').send(res);
			} catch (error) {
				this.logger.error('Error fetching partner dashboard', error);
				next(error);
			}

		} catch (error) {
			next(error);
		}
	}

	async GetRecentActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const partner_id = req.curr_user?._id?.toString() as string;
			const limit = parseInt(req.query.limit as string) || 10;

			try {
				const activities = await this.dashboardService.GetRecentActivities(partner_id, limit);
				ApiResponse.ok(activities, 'Recent activities fetched successfully').send(res);
			} catch (error) {
				this.logger.error('Error fetching recent activities', error);
				next(error);
			}

		} catch (error) {
			next(error);
		}
	}

	async MarkCandidateAdded(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const partner_id = req.curr_user?._id?.toString() as string;

			try {
				const result = await this.dashboardService.MarkCandidateAdded(partner_id);
				ApiResponse.ok(result, 'Candidate added step marked as complete').send(res);
			} catch (error) {
				this.logger.error('Error marking candidate added', error);
				next(error);
			}

		} catch (error) {
			next(error);
		}
	}

	async MarkPaymentMethodSetup(req: Request, res: Response, next: NextFunction): Promise<void> {
		try {
			const partner_id = req.curr_user?._id?.toString() as string;

			try {
				const result = await this.dashboardService.MarkPaymentMethodSetup(partner_id);
				ApiResponse.ok(result, 'Payment method setup step marked as complete').send(res);
			} catch (error) {
				this.logger.error('Error marking payment setup', error);
				next(error);
			}

		} catch (error) {
			next(error);
		}
	}
}
