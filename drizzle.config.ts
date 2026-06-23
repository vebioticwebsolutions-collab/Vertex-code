import 'dotenv/config'; // drizzle-kit does not auto-load .env — load DATABASE_URL ourselves
import { defineConfig } from 'drizzle-kit';

// Drizzle Kit config — Repo A OWNS the schema + migrations for the whole system.
// Repo B (internal-tool) imports the same schema and never migrates.
//
// DATABASE_URL must be the Supabase DIRECT connection (port 5432, ?sslmode=require),
// NOT the Supavisor pooler. It is read from the environment (never committed).
//
// Common commands:
//   npx drizzle-kit pull      # introspect the live DB into ./drizzle (reconcile `quotes`)
//   npx drizzle-kit generate  # emit SQL migrations from src/db/schema.ts
//   npx drizzle-kit migrate   # apply pending migrations
// See src/db/README.md for the one-time baseline of the pre-existing `quotes` table.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
