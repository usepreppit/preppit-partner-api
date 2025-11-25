import { Router } from 'express';
import { container } from '../../startup/di/container';
import { PracticeController } from './practice.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { practiceAuthMiddleware } from '../../middlewares/practice_auth.middleware';

const route = Router();
// route.use(authMiddleware);
const practiceController = container.get<PracticeController>(PracticeController);

export default (app: Router) => {
    app.use('/practice', route);
    
    // route.post('', practiceAuthMiddleware, practiceController.CreatePractice.bind(practiceController)); //create a practice session
    // route.get('', authMiddleware, practiceController.GetScenario.bind(practiceController)); //get practice sessions for a user
    route.get('/:practice_id', authMiddleware, practiceController.GetPracticeById.bind(practiceController)); //get a specific practice session by id
    route.get('/details/:practice_id', authMiddleware, practiceController.GetPracticeDetails.bind(practiceController));
    route.get('/history/me', authMiddleware, practiceController.GetPracticeHistory.bind(practiceController)); //get practice history for a user
    route.post('/get_scenario', authMiddleware, practiceController.GetScenario.bind(practiceController));
    route.post('/start', authMiddleware, practiceAuthMiddleware, practiceController.StartPractice.bind(practiceController));
    route.get('/analytics/me', authMiddleware, practiceController.GetPracticeUsageAnalytics.bind(practiceController));

    route.get('/evaluate/:practice_id', authMiddleware, practiceController.EvaluateUserPractice.bind(practiceController));
    // route.post('/evaluate/:practice_id', authMiddleware, practiceController.GetPracticeEvaluation.bind(practiceController));


    route.post('/evaluate/:practice_id', practiceController.EvaluatePractice.bind(practiceController));
};
