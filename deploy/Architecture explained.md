# PSTM Hosting Architecture — Team Overview

> Simple explanation of why we're splitting into 2 repos, where each lives, and why Supabase beats a local database.

---

## The Big Picture: Two Repos, One Database

```
┌─────────────────────────────────────────────────────────────────┐
│                         VISITORS (Public)                        │
└────────────────┬────────────────────────────────────┬────────────┘
                 │                                    │
          [Public Website]                    [Internal Team Tool]
          app.domain.com                       tools.domain.com
                 │                                    │
                 ▼                                    ▼
       ┌─────────────────────┐            ┌──────────────────────┐
       │   REPO A            │            │   REPO B             │
       │  astro-web          │            │  internal-tool       │
       │  (Astro SSR)        │            │  (Next.js)           │
       └─────────┬───────────┘            └──────────┬───────────┘
                 │                                   │
                 │  Runs on Hostinger VPS            │  Runs on Cloudflare Workers
                 │  (has compute power)              │  (serverless, global)
                 │                                   │
                 └───────────────┬────────────────────┘
                                 │
                    (Both repos talk to same DB)
                                 ▼
                    ┌────────────────────────┐
                    │  Supabase (Postgres)   │
                    │  The Single Database   │
                    └────────────────────────┘
```

---

## Why Two Repos?

### Repo A: `astro-web` — The Public Face
- **What it is:** Your marketing site + quote pipeline (what customers see)
- **Where it runs:** Hostinger VPS (we already own this, with the root domain)
- **Why here:** Needs compute power for:
  - Rendering heavy pages (Astro SSR)
  - Heavy backend jobs: PDF generation, emails, automations
  - Direct database access (fast, no serverless limitations)
- **Tech:** Astro, Node.js, Drizzle ORM

### Repo B: `internal-tool` — The Team Dashboard
- **What it is:** Admin tool for sales team (leads, follow-ups, rates)
- **Where it runs:** Cloudflare Workers (serverless, global edge network)
- **Why here:** 
  - No heavy compute needed (just CRUD + queries)
  - Scales instantly, costs nothing when idle
  - Fast everywhere (edge servers near users)
  - Perfect for internal tools (light traffic, sporadic use)
- **Tech:** Next.js, Cloudflare Workers, Drizzle ORM

**Key insight:** Each repo does what it's best at. The public site gets compute muscle. The internal tool gets speed + simplicity.

---

## The Database: Why Supabase (Not Local Postgres)

### Option 1: Local Postgres on VPS ❌
```
Pros:
  ✓ Full control
  ✓ Faster (same server)

Cons:
  ✗ YOU manage backups (if it fails, you lose data)
  ✗ YOU manage updates/security patches
  ✗ YOU manage scaling (disk space, RAM, connections)
  ✗ YOU debug crashes at 2 AM
  ✗ Workers can't access it easily (serverless pools don't work with local Postgres)
  ✗ No automatic failover
  ✗ Single point of failure
```

### Option 2: Supabase (Managed Postgres) ✅
```
Pros:
  ✓ Automatic daily backups (3 years retention)
  ✓ Automatic security patches
  ✓ Cloudflare can pool connections via Hyperdrive
  ✓ Scales seamlessly (no manual intervention)
  ✓ High availability built-in
  ✓ Point-in-time recovery
  ✓ 24/7 monitoring by experts
  ✓ Works perfectly with Workers
  ✓ Zero ops overhead
  ✓ Both servers are in Mumbai, no latency issue
```
---

## How the Repos Talk to the Database

### Repo A (VPS) → Supabase
```
Astro site (VPS)
    ↓
  Drizzle ORM
    ↓
  Direct Postgres connection
    ↓
  Supabase (5432 port)
```
**Speed:** ~5ms (same data center region)

### Repo B (Workers) → Supabase
```
Next.js (Workers)
    ↓
  Drizzle ORM
    ↓
  Cloudflare Hyperdrive (connection pool)
    ↓
  Supabase (5432 port)
```
**Speed:** ~20-50ms (pooled connections, cached reads)
**Why Hyperdrive?** Workers can't maintain traditional database connections. Hyperdrive pools them for us (think: a smart traffic light for database connections).

**Key rule:** The browser never touches the database. Both repos handle data on the server, return JSON/HTML to the browser.

---

## Deployment Flow (Simple Version)

### When you push to `main`:

**Repo A (`astro-web`):**
1. GitHub Actions runs tests
2. Builds Astro
3. SSH to VPS
4. Pull code, restart Astro service
5. Site updates at `app.domain.com`
✅ Done (seconds)

**Repo B (`internal-tool`):**
1. GitHub Actions runs tests
2. Builds Next.js
3. Deploys to Cloudflare (one command)
4. Tool updates at `tools.domain.com`
✅ Done (30 seconds)

---
