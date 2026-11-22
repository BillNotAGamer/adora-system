# ADORA CXP-01R — Visual Refinement, Motion Evidence & Safe Checkpoint Report

**Route:** `/creative-lab/typography-world`  
**Worktree:** `F:\Coding\Adora System Mega Project\adora-system-cxp01`  
**Branch:** `feature/adora-cxp01-typography-world`  
**Base Commit (UX-1):** `bc9147a6617ddf23b592a8bbbca24a355f5e6737`  
**Date:** 2026-11-23  

---

## 1. Exact Changes Made

### Preview Recovery Foundation (carried forward cleanly)
- Replaced CSS Module usage (`typography-world.module.css`) with an explicitly prefixed `.cxp01-*` stylesheet ([typography-world.css](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/src/app/creative-lab/typography-world/typography-world.css)) imported directly by [typography-world-experience.tsx](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/src/components/creative-lab/typography-world/typography-world-experience.tsx), avoiding Turbopack's `*.css` rule conflict without touching shared `apps/web/next.config.ts`.

### CXP-01R Visual & Continuity Refinements
1. **Isolated Responsive Framing for Human Moment (`360px`, `390px`, `768px` portrait):**
   - Added `.cxp01-plate-image--human` in [typography-world.css](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/src/app/creative-lab/typography-world/typography-world.css) applied only to `human-moment.jpg` (both interactive and `prefers-reduced-motion` views), leaving `.cxp01-plate-image` (`object-position: 62% 48%` on mobile) untouched for `highland-world.jpg` Identity/Passage framing.
   - Mobile (`<= 767px`): `object-position: 86% 42%`.
   - Portrait tablet (`<= 1023px` and `orientation: portrait`, covering `768×1024`): `object-position: 82% 42%`.
   - Desktop (`1440×900`, `1920×1080`): `object-position: center 48%`.
2. **Initial `ADORA` Wordmark Left-`A` Contrast Treatment:**
   - Added `worldScrimOpacity` to [choreography.ts](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/src/components/creative-lab/typography-world/choreography.ts) so `.cxp01-world-scrim` (which applies a `56%` dark left gradient behind Moment III editorial copy) remains `0` throughout Moment I and Moment II (`p <= 0.43`), removing unintended darkening behind the first `A` and `D`.
   - Elevated the `ADORA` baseline (`y = 500` in the `1600×900` viewBox, `DESKTOP_A_Y = 416`) and shifted desktop `highland-world.jpg` `object-position` slightly left (`36% 48%`) so the upper-left golden sunrise sunbeams pass through the apex and upper stem of the first `A`.
   - Added a subtle top atmospheric gradient on `.cxp01-chrome-header` so the `ADORA` brand mark and `MOVEMENT / AI PLANNER` chrome remain legible over bright sky regions during Moment II/III.
3. **Human Moment Plate Seam Repair:**
   - Detected a vertical image-generation seam at `x = 820` in the bottom-center blurred foliage (`y >= 584`) of [human-moment.jpg](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/public/images/cxp01/human-moment.jpg). Applied a localized feathered horizontal blend and `2.2px` Gaussian bokeh smoothing strictly to the `y >= 584, x = 810..830` leaf region while keeping the stone pillar edge above `y = 584` intact.
4. **Mid-Passage `A` Counter Mask Alignment:**
   - Replaced the over-scaled `A` interior polygon (`scale` up to `1.29`, which previously poked outside the serif `A` strokes and created nested cuts) with a strictly interior counter wedge (`desktop: points="350,288 262,500 426,500"`, `mobile: points="438,494 256,955 604,955"`) scaling only up to `1.00` during `p = 0.14..0.24`, completely eliminating both polygon overhang and the thin left-stem hairline gap.
