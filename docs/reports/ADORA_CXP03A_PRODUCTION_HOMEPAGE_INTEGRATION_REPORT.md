# ADORA CXP-03A — Production Homepage Integration Report

**Final Verdict:** `ADORA CXP-03A — CINEMATIC HOMEPAGE READY FOR OWNER VISUAL REVIEW`

## 1. Authoritative Baseline & Worktree State

- **Main Baseline SHA:** `43304e3f70768553177dc410cd37351c079cd6a0` (matches `origin/main`; ancestor of CXP-02 merge `063d729d2bfe60e72182d3fca780cfa0c5b3c6a8`)
- **Feature Branch:** `feature/adora-cxp03-homepage-integration`
- **Isolated Worktree:** `F:\Coding\Adora System Mega Project\adora-system-cxp03`
- **Historical Worktrees & Main:** Untouched (`adora-system`, `adora-system-cxp01`, `adora-system-cxp02`, `adora-system-main-integration`). No merge or push performed.

## 2. Production Homepage Architecture & Component Reuse

- **`GET /` (`apps/web/src/app/page.tsx`):** Directly renders the approved six-movement cinematic narrative (`CinematicJourneyExperience` with `mode="production"`) instead of redirecting or duplicating the lab route.
- **Reused & Parameterized CXP-02 Components:**
  - `CinematicJourneyExperience`: Added `mode?: "lab" | "production"`, `catalogSource`, and `catalogDisclosure` props so `/creative-lab/cinematic-journey` remains intact for side-by-side comparison while `/` receives full production header, footer, catalog, and accessibility integration.
  - `DiscoveryRibbon` & `ReducedMotionDiscoverySection`: Added `catalogSource` and `catalogDisclosure` props wired to `homepageEditorialPresentation`, plus `aria-hidden={!interactive}` when inactive.
  - `JourneyConciergeActs` & `ReducedMotionJourneyAndConcierge`: Added `mode`, `id="how-it-works"` anchor support, `data-concierge-inline` collision marker for `ConciergeFloatingTrigger`, and interactive trip switcher in reduced-motion mode; omitted the lab-only CXP-01S comparison link on production `/`.
  - `narrative-choreography.ts`: Preserved all CXP-01S opening mask and colonnade occlusion-lock invariants; added `openingInteractive` flag and applied targeted Discovery framing & pacing refinements.

## 3. Global Header, Footer & AI Concierge Integration

- **Single Header Ownership (`SiteHeader`):** Added `tone="cinematic"` (`fixed inset-x-0 top-0 z-40` with subtle obsidian top gradient scrim and backdrop blur) for `/`. Production `/` omits `.cxp01-chrome-header`, guaranteeing `1` `<header>`, `1` ADORA brand link, `1` mobile menu (`z-40` above all cinematic layers `z: 1..30`), and `0` changes to other routes.
- **Dark Editorial Footer (`SiteFooter`):** Added `tone="dark"` (`showCta={false}`) below the cinematic runway so Movement 06 transitions smoothly into the obsidian footer (`1` `<footer>` landmark; the bottom movement progress bar uses `<div role="region">`).
- **UX-1 AI Concierge Preservation:** Retained the single `ConciergeProvider` and reducer. Movement 01 provides a restrained `.hero-primary-cta` trigger; Movement 06 triggers the shared modal with `data-concierge-inline` collision suppression and verified scroll-position preservation on Escape. `ConciergeFloatingTrigger` gained a passive scroll listener so it appears cleanly in Movements 02–05 and hides during Movement 01, Movement 06, and `SiteFooter`.

## 4. Data-Fetching Contract, Navigation & SEO

