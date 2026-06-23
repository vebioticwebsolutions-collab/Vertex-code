// Server-only: the single shared ioredis connection for BullMQ (producers in the
// Astro web process AND the standalone worker). Lazy — no Redis socket is opened
// until something actually enqueues or the worker starts, so the web process
// doesn't hold a Redis connection just for serving public pages.
//
// `maxRetriesPerRequest: null` is REQUIRED by BullMQ workers (blocking BRPOPLPUSH
// calls must not be aborted). Redis is local on the VPS (127.0.0.1, requirepass,
// AOF) — see deploy/VPS_SETUP.md.
import IORedis from 'ioredis';

let _connection;

export function getConnection() {
  if (!_connection) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL is not set — required for BullMQ (see /etc/pstm-astro.env).');
    }
    _connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return _connection;
}