5. **World → Human Moment Spatial Handoff:**
   - Updated `worldScale` in [choreography.ts](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/src/components/creative-lab/typography-world/choreography.ts) to accelerate smoothly (`1.0 → 1.60`) with `transform-origin: 76% 48%` (`50% 48%` on mobile) during `p = 0.60..0.85` so the highland camera visibly pushes toward the stone arch as `humanPortalLayer` opens from `(76%, 48%)`.
   - Softened the bottom threshold of `humanPortalLayer` with a dynamic CSS `mask-image` mist feather during `0 < archPortalProgress < 0.96` and replaced the solid `1px` box border on `.cxp01-arch-rim` with a soft radial golden glow.

---

## 2. Before / After Evidence

### Mobile Human Moment (`390×844`, plus `360×800` & `768×1024`)
- **Before (CXP-01 preview recovery):** Shared `.cxp01-plate-image` (`object-position: 62% 48%`) centered on the stone pillar and flower vase, cropping the woman holding the coffee cup off the right edge.
- **After (CXP-01R):** [11_mobile_human_moment.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/11_mobile_human_moment.png) (`390×844`) cleanly frames the woman holding the steaming coffee cup inside the sunlit stone arch above `"CHẬM LẠI."` and `"THIẾT KẾ HÀNH TRÌNH CÙNG ADORA"`. Verified identically at `360×800` and `768×1024` portrait (in scratch verification captures) and `1440×900` / `1920×1080` desktop ([07_desktop_human_moment.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/07_desktop_human_moment.png)), while keeping [09_mobile_opening.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/09_mobile_opening.png) and [10_mobile_mid_passage.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/10_mobile_mid_passage.png) untouched in aperture framing.

### Wordmark Contrast, Mid-Passage Mask & Seam Outcome
- **Opening wordmark ([01_desktop_opening.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/01_desktop_opening.png)):** Removing `.cxp01-world-scrim` at `p = 0` and raising the `ADORA` band lets sunrise rays illuminate the apex and upper stem of the first `A` while preserving natural pine shadow across the lower left slope.
- **Mid-passage ([03_desktop_mid_passage.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/03_desktop_mid_passage.png), [08_desktop_reverse_checkpoint.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/08_desktop_reverse_checkpoint.png), [10_mobile_mid_passage.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/10_mobile_mid_passage.png)):** Clean solid monumental `A` doorway with zero inner polygon overhang and zero stem hairline artifacts; forward and reverse states at `p = 0.27` match identically.
- **Human Moment seam ([07_desktop_human_moment.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/07_desktop_human_moment.png)):** The bottom-center foliage seam at `x = 820` is eliminated while preserving the crisp stone pillar boundary above `y = 584`.

---

## 3. Motion Evidence & World → Human Continuity Assessment

### Browser Screencast Recording
- **Method:** Single controlled headless Chrome CDP session (`1440×900`, `Page.startScreencast`) against the production `next start --port 3101` build, driven by **48 forward** `mouseWheel` events (`deltaY = +90`, `60ms` cadence) across Identity → Passage → World → Human Moment followed by **48 reverse** `mouseWheel` events (`deltaY = -90`, `55ms` cadence) returning cleanly to `scrollY = 0`.
- **Captured output:** **177 compositor frames** encoded via Playwright's `ffmpeg-win64.exe` (`-f image2pipe -vcodec mjpeg -c:v libvpx-vp9`) to external scratch recording `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp01r_motion_proof.webm` (`1,531,191 bytes`), excluded from Git commit per checkpoint policy.
- **Limitation note:** Headless Chrome CDP confirms deterministic scroll-state progression, zero frame drops/errors in the compositor capture, and exact reverse restoration (`scrollY = 0`), **not** physical mobile/desktop GPU thermal or high-refresh-rate panel smoothness.

