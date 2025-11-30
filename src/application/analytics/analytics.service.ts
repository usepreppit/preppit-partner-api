import { inject, injectable } from 'inversify';
import { AnalyticsRepository } from './models/analytics.repository';
import { ApiError } from '../../helpers/error.helper';
import { Logger } from '../../startup/logger';

export interface OverviewMetrics {
    total_candidates_onboarded: number;
    active_candidates_this_month: number;
    total_practice_sessions_30_days: number;
    total_practice_minutes_used: number;
    average_practice_per_candidate: number;
}

export interface CandidatePerformanceOverview {
    top_performing_candidates: Array<{
        candidate_id: string;
        name: string;
        email: string;
        total_sessions: number;
        total_minutes: number;
        average_score: number;
        consistency_score: number;
        last_practice_date: Date;
    }>;
    least_active_candidates: Array<{
        candidate_id: string;
        name: string;
        email: string;
        total_sessions: number;
        total_minutes: number;
        last_practice_date: Date | null;
        days_since_last_practice: number;
    }>;
    engagement_rate: {
        total_candidates: number;
        active_last_7_days: number;
        percentage: number;
    };
}

export interface PracticeSessionMetrics {
    total_sessions_completed: number;
    average_sessions_per_candidate: number;
    session_completion_trendline: Array<{
        date: string;
        sessions: number;
        unique_candidates: number;
    }>;
    peak_practice_hours: Array<{
        hour: number;
        sessions: number;
        label: string;
    }>;
}

export interface AtRiskCandidate {
    candidate_id: string;
    name: string;
    email: string;
    batch_name: string;
    risk_factors: string[];
    risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    days_since_last_practice: number;
    total_sessions: number;
    average_score: number;
    recent_avg_score: number;
    incomplete_modules: number;
    total_modules_attempted: number;
    completed_modules: number;
    last_practice_date: Date | null;
    sessions_last_7_days: number;
    sessions_last_14_days: number;
    sessions_last_30_days: number;
    minutes_last_7_days: number;
    total_minutes: number;
    low_score_count: number;
    very_low_score_count: number;
    failed_sessions: number;
}

export interface AtRiskCandidatesData {
    candidates: AtRiskCandidate[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

@injectable()
export class AnalyticsService {
    constructor(
        @inject('AnalyticsRepository') private analyticsRepository: AnalyticsRepository,
        @inject(Logger) private logger: Logger
    ) {}

    async getOverviewMetrics(partner_id: string): Promise<OverviewMetrics> {
        try {
            const metrics = await this.analyticsRepository.getOverviewMetrics(partner_id);
            return metrics;
        } catch (error) {
            this.logger.error('Error getting overview metrics:', error);
            throw new ApiError(500, 'Failed to retrieve overview metrics');
        }
    }

    async getCandidatePerformanceOverview(
        partner_id: string,
        limit: number = 10
    ): Promise<CandidatePerformanceOverview> {
        try {
            const performance = await this.analyticsRepository.getCandidatePerformanceOverview(
                partner_id,
                limit
            );
            return performance;
        } catch (error) {
            this.logger.error('Error getting candidate performance overview:', error);
            throw new ApiError(500, 'Failed to retrieve candidate performance overview');
        }
    }

    async getPracticeSessionMetrics(
        partner_id: string,
        period: string = 'weekly'
    ): Promise<PracticeSessionMetrics> {
        try {
            if (!['daily', 'weekly', 'monthly'].includes(period)) {
                throw new ApiError(400, 'Invalid period. Must be daily, weekly, or monthly');
            }

            const metrics = await this.analyticsRepository.getPracticeSessionMetrics(
                partner_id,
                period
            );
            return metrics;
        } catch (error) {
            this.logger.error('Error getting practice session metrics:', error);
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, 'Failed to retrieve practice session metrics');
        }
    }

    async getAtRiskCandidates(
        partner_id: string,
        page: number = 1,
        limit: number = 20
    ): Promise<AtRiskCandidatesData> {
        try {
            if (page < 1) page = 1;
            if (limit < 1 || limit > 100) limit = 20;

            const atRiskData = await this.analyticsRepository.getAtRiskCandidates(
                partner_id,
                page,
                limit
            );
            return atRiskData;
        } catch (error) {
            this.logger.error('Error getting at-risk candidates:', error);
            throw new ApiError(500, 'Failed to retrieve at-risk candidates');
        }
    }
}
