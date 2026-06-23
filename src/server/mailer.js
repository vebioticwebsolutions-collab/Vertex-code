// Server-only: nodemailer transport for the worker's `email` job. SMTP lives ONLY
// on the VPS worker (plan §4 A3) — never the public web path. Lazy singleton so a
// process that never sends mail never builds a transport.
import nodemailer from 'nodemailer';

let _transport;

export function getMailer() {
  if (!_transport) {
    const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_USER) {
      throw new Error('SMTP is not configured (SMTP_HOST / SMTP_USER missing).');
    }
    _transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 465),
      // Default to implicit TLS (465). Set SMTP_SECURE=false for STARTTLS (587).
      secure: SMTP_SECURE !== 'false',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return _transport;
}
