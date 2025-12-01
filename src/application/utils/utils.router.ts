import { Router } from 'express';
import { container } from '../../startup/di/container';
import { UtilsController } from './utils.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate_send_feedback } from '../../validation/utils.validation';
import { sendError } from '../../helpers/validator.helper';

const route = Router();

// route.use(authMiddleware);
const utilsController = container.get<UtilsController>(UtilsController);

export default (app: Router) => {
    app.use('/utils', route);
    route.get('/google/get_auth_url', utilsController.GetGoogleAuthUrl.bind(utilsController));

    route.get('/medications_on_table/ai_image', utilsController.GetAiMedicationImage.bind(utilsController));
    route.get('/medications_on_table/extract_page', utilsController.ExtractMedicationsOnTablePage.bind(utilsController));
    
    // Available exams endpoint for partner onboarding
    route.get('/available-exams', utilsController.GetExamTypes.bind(utilsController));

    // Feedback endpoint
    route.post(
        '/feedback',
        authMiddleware,
        (req, res, next) => {
            validate_send_feedback(req.body, (err: any, status: boolean) => {
                if (!status) {
                    return sendError(res, err);
                }
                next();
            });
        },
        utilsController.SendFeedback.bind(utilsController)
    );
};