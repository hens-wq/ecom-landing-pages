# Assets — Brand AI

Production assets (client-supplied, 2026-09-08). Same rules as
`public/landing/cyber/README.md` — replace a file in place (keep the
filename) or point the relevant field in `content/landing/brand-ai.ts` at
a new file; no component changes needed.

| File | Used in | Role |
| ---- | ------- | ---- |
| `10-ai-hero-professional.webp` | `HeroSection` | Hero full-bleed background. `priority`-loaded (LCP). |
| `07-ai-bg-light.webp` | `TrustBarSection` | Light-section background — the page's rhythm break after the dark Hero. |
| `02-ai-bg-dark.webp` | `ArielTrustSection` | Subtle dark texture behind the credibility section. |
| `04-ai-practical-training.webp` | `ObjectionSection` | Supporting photo for the hands-on/practical reassurance message. |
| `01-ai-wide.webp` | `CyberExperienceSection` | Full-bleed background texture (very low opacity) — atmosphere, not the section's focal image. |
| `08-ai-specialist.webp` | `CyberExperienceSection` | The section's actual focal content photo. |
| `03-ai-bg-accent.webp` | `MidFormSection` | Full-bleed background behind the mid-page form. |
| `06-ai-team.webp` | `CareerSection` | Full-bleed transition band at the top of the section. |
| `05-ai-career-office.webp` | `CareerSection` | The section's contained 4:5 portrait photo. |
| `09-ai-final-room.webp` | `FinalSection` | Full-bleed cinematic background for the closing conversion section. |

The Ecom + Ariel logos are **not duplicated here** — this page reuses the
files already in `public/landing/cyber/` (brand-level assets shared
across every landing page, not part of this page's own 10-slot photo
set); see `SHARED_ASSETS` in `content/landing/brand-ai.ts`.

Do not bake copy into images — headlines, stats and CTAs stay as real
HTML text so they can be edited without touching assets.
