import { Router } from 'express';
import { Container } from 'inversify';
import { AnalyticsController } from './analytics.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

export function createAnalyticsRouter(container: Container): Router {
    const route = Router();
    const analyticsController = container.get<AnalyticsController>('AnalyticsController');

    /**
     * @route   GET /analytics/overview
     * @desc    Get overview metrics (total candidates, active candidates, practice stats)
     * @access  Private (Partner)
     */
    route.get(
        '/overview',
        authMiddleware,
        analyticsController.GetOverviewMetrics.bind(analyticsController)
    );

    /**
     * @route   GET /analytics/performance
     * @desc    Get candidate performance overview (top performers, least active, engagement)
     * @access  Private (Partner)
     * @query   limit - Number of candidates to return (default: 10)
     */
    route.get(
        '/performance',
        authMiddleware,
        analyticsController.GetCandidatePerformanceOverview.bind(analyticsController)
    );

    /**
     * @route   GET /analytics/practice-metrics
     * @desc    Get practice session metrics and trends
     * @access  Private (Partner)
     * @query   period - daily, weekly, or monthly (default: weekly)
     */
    route.get(
        '/practice-metrics',
        authMiddleware,
        analyticsController.GetPracticeSessionMetrics.bind(analyticsController)
    );

    /**
     * @route   GET /analytics/at-risk
     * @desc    Get at-risk candidates (low engagement, poor performance)
     * @access  Private (Partner)
     * @query   page - Page number (default: 1)
     * @query   limit - Items per page (default: 20)
     */
    route.get(
        '/at-risk',
        authMiddleware,
        analyticsController.GetAtRiskCandidates.bind(analyticsController)
    );

    return route;
}
