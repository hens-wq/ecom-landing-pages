# Ecom College — Performance Landing Pages

Landing page platform for Ecom College (מכללת איקום) paid-advertising
campaigns. Separate project from the existing Ecom training system.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4 (theme tokens in `app/globals.css`)
- Motion for React (`motion/react`) for scroll-triggered animation
- Lucide icons
- Heebo (`next/font/google`), full RTL (`<html lang="he" dir="rtl">`)

## Getting started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` to configure lead delivery / analytics
(all optional — the app works with none of them set).

## Route architecture

Every campaign page lives under `/lp`, grouped by campaign type:

```
/lp/brand/cyber              <- built
/lp/brand/ai                    not yet built
/lp/brand/digital-marketing     not yet built
/lp/brand/hightech               not yet built
/lp/general/cyber                not yet built
/lp/general/ai                   not yet built
/lp/general/hightech              not yet built
```

`app/lp/layout.tsx` is the shared shell for all of them (currently just
analytics injection). `/` redirects to `/lp/brand/cyber` since the project
has no marketing homepage — traffic always lands directly on a campaign URL.

## Project structure

```
app/
  layout.tsx            Root layout: Heebo font, lang="he" dir="rtl"
  page.tsx               Redirects "/" -> the current live campaign page
  globals.css             Design tokens (colors, fluid type scale) for Tailwind v4
  api/lead/route.ts        Receives + validates leads, forwards to LEAD_WEBHOOK_URL
  lp/
    layout.tsx              Shared shell for all campaign pages (analytics)
    brand/cyber/page.tsx      The Brand Cyber landing page

components/
  ui/                 Presentation primitives (CTAButton, AnimatedSection,
                       TrustMetric, Testimonial, FAQ, StickyMobileCTA,
                       ImagePlaceholder) — each takes a `variant`/`effect`
                       prop rather than looking identical everywhere.
  forms/               LeadForm + FormSuccessState
  layout/              Cross-cutting layout components (AnalyticsScripts)

lib/
  types.ts               Shared types (LandingPageId, LeadFormValues, ...)
  utils.ts                cn() class-merging helper
  validation.ts            Field validation, incl. Israeli phone numbers
  leads/submitLead.ts       Client -> /api/lead submission call
  tracking/
    utm.ts                 Captures + persists UTM/fbclid/gclid for the visit
    useTrackingContext.ts    Hook: current tracking context for a landing page
    analytics.ts             GTM / GA4 / Meta Pixel integration points

content/
  landing/brand-cyber.ts    Cyber page copy, kept separate from layout code
                             so headlines/CTAs/social proof can be swapped
                             without touching components

public/
  landing/cyber/            Cyber-page-only image assets
  landing/shared/            Assets shared across landing pages
```

## Lead flow

`LeadForm` → `POST /api/lead` (server-side validation) → forwards to
`LEAD_WEBHOOK_URL` if set, otherwise logs and simulates success. The
intended production path is Landing Page → Google Sheets/webhook → Make →
Fireberry CRM; nothing is wired to a real destination yet.

UTM params (`utm_source/medium/campaign/content/term`), `fbclid` and
`gclid` are captured from the URL on first touch and persisted in
`sessionStorage` for the rest of the visit, then submitted alongside every
lead as both JSON fields and hidden form inputs.

## Analytics

GTM / GA4 / Meta Pixel each activate only when their ID env var
(`NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID`)
is set — see `components/layout/AnalyticsScripts.tsx` and
`lib/tracking/analytics.ts`. No IDs are hardcoded.

## Design system notes

- Brand color `#8c52ff`, accents `#34d1c3` / `#85ed72`, on a near-black /
  charcoal / off-white base — see the `brand-*`, `teal-*`, `lime-*` and
  `ink-*` tokens in `app/globals.css`. The page is not meant to read as
  "all purple."
- Fluid, editorial type scale (`text-display-sm` … `text-display-2xl`) for
  headlines, defined with `clamp()` so large campaign headlines scale
  smoothly from 390px mobile up to desktop without breakpoint jumps.
- `components/ui/*` are primitives, not a rigid design system — each
  landing page is free to compose them differently (see `AnimatedSection`'s
  `effect` prop, `Testimonial`'s `variant` prop, etc.) so future pages
  don't end up visually identical to Cyber.
- **No low-contrast grey marketing text on dark backgrounds.** On a dark
  section, primary text is off-white/white; secondary or supporting text
  (including disclaimers, labels, captions) is `ink-200` at minimum, or a
  brand/teal/lime accent color — never `ink-300/400/500`, which read as
  almost invisible there. Differentiate "secondary" with size, weight,
  spacing, or accent color, not by darkening the grey. Those darker ink
  shades stay fine for borders, dividers, icons, and text on light
  (`paper`/`off-white`) backgrounds. See the note in `app/globals.css`.
  This applies to every landing page in this project, not just Cyber.

## Deploying to Vercel

- Framework: Next.js (App Router). Vercel auto-detects it — no `vercel.json`
  or other config needed; connect the repo (or `vercel deploy`) and go.
- `/` responds with a 307 redirect to `/lp/brand/cyber` (see `app/page.tsx`)
  — intentional for now, since the project has no marketing homepage yet
  and all paid traffic lands directly on a campaign URL.
- Environment variables (Project Settings → Environment Variables — see
  `.env.example` for the full list with comments):
  - `LEAD_WEBHOOK_URL` — server-side only, never sent to the client. Leave
    unset to keep leads validated + logged only; no real lead is sent
    anywhere until this is set to a real endpoint.
  - `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_META_PIXEL_ID`
    — each analytics integration activates independently once its ID is
    set; all three are optional and the page works cleanly with none set.
  - `NEXT_PUBLIC_*` vars are inlined into the client bundle at **build**
    time, not read at request time — set them before the first deploy, and
    **redeploy** after adding/changing one (saving the env var alone does
    not update an already-built deployment). Set them per-environment
    (Production vs. Preview) if the IDs differ.
- Images: every image on the page is local
  (`public/landing/cyber/*.webp`), served through `next/image`'s built-in
  optimizer — no `images.remotePatterns`/external image config required.
- `app/layout.tsx` sets `robots: { index: false, follow: false }` (a
  paid-traffic-only page, not meant to be organically indexed today).
  Revisit that if/when organic discovery of this URL is wanted.
- No database and no serverless config beyond the standard
  `app/api/lead/route.ts` route handler — a default Vercel Next.js
  deployment covers the whole app.
