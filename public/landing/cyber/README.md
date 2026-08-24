# Assets — Brand Cyber

Drop final assets for `/lp/brand/cyber` in this folder, then pass the file
path as the `src` prop to the relevant `ImagePlaceholder` — the placeholder
box disappears automatically and no other markup changes. `fill` slots
(the hero) size to their container; the rest size by `aspectRatio`.

| # | Slot | Where | Composition required | Notes |
| - | ---- | ----- | --------------------- | ----- |
| 1 | Hero photo | `_sections/HeroSection.tsx` — full-bleed background | A young Israeli-looking person, ~22–27, in a modern Cyber/SOC environment: relatable, aspirational, confident, authentic. Monitoring screens / dashboards / network visualization / data layers in the background, atmospheric lighting, real depth. | **Not** corporate stock, hacker-in-hoodie, VR goggles, sci-fi, or Matrix clichés. One image, cropped differently per breakpoint by the layout — supply the widest/highest-res version you have and it will cover both crops. No baked-in text. |
| 2 | Ariel logo | `_sections/ArielTrustSection.tsx` | Official logo of "היחידה ללימודי חוץ והמשך, אוניברסיטת אריאל," transparent background. | Use only the logo as supplied by Ariel University — nothing redrawn or approximated. |
| 3 | Cyber/SOC dashboard visual | `_sections/CyberExperienceSection.tsx` — central visual | A real (sensitive details blurred) or well-designed SOC/monitoring dashboard: graphs, network map, alerts. 16:9. | Should read as genuinely technical, not decorative — this is what sells "these are real tools." |
| 4 | Career / high-tech environment | `_sections/CareerSection.tsx` | A young person in a real high-tech/Cyber workplace — a natural continuation of the hero's mood, signaling "this could be you, working." 4:5. | Optional per the brief but included as the "career" visual; skip by leaving the placeholder if not needed. |

Do not bake copy into images — headlines, stats and CTAs stay as real
HTML text so they can be edited without touching assets. All four slots
currently render as labeled placeholder boxes describing exactly this
brief, so the composition can be judged before assets exist.
