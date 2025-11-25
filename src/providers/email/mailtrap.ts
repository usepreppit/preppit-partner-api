interface MailTrapToken {
    MailTrapToken: string;
    fromEmail: object;
    trackOpens?: boolean;
    trackLinks?: 'HtmlAndText' | 'HtmlOnly' | 'TextOnly' | undefined;
}
  
export const mailTrapConfig: MailTrapToken = {
    MailTrapToken: process.env.MAILTRAP_TOKEN!,
    fromEmail: { name: "ringconnect", email: process.env.MAILTRAP_FROM_EMAIL! },
    trackOpens: true,
    trackLinks: 'HtmlAndText'
};