import { verifyInternalJwt, rejectAuth, serverError, json } from '../../../../lib/internal-auth.js';
import { getJob } from '../../../../server/jobs.js';

// GET /api/internal/jobs/:id — poll job status (plan §4 A3). Server-to-server,
// JWT-gated, no CORS. The tool polls this until status is 'completed'/'failed'
// and then reads resultUrl.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = async ({ request, params }) => {
  const auth = await verifyInternalJwt(request);
  if (!auth.ok) return rejectAuth(auth);

  // jobs.id is a uuid PK — reject a non-uuid id up front so Postgres doesn't
  // raise 22P02 (which would surface as an opaque 500 instead of a clean 404).
  if (!params.id || !UUID_RE.test(params.id)) {
    return json({ error: 'Job not found' }, 404);
  }

  let job;
  try {
    job = await getJob(params.id);
  } catch (err) {
    console.error('[api/internal/jobs/:id] lookup failed:', err);
    return serverError('Failed to look up job');
  }
  if (!job) return json({ error: 'Job not found' }, 404);

  return json({
    jobId: job.id,
    type: job.type,
    status: job.status,
    resultUrl: job.resultUrl ?? null,
    error: job.error ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
};
