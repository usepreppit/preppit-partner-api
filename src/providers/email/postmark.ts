interface PostmarkConfig {
    serverToken: string;
    fromEmail: string;
    trackOpens?: boolean;
    trackLinks?: 'HtmlAndText' | 'HtmlOnly' | 'TextOnly' | undefined;
}
  
export const postmarkConfig: PostmarkConfig = {
    serverToken: process.env.POSTMARK_SERVER_TOKEN!,
    fromEmail: process.env.POSTMARK_FROM_EMAIL!,
    trackOpens: true,
    trackLinks: 'HtmlAndText'
};
