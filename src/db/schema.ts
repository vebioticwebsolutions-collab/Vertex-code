// ─────────────────────────────────────────────────────────────────────────────
// PSTM shared Drizzle schema — SOURCE OF TRUTH for both repos.
//
// Repo A (astro-web) owns this file + the migrations. Repo B (internal-tool)
// imports these table objects and NEVER migrates. When a table changes, change
// it here first, migrate from Repo A, then re-import in Repo B (gap 7.4).
//
// `quotes` already exists in Supabase (created outside Drizzle). It is defined
// here to match the live columns, but its CREATE migration must be BASELINED,
// not re-run — see src/db/README.md. Run `npx drizzle-kit pull` to reconcile the
// exact column types/PK before the first `generate`.
// ─────────────────────────────────────────────────────────────────────────────
import {
  pgTable,
  bigint,
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// --- quotes (PRE-EXISTING — verify with `drizzle-kit pull` before baselining) ---
// Written by the public site on quote submission. `customer_key` is the
// normalized phone used for customer rollup (gap 7.8); added by Drizzle migration
// + backfilled.
export const quotes = pgTable(
  'quotes',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),

    fullName: text('full_name'),
    companyName: text('company_name'),
    gstin: text('gstin'),
    email: text('email'),
    mobile: text('mobile'),
    // Normalized phone (last 10 digits of `mobile`) — customer rollup key.
    customerKey: text('customer_key'),

    productType: text('product_type'),
    plankType: text('plank_type'),
    materialType: text('material_type'),

    length: doublePrecision('length'),
    width: doublePrecision('width'),
    height: doublePrecision('height'),
    qty: integer('qty'),
    remarks: text('remarks'),

    weightKg: doublePrecision('weight_kg'),
    sheetWidthMm: doublePrecision('sheet_width_mm'),
    effectiveLengthMm: doublePrecision('effective_length_mm'),
    ratePerKg: doublePrecision('rate_per_kg'),
    finalRate: doublePrecision('final_rate'),
    weightBreakdown: jsonb('weight_breakdown'),
  },
  (t) => [index('quotes_customer_key_idx').on(t.customerKey)],
);

// --- users (internal tool; identity comes from Cloudflare Access email) ---
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name'),
    // 'Admin' | 'Manager' | 'Sales'
    role: text('role').notNull().default('Sales'),
    canEditRate: boolean('can_edit_rate').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email)],
);

// --- rate_log (audit trail for rate-per-kg changes; rate entry is can_edit_rate-gated) ---
export const rateLog = pgTable('rate_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  materialType: text('material_type'),
  ratePerKg: doublePrecision('rate_per_kg'),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
  createdById: uuid('created_by_id').references(() => users.id),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- follow_ups (internal tool; behavioral spec ported from crm, written fresh) ---
export const followUps = pgTable(
  'follow_ups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Attaches to a lead (a quotes row); nullable so a rollup-level task is possible.
    quoteId: bigint('quote_id', { mode: 'number' }).references(() => quotes.id),
    // Customer rollup key = normalized phone (mirrors quotes.customer_key).
    customerKey: text('customer_key'),
    // Owning rep.
    staffId: uuid('staff_id').references(() => users.id),
    completedById: uuid('completed_by_id').references(() => users.id),
    // Bulk-assign grouping (grp_<ts>_<rand>) for group auto-complete.
    groupId: text('group_id'),

    scheduledDate: timestamp('scheduled_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // 'Call' | 'Meeting' | 'Email' | 'Visit' | 'Check-in'
    type: text('type').notNull().default('Call'),
    // 'Low' | 'Medium' | 'High'
    priority: text('priority').notNull().default('Medium'),
    title: text('title'),
    remarks: text('remarks'),
    outcome: text('outcome'),
    // 'Pending' | 'Completed' | 'Missed'
    status: text('status').notNull().default('Pending'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('follow_ups_staff_idx').on(t.staffId),
    index('follow_ups_status_idx').on(t.status),
    index('follow_ups_scheduled_idx').on(t.scheduledDate),
    index('follow_ups_quote_idx').on(t.quoteId),
    index('follow_ups_customer_key_idx').on(t.customerKey),
    index('follow_ups_group_idx').on(t.groupId),
  ],
);

// --- jobs (async work delegated to the VPS worker: email / pdf / automation) ---
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // 'email' | 'pdf' | 'automation'
    type: text('type').notNull(),
    // 'queued' | 'active' | 'completed' | 'failed'
    status: text('status').notNull().default('queued'),
    payload: jsonb('payload'),
    resultUrl: text('result_url'),
    error: text('error'),
    // Dedupe key so retries / double-submits don't double-send (gap 7.6).
    idempotencyKey: text('idempotency_key'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('jobs_idempotency_uq').on(t.idempotencyKey)],
);
