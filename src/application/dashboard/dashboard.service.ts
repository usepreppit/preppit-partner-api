import { inject, injectable } from 'inversify';
import { Logger } from './../../startup/logger';
import { ApiError, ValidationError } from '../../helpers/error.helper';
import { DashboardRepository } from './models/dashboard.repository';
import {
	PartnerDashboardData,
	KeyMetrics,
	FinanceMetrics,
	PracticeMetrics,
	NextSteps,
	NextStepItem
} from './types/dashboard.types';

@injectable()
export class DashboardService {
	constructor(
		@inject(Logger) private readonly logger: Logger,
		@inject(DashboardRepository) private readonly dashboardRepository: DashboardRepository,
	) { }

	async GetPartnerDashboard(partner_id: string, account_type?: 'admin' | 'partner'): Promise<PartnerDashboardData> {
		try {
			// Only partners can access partner dashboard
			if (account_type !== 'partner') {
				throw new ValidationError("Dashboard is only available for partner accounts");
			}

			this.logger.info(`Fetching dashboard data for partner: ${partner_id}`);

			// Fetch all dashboard data in parallel
			const [
				keyMetrics,
				financeMetrics,
				practiceMetrics,
				nextSteps
			] = await Promise.all([
				this.getKeyMetrics(partner_id),
				this.getFinanceMetrics(partner_id),
				this.getPracticeMetrics(partner_id),
				this.getNextSteps(partner_id)
			]);

			return {
				key_metrics: keyMetrics,
				finance_metrics: financeMetrics,
				practice_metrics: practiceMetrics,
				next_steps: nextSteps
			};

		} catch (error) {
			this.logger.error(`Error fetching partner dashboard: ${error}`);
			throw new ApiError(400, 'Error fetching partner dashboard', error);
		}
	}

	private async getKeyMetrics(partner_id: string): Promise<KeyMetrics> {
		const [
			total_candidates,
			completed_this_month,
			completed_all_time,
			avg_score,
			paymentStats,
			inviteStats
		] = await Promise.all([
			this.dashboardRepository.getTotalCandidatesForPartner(partner_id),
			this.dashboardRepository.getCompletedSessionsThisMonth(partner_id),
			this.dashboardRepository.getCompletedSessionsAllTime(partner_id),
			this.dashboardRepository.getAverageCandidateScore(partner_id),
			this.dashboardRepository.getCandidatePaymentStats(partner_id),
			this.dashboardRepository.getCandidateInviteStats(partner_id)
		]);

		// Determine performance level based on average score
		let performance = "Needs Improvement";
		if (avg_score >= 90) performance = "Excellent";
		else if (avg_score >= 75) performance = "Good";
		else if (avg_score >= 60) performance = "Fair";

		return {
			total_candidates_enrolled: total_candidates,
			completed_sessions_this_month: completed_this_month,
			completed_sessions_all_time: completed_all_time,
			average_candidate_score: avg_score,
			average_candidate_performance: performance,
			candidates_paid: paymentStats.paid,
			candidates_pending_payment: paymentStats.pending,
			invites_accepted: inviteStats.accepted,
			invites_pending: inviteStats.pending
		};
	}

	private async getFinanceMetrics(partner_id: string): Promise<FinanceMetrics> {
		const [
			total_revenue,
			sessionsStats
		] = await Promise.all([
			this.dashboardRepository.getTotalRevenue(partner_id),
			this.dashboardRepository.getPracticeSessionsStats(partner_id)
		]);

		const utilizationRate = sessionsStats.purchased > 0
			? Math.round((sessionsStats.utilized / sessionsStats.purchased) * 100)
			: 0;

		// TODO: Get partner's preferred currency from partner model
		const currency = "USD"; // Default for now

		return {
			revenue_and_payouts: {
				total_revenue_generated: total_revenue,
				total_payouts: 0, // TODO: Implement payout tracking
				pending_payout: total_revenue, // For now, all revenue is pending
				currency
			},
			practice_sessions: {
				purchased: sessionsStats.purchased,
				utilized: sessionsStats.utilized,
				utilization_rate: utilizationRate
			}
		};
	}

	private async getPracticeMetrics(partner_id: string): Promise<PracticeMetrics> {
		const [
			sessionsTaken,
			feedbackTrends,
			popularExams
		] = await Promise.all([
			this.dashboardRepository.getPracticeSessionsTaken(partner_id),
			this.dashboardRepository.getFeedbackTrends(partner_id),
			this.dashboardRepository.getPopularExamTypes(partner_id)
		]);

		return {
			practice_sessions_taken: sessionsTaken,
			feedback_trends: feedbackTrends,
			popular_exam_types: popularExams
		};
	}

	private async getNextSteps(partner_id: string): Promise<NextSteps> {
		const partnerStatus = await this.dashboardRepository.getPartnerNextStepsStatus(partner_id);

		if (!partnerStatus) {
			throw new ValidationError("Partner not found");
		}

		const steps: NextStepItem[] = [
			{
				id: 'add_candidates',
				title: 'Add Candidates / Users',
				description: 'Start adding candidates to your platform to begin managing their exam preparation',
				status: partnerStatus.has_added_candidates ? 'completed' : 'pending',
				action_url: '/candidates',
				completed_at: partnerStatus.first_candidate_added_at
			},
			{
				id: 'setup_payment',
				title: 'Set Up Payment Method',
				description: 'Configure your payment method to receive payouts from the platform',
				status: partnerStatus.payment_method_setup ? 'completed' : 'pending',
				action_url: '/settings/payment',
				completed_at: partnerStatus.payment_method_setup_at
			}
		];

		// Filter out completed steps if both are completed
		const allCompleted = steps.every(step => step.status === 'completed');
		const visibleSteps = allCompleted ? [] : steps;

		const completedCount = steps.filter(step => step.status === 'completed').length;
		const completion_percentage = Math.round((completedCount / steps.length) * 100);

		return {
			items: visibleSteps,
			completion_percentage
		};
	}

	async GetRecentActivities(partner_id: string, limit: number = 10) {
		try {
			this.logger.info(`Fetching recent activities for partner: ${partner_id}`);

			const activities = await this.dashboardRepository.getRecentActivities(partner_id, limit);

			return activities;

		} catch (error) {
			this.logger.error(`Error fetching recent activities: ${error}`);
			throw new ApiError(400, 'Error fetching recent activities', error);
		}
	}

	// Methods to mark next steps as complete
	async MarkCandidateAdded(partner_id: string) {
		try {
			// This would be called when a partner adds their first candidate
			// TODO: Implement in candidate/user creation flow
			this.logger.info(`Marking candidate added for partner: ${partner_id}`);

			// Update partner record
			// await this.partnerRepository.updateById(partner_id, {
			//     has_added_candidates: true,
			//     first_candidate_added_at: new Date()
			// });

			return { message: 'Candidate added step marked as complete' };

		} catch (error) {
			this.logger.error(`Error marking candidate added: ${error}`);
			throw new ApiError(400, 'Error marking candidate added', error);
		}
	}

	async MarkPaymentMethodSetup(partner_id: string) {
		try {
			// This would be called when a partner sets up their payment method
			this.logger.info(`Marking payment method setup for partner: ${partner_id}`);

			// Update partner record
			// await this.partnerRepository.updateById(partner_id, {
			//     payment_method_setup: true,
			//     payment_method_setup_at: new Date()
			// });

			return { message: 'Payment method setup step marked as complete' };

		} catch (error) {
			this.logger.error(`Error marking payment setup: ${error}`);
			throw new ApiError(400, 'Error marking payment setup', error);
		}
	}
}
