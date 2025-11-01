import nodemailer from 'nodemailer';
import { ENV } from '../env.js';

export function isSmtpConfigured(): boolean {
  return Boolean(ENV.SMTP_HOST && ENV.SMTP_USER && ENV.SMTP_PASS && ENV.SMTP_FROM);
}

function createTransport() {
  if (!isSmtpConfigured()) return null as any;
  return nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE,
    auth: {
      user: ENV.SMTP_USER as string,
      pass: ENV.SMTP_PASS as string,
    },
  });
}

export async function sendDailyDigest(
  recipients: string[],
  subject: string,
  html: string,
  text?: string
): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log('[SMTP not configured] Would send to:', recipients);
    console.log('Subject:', subject);
    console.log(text || html);
    return;
  }

  const transporter = createTransport();
  const from = ENV.SMTP_FROM_NAME ? `${ENV.SMTP_FROM_NAME} <${ENV.SMTP_FROM}>` : (ENV.SMTP_FROM as string);
  const uniqueRecipients = Array.from(new Set(recipients.filter((e) => !!e && e.includes('@'))));
  if (uniqueRecipients.length === 0) return;

  await transporter.sendMail({
    from,
    to: from, // primary TO as from address, hide recipients in BCC
    bcc: uniqueRecipients,
    subject,
    text,
    html,
  });
}


