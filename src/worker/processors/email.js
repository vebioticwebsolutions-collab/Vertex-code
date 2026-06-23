// `email` job processor — sends via Google Workspace SMTP (worker-only).
// Idempotency is handled upstream (one jobs row per idempotencyKey), so reaching
// here means we should actually send. Returns null (no result file).
import { getMailer } from '../../server/mailer.js';

export async function processEmail(row) {
  const p = row.payload || {};
  if (!p.to) throw new Error('email payload missing "to"');
  if (!p.text && !p.html) throw new Error('email payload missing "text"/"html"');

  const info = await getMailer().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: p.to,
    cc: p.cc,
    bcc: p.bcc,
    subject: p.subject || 'PSTM Quotation',
    text: p.text,
    html: p.html,
    // [{ filename, path | href | content }] — e.g. an R2 URL from a prior pdf job.
    attachments: p.attachments,
  });
  console.log(`[email] sent ${info.messageId} to ${p.to}`);
  return null;
}
