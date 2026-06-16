# Vertex by PST — Phase-wise Implementation Plan

> **Stack:** Astro (SSR) · FastAPI (Render) · PostgreSQL (Supabase) · Cloudflare R2 · Resend
> **Repo structure:** Monorepo `pstm-platform` → `/frontend-public` · `/frontend-internal` · `/backend` · `/database`

---

## Overview of Phases

| # | Phase | Owner | Outcome |
|---|-------|-------|---------|
| 1 | Project Scaffolding & Repo Setup | Both | Monorepo wired, envs configured, CI/CD stubs |
| 2 | Backend Foundation | Backend | DB schema, auth, rate entry, core calculation logic |
| 3 | Public Site | Frontend | Homepage, Products, Calculator flow + OTP + Result |
| 4 | Internal Tool | Frontend | Login, Dashboard, Rate entry UI, Calculators, History |
| 5 | Integration & End-to-End Testing | Both | All flows verified end-to-end, edge cases handled |
| 6 | Production Deployment | Both | Live on Vercel + Render + Supabase + R2 + Resend |

---

## Phase 1 — Project Scaffolding & Repo Setup

> **Goal:** Everyone can clone the repo and run their part locally. No logic yet — just structure, tooling, and environment wiring.

### 1.1 Monorepo Initialization
- [ ] Create GitHub repo `pstm-platform` (or connect the existing `Vertex by PST` repo)
- [ ] Set up monorepo folder structure:
  ```
  /
  ├── frontend-public/     ← Astro SSR (public website)
  ├── frontend-internal/   ← Astro SSR (staff tool)
  ├── backend/             ← FastAPI app
  └── database/            ← SQL migrations + schema docs
  ```
- [ ] Add a root `README.md` with architecture overview, setup instructions, and env var list
- [ ] Add `.gitignore` covering `node_modules`, `__pycache__`, `.env`, `.astro`, `dist/`

### 1.2 Frontend Scaffolding (both Astro projects)
- [ ] `cd frontend-public && npm create astro@latest` — choose SSR mode (Node or Vercel adapter)
- [ ] `cd frontend-internal && npm create astro@latest` — same SSR setup
- [ ] Install shared deps in both: `nanostores` (for client state), Astro React/Svelte island adapter (pick one framework for islands)
- [ ] Set up `.env` files in each:
  - `PUBLIC_API_URL=http://localhost:8000` (dev)
- [ ] Create placeholder pages in `frontend-public`: `/`, `/rate-working`, `/rate-working/[type]`, `/products`, `/contact`, `/thank-you`
- [ ] Create placeholder pages in `frontend-internal`: `/login`, `/dashboard`, `/rates`, `/calculator/walkway`, `/calculator/staircase`, `/history`

### 1.3 Backend Scaffolding
- [ ] `cd backend && python -m venv venv && pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose[cryptography] passlib[bcrypt] python-multipart resend boto3 weasyprint`
- [ ] Create `requirements.txt`
- [ ] Set up folder structure:
  ```
  backend/
  ├── main.py
  ├── routers/
  │   ├── public.py        ← /api/public/*
  │   ├── internal.py      ← /api/internal/*
  │   └── auth.py          ← /auth/*
  ├── models/              ← SQLAlchemy ORM models
  ├── schemas/             ← Pydantic request/response models
  ├── services/
  │   ├── calculator.py    ← Walkway + Staircase calculation logic
  │   ├── pdf.py           ← PDF generation
  │   ├── email.py         ← Resend integration
  │   └── r2.py            ← Cloudflare R2 upload/signed URL
  ├── db.py                ← DB connection + session
  └── auth.py              ← JWT creation + verification
  ```
- [ ] Set up `.env`:
  ```
  DATABASE_URL=postgresql://...
  JWT_SECRET=...
  R2_ACCESS_KEY=...
  R2_SECRET_KEY=...
  R2_BUCKET=...
  R2_PUBLIC_URL=...
  RESEND_API_KEY=...
  ```
