import { Router } from 'express';
import { container } from '../../startup/di/container';
import { SubscriptionsController } from './subscriptions.controller';
import { CandidatesController } from '../candidates/candidates.controller';
import { PaymentsController } from '../payments/payments.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireOnboardingComplete } from '../../middlewares/onboarding.middleware';

const route = Router();
route.use(authMiddleware);
const subscriptionsController = container.get<SubscriptionsController>(SubscriptionsController);
const candidatesController = container.get<CandidatesController>(CandidatesController);
const paymentsController = container.get<PaymentsController>(PaymentsController);

export default (app: Router) => {
    app.use('/subscriptions', route);
    
    // User subscriptions
    route.get('', subscriptionsController.GetMySubscriptions.bind(subscriptionsController));
    
    // Seat pricing calculator (must come before :seat_id route)
    route.get(
        '/seats/pricing',
        requireOnboardingComplete,
        paymentsController.GetSeatPricing.bind(paymentsController)
    );
    
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
