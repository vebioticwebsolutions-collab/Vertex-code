import { makeEnqueueRoute } from './_enqueue.js';

// POST /api/internal/jobs/pdf
// payload: { quoteId, extra?, idempotencyKey? }
// Renders the DOCX quotation template for `quoteId` → PDF → R2.
export const POST = makeEnqueueRoute('pdf', (p) => {
  if (p.quoteId === undefined || p.quoteId === null) return 'Missing "quoteId"';
  return null;
});
