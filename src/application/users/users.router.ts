import { Router } from 'express';
import { container } from '../../startup/di/container';
import { UserController } from './users.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const route = Router();
route.use(authMiddleware);
const userController = container.get<UserController>(UserController);

export default (app: Router) => {
    app.use('/users', route);
    route.get('/me', userController.GetMe.bind(userController));
};