- [ ] Confirm FastAPI starts: `uvicorn main:app --reload` → `GET /` returns `{"status": "ok"}`
- [ ] Set up CORS in `main.py` to allow `localhost:4321` (Astro dev) and eventual production origins

### 1.4 Database — Supabase Setup
- [ ] Create Supabase project, get connection string
- [ ] Write SQL migrations in `/database/`:
  ```sql
  -- 001_create_users.sql
  -- 002_create_rate_log.sql
  -- 003_create_quotes.sql
  -- 004_create_calc_cache.sql
  -- 005_create_otp_tokens.sql
  ```
- [ ] Apply migrations via Supabase SQL editor or `psql`
- [ ] Confirm SQLAlchemy connects from backend: add a health check route that does a simple `SELECT 1`

**✅ Phase 1 done when:** Both Astro dev servers run, FastAPI starts and connects to DB, all placeholder routes return 200, everyone on team can clone and run.

---

## Phase 2 — Backend Foundation

> **Goal:** All API endpoints are functional, tested with curl/Postman, ready for frontend to integrate against.

### 2.1 Database Models (SQLAlchemy ORM)
- [ ] `User` model: `id, name, email, hashed_password, role, created_at, last_login`
- [ ] `RateLog` model: `id, date, ms_rate_per_kg, gp_rate_per_kg, entered_by (FK→users), created_at`
- [ ] `Quote` model: `id, type, source, inputs (JSON), rate_used, final_rate_rs, weight_kg, lead_name, lead_email, lead_phone, lead_location, email_verified, pdf_url, staff_id (nullable FK→users), created_at`
- [ ] `CalcCache` model: `cache_key (PK hash), type, inputs (JSON), weight_kg, component_data (JSON), created_at`
- [ ] `OtpToken` model: `quote_token (PK), otp_hash, email, expires_at, verified (bool), attempts (int)`
- [ ] Seed one admin user for testing: `python seed.py`

### 2.2 Auth System
- [ ] `POST /auth/login` — accepts `{email, password}`, validates against `users` table, returns `{access_token, token_type, expires_in, user: {name, role}}`
- [ ] JWT utility: `create_token(user_id)` + `decode_token(token)` using `python-jose`
- [ ] FastAPI dependency: `get_current_user` → validates `Authorization: Bearer` header, raises `401` if invalid/expired
- [ ] Protect all `/api/internal/*` routes with `Depends(get_current_user)`

### 2.3 Rate Entry API
- [ ] `POST /api/internal/rates` (JWT) — saves new rate entry to `rate_log`, returns `{status, date, entered_by}`
- [ ] `GET /api/internal/rates` (JWT) — returns last 30 entries (sorted by date desc), plus `today_ms_rate`, `today_gp_rate`
- [ ] `GET /api/internal/dashboard` (JWT) — returns today's rate, count of quotes today, count of quotes this week

### 2.4 Walkway Calculation Engine
- [ ] Implement pure calculation function for all **7 walkway plank types** in `services/calculator.py`:
  - `2fold-no-hook`
  - `2fold-with-hook`
  - `3fold-no-hook`
  - `3fold-with-hook`
  - `channel-type`
  - `plain-flat`
  - `toothed-flat`
  - Each function accepts dimensions (length, width, thickness, bottom_bend where applicable) and returns: `{sheet_weight_kg, stiffner_weight_kg, end_plate_weight_kg, hook_weight_kg, total_weight_kg}`
- [ ] Implement caching logic: hash `(type + dims)` → check `calc_cache` table → if hit, skip recalculation
- [ ] `POST /api/public/walkway/calculate` — runs calculation (with cache), stores result in `calc_cache`, generates a `quote_token` UUID, stores preliminary record in `otp_tokens` table, returns `{quote_token, status: "calculated"}`
- [ ] `POST /api/internal/walkway/calculate` (JWT) — full calculation, uses today's rate from `rate_log`, saves to `quotes` table, returns full detailed response with `breakdown`, `rate_working`, `summary`, `quote_id`

