# Database layer (Drizzle) — Repo A owns the schema

Repo A (`astro-web`) is the **single source of truth** for the PSTM database
schema and migrations. The internal tool (Repo B) imports [`schema.ts`](./schema.ts)
and **never migrates**.

- [`schema.ts`](./schema.ts) — all tables (`quotes`, `users`, `rate_log`, `follow_ups`, `jobs`).
- [`client.ts`](./client.ts) — server-only Drizzle client (postgres.js → Supabase **direct** 5432). Never import client-side.
- [`../../../drizzle.config.ts`](../../drizzle.config.ts) — drizzle-kit config.

`DATABASE_URL` must be the Supabase **Direct connection** (port 5432,
`?sslmode=require`), NOT the Supavisor pooler. Locally, put it in `.env`
(gitignored); in prod it comes from `/etc/pstm-astro.env`.

## Scripts

```bash
npm run db:pull       # introspect the live DB → ./drizzle (for reconciliation)
npm run db:generate   # emit SQL migrations from schema.ts → ./drizzle
npm run db:migrate    # apply pending migrations
npm run db:studio     # browse the DB
```

## ⚠️ One-time baseline of the pre-existing `quotes` table

`quotes` was created via the Supabase UI, **outside Drizzle**. If you run
`db:generate` blind, Drizzle will emit a `CREATE TABLE quotes` and `db:migrate`
will fail (it already exists) — or worse, a destructive diff. Baseline it first
(do this once, when you have `DATABASE_URL`):

1. **Reconcile types.** Run `npm run db:pull` and diff the introspected `quotes`
   against [`schema.ts`](./schema.ts). Fix any column-type mismatches in
   `schema.ts` to match reality (the `id` PK kind and numeric types are
   best-guesses noted in the file). Runtime inserts already only use known
   columns, so this only affects migration correctness.

2. **Generate the initial migration** with `npm run db:generate`. It will include
   `quotes` (pre-existing) **plus** the new objects: `users`, `rate_log`,
   `follow_ups`, `jobs`, and the `quotes.customer_key` column + index.

3. **Split the migration** so the already-existing parts aren't re-created:
   - Edit the generated `.sql` so the `CREATE TABLE quotes` / existing columns
     are removed, leaving only the genuinely new DDL
     (`ALTER TABLE quotes ADD COLUMN customer_key`, the new tables, indexes), **or**
   - mark the baseline as applied in `drizzle.__drizzle_migrations` so Drizzle
     treats the `quotes` creation as done.

4. **Backfill** `quotes.customer_key` from existing rows (gap 7.8):

   ```sql
   UPDATE quotes
   SET customer_key = RIGHT(REGEXP_REPLACE(mobile, '\D', '', 'g'), 10)
   WHERE mobile IS NOT NULL
     AND LENGTH(REGEXP_REPLACE(mobile, '\D', '', 'g')) >= 10;
   ```

5. `npm run db:migrate` to apply the new objects.

After this, normal flow: change `schema.ts` → `db:generate` → review SQL →
`db:migrate` → commit the migration → Repo B re-imports the schema (gap 7.4).
