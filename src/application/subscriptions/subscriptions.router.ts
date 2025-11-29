import { Router } from 'express';
import { container } from '../../startup/di/container';
import { SubscriptionsController } from './subscriptions.controller';
import { CandidatesController } from '../candidates/candidates.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireOnboardingComplete } from '../../middlewares/onboarding.middleware';

const route = Router();
route.use(authMiddleware);
const subscriptionsController = container.get<SubscriptionsController>(SubscriptionsController);
const candidatesController = container.get<CandidatesController>(CandidatesController);

export default (app: Router) => {
    app.use('/subscriptions', route);
    
    // User subscriptions
    route.get('', subscriptionsController.GetMySubscriptions.bind(subscriptionsController));
    
    // Seat subscriptions (partner only)
    route.get(
        '/seats',
        requireOnboardingComplete,
        candidatesController.GetAllSeatSubscriptions.bind(candidatesController)
    );
    
    route.get(
        '/seats/:seat_id',
        requireOnboardingComplete,
        candidatesController.GetSeatSubscriptionById.bind(candidatesController)
    );
};