### 2.5 Staircase Tower Calculation Engine
- [ ] Implement BOQ calculation for all staircase configs in `services/calculator.py`:
  - `4leg` / `8leg` variants
  - `antiskid-3.8x1.8` / `antiskid-2.4x1.2` / floor-type configs
  - Inputs: `config`, `platform_height_m`, `num_towers`, `finish`
  - Output: full BOQ array + `{total_weight_kg, total_price_rs, rate_per_mtr_rs, kg_per_mtr}`
- [ ] `POST /api/internal/staircase/calculate` (JWT) — runs BOQ, saves to `quotes`, returns full BOQ + summary + `quote_id`

### 2.6 Lead Submit + OTP Flow
- [ ] `POST /api/public/lead/submit` — accepts `{quote_token, name, location, phone, email}`:
  1. Look up `otp_tokens` table by `quote_token` (must not be expired)
  2. Generate 6-digit OTP → hash it → store in `otp_tokens` with `expires_at = now + 10 min`
  3. Send OTP email via Resend (`services/email.py`)
  4. Returns `{status: "otp_sent", message: "OTP sent to ...", expires_in_seconds: 600}`
- [ ] `POST /api/public/lead/verify-otp` — accepts `{quote_token, otp}`:
  1. Check OTP hash, expiry, and attempts (max 5)
  2. On success: mark `verified=true`, retrieve calc result from cache
  3. Apply today's material rate to get `final_rate_rs`
  4. Generate PDF via `services/pdf.py` (WeasyPrint or ReportLab)
  5. Upload PDF to Cloudflare R2 via `services/r2.py`
  6. Save complete `Quote` record including `lead_*` fields, `pdf_url`, `email_verified=true`
  7. Send quote email to lead with PDF link via Resend
  8. Return full result: `{final_rate_rs, weight_kg, plank_size, thickness_mm, rate_date, pdf_url, quote_id}`

### 2.7 Quotes History API
- [ ] `GET /api/internal/quotes` (JWT) — paginated, filterable by `type`, `from`, `to`, `source`, `page`, `per_page`
- [ ] Returns `{total, page, quotes: [...]}`

### 2.8 PDF Template
- [ ] Design PDF template for walkway quotation (HTML → WeasyPrint):
  - Company header + logo
  - Customer: name, location, date
  - Inputs: plank type, dimensions
  - Results: weight breakdown, rate, final price
  - "Valid for 7 days" footer

**✅ Phase 2 done when:** All endpoints documented in the plan return correct responses in Postman. All validation, error cases (OTP expired, wrong OTP, token not found) return proper error responses.

---

## Phase 3 — Public Site (Astro)

> **Goal:** A customer visits the public website, calculates a walkway rate, verifies their email via OTP, and receives a PDF quote.

### 3.1 Design System
- [ ] Set up global CSS tokens: colors, spacing, typography (use Google Fonts — Inter or Outfit)
- [ ] Create shared layout component: `<Layout>` with `<head>` SEO, nav, footer
- [ ] Create reusable components: `<Button>`, `<InputField>`, `<Card>`, `<StepIndicator>`

### 3.2 Homepage `/`
- [ ] Company intro + Vertex by PST branding
- [ ] Hero section with strong CTA → "Get Rate" → links to `/rate-working`
- [ ] Product overview cards (walkway + staircase tower teaser)
- [ ] SEO: `<title>`, `<meta description>`, Open Graph tags, `schema.org` Organization markup
- [ ] Fully static (no API call)

### 3.3 Products Page `/products`
- [ ] Static page per product with: name, description, specs, use cases, hero image
- [ ] CTA on each product → `Go to Rate Calculator`
- [ ] SEO structured product data

### 3.4 Rate Calculator Hub `/rate-working`
- [ ] Grid of 7 walkway plank type cards
- [ ] Each card: name, short description, image/illustration
- [ ] Click → navigate to `/rate-working/[type]`
- [ ] Static page — no API call

