import { Router } from 'express';
import { container } from '../../startup/di/container';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireOnboardingComplete } from '../../middlewares/onboarding.middleware';
import { TransactionsController } from './transactions.controller';

const route = Router();
route.use(authMiddleware);
const transactionsController = container.get<TransactionsController>(TransactionsController);

export default (app: Router) => {
    app.use('/transactions', route);
    
    // Legacy payment history endpoint
    route.get('/payment-history', transactionsController.GetPaymentHistory.bind(transactionsController));
    
    // Partner transaction endpoints (requires onboarding)
    route.get(
        '/',
        requireOnboardingComplete,
        transactionsController.GetPartnerTransactions.bind(transactionsController)
    );
    
    route.get(
        '/stats',
        requireOnboardingComplete,
        transactionsController.GetTransactionStats.bind(transactionsController)
    );
    
    route.get(
        '/:transaction_id',
        requireOnboardingComplete,
        transactionsController.GetTransactionById.bind(transactionsController)
    );
};

