# Assets — Brand Cyber

Production assets (client-supplied, 2026-08-25). To swap any of them,
replace the file in place (keep the filename) or point the relevant
`src`/`bgSrc`/`imageSrc`/`transitionSrc` field in
`content/landing/brand-cyber.ts` at a new file — no component changes
needed. `fill` usages (all the full-bleed backgrounds) size to their
container; the rest size by `aspectRatio`.

| File | Used in | Role |
| ---- | ------- | ---- |
| `10-hero-dark-professional.webp` | `HeroSection` | Hero full-bleed background. `priority`-loaded (LCP). Mobile crop: `object-[32%_40%]`; desktop: `object-[55%_35%]`. |
| `07-bg-light.webp` | `TrustBarSection` | Light-section background — the page's rhythm break after the dark Hero. |
| `02-cyber-bg-dark.webp` | `ArielTrustSection` | Subtle dark texture behind the credibility section, at reduced opacity + gradient so it never reads as flat black. |
| `04-practical-training.webp` | `ObjectionSection` | Supporting photo for the hands-on/practical reassurance message. |
| `01-soc-wide.webp` | `CyberExperienceSection` | Full-bleed background texture (very low opacity, under the CSS grid) — atmosphere, not the section's focal image. |
| `08-female-analyst.webp` | `CyberExperienceSection` | The section's actual focal content photo, inside the scattered-chip composition (desktop) / above the chip strip (mobile). |
| `03-ecom-bg-purple.webp` | `MidFormSection` | Full-bleed background replacing the old CSS-only gradient — real purple texture behind the mid-page form. |
| `06-cyber-team.webp` | `CareerSection` | Full-bleed transition band at the top of the section (learning → career bridge), distinct from the section's own portrait photo below it. |
| `05-career-office.webp` | `CareerSection` | The section's contained 4:5 portrait photo. |
| `09-final-soc-room.webp` | `FinalSection` | Full-bleed cinematic background for the closing conversion section, with a radial scrim keeping the centered headline/form readable. |

**Still a placeholder:** the Ariel University logo in `ArielTrustSection`
— not part of this asset drop. Supply the official logo (transparent
background) to replace it; nothing else needs to change.

Do not bake copy into images — headlines, stats and CTAs stay as real
HTML text so they can be edited without touching assets.
