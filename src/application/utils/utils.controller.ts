import { inject, injectable } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '../../startup/logger';
import { getAuthURL } from '../../helpers/thirdparty/googleapis.helper';
import { ApiResponse } from '../../helpers/response.helper';
import { ExamsService } from '../exams/exams.service';
import { ResendEmailService } from '../../helpers/email/resend.helper';

@injectable()
export class UtilsController {
    constructor(
        @inject(Logger) private readonly logger: Logger,
        @inject(ExamsService) private readonly examService: ExamsService,
        @inject(ResendEmailService) private readonly emailService: ResendEmailService,
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

    async GetExamTypes(_: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            this.logger.info('Getting available exams for partner onboarding');
            // Fetch all published exams from the database
            const exams = await this.examService.GetExams({ status: 'published' });
            
            // Format the exams for partner selection
            const availableExams = exams.map((exam: any) => ({
                exam_id: exam._id,
                title: exam.title,
                description: exam.description,
                type: exam.type,
                sim_name: exam.sim_name,
                slug: exam.slug,
                status: exam.status,
                duration_minutes: exam.durationMinutes,
                tags: exam.tags || [],
                scenario_count: exam.scenarioCount || 0,
                students_joined: exam.studentsJoined || 0
            }));
            
            ApiResponse.ok({ 
                exams: availableExams,
                total: availableExams.length 
            }, 'Available exams retrieved successfully').send(res);
        } catch (error) {
            this.logger.error('Error getting available exams:', error);
            next(error);
        }
    }

    async SendFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { subject, message } = req.body;
            const user = req.curr_user;

            this.logger.info(`Sending feedback from ${user?.email || 'Unknown user'}`);

            // Build email HTML body
            const htmlBody = `
                <h2>New Feedback Received</h2>
                <p><strong>From:</strong> ${user?.firstname || 'N/A'} ${user?.lastname || ''} (${user?.email || 'Anonymous'})</p>
                <p><strong>User ID:</strong> ${user?._id || 'N/A'}</p>
                <p><strong>Subject:</strong> ${subject}</p>
                <hr>
                <h3>Message:</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>
                <hr>
                <p><em>Sent at: ${new Date().toISOString()}</em></p>
            `;

            // Send email to debayo@usepreppit.com
            await this.emailService.sendTransactionalEmail(
                'debayo@usepreppit.com',
                `Feedback: ${subject}`,
                htmlBody
            );

            this.logger.info('Feedback email sent successfully');
            ApiResponse.ok({ success: true }, 'Feedback sent successfully').send(res);
        } catch (error) {
            this.logger.error('Error sending feedback:', error);
            next(error);
        }
    }
}