### 3.5 Calculator Page `/rate-working/[type]` ← Core Feature
This is a multi-step Astro Island (client-side React/Svelte component):

**Step 1 — Spec Input Form**
- [ ] Dynamic fields based on `type` param (length, width, thickness, bottom_bend if applicable)
- [ ] Client-side validation (required, numeric ranges)
- [ ] "Calculate" button → `POST /api/public/walkway/calculate`
- [ ] Store returned `quote_token` in component state
- [ ] Show loading state, handle API errors

**Step 2 — Lead Capture Form**
- [ ] Shown after Step 1 succeeds
- [ ] Fields: Full Name, Location (city/state), Phone, Email
- [ ] Validation: phone format, email format
- [ ] "Send OTP" button → `POST /api/public/lead/submit` (with `quote_token`)
- [ ] Store `expires_in_seconds` for countdown

**Step 3 — OTP Screen**
- [ ] 6-box OTP input (auto-focus, auto-advance)
- [ ] 10-minute countdown timer
- [ ] "Resend OTP" button (re-calls `POST /api/public/lead/submit`)
- [ ] "Verify" button → `POST /api/public/lead/verify-otp`
- [ ] Handle wrong OTP, expired OTP gracefully with error messages

**Step 4 — Result Display**
- [ ] Shown after OTP verified
- [ ] Show: final rate (Rs.), weight (kg), plank size, rate date
- [ ] PDF download button (opens `pdf_url` from API)
- [ ] "Check your email" message
- [ ] Navigation: "Calculate another" link

### 3.6 Contact Page `/contact`
- [ ] Company address, phone, email, Google Maps embed
- [ ] Optional contact form (static or light API call)

### 3.7 Thank You / Confirmation Page `/thank-you`
- [ ] Summary of what was submitted
- [ ] "Your quotation PDF has been sent to your email"
- [ ] CTA back to homepage or products

**✅ Phase 3 done when:** A full public calculator flow works end-to-end in the browser: enter specs → enter lead info → receive OTP on real email → verify → see result + download PDF.

---

## Phase 4 — Internal Staff Tool (Astro)

> **Goal:** Staff can log in, enter daily material rates, calculate walkway + staircase quotes in full detail, and browse quote history.

### 4.1 Auth Guard
- [ ] Create a middleware/utility `requireAuth()` that checks for JWT in `localStorage`
- [ ] If no token or token expired → redirect to `/login`
- [ ] Apply to all pages except `/login`
- [ ] Create API utility wrapper that auto-attaches `Authorization: Bearer {token}` header

### 4.2 Login Page `/login`
- [ ] Email + password form
- [ ] `POST /auth/login` → on success, save `access_token` to `localStorage`, redirect to `/dashboard`
- [ ] Error: "Invalid credentials" message
- [ ] No registration UI (accounts are created by admin only)

### 4.3 Dashboard `/dashboard`
- [ ] Call `GET /api/internal/dashboard` on load
- [ ] Show: today's MS rate, GP rate, quotes generated today, quotes this week
- [ ] Quick-link cards: "Go to Walkway Calculator", "Go to Staircase Calculator", "Enter Today's Rate", "View History"
- [ ] Logout button → clear `localStorage`, redirect to `/login`

### 4.4 Rate Entry Screen `/rates`
- [ ] Show current rate (from `GET /api/internal/rates`)
- [ ] Form: MS Rate (Rs./kg), GP Rate (Rs./kg)
- [ ] `POST /api/internal/rates` → show success confirmation
- [ ] Rate history table: date, MS rate, GP rate, entered by (last 30 entries)

