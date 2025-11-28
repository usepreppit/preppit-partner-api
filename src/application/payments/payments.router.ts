import { Router } from 'express';
import { container } from '../../startup/di/container';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { PaymentsController } from './payments.controller';

const route = Router();
route.use(authMiddleware);
const paymentsController = container.get<PaymentsController>(PaymentsController);

export default (app: Router) => {
    app.use('/payments', route);
    
    // Legacy endpoints (keeping for backward compatibility)
    route.get('/get_cards', paymentsController.GetUserCards.bind(paymentsController));
    route.get('/stripe/get_secret', paymentsController.GetClientSecret.bind(paymentsController));
    route.get('/stripe/get_cards', paymentsController.GetUserCards.bind(paymentsController));
    route.get('/plans', paymentsController.GetSubscriptionPlans.bind(paymentsController));
    route.get('/plans/:id', paymentsController.GetSingleSubscriptionPlan.bind(paymentsController));
    route.post('/plans', paymentsController.CreateSubscriptionPlans.bind(paymentsController));
    route.post('/purchase_plan', paymentsController.PurchasePlan.bind(paymentsController));
    route.get('/history', paymentsController.GetUserPaymentHistory.bind(paymentsController));
    
    // New partner payment endpoints
    route.get('/payment-methods', paymentsController.GetPaymentMethods.bind(paymentsController));
    route.get('/pricing', paymentsController.GetPricing.bind(paymentsController));
    route.post('/process', paymentsController.ProcessPayment.bind(paymentsController));
    
    // route.get('/stripe/get_client_secret', transactionsController.GetClientSecret.bind(transactionsController));
    // route.post('/stripe/save_card', paymentsController.SaveCard.bind(paymentsController));
    // route.post('/purchaseMinutes', paymentsController.PurchasePlan.bind(paymentsController));
    
    // route.post('/fund_wallet', transactionsController.FundWallet.bind(transactionsController));
    // route.get('/paystack/get_authorization_buy_practice_minutesurl', paymentController.GetPaystackAuthUrl.bind(paymentController));

};


