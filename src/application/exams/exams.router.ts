import { Router } from 'express';
import { container } from '../../startup/di/container';
import { ExamsController } from './exams.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const route = Router();
route.use(authMiddleware);
const examsController = container.get<ExamsController>(ExamsController);

export default (app: Router) => {
    app.use('/exams', route);
    
    route.get('', examsController.GetExams.bind(examsController));
    route.get('/me', examsController.GetMyExams.bind(examsController));
    route.get('/analytics/:id', examsController.GetExamAnalytics.bind(examsController));
    route.get('/:id', examsController.GetExamById.bind(examsController));
    route.get('/:id/scenarios', examsController.GetExamScenarios.bind(examsController))
    route.get('/:id/scenario/:scenario_id?', examsController.GetExamScenarioById.bind(examsController))

    route.patch('/:id/join', examsController.JoinExam.bind(examsController));
    route.get('/subscriptions/:id', examsController.GetExamSubscriptions.bind(examsController));
    route.post('/subscriptions/:id', examsController.CreateExamSubscription.bind(examsController));


    /** Admin Area */
    route.post('', examsController.CreateExam.bind(examsController));
    route.post('/:id/scenarios', examsController.AddExamScenarios.bind(examsController)); //Bulk Addition of Exam Scenarios
};
