import { makeEnqueueRoute } from './_enqueue.js';

// POST /api/internal/jobs/email
// payload: { to, cc?, bcc?, subject?, text?, html?, attachments?, idempotencyKey? }
export const POST = makeEnqueueRoute('email', (p) => {
  if (!p.to) return 'Missing "to"';
  if (!p.text && !p.html) return 'Provide "text" or "html"';
  return null;
});
