interface ResendConfig {
    fromEmail: string;
    trackOpens?: boolean;
    trackLinks?: 'HtmlAndText' | 'HtmlOnly' | 'TextOnly' | undefined;
}
  
export const resendConfig: ResendConfig = {
    fromEmail: process.env.RESEND_FROM_EMAIL!,
    trackOpens: true,
    trackLinks: 'HtmlAndText'
};