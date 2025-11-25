import { inject, injectable } from 'inversify';
const { MailtrapClient } = require("mailtrap");
import { mailTrapConfig } from '../../providers/email/mailtrap';
import { Logger } from '../../startup/logger';
import { ApiError } from '../error.helper';

// const mailtrap_api_key = process.env.MAILTRAP_API_KEY as string;
const mail_trap_token = process.env.MAILTRAP_TOKEN as string;

@injectable()
export class MailtrapEmailService {
    private client: typeof MailtrapClient;
    @inject(Logger) private readonly logger: Logger;

    constructor() {
        this.client = new MailtrapClient({ token: mail_trap_token });
        this.logger = new Logger();
    }

    // async sendTransactionalEmail(
    //     to: string,
    //     subject: string,
    //     htmlBody: string
    // ): Promise<void> {
    //     try {
    //         await this.client.sendEmail({
    //             From: postmarkConfig.fromEmail,
    //             To: to,
    //             Subject: subject,
    //             HtmlBody: htmlBody,
    //             TextBody: 'This is a text body',
    //             MessageStream: 'outbound',
    //             TrackOpens: postmarkConfig.trackOpens
    //         });
    //         this.logger.info(`Postmark email sent to ${to}`);
    //     } catch (error) {
    //         // logger.error(`Postmark failed to ${to}: ${error.message}`);
    //         throw new ApiError(400, 'Failed to send email via Postmark', error);
    //     }
    // }

    async sendTemplateEmail(
        template_uuid: string,
        to: object | Array<object> | string,
        templateData: object
    ): Promise<void> {
        const formattedTo = this.formatRecipient(to);
        console.log(formattedTo);
        
        try {
            await this.client.send({
                From: mailTrapConfig.fromEmail,
                To: formattedTo,
                template_uuid: template_uuid,
                template_variables: templateData
            });
            this.logger.info(`Mailtrap template email sent to ${formattedTo}`);
        } catch (error) {
            this.logger.error(`Mailtrap template failed to ${formattedTo}: ${error}`);
            throw new ApiError(400, 'Failed to send template email', error);
        }
    }

    private formatRecipient(to: object | Array<object> | string) {
        if (typeof to === 'string') {
            return to.split(',').map(email => ({ email: email.trim() }));
        } else if (Array.isArray(to)) {
            return to;
        } else {
            return [to];
        }
    }
}