### World → Human Moment Continuity Assessment
- **What works well:** Identity → Passage → World (`p = 0.00 → 0.54`) uses a single continuous photographic plate (`highland-world.jpg`) under a precision vector mask (`veilOpacity = 1` until `maskScale > 20`), delivering a genuine doorway-to-world passage with zero opacity fade cheat. During World → Human Moment (`p = 0.63 → 0.85`), the arch-targeted camera push (`worldScale` toward `76% 48%`), warm golden rim glow, and feathered bottom threshold ([06_desktop_arch_handoff.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/06_desktop_arch_handoff.png)) improve directional continuity compared with a sharp rectangular inset.
- **Honest architectural limitation:** Because `highland-world.jpg` (distant ridge arch) and `human-moment.jpg` (close-up stone terrace colonnade) are still two separate 2D photographs with different camera focal lengths and foreground geometry, the `p = 0.63 → 0.85` arch portal remains recognizable as an expanding 2D masked portal transition rather than a physically continuous 3D camera dolly through one unified architectural space. If the owner wants true parallax/depth continuity across World → Human Moment in a subsequent checkpoint, that would warrant a WebGL depth-displacement / 2.5D layered foreground occluder pass.

---

## 4. Verification Results

All checks executed in `F:\Coding\Adora System Mega Project\adora-system-cxp01\apps\web` after the final edit:

- **Unit tests (`pnpm test`):** **44 / 44 passed** (6 suites, including 4 deterministic state tests in [choreography.test.ts](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/src/components/creative-lab/typography-world/choreography.test.ts)).
- **Typecheck (`pnpm typecheck`):** Passed (`0` errors).
- **Lint (`pnpm lint`):** Passed (`0` errors; `5` `@next/next/no-img-element` warnings on `<img>` elements intentionally used inside SVG/CSS-clipped cinematic layers in `typography-world-experience.tsx`).
- **Production build (`pnpm build`):** Succeeded (`next build` prerendered `/creative-lab/typography-world` statically alongside existing routes; Next.js `16.4.3` security upgrade nudge displayed and bypassed on retry; no dependency upgrade performed per CXP-01R boundary).
- **Single-session headless Chrome CDP verification:**
  - Console errors / Page errors / Failed network requests: `0` / `0` / `0`.
  - Transfer & layout metrics (`1440×900`): JS `178 KB`, CSS `134 KB`, CLS `0`, DOMContentLoaded `67 ms`, Load `75 ms`.
  - Horizontal overflow (`scrollWidth <= innerWidth`): Passed at **1920×1080**, **1440×900**, **1024×768**, **768×1024**, **390×844**, and **360×800**.
  - Scroll restoration on reload (`p = 0.54`): `beforeReloadY: 2138` → `afterReloadY: 2138`, `MOVEMENT 02`.
  - Reduced motion (`prefers-reduced-motion: reduce`): Rendered static 3-section fallback ([12_reduced_motion.png](file:///F:/Coding/Adora%20System%20Mega Project/adora-system-cxp01/docs/reports/assets/cxp01/12_reduced_motion.png)), `data-cxp01-mode="reduced-motion"`, `sections: 3`, `/ai-planner` CTA active.
  - Route navigation: `/ai-planner` (`AI Planner (demo) · ADORA`) and `/` (`Đi xa hơn. Hiểu sâu hơn.`) both loaded intact.

---

## 5. Final Git State & Local Preview Instructions

- **Worktree:** `F:\Coding\Adora System Mega Project\adora-system-cxp01`
- **Branch:** `feature/adora-cxp01-typography-world` (isolated from `main`, `bc9147a`, and `adora-system`)
- **Scoped Checkpoint Commit:** Recorded on `feature/adora-cxp01-typography-world` containing only CXP-01 source, plate assets (`public/images/cxp01/*`), unit tests, compact PNG evidence (`docs/reports/assets/cxp01/*`), and this report (`docs/reports/ADORA_CXP01R_VISUAL_REFINEMENT_REPORT.md`).

### Local Preview Instructions
```powershell
cd "F:\Coding\Adora System Mega Project\adora-system-cxp01\apps\web"
pnpm build
pnpm start --port 3101
```
Open: `http://localhost:3101/creative-lab/typography-world` (tested live at `1440×900`, `1920×1080`, `768×1024`, `390×844`, `360×800`, and with OS/browser Reduced Motion enabled).
