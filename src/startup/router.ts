import { Router, Request, Response } from 'express';

import auth_router from '../application/auth/auth.router';
import user_router from '../application/users/users.router';
import exam_router from '../application/exams/exams.router';
import utils_router from '../application/utils/utils.router';
import practice_router from '../application/practice/practice.router';
import profile_router from '../application/profile/profile.router';
import dashboard_router from '../application/dashboard/dashboard.router';
import candidates_router from '../application/candidates/candidates.router';
import payments_router from '../application/payments/payments.router';
import subscriptions_router from '../application/subscriptions/subscriptions.router';
import { NotFoundError } from '../helpers/error.helper';


const defaultRoute = (app: Router) => {
  app.get('/', async (_: Request, res: Response) => {
    res.send('Welcome to the Default API set');
  });
};

export default() => {
    const app = Router();
    defaultRoute(app);
    auth_router(app);
    user_router(app);
    exam_router(app);
    utils_router(app);
    practice_router(app);
    profile_router(app);
    dashboard_router(app);
    candidates_router(app);
    payments_router(app);
    subscriptions_router(app);
    app.use((_, __, next) => {
        next(new NotFoundError('Route not found'));
    });

    return app;
}
