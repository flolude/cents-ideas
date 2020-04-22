import { IEmailContent } from '../models';

const subject = 'Change your CENTS Ideas Email Adress';
const html = (url: string) =>
  `
<p>Click the button below to change your email adress</p>
<a href="${url}">Change Email</a>
`;
const text = (url: string) =>
  `
Open the link below to change your email adress

${url}
`;

export const getRequestEmailChangeEmail = (url: string): IEmailContent => ({
  subject,
  html: html(url),
  text: text(url),
});
