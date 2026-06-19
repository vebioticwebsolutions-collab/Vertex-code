# Design Overhaul Brief — Vertex by Primesteeltech

## What this site is
A marketing website + live quote engine for a scaffolding/access-equipment manufacturer (Ringlock scaffolding systems, staircase access towers, walkway planks). Built with Astro + Tailwind, dark theme throughout. Audience is B2B/industrial buyers (construction, infrastructure, refinery, real estate procurement teams) — the brand needs to feel like a serious heavy-engineering manufacturer, not a tech startup.

## The ask
**Colour scheme overhaul only.** Do not change page text/copy, image content, page layout, section order, or component structure. Every page should keep its current sections, grids, and content — only the colour palette (backgrounds, accent colour, button fills, borders, glow/shadow effects) is being redesigned.

## What's wrong with the current palette
The whole site currently runs on Tailwind's stock `emerald-500` (#10B981) green paired with `teal-400` gradients, on near-black backgrounds (#050F09 / #0A170E). The execution leans heavily on:
- Neon glow box-shadows around buttons and cards (bright green halo effect)
- Bright two-colour gradients on every CTA button (emerald → teal)
- Glowing pulsing dots/rings, animated badges
- A bright, almost mint/neon-mint green that reads as "AI app" or generic SaaS rather than an industrial manufacturer

We want to keep the **identity** (dark + green, premium, modern, high-end industrial) but swap the actual green and the treatment of effects so it reads as formal, confident, and engineered — closer to a heritage industrial brand (think structural steel, military-grade equipment, premium automotive) than a consumer tech product.

## Recurring visual patterns site-wide (these are what need recolouring)
- Gradient text on H1 headings (currently emerald→teal)
- Gradient-fill CTA buttons (currently emerald→teal)
- Glow box-shadows on cards/buttons on hover
- Hover lift effect on cards (translate up slightly) combined with a green border glow
- Pulsing/animated dot indicators (used in maps, coverage zones, live-status badges)
- Dashed line connectors between numbered process steps
- Radio-button "selection cards" that highlight green when selected (used heavily in the quote engine and product config)
- Marquee/certification logo strips
- Backdrop-blur dark panels layered over background imagery

## Page-by-page structure (for layout context only — do not change any of this)

**Home (`/`)** — Hero with tagline + CTA → video section → split feature layout (dark/light contrast cards) → stats banner (e.g. tonnage delivered, compliance %) → 4-sector industry grid (high-rise, infrastructure, refineries, architectural) → 3-step "how to procure" flow → certification marquee strip → client logo strip → parent-company cross-promo.

**About (`/about`)** — Hero → achievement stat bar → split image/text brand-heritage section → 2 leadership/director cards → 3-column "why us" feature grid → animated distribution-hub map (pulsing location dots, dashed connector lines) → regional delivery-zone tag list → footer CTA.

**Products catalog (`/products`)** — Hero → buyer's guide promo box (download + contact CTAs) → 3 flagship-product sections (Ringlock, Staircase Tower, Walkway Planks) each with imagery + "learn more" → full product grid (~19 items) with category filter buttons and hover-reveal spec cards.

**Product detail pages (`/products/ringlock-scaffolding`, `/products/staircase-tower`, `/products/walkway-planks`)** — All three share one template: breadcrumb → hero with CTA pair (configure & quote / download specs) → "system architecture" 4-column component grid → "extreme environments" image showcase (3 images with text overlay) → 3-step erection-process flow → technical specs table → cross-sell links to the other two products → FAQ accordion.

**Rentals (`/rentals`)** — Hero with phone CTA → "why rent" 3-benefit grid → asset spotlight (image + feature bullets) → 4-step rental process with connector lines → coverage-area city grid with pulse indicators → FAQ accordion → final CTA with phone link.

**Our Projects (`/our-projects`)** — Hero → portfolio carousel housed in a tablet-device mockup frame (10 project slides, gradient overlays, prev/next arrows, dot indicators, auto-rotate) → CTA action hub → phone-sales section.

