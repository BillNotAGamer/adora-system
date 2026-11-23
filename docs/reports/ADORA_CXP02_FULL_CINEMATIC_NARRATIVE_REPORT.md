# ADORA CXP-02 — Full Cinematic Narrative Prototype Report

**Experimental Route:** `/creative-lab/cinematic-journey`  
**Preserved CXP-01S Baseline Route:** `/creative-lab/typography-world` (untouched)  
**Worktree:** `F:\Coding\Adora System Mega Project\adora-system-cxp02`  
**Branch:** `feature/adora-cxp02-cinematic-narrative`  
**Starting CXP-01S Baseline SHA:** `1d60f53f1cdd8df95968237bfa2201fa60260003`  
**Date:** 2026-11-23  

---

## 1. Starting Baseline & Isolation

- Verified `adora-system-cxp01` (`feature/adora-cxp01-typography-world`) was cleanly committed at `1d60f53f1cdd8df95968237bfa2201fa60260003` (`feat(web): refine cxp-01s world-to-human 2.5d colonnade spatial occlusion`).
- Created isolated worktree `F:\Coding\Adora System Mega Project\adora-system-cxp02` on new branch `feature/adora-cxp02-cinematic-narrative` directly from `1d60f53f1cdd8df95968237bfa2201fa60260003`.
- Main repository (`adora-system`), `main` (`bc9147a`), `/creative-lab/typography-world`, `/` (production homepage), backend, database, and UX-1 Concierge provider remain untouched.

---

## 2. Narrative Creative Direction & Scene Architecture

CXP-02 expands the approved CXP-01S opening into a continuous, reversible 6-movement scrollytelling journey (`A Name → A World → A Feeling → A Discovery → A Personal Journey → AI Concierge`):

| Movement | Scroll Range (`p`) | Visual Mechanism | Continuity Principle |
| :--- | :--- | :--- | :--- |
| **01 · Identity & Passage** | `0.00 → 0.21` | Preserved CXP-01S `ADORA` / mobile `A` precision vector mask | Single continuous `highland-world.jpg` plate |
| **02 · The World** | `0.21 → 0.30` | Full-bleed sunlit highland ridge & weathered stone arch | Same plate; zero cut or fade |
| **03 · Human Moment** | `0.30 → 0.48` | Preserved CXP-01S 2.5D weathered stone colonnade occlusion pass | 3-plane parallax; seam locked inside opaque pillar |
| **04 · Discovery (Act I)** | `0.48 → 0.72` | **Camera Pullback & Diurnal Horizon Ribbon** | Full-bleed `human-moment.jpg` physically reframes & pans into the `"01 · Sáng sớm"` origin plate while vertical scroll drives a horizontal dawn→night Đà Lạt ribbon |
| **05 · Your Journey (Act II)** | `0.72 → 0.87` | **Widescreen Horizontal Cinema Shutter** | Horizontal horizon shutter opens from center into twilight highlands (`adora-highlands-hero.webp`), presenting an interactive 2-day vs 3-day real demo itinerary rhythm preview |
| **06 · AI Concierge (Act III)** | `0.87 → 1.00` | **Obsidian-and-Gold Studio Finale** | Twilight horizon vignettes into the dark-forest atmosphere of Movement 01, opening the real shared UX-1 `Your Travel Concierge` modal via `<ConciergeTrigger href="/ai-planner">` |

Each major transition uses a distinct visual grammar (vector typographic aperture → 2.5D stone-pillar occlusion → camera pullback reframe + horizontal diurnal ribbon → widescreen horizontal cinema shutter → twilight-to-obsidian studio vignette) rather than repeating the same effect.

---

## 3. Modular Implementation & Visual Asset Provenance

