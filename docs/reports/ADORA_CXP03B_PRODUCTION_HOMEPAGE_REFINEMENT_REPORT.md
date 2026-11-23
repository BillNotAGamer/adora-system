# ADORA CXP-03B — Production Homepage Refinement Report

## 1. Starting Branch & Baseline

- **Worktree:** `F:\Coding\Adora System Mega Project\adora-system-cxp03`
- **Branch:** `feature/adora-cxp03-homepage-integration`
- **Starting HEAD (CXP-03A):** `98deb65d9d753d468e99ef0c42034042dd9ed4c1`
- **Main Branch:** Untouched at `43304e3f70768553177dc410cd37351c079cd6a0`

## 2. Exact Files Changed

- `apps/web/src/components/creative-lab/cinematic-journey/cinematic-journey-experience.tsx`
- `apps/web/src/components/layout/site-header.tsx`
- `apps/web/src/app/creative-lab/cinematic-journey/cinematic-journey.css`
- `scripts/verify_cxp03_homepage.mjs`
- `docs/reports/assets/cxp03/*.png` (refreshed visual evidence)
- `docs/reports/ADORA_CXP03B_PRODUCTION_HOMEPAGE_REFINEMENT_REPORT.md`

## 3. Task A — Remove In-Hero CTA & Rebalance Opening Hero

- Removed the in-hero `<ConciergeTrigger href="/ai-planner" className="hero-primary-cta cxp03-opening-cta">Plan with Adora AI</ConciergeTrigger>` from both the cinematic opening overlay (`.cxp01-opening-overlay`) and the reduced-motion opening caption (`.cxp01-reduced-caption`) in `cinematic-journey-experience.tsx`, along with unused imports/state and `.cxp03-opening-cta` CSS rules.
- Restored `.cxp03-production .cxp01-opening-overlay` bottom padding (`clamp(8.5rem, 17.5vh, 10.5rem)` desktop; `5.5rem 1.5rem 5.75rem` mobile) to the approved CXP-02 proportions so the Vietnamese subtitle and `Cuộn để bước qua` cue (desktop) and `Một thế giới đang mở ra. / Khám phá ADORA` block (mobile) sit in natural balance without awkward empty space.
- Preserved all existing AI Concierge entry points: `SiteHeader` (`Plan with Adora AI`), `ConciergeFloatingTrigger`, and Movement 06 finale CTA (`Mở ADORA Travel Concierge`).

## 4. Task B — Bottom Horizontal Rail Alignment Refinement

- **Root Cause Identified:** In CXP-03A, `.cxp03-production .cxp01-chrome-footer` carried an asymmetric right padding (`clamp(10.75rem, 16vw, 14rem)` desktop, `9.75rem` mobile) to avoid colliding with the floating Concierge button, which truncated the bottom horizontal hairline short of the right edge of the outer hero frame and header.
- **Refinement Applied:**
  - Restored symmetric full-grid horizontal padding (`clamp(1.25rem, 4vw, 3.75rem)` desktop, `1.25rem` mobile) on `.cxp03-production .cxp01-chrome-footer` and matched its top hairline (`1px solid rgba(244, 239, 230, 0.24)`) to the outer hero frame.
  - Aligned `SiteHeader` (`tone="cinematic"`) inner horizontal padding to the exact same `clamp(1.25rem, 4vw, 3.75rem)` grid so the top wordmark/CTA, outer hero frame left/right borders, bottom horizontal rail, left movement caption, and right progress indicator lock onto one coherent architectural grid across viewports.
  - Lifted `body:has(.cxp03-production) .concierge-floating` cleanly above the full-width bottom rail (`right: clamp(1.25rem, 4vw, 3.75rem); bottom: clamp(4.35rem, 8.5vh, 5.15rem)` desktop; `right: max(1.25rem, env(safe-area-inset-right)); bottom: calc(4.4rem + env(safe-area-inset-bottom))` mobile) so it never overlaps the rail or progress indicator.

## 5. Verification Commands & Outcomes

| Check | Command | Outcome |
| :--- | :--- | :--- |
| Unit Tests | `pnpm test` (`apps/web`) | Passed (`48/48`, 6 suites) |
| Typecheck | `pnpm typecheck` (`apps/web`) | Passed (`0` errors) |
| Lint | `pnpm lint` (`apps/web`) | Passed (`0` errors, `16` pre-existing `@next/next/no-img-element` warnings) |
| Production Build | `pnpm build` (`apps/web`) | Passed (`22/22` routes on retry after Next.js `16.4.3` security advisory nudge) |
| Production Homepage Verifier | `$env:CXP03_PORT="3103"; node scripts/verify_cxp03_homepage.mjs` | Passed (exit `0`, `0` console/page/network errors, `CLS: 0`, `LCP: 404 ms`, `LongTasks: 0 ms`, `hasInHeroCta: false`, `railAlignedWithFrame: true`, all 6 viewports `360`–`1920` zero overflow) |

*Note on legacy `verify_concierge.mjs`:* Its historical `.hero-primary-cta` selector at `scrollY = 0` is intentionally superseded by the owner's removal of the in-hero CTA; Concierge open/close/Escape/scroll-preservation behavior on `/` remains verified by `scripts/verify_cxp03_homepage.mjs`.

## 6. Visual Review Summary

Inspected refreshed captures in `docs/reports/assets/cxp03/`:
- **Desktop Opening (`01_home_identity.png`) & Reduced Motion (`16_reduced_motion.png`):** Clean, atmospheric ADORA photographic wordmark with subtitle and `Cuộn để bước qua` cue only — no in-hero CTA button. Top header edges, outer hero frame, and full-width bottom horizontal rail align pixel-accurately (`railAlignedWithFrame: true`).
- **Desktop Discovery (`06_home_discovery_ribbon.png`) & Footer (`10_home_footer.png`):** Bottom rail spans full grid cleanly with balanced left caption and right progress indicator; Concierge floating trigger sits cleanly above the rail and hides automatically in Movement 06 and `SiteFooter`.
- **Mobile Portrait (`11_mobile_opening.png`, `13_mobile_discovery.png`):** No awkward gap after hero CTA removal; bottom horizontal rail spans full width cleanly from left to right margin with balanced caption and gold progress marker.

## 7. Owner Feedback Alignment

Yes — both owner review issues are resolved while preserving the approved CXP-02 / CXP-03A creative direction, visual mood, narrative structure, and Concierge functionality.
