import "server-only";

import nodemailer from "nodemailer";

/** Sends through SMTP when configured; otherwise prints the email to the server log. */
export async function sendEmail(to: string, subject: string, text: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST) {
    console.log(`[email] SMTP not configured; would send to ${to}\nSubject: ${subject}\n\n${text}`);
    return { delivered: false };
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: EMAIL_FROM || SMTP_USER, to, subject, text });
  return { delivered: true };
}