### Source Files Added
- [narrative-choreography.ts](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp02/apps/web/src/components/creative-lab/cinematic-journey/narrative-choreography.ts) — Pure deterministic 6-movement progress engine (`progress ∈ [0, 1]`, strictly reversible, exclusive interactivity flags).
- [narrative-choreography.test.ts](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp02/apps/web/src/components/creative-lab/cinematic-journey/narrative-choreography.test.ts) — Unit tests verifying CXP-01S invariants, Human→Discovery continuity, exclusive interactivity, and reversibility.
- [discovery-ribbon.tsx](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp02/apps/web/src/components/creative-lab/cinematic-journey/discovery-ribbon.tsx) — Authentic `@/lib/demo` Đà Lạt experiences (`EXPERIENCES`) & destination links (`/destinations/da-lat`, `/experiences/[slug]`), plus honest `coming-soon` labels for Hội An, Sa Pa, Phú Quốc.
- [journey-concierge-acts.tsx](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp02/apps/web/src/components/creative-lab/cinematic-journey/journey-concierge-acts.tsx) — Interactive `TRIPS` rhythm preview (`/trips/da-lat-3-ngay`, `/trips/da-lat-cuoi-tuan-2-ngay`) and real shared `<ConciergeTrigger href="/ai-planner">` modal entry point with demo disclosures.
- [cinematic-journey-experience.tsx](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp02/apps/web/src/components/creative-lab/cinematic-journey/cinematic-journey-experience.tsx) — Lean `requestAnimationFrame` DOM/SVG orchestrator (zero per-frame React state updates) + full static 6-section `prefers-reduced-motion` fallback.
- [cinematic-journey.css](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp02/apps/web/src/app/creative-lab/cinematic-journey/cinematic-journey.css) & [page.tsx](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp02/apps/web/src/app/creative-lab/cinematic-journey/page.tsx) — Isolated `/creative-lab/cinematic-journey` route using `.cxp02-*` scoped CSS compatible with Turbopack's `*.css` rule.
- [verify_cxp02.mjs](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp02/scripts/verify_cxp02.mjs) — Dedicated CXP-02 narrative, Concierge modal, screencast, responsive, reduced-motion, and regression verifier.

### Visual Asset Provenance
- Reused CXP-01S concept plates (`public/images/cxp01/highland-world.jpg`, `human-moment.jpg`, `stone-pillar-occluder.png` — synthetic concept art, not literal commercial photography).
- Reused existing repo editorial assets from `@/lib/demo` (`public/images/home/dalat-pine-trail.webp`, `adora-highlands-hero.webp`; `public/images/discover/dalat-flower-greenhouse.webp`, `dalat-lake-dusk.webp`, `dalat-night-food.webp`). Zero unverified external imagery added.

---

## 4. Browser Visual-Iteration Findings

1. **Iteration 1 catch (Discovery origin plate framing):** Initial visual review of `07_discovery_ribbon.png` and `13_mobile_discovery.png` showed that clipping `human-moment.jpg` to the left desktop column (`inset(16% 69% 14% 4%)`) or top mobile box (`inset(12% 6% 62% 6%)`) without subject-tracking pan cropped the woman off the docked frame.
2. **Iteration 2 fix:** Added smooth `humanTranslateX` / `humanTranslateY` subject-tracking pan coupled to `humanReframeProgress` (`p = 0.485..0.565`), keeping the coffee moment centered inside `"01 · Sáng sớm · Đà Lạt"` on mobile ([13_mobile_discovery.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp02/docs/reports/assets/cxp02/13_mobile_discovery.png)) and framing the sunlit arch, wildflowers, croissant, and steaming cup on desktop ([07_discovery_ribbon.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp02/docs/reports/assets/cxp02/07_discovery_ribbon.png)).
3. **Screencast ordering catch:** Running `Page.startScreencast` after opening `<dialog>` initially yielded 1 frame; reordering screencast capture prior to modal testing and closing via the dialog's `"Đóng"` button yielded a clean **297-frame** full forward/reverse recording.

---

## 5. Screenshots & Genuine Motion Recording

### Motion Recording (External Scratch Storage, Excluded from Git)
- **Path:** `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp02_motion_proof.webm` (`3,298,362 bytes`, VP9 WebM).
- **Capture:** **297** real Chrome CDP `Page.startScreencast` compositor frames across **76 forward** (`deltaY = +120`) and **76 reverse** (`deltaY = -120`) `mouseWheel` events on `1440×900` against `next start --port 3102`, returning cleanly to `scrollY = 0`.
- **Hardware note:** Headless Chrome CDP verifies deterministic narrative progression and reversibility, not physical device 60 FPS GPU frame pacing.

