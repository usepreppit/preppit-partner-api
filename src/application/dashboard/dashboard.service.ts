import { inject, injectable } from 'inversify';
import { Logger } from './../../startup/logger';
import { ApiError, ValidationError } from '../../helpers/error.helper';
import { DashboardRepository } from './models/dashboard.repository';


@injectable()
export class DashboardService {
    constructor(
		@inject(Logger) private readonly logger: Logger,
        @inject(DashboardRepository) private readonly dashboardRepository: DashboardRepository,
    ) {}

	async GetProfileAnalytics(user_id: string) {
		try {
			const [user_streaks, profile_analytics] = await Promise.all([
				this.dashboardRepository.getUserStreaks(user_id),
				this.dashboardRepository.getProfileAnalytics(user_id)
			]);

			return { user_streaks, profile_analytics };
		
		} catch (error) {
			this.logger.error(`Error Getting user profile analytics: ${error}`);
			throw new ApiError(400, 'Error Getting user profile analytics', error);
		}
	}

	async GetRecentActivities(user_id: string) {
		try {
			const recent_activities = await this.dashboardRepository.getRecentActivities(user_id, 5);
			return recent_activities;
		
		} catch (error) {
			this.logger.error(`Error Getting recent activities: ${error}`);
			throw new ApiError(400, 'Error Getting recent activities', error);
		}
	}

	async GetPerformanceProgress(user_id: string) {
		try {
			const performance_progress = await this.dashboardRepository.getPerformanceProgress(user_id);
			if(!performance_progress) {
				throw new ValidationError("Invalid user");
			}

			return performance_progress;
		
		} catch (error) {
			this.logger.error(`Error Getting performance progress: ${error}`);
			throw new ApiError(400, 'Error Getting performance progress', error);
		}
	}

	async GetPracticeTimeAnalytics(user_id: string) {
		try {
			const recent_activities = await this.dashboardRepository.getPracticeTimeAnalytics(user_id, 4);
			if(!recent_activities) {
				throw new ValidationError("Invalid user");
			}

			return recent_activities;
		
		} catch (error) {
			this.logger.error(`Error Getting recent activities: ${error}`);
			throw new ApiError(400, 'Error Getting recent activities', error);
		}
	}
}