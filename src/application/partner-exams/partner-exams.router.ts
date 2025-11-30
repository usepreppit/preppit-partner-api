import { Router } from 'express';
import { PartnerExamsController } from './partner-exams.controller';
import { container } from '../../startup/di/container';
import { authMiddleware } from '../../middlewares/auth.middleware';

const partnerExamsRouter = Router();
const partnerExamsController = container.get(PartnerExamsController);

/**
 * @route GET /partner-exams
 * @desc Get all partner exams with pagination and search
 * @access Private (Partner)
 */
partnerExamsRouter.get(
    '/',
    authMiddleware,
    partnerExamsController.GetPartnerExams.bind(partnerExamsController)
);

/**
 * @route GET /partner-exams/:exam_id
 * @desc Get detailed information about a specific exam
 * @access Private (Partner)
 */
partnerExamsRouter.get(
    '/:exam_id',
    authMiddleware,
    partnerExamsController.GetExamDetails.bind(partnerExamsController)
);

/**
 * @route GET /partner-exams/:exam_id/questions
 * @desc Get all questions for an exam with pagination
 * @access Private (Partner)
 */
partnerExamsRouter.get(
    '/:exam_id/questions',
    authMiddleware,
    partnerExamsController.GetExamQuestions.bind(partnerExamsController)
);

/**
 * @route GET /partner-exams/:exam_id/sessions
 * @desc Get all sessions for an exam with filtering
 * @access Private (Partner)
 */
partnerExamsRouter.get(
    '/:exam_id/sessions',
    authMiddleware,
    partnerExamsController.GetExamSessions.bind(partnerExamsController)
);

/**
 * @route GET /partner-exams/:exam_id/sessions/:session_id
 * @desc Get detailed information about a specific session
 * @access Private (Partner)
 */
partnerExamsRouter.get(
    '/:exam_id/sessions/:session_id',
    authMiddleware,
    partnerExamsController.GetSessionDetails.bind(partnerExamsController)
);

/**
 * @route GET /partner-exams/:exam_id/scenarios
 * @desc Get all scenarios for an exam
 * @access Private (Partner)
 */
partnerExamsRouter.get(
    '/:exam_id/scenarios',
    authMiddleware,
    partnerExamsController.GetExamScenarios.bind(partnerExamsController)
);

export default partnerExamsRouter;
