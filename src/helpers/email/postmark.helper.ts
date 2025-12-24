import { inject, injectable } from 'inversify';
import postmark = require('postmark');
import { postmarkConfig } from '../../providers/email/postmark';
import { Logger } from '../../startup/logger';
import { ApiError } from '../error.helper';

const api_key = process.env.POSTMARK_API_KEY as string;

@injectable()
export class PostmarkEmailService {
    private client: postmark.ServerClient;
    @inject(Logger) private readonly logger: Logger;

    constructor() {
        this.client = new postmark.ServerClient(api_key);
        this.logger = new Logger();
    }

    async sendTransactionalEmail(
        to: string,
        subject: string,
        htmlBody: string
    ): Promise<void> {
        try {
            await this.client.sendEmail({
                From: postmarkConfig.fromEmail,
                To: to,
                Subject: subject,
                HtmlBody: htmlBody,
                TextBody: 'This is a text body',
                MessageStream: 'outbound',
                TrackOpens: postmarkConfig.trackOpens
            });
            this.logger.info(`Postmark email sent to ${to}`);
        } catch (error) {
            // logger.error(`Postmark failed to ${to}: ${error.message}`);
            throw new ApiError(400, 'Failed to send email via Postmark', error);
        }
    }

    async sendTemplateEmail(
        templateId: number,
        to: string,
        templateData: Record<string, unknown>
    ): Promise<void> {
        try {
            templateData['product_name'] = "Preppit";
            await this.client.sendEmailWithTemplate({
                From: postmarkConfig.fromEmail,
                To: to,
                TemplateId: templateId,
                TemplateModel: templateData
            });
            this.logger.info(`Postmark template email sent to ${to}`);
        } catch (error) {
            this.logger.error(`Postmark template failed to ${to}: ${error}`);
            throw new ApiError(400, 'Failed to send template email', error);
        }
    }

    async sendBatchTemplateEmail(
        emails: Array<{
            templateId: number;
            to: string;
            templateData: Record<string, unknown>;
        }>
    ): Promise<postmark.Models.MessageSendingResponse[]> {
        try {
            const messages = emails.map(email => {
                email.templateData['product_name'] = "Preppit";
                return {
                    From: postmarkConfig.fromEmail,
                    To: email.to,
                    TemplateId: email.templateId,
                    TemplateModel: email.templateData
                };
            });

            const results = await this.client.sendEmailBatchWithTemplates(messages);
            this.logger.info(`Postmark batch template emails sent to ${emails.length} recipients`);
            return results;
        } catch (error) {
            this.logger.error(`Postmark batch template failed: ${error}`);
            throw new ApiError(400, 'Failed to send batch template emails', error);
        }
    }
}