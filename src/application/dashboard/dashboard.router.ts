import { Router } from 'express';
import { container } from '../../startup/di/container';
import { DashboardController } from './dashboard.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireOnboardingComplete } from '../../middlewares/onboarding.middleware';

const route = Router();
route.use(authMiddleware);
const dashboardController = container.get<DashboardController>(DashboardController);

export default (app: Router) => {
	app.use('/dashboard', route);
	
	// Partner dashboard - requires onboarding to be completed
	route.get(
		'/',
		requireOnboardingComplete,
		dashboardController.GetPartnerDashboard.bind(dashboardController)
	);
	
	// Recent activities
	route.get(
		'/activities',
		requireOnboardingComplete,
		dashboardController.GetRecentActivities.bind(dashboardController)
	);
	
	// Mark next steps as complete
	route.post(
		'/next-steps/candidate-added',
		requireOnboardingComplete,
		dashboardController.MarkCandidateAdded.bind(dashboardController)
	);
	
	route.post(
		'/next-steps/payment-setup',
		requireOnboardingComplete,
		dashboardController.MarkPaymentMethodSetup.bind(dashboardController)
	);
};
