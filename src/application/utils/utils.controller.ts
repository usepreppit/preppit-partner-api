import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../startup/logger';
import { getAuthURL } from '../../helpers/thirdparty/googleapis.helper';
import { ApiResponse } from '../../helpers/response.helper';
import { ExamsService } from '../exams/exams.service';

@injectable()
export class UtilsController {
    constructor(
        @inject(Logger) private readonly logger: Logger,
        @inject(ExamsService) private readonly examService: ExamsService,
    ) {}

    async GetGoogleAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
        const redirect_uri = req.query.redirect_uri as string;
        const scope = req.query.scope as string;
        try {
            this.logger.info('Generating Google Auth URL');
            const auth_url = await getAuthURL(scope, redirect_uri);
            ApiResponse.ok({ auth_url: auth_url }).send(res);
        } catch (error) {
            next(error);
        }
    }

    async GetAiMedicationImage(_: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Getting AI medication image');
            const response = await this.examService.GenerateScenarioImages();
            ApiResponse.ok(response).send(res); 
        } catch (error) {
            next(error);
        }
    }   

    async ExtractMedicationsOnTablePage(_: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Extracting medications on table page from PDF');
            // Call the PDF helper function to extract the page data
            const response = await this.examService.SortExamMedicationsOnTable();
            ApiResponse.ok(response).send(res);
        } catch (error) {
            next(error);
        }
    }
}