- **Phase 1A Catalog Contract Preserved:** `apps/web/src/app/page.tsx` retains `connection()` + `getHomepageCatalog()` inside a scoped `<Suspense>` boundary passed as `catalogDisclosure` into Discovery, accurately distinguishing live connected catalog vs. offline editorial fallback while keeping coming-soon destinations (`Phú Quốc`, `Hội An`, `Sapa`) honestly labeled `(Sắp ra mắt)`.
- **Verified Production Routes:** `/destinations/da-lat`, `/experiences/rung-thong-binh-minh`, `/trips/da-lat-3-ngay`, `/ai-planner`, and `/creative-lab/cinematic-journey` all verified with HTTP 200, `h1Count: 1`, and `0` console/page errors.
- **SEO & Metadata:** Preserved existing `metadata` (`title: "Đi xa hơn. Hiểu sâu hơn."`, Vietnamese description, OpenGraph, `index: true`, `follow: true`) and a single semantic `<h1>` (`ADORA — Đi xa hơn. Hiểu sâu hơn.`).

## 5. SSR, No-JS, Reduced Motion & `html[data-motion="off"]`

- **Reduced Motion & `data-motion="off"`:** `CinematicJourneyExperience` observes both `prefers-reduced-motion: reduce` and `document.documentElement[data-motion="off"]` via `MutationObserver`, switching immediately into the full 6-movement vertical editorial narrative (`sections: 6`) with working trip switcher, destination/experience/trip links, Concierge CTA, and `SiteFooter`.
- **SSR & No-JS Fallback:** `<noscript><style>` converts the sticky runway into a stacked, visible 6-movement editorial flow (`discoveryOpacity: "1"`, `journeyOpacity: "1"`, `conciergeOpacity: "1"`, `h1Count: 1`, `headerCount: 1`, `footerCount: 1`, working `/destinations/da-lat` and `/ai-planner` links). Note: because Next.js `16.4.3` PPR (`cacheComponents: true`) pairs with root `loading.tsx`, Chrome with scripts disabled keeps the streamed `<main>` inside Next's PPR stream container (the same documented behavior verified in `verify_web_0_4.mjs` Package A).
- **Print:** Added `@media print` rules disabling sticky stage clipping and revealing all 6 movements linearly.

## 6. Targeted Visual Polish Decisions

1. **Desktop Discovery Origin Framing:** Tuned desktop reframe pan (`reframePanX = -56%`, `targetLeft = 3.5%`, `targetRight = 66.5%`, `humanScale` delta `+0.04`) so the woman's face, hands, steaming coffee cup, and stone arch sit squarely inside the left origin plate (`06_home_discovery_ribbon.png`), while preserving mobile framing unchanged (`13_mobile_discovery.png`).
2. **Authored Discovery Ribbon Rhythm:** Differentiated desktop card proportions (`11/10`, elevated `16/10`, `4/3`, gold-accented `16/10`) for a curated editorial hierarchy rather than identical rectangular cards; tightened mobile Discovery vertical rhythm so card titles have zero bottom clipping.
3. **Discovery → Your Journey Pacing:** Extended production runway (`1140svh` desktop / `960svh` mobile), broadened horizontal cinema shutter (`p = 0.715..0.81`) and Journey typography entrance (`0.76..0.818`), and strengthened the Journey scrim for immediate readability.

## 7. Responsive & Performance Findings

- **6-Viewport Matrix (`360×800`, `390×844`, `768×1024`, `1024×768`, `1440×900`, `1920×1080`):** All 6 viewports passed with `scrollWidth <= innerWidth`, working mobile menu (`headerZIndex: 40`), and clean responsive framing.
- **Controlled Production Measurements (`1440×900`, `http://127.0.0.1:3103`):**
  - `LCP`: `324–400 ms` (2 runs)
  - `CLS`: `0`
  - `LongTasks`: `0 ms` on `/` (`verify_cxp03_homepage.mjs`); `0` long tasks on 5/6 viewports during `verify_concierge.mjs`
  - Transferred resources: `272 KB` JS (vs. `~217–259 KB` lab baseline, reflecting `SiteHeader`/`SiteFooter` + root providers), `21 KB` CSS, `2192 KB` images (native `<img>` retained intentionally for SVG `<mask>` / `clip-path` pixel-lock continuity; `@next/next/no-img-element` warnings remain scoped and unsuppressed)
  - `0` console errors, `0` page errors, `0` failed requests.

