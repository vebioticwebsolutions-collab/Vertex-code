// Server-only: the enqueue/lookup contract shared by the internal producer routes.
// A job is persisted to the `jobs` table (source of truth) AND pushed onto its
// BullMQ queue. The DB row id doubles as the BullMQ jobId so a duplicate enqueue
// is a no-op at the queue level too.
//
// Idempotency (gap 7.6): if the caller supplies an idempotencyKey and a row with
// that key already exists, we return the existing job instead of enqueuing again
// — retries / double-submits never double-send. The unique index
// `jobs_idempotency_uq` is the race-safe backstop via onConflictDoNothing.
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/client.ts';
import { getQueue, DEFAULT_JOB_OPTIONS } from './queues.js';

const { jobs } = schema;

export async function enqueueJob({ type, payload, idempotencyKey = null }) {
  // Insert; if a row with this idempotencyKey already exists (duplicate submit or
  // a concurrent race), the conflict is swallowed and we fall back to reading the
  // existing row. (A null key never conflicts — those always insert a fresh row.)
  const inserted = await db
    .insert(jobs)
    .values({ type, payload, status: 'queued', idempotencyKey })
    .onConflictDoNothing({ target: jobs.idempotencyKey })
    .returning();

  if (inserted.length === 0) {
    const existing = await db
      .select()
      .from(jobs)
      .where(eq(jobs.idempotencyKey, idempotencyKey))
      .limit(1);
    return { job: existing[0], deduped: true };
  }

  const job = inserted[0];
  // jobId === DB id → re-adding the same id is ignored by BullMQ (queue-level dedupe).
  await getQueue(type).add(type, { jobId: job.id }, { ...DEFAULT_JOB_OPTIONS, jobId: job.id });
  return { job, deduped: false };
}

export async function getJob(id) {
  const rows = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return rows[0] ?? null;
}
