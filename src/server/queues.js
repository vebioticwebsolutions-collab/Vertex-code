// Server-only: BullMQ queue definitions, shared by the producer API routes and
// (by name) the worker. Queues are created lazily so importing this module in the
// web process doesn't open a Redis connection until a job is actually enqueued.
import { Queue } from 'bullmq';
import { getConnection } from './redis.js';

// The three heavy-work queues delegated to the VPS worker (plan §4 A3).
export const QUEUE_NAMES = Object.freeze({
  email: 'email',
  pdf: 'pdf',
  automation: 'automation',
});

// Retries + idempotency guard against double-send (gap 7.6). Keep some history
// for debugging but cap it so Redis memory stays bounded.
export const DEFAULT_JOB_OPTIONS = Object.freeze({
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 1000,
  removeOnFail: 5000,
});

const _queues = new Map();

export function getQueue(name) {
  if (!Object.values(QUEUE_NAMES).includes(name)) {
    throw new Error(`Unknown queue: ${name}`);
  }
  if (!_queues.has(name)) {
    _queues.set(
      name,
      new Queue(name, { connection: getConnection(), defaultJobOptions: DEFAULT_JOB_OPTIONS }),
    );
  }
  return _queues.get(name);
}
