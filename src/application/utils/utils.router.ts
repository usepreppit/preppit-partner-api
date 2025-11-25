import { Router } from 'express';
import { container } from '../../startup/di/container';
import { UtilsController } from './utils.controller';
// import { authMiddleware } from '../../middlewares/auth.middleware';

const route = Router();

// route.use(authMiddleware);
const utilsController = container.get<UtilsController>(UtilsController);

export default (app: Router) => {
    app.use('/utils', route);
    route.get('/google/get_auth_url', utilsController.GetGoogleAuthUrl.bind(utilsController));

    route.get('/medications_on_table/ai_image', utilsController.GetAiMedicationImage.bind(utilsController));
    route.get('/medications_on_table/extract_page', utilsController.ExtractMedicationsOnTablePage.bind(utilsController));
};