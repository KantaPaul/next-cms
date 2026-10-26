import 'server-only';
import nodemailer from 'nodemailer';
import { env } from '@/env.mjs';

export function isMailConfigured() {
  return Boolean(env.MAIL_FROM && (env.RESEND_API_KEY || env.SMTP_HOST));
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!input.to || !env.MAIL_FROM || !isMailConfigured()) {
    return { sent: false, reason: 'Email is not configured.' };
  }

  try {
    if (env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.MAIL_FROM,
          to: input.to,
          subject: input.subject,
          text: input.text,
        }),
      });
      if (!response.ok) {
        return { sent: false, reason: 'The email provider rejected the message.' };
      }
      return { sent: true };
    }

    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    });
    await transport.sendMail({
      from: env.MAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { sent: true };
  } catch (error) {
    console.error('[mail]', error);
    return { sent: false, reason: 'The email could not be sent.' };
  }
}
