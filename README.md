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
/lp/brand/ai                  <- built (structural clone of Cyber —
                                  same copy, new AI color system/assets;
                                  real AI copy is a future pass)
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
                          (renders the Cyber page directly there instead,
                          in a static export — see "Deploying as a static
                          export" below)
  globals.css             Design tokens (colors, fluid type scale) for Tailwind v4
  api/lead/route.ts        Receives + validates leads, forwards to LEAD_WEBHOOK_URL
                            (Node.js-only — excluded from static exports)
  lp/
    layout.tsx              Shared shell for all campaign pages (analytics)
    brand/cyber/page.tsx      The Brand Cyber landing page
    brand/ai/page.tsx          The Brand AI landing page (structural clone
                                 of Cyber — see content/landing/brand-ai.ts)

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
  leads/submitLead.ts       Client -> /api/lead (Node.js build) or ->
                             window.LEAD_SUBMIT_URL (static export build)
  tracking/
    utm.ts                 Captures + persists UTM/fbclid/gclid for the visit
    useTrackingContext.ts    Hook: current tracking context for a landing page
    analytics.ts             GTM / GA4 / Meta Pixel integration points

content/
  landing/brand-cyber.ts    Cyber page copy, kept separate from layout code
                             so headlines/CTAs/social proof can be swapped
                             without touching components
  landing/brand-ai.ts        AI page copy — currently identical Hebrew text
                              to brand-cyber.ts (a real rewrite is a future
                              pass), asset paths repointed to landing/ai/

public/
  landing/cyber/            Cyber-page-only image assets
  landing/ai/                AI-page-only image assets (10-slot set, same
                               slot roles as Cyber's; logos are NOT
                               duplicated here — see that folder's README)
  landing/shared/            Assets shared across landing pages
  lead-config.js             Static-export lead endpoint — a plain file,
                              not part of the JS bundle, editable directly
                              on a static host with no rebuild

scripts/
  build-static.sh            Produces the static export (see below)
```

## Lead flow

**Node.js build** (`npm run build` / Vercel): `LeadForm` → `POST /api/lead`
(server-side validation) → forwards to `LEAD_WEBHOOK_URL` if set, otherwise
logs and simulates success. The intended production path is Landing Page →
Google Sheets/webhook → Make → Fireberry CRM; nothing is wired to a real
destination yet.

**Static export build** (`npm run build:static`): there is no server to run
`/api/lead` on, so `LeadForm` posts straight to `window.LEAD_SUBMIT_URL`
instead (set in `public/lead-config.js`, empty by default). While empty, a
submission shows an honest "not connected yet" message — it never fakes a
success. See "Deploying as a static export" below.

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
- The AI page reuses the same `brand-*`/`teal-*`/`lime-*` hue tokens (its
  turquoise/purple/lime already match those hex values) but swaps
  backgrounds to the `ai-dark` / `ai-light` / `ai-plum` tokens in
  `app/globals.css`, so it reads turquoise-dominant with purple as a
  genuine but supporting accent, not a purple page. `CTAButton` (and
  `StickyMobileCTA`, which forwards it) takes an `accent="teal"` prop for
  this — `variant="primary"` defaults to `accent="brand"` (Cyber's purple)
  unchanged.
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

## Deploying as a static export (no Node.js host)

For hosting with **no Node.js runtime** — plain shared/cPanel Apache
hosting, for example — build a plain HTML/CSS/JS export instead:

```bash
npm run build:static                          # Cyber, deploys under /<domain>/cyber/
STATIC_BASE_PATH="" npm run build:static       # Cyber, deploys at the domain root

npm run build:static:ai                        # AI, deploys under /<domain>/ai/
STATIC_BASE_PATH="" npm run build:static:ai    # AI, deploys at the domain root
```

Each produces `./out` (one command at a time — re-run for the other page,
`out/` is overwritten). `output: "export"` builds every route in the app
regardless of which command you ran, so `out/` also contains the *other*
page's `/lp/brand/...` folder — that copy is non-functional (its assets
resolve against the wrong basePath) and should not be uploaded; upload
only `index.html`, `_next/`, `landing/`, `lead-config.js`, `favicon.ico`,
and the one `lp/brand/<page>/` folder that matches the command you ran.
Upload **those contents** (not a wrapping folder) into the target
directory on the host — `index.html` must sit directly inside it. Nothing
else on the server is required; no database, no build step, no
`npm install` on the host.

How it differs from the normal build, and why:

- `app/api/lead/route.ts` can't run without a server, so
  `scripts/build-static.sh` (Cyber) / `scripts/build-static-ai.sh` (AI)
  moves it out of `app/` for the duration of this one build only and
  restores it immediately after (success or failure) — `git status` is
  clean before and after every run. Lead forms post to
  `window.LEAD_SUBMIT_URL` instead (see "Lead flow" above and "Activating
  the lead forms later" below).
- `next.config.ts` sets `output: "export"` and `images: { unoptimized: true }`
  only when `STATIC_EXPORT=1` — the normal `npm run build` / Vercel path
  is entirely unaffected, and both builds share this one config file.
- `STATIC_BASE_PATH` (default `/cyber`) controls where the exported site
  expects to live. Every asset URL in the build is prefixed with it at
  build time — `next/image`'s `unoptimized` mode and `next/script`'s
  `beforeInteractive` strategy don't apply Next's usual automatic
  basePath prefixing, so `content/landing/brand-cyber.ts` and
  `app/lp/layout.tsx` prepend it by hand via `NEXT_PUBLIC_BASE_PATH`
  (also injected only for this build). If the deployment target changes,
  re-run the command with a different `STATIC_BASE_PATH` — nothing else
  needs to change.
- `/` renders the target page directly (Cyber or AI, picked by
  `STATIC_PAGE` — see `app/page.tsx` / `next.config.ts`) instead of
  redirecting, since a static host has no server to issue that redirect
  from — the normal build's `/` still redirects to `/lp/brand/cyber`,
  unchanged. `/lp/brand/cyber/` (or `/lp/brand/ai/`) also still works in
  the static export (both point at the same page as `/`).
- All the page's client-side behavior — Motion animations, the FAQ
  accordion, the sticky mobile CTA, form validation, UTM/fbclid/gclid
  capture — is plain client-side React with no server dependency, so all
  of it works identically in the static export.

### Activating the lead forms later

Submissions do nothing but show an honest "not connected yet" message
until `public/lead-config.js` has a real endpoint:

```js
window.LEAD_SUBMIT_URL = "https://hook.eu1.make.com/xxxxxxxxxxxx";
```

Edit that one file (locally and rebuild+re-upload, or directly on the
server — it's a plain file, not part of the JS bundle) — no Node.js and no
rebuild is required just to change the endpoint. Verify the destination
(Make.com webhook, or similar) accepts a cross-origin `POST` from the
browser (CORS) before relying on it; if it doesn't, front it with a small
same-origin relay.
