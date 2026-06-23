import { makeEnqueueRoute } from './_enqueue.js';

// POST /api/internal/jobs/automation
// payload: { quoteId, idempotencyKey? }
// Builds the BOQ spreadsheet for `quoteId` → R2.
export const POST = makeEnqueueRoute('automation', (p) => {
  if (p.quoteId === undefined || p.quoteId === null) return 'Missing "quoteId"';
  return null;
});