### 4.5 Walkway Calculator `/calculator/walkway`
- [ ] Type selector (all 7 types — tabs or dropdown)
- [ ] Full input form for selected type (all fields visible)
- [ ] Calculate button → `POST /api/internal/walkway/calculate`
- [ ] Result panel: full breakdown display
  - Summary: total weight, final rate (Rs.)
  - Breakdown: sheet wt, stiffner wt, end plate wt, hook wt
  - Rate working: std weight, std rate, raw material rate, diff/kg
- [ ] Option to save/generate PDF for the quote (call a dedicated `GET /api/internal/quotes/{id}/pdf` or reuse pdf_url from response)

### 4.6 Staircase Tower Calculator `/calculator/staircase`
- [ ] Config selector: 4-leg / 8-leg, platform size variants
- [ ] Inputs: platform height (m), number of towers, finish (painted/galvanized)
- [ ] Calculate button → `POST /api/internal/staircase/calculate`
- [ ] Result panel:
  - Summary: total weight (kg), total price (Rs.), rate/mtr, kg/mtr
  - Full BOQ table: item name, qty, weight each, total weight, rate, total price

### 4.7 Quote History `/history`
- [ ] Table view with columns: ID, Date, Type, Source (public/internal), Lead Name, Final Rate
- [ ] Filter controls: type (walkway/staircase/all), date range picker, source (public/internal/all), staff member
- [ ] Pagination (25 per page, from `GET /api/internal/quotes?page=...`)
- [ ] Expandable row → shows full inputs used for that calculation
- [ ] "Download PDF" link per row (opens `pdf_url`)
- [ ] "Export CSV" button for current filter

**✅ Phase 4 done when:** Staff can log in, enter rates, run both calculators with full detail output, and browse + filter all past quotes.

---

## Phase 5 — Integration & End-to-End Testing

> **Goal:** Find and fix all issues before going live. Both frontend and backend test together.

### 5.1 Public Flow E2E Testing
- [ ] Full flow: specs → lead form → OTP email → verify → PDF link works
- [ ] Edge cases:
  - Wrong OTP (up to 5 attempts then lock)
  - OTP expired (resend works)
  - Calculation with min/max dimension values
  - Rate not entered yet today (backend should handle gracefully)
  - Duplicate email submissions

### 5.2 Internal Flow E2E Testing
- [ ] Login → wrong credentials → correct credentials
- [ ] Token expiry: leave internal tool open 24h → auto-redirect to /login
- [ ] Rate entry: enter rate → check it appears in dashboard
- [ ] Walkway calc for all 7 types — verify calculation results are correct
- [ ] Staircase calc for all configs — verify BOQ totals match
- [ ] History filters — verify correct data returned
- [ ] CSV export opens correctly formatted file

### 5.3 Cross-cutting Tests
- [ ] CORS: both Astro origins (public + internal) can call the API
- [ ] Environment variables: confirm no keys are exposed to frontend
- [ ] Mobile responsiveness: public site works on 375px (iPhone SE)
- [ ] PDF opens correctly on desktop and mobile (check Cloudflare R2 signed URL expiry)
- [ ] Email deliverability: OTP email + quote email land in inbox (not spam)
- [ ] SQL: confirm `calc_cache` actually prevents duplicate DB hits

### 5.4 Performance Checks
- [ ] Astro public site: Lighthouse score ≥ 90 (performance, SEO, accessibility)
- [ ] API response time: `/calculate` under 500ms (should be faster with cache hit)
- [ ] PDF generation: under 3 seconds

**✅ Phase 5 done when:** All flows pass without bugs. Errors are handled gracefully with user-friendly messages. No secret keys exposed.

---

## Phase 6 — Production Deployment

> **Goal:** Everything is live on real domains. All services connected to each other in production.

### 6.1 Supabase Production DB
- [ ] Create production Supabase project (separate from any dev project)
- [ ] Apply all migrations
- [ ] Get production `DATABASE_URL`

### 6.2 Cloudflare R2 Setup
- [ ] Create R2 bucket: `pstm-quotes-prod`
- [ ] Create API token (R2 read+write)
- [ ] Set up custom domain: `files.yourcompany.com` → R2 bucket
- [ ] Configure CORS on R2 bucket for public PDF access