## 8. Browser Captures & Genuine Motion Evidence

- **Compact PNG Evidence (`docs/reports/assets/cxp03/`):** `01_home_identity.png` through `17_no_js_fallback.png` (desktop Movements 01–06, Concierge modal open, dark footer, mobile Movements 01/03/04/05/06, reduced motion, no-JS).
- **Genuine CDP Screencast WebM Recordings (external scratch storage — not committed):**
  - Desktop Forward Scroll (`113` frames, `1.13 MB`): `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp03_verify\cxp03_forward_motion.webm`
  - Desktop Reverse Scroll (`130` frames, `1.14 MB`): `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp03_verify\cxp03_reverse_motion.webm`
  - Mobile Forward Scroll (`125` frames, `360 KB`): `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp03_verify\cxp03_mobile_motion.webm`
- **Reproduction:** Start `pnpm --filter @adora/web start --port 3103` in `adora-system-cxp03` and run `$env:CXP03_PORT="3103"; node scripts/verify_cxp03_homepage.mjs`.

## 9. Verification Summary & Historical Regression Classification

| Check | Result | Classification / Notes |
| :--- | :--- | :--- |
| `pnpm test` (`apps/web`) | Passed (`48/48`, 6 suites) | All unit & choreography tests pass |
| `pnpm typecheck` (`apps/web`) | Passed (`0` errors) | Strict TS clean |
| `pnpm lint` (`apps/web`) | Passed (`0` errors, `16` warnings) | Pre-existing `@next/next/no-img-element` warnings |
| `pnpm build` (`apps/web`) | Passed (`22/22` routes on retry) | Next.js `16.4.3` security advisory nudge logged below |
| `node scripts/verify_cxp03_homepage.mjs` | Passed (exit `0`) | Successor production homepage verifier |
| `node scripts/verify_concierge.mjs` | Passed (exit `0`, 6/6 viewports) | Still applicable — 100% preserved |
| `node scripts/verify_cxp02.mjs` | Passed (exit `0`) | Lab route preserved intact |
| `verify_homepage.mjs` / `verify_web_0_4.mjs` (old homepage visual assertions) | Intentionally superseded on `/` | Old static hero/philosophy/card-grid assertions on `/` are superseded by CXP-03A; underlying Concierge, discovery, trip, and accessibility invariants remain protected by `verify_cxp03_homepage.mjs` and `verify_concierge.mjs` |

## 10. Remaining Technical & Security Issues (CXP-03B Blockers)

- **Next.js `16.4.3` Security Vulnerability Advisory:** `next build` emits `SecurityFatalError` on first run (`next upgrade --agent=security --internal-nudge-id=acbefd91-6141-4204-908d-943e3763815b`). Next.js was **not** upgraded in CXP-03A per task constraints; this must be resolved before production deployment (CXP-03B).
- **Root `loading.tsx` + PPR No-JS Shell:** With Next.js `cacheComponents: true`, disabling JavaScript displays `loading.tsx` above the streamed PPR `<main>`. Addressing No-JS visual painting without `loading.tsx` occlusion is recommended for CXP-03B hardening.

## 11. Local Preview Instructions

```powershell
Set-Location "F:\Coding\Adora System Mega Project\adora-system-cxp03\apps\web"
pnpm start --port 3103
```

Open `http://localhost:3103/` (and compare side-by-side with `http://localhost:3103/creative-lab/cinematic-journey`).

## 12. Owner Visual-Review Recommendations

1. Scroll smoothly forward and backward across `http://localhost:3103/` from Movement 01 through Movement 06 and into the dark `SiteFooter`.
2. Inspect Movement 04 (`Discovery`) on desktop to confirm the refined framing of the woman and steaming coffee cup in the left origin plate and the differentiated Discovery ribbon proportions.
3. Test the `SiteHeader` navigation, mobile drawer (`390×844`), Movement 05 trip rhythm switcher, and Movement 06 `ADORA Travel Concierge` modal open/close scroll preservation.
