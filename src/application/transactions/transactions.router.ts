import { Router } from 'express';
import { container } from '../../startup/di/container';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { TransactionsController } from './transactions.controller';

const route = Router();
route.use(authMiddleware);
const transactionsController = container.get<TransactionsController>(TransactionsController);

export default (app: Router) => {
    app.use('/payments', route);
    route.get('/history', transactionsController.GetPaymentHistory.bind(transactionsController));
    // route.get('/stripe/get_users_card', transactionsController.GetUserCards.bind(transactionsController));
    // route.get('/stripe/get_client_secret', transactionsController.GetClientSecret.bind(transactionsController));
    // route.post('/:payment_channel/save_card', transactionsController.SaveCard.bind(transactionsController));
    // route.post('/stripe/fund_wallet', transactionsController.FundWallet.bind(transactionsController));
    // route.get('/get_users_card', transactionsController.GetUserCards.bind(transactionsController));
    // route.post('/fund_wallet', transactionsController.FundWallet.bind(transactionsController));
    // route.get('/paystack/get_authorization_url', paymentController.GetPaystackAuthUrl.bind(paymentController));

};