**Find Us (`/find-us`)** — Hero → regional logistics sections, each a grid of city/zone link-buttons grouped by area (multiple regions, each with its own sub-grid of 6–10+ locations) → corporate HQ + quote CTA footer. Primarily a dense taxonomy of link buttons/tags.

**Dynamic location pages (`/locations/[state]/[city]`)** — Same template per city: breadcrumb → localized hero → delivery/logistics split section → product benefit grid (2 image cards) → spec cards (icon + label) → 3-column "why choose us in [city]" grid → 4-sector industry card grid → CTA footer.

**Contact Us (`/contact-us`)** — Hero → two-panel layout: left = HQ info card (address, phone, WhatsApp CTA, email, department routing), right = contact form (name, company, phone, dropdown, message, submit) → embedded map (currently grayscale/contrast-filtered).

**FAQ (`/faq`)** — Hero + live search input → accordion FAQ list grouped into ~4 categories with category badges → "no results" empty state.

**Blogs (`/blogs`)** — Hero → rotating "trending posts" carousel (auto-advances) → category filter row → blog card grid (read-time badge, category tag, excerpt, date).

**Quote Engine (`/quote`)** — The most complex page: a 7-step form wizard with a progress bar. Steps: (1) intro splash, (2) product selection (radio cards with images), (3) sub-selection of fold/hook/material type depending on product (more radio cards), (4) dimension input matrix (length/width/height/qty + remarks), (5) business details form, (6) 4-digit OTP verification (auto-advancing input boxes), (7) success/confirmation screen with checkmark animation. A floating "call us" button persists in the bottom-right across all steps. **This page has the heaviest use of the green "selected state" highlight and progress-bar fill — get the new green right here especially, since it's the conversion-critical page.**

**Shared header/footer (every page)** — Top utility bar (social icons), main nav with a dropdown for Products, a "NEW" badge tag style, a pulsing-dot "live" badge on the Quote CTA button, and a gradient-fill primary CTA button. Footer is a 4-column link directory + bottom bar. These should be restyled first since the look propagates to every page.

## Proposed colour direction (pick one, or mix-and-match green + black pairing)

### Green options
**A — Bottle/Racing Green** (most formal, closest to "heritage industrial")
- Primary green: `#0E3B2E`
- Accent/interactive green (links, active states, focus rings): `#3C8C6B` (muted sage-green, not neon)
- Use sparingly for highlight text/icons: `#5FAE8C`

**B — Deep Forest Green** (slightly richer/darker, more premium-automotive)
- Primary green: `#12352A`
- Accent/interactive green: `#4F9D78`
- Highlight accent: `#79C2A0`

**C — Pine/Industrial Green** (cooler, more "structural steel" feeling, least warm)
- Primary green: `#16332B`
- Accent/interactive green: `#3E8E76`
- Highlight accent: `#6BB89E`

All three intentionally desaturate and darken from the current neon `#10B981` — none should glow. CTAs should be solid-fill (not gradient) using the accent green, with white or near-black text depending on contrast, and no animated halo/box-shadow glow on hover — replace glow effects with a simple 1px border brightening or a subtle background lighten.

### Black/near-black pairing options
1. **Keep current near-black, warm-tinted** — `#070D0A` / `#0A130E` (very close to existing `#050F09`/`#0A170E`, minimal disruption, still reads "green-black" not "pure black")
2. **True neutral black** — `#0A0A0A` / `#121212` with green used only as accent (higher contrast, more "formal corporate," less "green-tinted everything")
3. **Charcoal-green hybrid** — `#0C1410` / `#111C16` (a middle ground — black with a deliberate cool green undertone, pairs well with option C above)

## What to deliver
A single consistent set of colour tokens (background levels, primary green, accent green, text colours, border colours, button states) applied across every page and component listed above — replacing the neon-emerald-gradient-glow treatment with the chosen formal dark-green palette, with no changes to copy, imagery, or layout structure.