### 6.3 Resend Email Setup
- [ ] Verify domain on Resend (`noreply@yourcompany.com`)
- [ ] Create API key
- [ ] Test OTP email and quote email templates in production

### 6.4 FastAPI — Deploy on Render
- [ ] Connect GitHub repo → Render Web Service
- [ ] Set build command: `pip install -r requirements.txt`
- [ ] Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Add all env vars on Render dashboard: `DATABASE_URL`, `JWT_SECRET`, `R2_*`, `RESEND_API_KEY`
- [ ] Set custom domain: `api.yourcompany.com`
- [ ] Test all endpoints on `https://api.yourcompany.com/docs`

### 6.5 Astro Public Site — Deploy on Vercel/Cloudflare Pages
- [ ] Connect `frontend-public/` directory in GitHub → Vercel project
- [ ] Add env var: `PUBLIC_API_URL=https://api.yourcompany.com`
- [ ] Configure SSR adapter (Vercel or Cloudflare)
- [ ] Set custom domain: `yourcompany.com`
- [ ] Verify HTTPS + redirects working

### 6.6 Astro Internal Tool — Deploy on Vercel/Cloudflare Pages
- [ ] Separate Vercel/CF Pages project for `frontend-internal/`
- [ ] Add env var: `PUBLIC_API_URL=https://api.yourcompany.com`
- [ ] Set custom domain: `tools.yourcompany.com`
- [ ] Optionally add Vercel IP allowlist or basic auth layer for extra security

### 6.7 Final Production Smoke Test
- [ ] Full public calculator flow on `yourcompany.com`
- [ ] Full internal staff flow on `tools.yourcompany.com`
- [ ] OTP email received at real email address
- [ ] PDF downloaded from R2 signed URL
- [ ] Quote appears in `/history` on the internal tool
- [ ] Backend logs show no errors on Render dashboard

**✅ Phase 6 done when:** All three URLs are live, flows work on real domains, no hardcoded localhost references remain.

---

## Dependency Map (What Must Come First)

```
Phase 1 (Scaffolding)
  └── Phase 2 (Backend Foundation)
        ├── Phase 3 (Public Site) — needs: /calculate, /lead/submit, /verify-otp
        └── Phase 4 (Internal Tool) — needs: /auth/login, /rates, /internal/calculate, /quotes
              └── Phase 5 (E2E Testing) — needs all of 3 + 4 complete
                    └── Phase 6 (Deployment)
```

> **Frontend can start Phase 3 + 4 in parallel with Phase 2** by mocking API responses locally. The API contract (request/response shapes) defined in the plan is the source of truth.

---

## Quick Reference: All API Endpoints

| Method | Endpoint | Auth | Phase |
|--------|----------|------|-------|
| POST | `/auth/login` | None | 2 |
| GET | `/api/internal/dashboard` | JWT | 2 |
| POST | `/api/internal/rates` | JWT | 2 |
| GET | `/api/internal/rates` | JWT | 2 |
| POST | `/api/public/walkway/calculate` | None | 2 |
| POST | `/api/internal/walkway/calculate` | JWT | 2 |
| POST | `/api/internal/staircase/calculate` | JWT | 2 |
| POST | `/api/public/lead/submit` | None | 2 |
| POST | `/api/public/lead/verify-otp` | None | 2 |
| GET | `/api/internal/quotes` | JWT | 2 |

---

## Key Principles (From the Original Plan)

> **The frontend team calls the API and displays what it returns.** They never handle calculation logic, database queries, PDF generation, or email sending — all of that lives in the backend. The API is the contract between both sides.

> **Astro Islands:** The calculator flow (Steps 1–4) requires client-side interactivity. Use an Astro Island component. The rest of the page (header, SEO metadata, product info) stays fully static Astro.

> **Frontend never touches the DB.** The frontend team does not need Supabase credentials.
