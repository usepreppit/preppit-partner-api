import { Router } from 'express';
import { container } from '../../startup/di/container';
import { SubscriptionsController } from './subscriptions.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const route = Router();
route.use(authMiddleware);
const subscriptionsController = container.get<SubscriptionsController>(SubscriptionsController);

export default (app: Router) => {
    app.use('/subscriptions', route);
    route.get('', subscriptionsController.GetMySubscriptions.bind(subscriptionsController));
};
