import { Router } from 'express';
import { container } from '../../startup/di/container';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { ReferralsController } from './referrals.controller';

const route = Router();
route.use(authMiddleware);
const referralsController = container.get<ReferralsController>(ReferralsController);

export default (app: Router) => {
    app.use('/referrals', route);
    route.get('', referralsController.GetReferrals.bind(referralsController));
    route.get('/stats', referralsController.GetReferralStats.bind(referralsController));

};
