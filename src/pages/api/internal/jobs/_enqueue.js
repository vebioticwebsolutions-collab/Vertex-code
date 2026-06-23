// Shared producer for /api/internal/jobs/{email,pdf,automation}. NOT a route —
// Astro excludes files prefixed with `_` from file-based routing.
//
// Every job endpoint is the same shape: JWT-gate → parse → validate → enqueue.
// The JWT (not CORS) is the gate; these are server-to-server only (gap 7.10/7.11),
// so no CORS headers are emitted here.
import { verifyInternalJwt, rejectAuth, serverError, json } from '../../../../lib/internal-auth.js';
import { enqueueJob } from '../../../../server/jobs.js';

// validate(payload) -> string error message, or null/undefined if valid.
export function makeEnqueueRoute(type, validate) {
  return async ({ request }) => {
    const auth = await verifyInternalJwt(request);
    if (!auth.ok) return rejectAuth(auth);

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }
    if (!body || typeof body !== 'object') {
      return json({ error: 'Body must be a JSON object' }, 400);
    }

    const { idempotencyKey = null, ...payload } = body;
    const validationError = validate ? validate(payload) : null;
    if (validationError) return json({ error: validationError }, 400);

    try {
      const { job, deduped } = await enqueueJob({ type, payload, idempotencyKey });
      // 202 Accepted for a freshly queued job; 200 when an idempotent dedupe hit.
      return json(
        { jobId: job.id, type: job.type, status: job.status, deduped },
        deduped ? 200 : 202,
      );
    } catch (err) {
      console.error(`[api/internal/jobs/${type}] enqueue failed:`, err);
      return serverError('Failed to enqueue job');
    }
  };
}
