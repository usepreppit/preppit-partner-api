import { Router } from 'express';
import { container } from '../../startup/di/container';
import { DashboardController } from './dashboard.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const route = Router();
route.use(authMiddleware);
const dashboardController = container.get<DashboardController>(DashboardController);

export default (app: Router) => {
    app.use('/dashboard', route);
    route.get('/personal', dashboardController.PersonalAnalytics.bind(dashboardController));
    route.get('/recent_activity', dashboardController.RecentActivity.bind(dashboardController));
    route.get('/practice_time_analytics', dashboardController.PracticeTime.bind(dashboardController));
    route.get('/score_progress_analytics', dashboardController.PerformanceProgress.bind(dashboardController));
};
