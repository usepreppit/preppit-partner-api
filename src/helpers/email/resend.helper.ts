import { inject, injectable } from 'inversify';
import { Resend } from 'resend'; 
import { resendConfig } from '../../providers/email/resend';
import { Logger } from '../../startup/logger';
import { ApiError } from '../error.helper';

const resend_api_key = process.env.RESEND_API_KEY as string;

@injectable()
export class ResendEmailService {
    private client: Resend;
    @inject(Logger) private readonly logger: Logger;

    constructor() {
        this.client = new Resend(resend_api_key);
        this.logger = new Logger();
    }

    async sendTransactionalEmail(
        to: string,
        subject: string,
        htmlBody: string
    ): Promise<void> {
        try {
            await this.client.emails.send({
                from: resendConfig.fromEmail,
                to: to,
                subject: subject,
                html: htmlBody,
            });
            this.logger.info(`Resend email sent to ${to}`);
        } catch (error) {
            // logger.error(`Postmark failed to ${to}: ${error.message}`);
            throw new ApiError(400, 'Failed to send email via Resend', error);
        }
    }
}