### Compact Visual Evidence (`docs/reports/assets/cxp02/`)
- Desktop 6-movement sequence: `01_identity.png`, `02_passage_a.png`, `03_world.png`, `04_colonnade_handoff.png`, `05_human_moment.png`, `06_human_to_discovery.png`, `07_discovery_ribbon.png`, `08_discovery_to_journey.png`, `09_your_journey.png`, `10_ai_concierge.png`, `11_concierge_modal_open.png`.
- Mobile (`390×844`): `12_mobile_opening.png`, `13_mobile_discovery.png`, `14_mobile_journey.png`, `15_mobile_concierge.png`.
- Reduced motion (`1440×900`): `16_reduced_motion.png`.

---

## 6. Verification & Performance Observations

- **Unit tests (`pnpm test`):** **48 / 48 passed** (6 suites, including 4 new CXP-02 narrative tests).
- **TypeScript (`pnpm typecheck`):** **0 errors**.
- **ESLint (`pnpm lint`):** **0 errors**, **16 warnings** (`@next/next/no-img-element` across CXP-01 and CXP-02 cinematic `<img>` layers).
- **Production build (`pnpm build`):** Passed cleanly (Next.js `16.4.3` security advisory remains documented for a separate maintenance checkpoint; no dependency upgrade performed).
- **CXP-02 Browser Verifier (`node scripts/verify_cxp02.mjs` on port `3102`):**
  - Console / Page / Network errors: `0` / `0` / `0`.
  - Performance (`1440×900`): JS `217 KB` (+39 KB vs CXP-01S `178 KB`, zero new npm packages), CSS `137 KB`, `CLS = 0`, `DOMContentLoaded = 38 ms`, `Load = 77 ms`.
  - Interactive Trip Switcher (`p = 0.83`): switched `3 days → 2 days` and updated link to `/trips/da-lat-cuoi-tuan-2-ngay`.
  - Live UX-1 Concierge Modal (`p = 0.96`): clicked shared `<ConciergeTrigger>` → `<dialog class="concierge-dialog" open>` opened (`"Your Travel Concierge"`).
  - Scroll restoration on reload (`p = 0.64`): preserved `scrollY = 5645` and `MOVEMENT 04`.
  - Responsive overflow (`scrollWidth <= innerWidth`): Passed at **360×800**, **390×844**, **768×1024**, **1024×768**, **1440×900**, and **1920×1080**.
  - Reduced motion (`prefers-reduced-motion: reduce`): Rendered 6 static sections (`data-cxp02-mode="reduced-motion"`) with working `/destinations/da-lat`, `/trips/da-lat-3-ngay`, and `[data-concierge-trigger]` controls.
  - Regression routes verified intact: `/creative-lab/typography-world`, `/ai-planner`, `/destinations/da-lat`, and `/`.

---

## 7. Remaining Artistic Limitations

1. **Desktop Discovery left-column subject crop (`07_discovery_ribbon.png`):** On desktop (`1440×900`), the `27%`-wide left origin column frames the sunlit arch, wildflowers, croissant, and edge of the steaming cup cleanly, while the woman's face sits slightly right of the clipped edge (whereas mobile `13_mobile_discovery.png` frames her face and cup dead-center). Widening the left origin column slightly or increasing desktop `reframePanX` in a future refinement pass could bring her full profile into the docked desktop frame.
2. **Discovery diurnal ribbon cards:** While driven smoothly by vertical scroll alongside the reframed Human Moment plate, the 4 experience plates still share a structured rectangular aspect ratio (`16:10`). Future art direction could explore staggered editorial aspect ratios or depth-layered mist accents if desired.

---

## 8. Final Git State & Local Preview Instructions

- **Worktree:** `F:\Coding\Adora System Mega Project\adora-system-cxp02`
- **Branch:** `feature/adora-cxp02-cinematic-narrative`
- **No merge, no push, no amend of prior commits.**

### Local Preview Instructions
```powershell
cd "F:\Coding\Adora System Mega Project\adora-system-cxp02\apps\web"
pnpm build
pnpm start --port 3102
```
Open: `http://localhost:3102/creative-lab/cinematic-journey`  
(Preserved CXP-01S baseline also available at `http://localhost:3102/creative-lab/typography-world`.)
