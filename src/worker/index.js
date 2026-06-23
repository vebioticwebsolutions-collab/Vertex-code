// PSTM background worker (systemd `pstm-worker`) — the BullMQ CONSUMER side.
// One Worker per queue (email / pdf / automation). The producer side lives in the
// Astro web process (src/pages/api/internal/jobs/*); this process does the heavy,
// VPS-only work: SMTP, DOCX→PDF via LibreOffice, BOQ spreadsheets, R2 uploads.
//
// Built to dist/worker/index.mjs by `npm run build:worker` (esbuild). Env comes
// from /etc/pstm-astro.env via the systemd unit.
import { Worker } from 'bullmq';
import { eq } from 'drizzle-orm';
import { getConnection } from '../server/redis.js';
import { getJob } from '../server/jobs.js';
import { db, schema } from '../db/client.ts';
import { processEmail } from './processors/email.js';
import { processPdf } from './processors/pdf.js';
import { processAutomation } from './processors/automation.js';

const { jobs } = schema;

const HANDLERS = {
  email: processEmail,
  pdf: processPdf,
  automation: processAutomation,
};

// PDF conversion is RAM/CPU heavy (LibreOffice) — keep it serial (gap 7.7).
const CONCURRENCY = { email: 5, pdf: 1, automation: 3 };

async function setStatus(id, fields) {
  await db.update(jobs).set({ ...fields, updatedAt: new Date() }).where(eq(jobs.id, id));
}

function makeWorker(type) {
  const worker = new Worker(
    type,
    async (job) => {
      const dbId = job.data?.jobId;
      if (!dbId) throw new Error(`job ${job.id} has no data.jobId`);

      await setStatus(dbId, { status: 'active', error: null });

      const row = await getJob(dbId);
      if (!row) throw new Error(`jobs row ${dbId} not found`);

      const resultUrl = await HANDLERS[type](row);

      await setStatus(dbId, { status: 'completed', resultUrl: resultUrl ?? null, error: null });
      return { resultUrl: resultUrl ?? null };
    },
    { connection: getConnection(), concurrency: CONCURRENCY[type] ?? 1 },
  );

  worker.on('completed', (job) => {
    console.log(`[worker:${type}] completed job ${job.id}`);
  });

  // Only mark the DB row 'failed' once the job is terminal — earlier retry
  // attempts stay 'active' so a transient failure isn't surfaced as terminal.
  // Terminal = retries exhausted, OR BullMQ gave up after repeated stalls (a
  // stalled failure does NOT increment attemptsMade, so check the message too —
  // otherwise a worker that died mid-job would leave the row stuck 'active').
  worker.on('failed', async (job, err) => {
    if (!job) return;
    const dbId = job.data?.jobId;
    const attempts = job.opts?.attempts ?? 1;
    const message = String(err?.message || err);
    const terminal = job.attemptsMade >= attempts || /stalled/i.test(message);
    console.error(
      `[worker:${type}] job ${job.id} failed (attempt ${job.attemptsMade}/${attempts}):`,
      message,
    );
    if (dbId && terminal) {
      try {
        await setStatus(dbId, { status: 'failed', error: message.slice(0, 2000) });
      } catch (e) {
        console.error(`[worker:${type}] could not mark job ${dbId} failed:`, e);
      }
    }
  });

  worker.on('stalled', (jobId) =>
    console.warn(`[worker:${type}] job ${jobId} stalled — will be reprocessed`),
  );
  worker.on('error', (err) => console.error(`[worker:${type}] worker error:`, err));
  return worker;
}

const workers = Object.keys(HANDLERS).map(makeWorker);
console.log(`[pstm-worker] started — queues: ${Object.keys(HANDLERS).join(', ')}`);

async function shutdown(signal) {
  console.log(`[pstm-worker] ${signal} received — closing workers…`);
  await Promise.allSettled(workers.map((w) => w.close()));
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
