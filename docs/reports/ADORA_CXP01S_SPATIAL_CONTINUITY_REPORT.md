# ADORA CXP-01S — Spatial Continuity Refinement Report

**Route:** `/creative-lab/typography-world`  
**Worktree:** `F:\Coding\Adora System Mega Project\adora-system-cxp01`  
**Branch:** `feature/adora-cxp01-typography-world`  
**UX-1 Baseline:** `bc9147a6617ddf23b592a8bbbca24a355f5e6737`  
**Starting HEAD (CXP-01R Checkpoint):** `f46e88b4bd293f72697bcd7428ec3fc95679a11a`  
**Date:** 2026-11-23  

---

## 1. Starting Git HEAD

Verified before any CXP-01S edits:
- Worktree: `F:\Coding\Adora System Mega Project\adora-system-cxp01`
- Branch: `feature/adora-cxp01-typography-world`
- Starting HEAD: `f46e88b4bd293f72697bcd7428ec3fc95679a11a` (`feat(web): refine cxp-01 typography-to-world visual prototype`)
- Main repository (`F:\Coding\Adora System Mega Project\adora-system`): untouched at `ba18425` (`feature/adora-unrestricted-creative`).

---

## 2. Existing Transition Defects (CXP-01R)

In CXP-01R ([before capture](file:///C:/Users/Admin/.gemini/antigravity/brain/bac67ed9-1138-4132-ab5b-4e2ba46c5af4/scratch/before_cxp01r_06_handoff.png)):
- `World → Human Moment` expanded `human-moment.jpg` through a rounded `clip-path: inset(...)` portal originating near `(76%, 48%)` over `highland-world.jpg`.
- Because `highland-world.jpg` depicts a distant ridge arch while `human-moment.jpg` depicts a close-up stone terrace colonnade, the viewer immediately perceived a second 2D photograph growing inside a masked window on top of the landscape rather than moving spatially into an architectural threshold.
- There was no foreground occlusion separating the outgoing ridge perspective from the incoming terrace perspective.

---

## 3. Spatial Techniques Considered

1. **Matched Architectural Perspective Cut / Retargeted 2D Arch Portal (Rejected):** Still exposes a visible 2D boundary between two different focal lengths whenever the viewer stops mid-scroll.
2. **Full Three.js / WebGL 3D Scene (Deferred):** Requires heavy runtime dependencies (`three` + depth maps/meshes) and introduces GPU/context-loss failure modes unnecessary when a real photographic occlusion pass achieves genuine depth separation cleanly in DOM/CSS.
3. **2.5D Architectural Colonnade Occlusion Pass with 3-Plane Parallax (Chosen):** Uses a real near-plane weathered stone colonnade pillar sweeping physically across the lens to occlude the transition boundary completely, pairing distinct parallax velocities across far, mid, and near planes.

---

## 4. Chosen Approach & Asset Continuity Strategy

### 3-Plane Parallax + Physical Occlusion Lock
- **Asset provenance:** Extracted [stone-pillar-occluder.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/public/images/cxp01/stone-pillar-occluder.png) (`440×900` RGBA PNG, `~151 KB`) directly from `human-moment.jpg`'s own weathered stone pillar and shadowed left arch wall, with subtle near-plane optical defocus (`3.2px` Gaussian blur), warm golden-hour grazing rim light on the right bevel, and feathered optical edges. Because it is built directly from the terrace's own stone pixels, its grain, shadow tone, and morning color temperature match both plates seamlessly.
- **Far plane (`worldLayer` — `highland-world.jpg`):** Preserves Identity → Passage → World (`p = 0.00 → 0.60`) unchanged. Across `p = 0.60 → 0.86`, gently dollies (`scale: 1.07 → 1.32`) and orbits left (`translateX: 0% → -7.0%` desktop, `-5.5%` mobile).
- **Near plane (`pillarOccluder` — `stone-pillar-occluder.png`, `z-index: 8`):** Sweeps rapidly right-to-left across the camera lens (`pillarLeftPct: 102% → -38%` desktop / `102% → -52%` mobile) during `p = 0.63 → 0.86`, with a subtle lens-proximity scale swell (`1.00 → 1.08 → 1.00`) and directional cast shadow (`drop-shadow`).
- **Mid plane (`humanPortalLayer` — `human-moment.jpg`, `z-index: 4`):** Revealed strictly via `clip-path: inset(0% 0% 0% <humanRevealLeftPct>%)`, where `humanRevealLeftPct` is mathematically locked to the **exact opaque center** of the sweeping stone pillar (`pillarLeftPct + pillarWidthPct * 0.5`). As the pillar clears the left edge of the frame, it hands off directly into `human-moment.jpg`'s own dark shadowed left arch wall while `humanPlateWrap` glides gently from `translateX(+5.5%) scale(1.09)` to `translateX(0%) scale(1.00)`.
- **Zero exposed seam:** Verified by unit test invariant (`choreography.test.ts`) and mid-scroll inspection — at every scroll progress `p ∈ [0, 1]`, the boundary between `highland-world.jpg` and `human-moment.jpg` is 100% hidden behind the opaque stone column.

---

## 5. Exact Modified & Added Files

- Added [stone-pillar-occluder.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/public/images/cxp01/stone-pillar-occluder.png)
- Modified [choreography.ts](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/src/components/creative-lab/typography-world/choreography.ts)
- Modified [choreography.test.ts](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/src/components/creative-lab/typography-world/choreography.test.ts)
- Modified [typography-world.css](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/src/app/creative-lab/typography-world/typography-world.css)
- Modified [typography-world-experience.tsx](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/apps/web/src/components/creative-lab/typography-world/typography-world-experience.tsx)
- Updated compact evidence PNGs in [docs/reports/assets/cxp01](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01)
- Added this report: [ADORA_CXP01S_SPATIAL_CONTINUITY_REPORT.md](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/ADORA_CXP01S_SPATIAL_CONTINUITY_REPORT.md)

---

## 6. Final Choreography & Responsive Results

- **Identity → Passage → World (`p = 0.00 → 0.60`):** Preserved intact on desktop and mobile ([01_desktop_opening.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/01_desktop_opening.png), [03_desktop_mid_passage.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/03_desktop_mid_passage.png), [05_desktop_world.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/05_desktop_world.png), [09_mobile_opening.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/09_mobile_opening.png), [10_mobile_mid_passage.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/10_mobile_mid_passage.png)).
- **World → Human Moment (`p = 0.63 → 0.86`):**
  - Before (CXP-01R): floating rounded arch portal (`before_cxp01r_06_handoff.png` in scratch).
  - After (CXP-01S): weathered stone colonnade pillar passes across the lens ([06_desktop_arch_handoff.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/06_desktop_arch_handoff.png)), revealing the sunlit terrace & woman emerging behind its right bevel, then clearing off the left edge into the final composed Human Moment ([07_desktop_human_moment.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/07_desktop_human_moment.png)).
- **Mobile & Portrait Tablet (`360px`, `390px`, `768px`):** Subject framing in [11_mobile_human_moment.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/11_mobile_human_moment.png) (`390×844`) and scratch captures (`360×800`, `768×1024`, `1920×1080`) remains intact with zero horizontal overflow.

---

## 7. Genuine Motion Evidence

- **Recording path (external scratch storage, excluded from Git):**  
  `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp01s_motion_proof.webm` (`1,384,044 bytes`, VP9 WebM).
- **Capture method:** Single controlled headless Chrome CDP session (`1440×900`, `Page.startScreencast`) against `next start --port 3101`, capturing **176 compositor frames** during **48 forward** (`deltaY = +90`) and **48 reverse** (`deltaY = -90`) `mouseWheel` events covering Identity → Passage → World → Colonnade Pass → Human Moment → Reverse back to Identity (`screencastEndScrollY = 0`).
- **Comparison reference (CXP-01R):** `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp01r_motion_proof.webm`.
- **Hardware disclaimer:** Headless Chrome CDP confirms deterministic scroll progression and visual occlusion, not 60 FPS physical mobile/desktop GPU frame pacing.

---

## 8. Technical Verification & Performance

- `pnpm test` (`apps/web`): **44 / 44 passed** (6 suites, including new colonnade occlusion-lock invariant test in `choreography.test.ts`).
- `pnpm typecheck`: **0 errors**.
- `pnpm lint`: **0 errors**, **6 warnings** (`@next/next/no-img-element` on cinematic `<img>` layers).
- `pnpm build`: Passed cleanly (Next.js `16.4.3` security advisory remains documented for a separate maintenance checkpoint; no dependency upgrade performed).
- Browser telemetry (`1440×900` production server):
  - Console errors / Page errors / Failed requests: `0` / `0` / `0`.
  - Transfer & layout: JS `178 KB` (zero new npm dependencies), CSS `135 KB`, pillar asset `~151 KB`, `CLS = 0`, `DOMContentLoaded = 55 ms`, `Load = 58 ms`.
  - Overflow checks (`scrollWidth <= innerWidth`): Passed at **1920×1080**, **1440×900**, **1024×768**, **768×1024**, **390×844**, and **360×800**.
  - Scroll restoration on reload (`p = 0.54`): `2138 → 2138`, `MOVEMENT 02`.
  - Reverse scroll (`0.96 → 0.27 → 0.00`): Restored `scrollY = 0`, `MOVEMENT 01`, `veilOpacity = 1`.
  - Reduced motion (`prefers-reduced-motion: reduce`): Static 3-section fallback intact ([12_reduced_motion.png](file:///F:/Coding/Adora%20System%20Mega%20Project/adora-system-cxp01/docs/reports/assets/cxp01/12_reduced_motion.png)).
  - Route navigation: `/ai-planner` and `/` both verified intact.

---

## 9. Remaining Artistic Limitations

1. **Single-pillar straight-vertical wipe silhouette:** While the defocused weathered stone pillar cleanly hides the perspective handoff and creates authentic 3-plane parallax, its edges are near-vertical rather than curving overhead into a full vaulted ceiling arch as it passes. Adding a curved upper arch spandrel or subtle foreground bokeh leaf cluster moving at a slightly different depth offset could further enrich the physical sense of stepping under a vaulted terrace.
2. **Headless motion capture only:** Physical trackpad/touch inertia and high-refresh-rate display feel should be judged directly by the owner in a live browser.

---

## 10. Final Git State & Local Preview Instructions

- **Worktree:** `F:\Coding\Adora System Mega Project\adora-system-cxp01`
- **Branch:** `feature/adora-cxp01-typography-world`
- **No merge, no push, no amend of CXP-01R (`f46e88b`).**

### Local Preview Instructions
```powershell
cd "F:\Coding\Adora System Mega Project\adora-system-cxp01\apps\web"
pnpm build
pnpm start --port 3101
```
Open: `http://localhost:3101/creative-lab/typography-world`
