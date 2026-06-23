// ─────────────────────────────────────────────────────────────────────────────
// Drizzle client for the VPS (Astro Node SSR). SERVER-ONLY — never import from
// browser/client code. The browser never touches the DB (the one rule).
//
// Uses the Supabase DIRECT connection (port 5432) via postgres.js. On Workers,
// Repo B uses Hyperdrive instead; this client is the VPS path only.
//
// DATABASE_URL is provided by systemd's EnvironmentFile (/etc/pstm-astro.env).
// ─────────────────────────────────────────────────────────────────────────────
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set (expected the Supabase direct connection string).');
}

// Reuse one pool across SSR requests. Astro's Node standalone loads this module
// once, so the client is effectively a singleton for the process.
const client = postgres(connectionString, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { schema };
