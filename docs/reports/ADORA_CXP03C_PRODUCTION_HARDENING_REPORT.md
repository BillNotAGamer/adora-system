# ADORA CXP-03C — Production Hardening & Final Verification Report

**Release Candidate Verdict:** `ADORA CXP-03C — RELEASE CANDIDATE READY FOR OWNER REVIEW`

## 1. Initial Git State & CXP-03B Verification

- **Worktree:** `F:\Coding\Adora System Mega Project\adora-system-cxp03`
- **Branch:** `feature/adora-cxp03-homepage-integration`
- **Verified Starting HEAD (CXP-03B committed):** `12148016a38ff451eeaac8e07658770b9056284b` (`refactor(web): refine homepage hero composition and caption rail`)
- **Parent CXP-03A Commit:** `98deb65d9d753d468e99ef0c42034042dd9ed4c1`
- **Untouched `main` Baseline:** `43304e3f70768553177dc410cd37351c079cd6a0`

## 2. Priority 1 — Floating Concierge Visibility Defect & Authoritative Fix

- **Root Cause:** In CXP-03B, removing the obsolete in-hero `.hero-primary-cta` button eliminated the only collision selector suppressing `ConciergeFloatingTrigger` at `scrollY = 0`. With no movement-aware lifecycle signal, `ConciergeFloatingTrigger` evaluated `collisions = false` on initial load and rendered over the lower-right corner of the Movement 01 hero frame.
- **Lifecycle Fix:**
  - Added `cinematicMovement: "01" | "02" | "03" | "04" | "05" | "06" | null` and `setCinematicMovement` to `ConciergeProvider` (`concierge-provider.tsx`).
  - Updated `ConciergeFloatingTrigger` (`concierge-floating-trigger.tsx`) so on `path === '/'` it returns `null` (completely unmounted — not visible, not focusable, no pointer interception, zero initial-render flash) unless `cinematicMovement` is explicitly `"02"`, `"03"`, `"04"`, or `"05"` (and still respects `isOpen`, `menuOpen`, `footer`, `[data-concierge-inline]`, and focused inputs).
  - Updated `CinematicJourneyExperience` (`mode="production"`) to sync `setCinematicMovement(state.movement)` from `computeCinematicJourneyState` on mount/hydration and every boundary crossing (resetting to `null` on unmount), and added viewport-section tracking for reduced-motion mode (`01` → HIDDEN, `02`–`05` → VISIBLE, `06`/footer → HIDDEN).
- **Verified State Table (`verify_cxp03_homepage.mjs`, desktop `1440×900` & mobile `390×844`, forward & reverse):**
  - Movement 01 start (`p = 0.00`), passage (`p = 0.13`), near-end (`p = 0.17`), reverse to start (`p = 0.00`): **HIDDEN** (`visible: false`, `ok: true`)
  - Movements 02 (`p = 0.255`, `0.355`), 03 (`p = 0.44`), 04 (`p = 0.62`, reverse `0.62`), 05 (`p = 0.83`): **VISIBLE** (`visible: true`, `ok: true`)
  - Movement 06 start (`p = 0.90`), finale (`p = 0.97`), and `SiteFooter`: **HIDDEN** (`visible: false`, `ok: true`)

## 3. Priority 2 — Restored UX-1 Concierge Regression Coverage

- Updated `scripts/verify_concierge.mjs` to replace the removed `.hero-primary-cta` selector with the real approved entry points (`header [data-concierge-trigger]` on desktop `>= 1024px`, `#mobile-navigation [data-concierge-trigger]` on mobile `< 1024px`), added an explicit assertion that `a.concierge-floating` is hidden during Movement 01 (`scrollY = 0`), and kept every existing focus-trap, reverse-Tab, inertness, survey, IME/Shift+Enter, draft-survival across `/ai-planner`, reload-reset, `data-motion="off"`, `prefers-reduced-motion: reduce`, mid-scroll floating trigger (`y = 1700`), print-media unlock, and `HTMLDialogElement = undefined` fallback check intact.
- **Outcome:** `scripts/verify_concierge.mjs` **PASSED** across all 6 viewports (`360`, `390`, `768`, `1024`, `1440`, `1920`) with `errors: []`.

## 4. Priority 3 — No-JS / PPR Fallback Root Cause & Fix

- **Root Cause:** With `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`, the root `apps/web/src/app/loading.tsx` wrapped `/` in an outer `<Suspense fallback={<Loading />}>`, causing Next.js to emit `<main aria-busy="true">Đang tải nội dung…</main>` as the visible initial HTML shell and place the actual homepage `<main class="cxp02-root cxp03-production">` inside `<div hidden id="S:1">`, which never swapped when JavaScript was disabled.
- **Route-Appropriate Fix:** Moved the loading skeleton from root `apps/web/src/app/loading.tsx` into route-scoped loading files for dynamic catalog routes (`apps/web/src/app/destinations/loading.tsx`, `apps/web/src/app/experiences/loading.tsx`, `apps/web/src/app/trips/loading.tsx`), preserving `cacheComponents: true`, `partialPrefetching: true`, Phase 1A `getHomepageCatalog()`, and catalog loading skeletons while allowing `/` to paint its `<main>` directly in the initial HTML shell.
- **Verified No-JS Result (`17_no_js_fallback.png`):** `hasLoadingSkeleton: false`, `openingPaintedHeight: 558`, `h1Count: 1`, `headerCount: 1`, `footerCount: 1`, `discoveryOpacity: "1"`, `journeyOpacity: "1"`, `conciergeOpacity: "1"`, `hasDestinationLink: true`, `hasAiPlannerLink: true`.

## 5. Priority 4 — Next.js Security Patch & Dependency Evidence

- **Upgraded Packages (`apps/web/package.json` & `pnpm-lock.yaml`):**
  - `next`: `16.4.3` → **`16.4.6`** (latest stable patched release in the `16.4.x` family, superseding the November 3, 2026 `16.4.5` security release)
  - `eslint-config-next`: `16.4.3` → **`16.4.6`**
- **Frozen-Lockfile & Build Verification:**
  - `pnpm install --frozen-lockfile`: Passed (`Lockfile is up to date`, exit `0`).
  - `pnpm build`: Passed cleanly on the **first try** (`Next.js 16.4.6 (Turbopack)`, `22/22` routes, **zero** `SecurityFatalError` or upgrade nudges).
- **`pnpm audit --prod` Findings:** `0` critical, `0` high, `0` Next.js vulnerabilities. Remaining `6` advisories (`1` low, `5` moderate — e.g. `glob` `GHSA-3g3m-2fjr-6pw4`) are scoped to Expo CLI transitive dependencies inside `apps/mobile` and do not affect `apps/web` runtime.

## 6. Priority 5 — Image Delivery & Lint Warnings Review

- Retained native `<img>` elements (16 scoped `@next/next/no-img-element` warnings, `0` errors) for the full-bleed SVG `<mask>` / `clip-path` / `transform` cinematic plates (`highland-world.jpg`, `human-moment.jpg`, `stone-pillar-occluder.png`, `adora-highlands-hero.webp`) and diurnal ribbon plates to preserve pixel-exact mask alignment and zero visual regression against CXP-03B. No global lint suppression was added; Discovery ribbon images use `loading="lazy"` and hero plate uses `fetchPriority="high" decoding="sync"`.

## 7. Priority 6 — Controlled 5-Sample Performance Verification

Measured against the `Next.js 16.4.6` production server (`http://127.0.0.1:3103`, `Chrome/157.0.8103.79`, cold browser cache cleared before each sample):

| Profile | Samples | Median LCP | LCP Range | Median TBT | Max CLS | JS / CSS / Img Transfer |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Desktop `1440×900` (1× CPU) | 5 | **136 ms** | `128–180 ms` | **0 ms** | **0** | `272 KB` / `21 KB` / `2192 KB` |
| Mobile `390×844` (4× CPU, DPR 2) | 5 | **212 ms** | `200–256 ms` | **51 ms** | **0** | `243 KB` / `21 KB` / `2192 KB` |

Raw samples saved outside Git: `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp03c_verify\perf_5x.json`.

## 8. Priority 7 & 8 — Accessibility, Responsive & Full Regression Results

| Check | Outcome |
| :--- | :--- |
| `pnpm test` (`apps/web`) | **PASS** (`48/48`, 6 suites) |
| `pnpm typecheck` (`apps/web`) | **PASS** (`0` errors) |
| `pnpm lint` (`apps/web`) | **PASS** (`0` errors, `16` justified `@next/next/no-img-element` warnings) |
| `pnpm build` (`apps/web`) | **PASS** (first-try clean `Next.js 16.4.6`, `22/22` routes) |
| `node scripts/verify_cxp03_homepage.mjs` | **PASS** (exit `0`, `0` errors, all 6 viewports `360`–`1920`, M01–M06+Footer floating visibility, No-JS painted, reduced motion, `data-motion="off"`, scroll restoration, route nav) |
| `node scripts/verify_concierge.mjs` | **PASS** (exit `0`, 6/6 viewports `360`–`1920`, `errors: []`) |
| `node scripts/verify_cxp02.mjs` | **PASS** (exit `0`, `/creative-lab/cinematic-journey` preserved) |

## 9. Visual Evidence & Local Preview

- **Refreshed Screenshots (`docs/reports/assets/cxp03/`):** `01_home_identity.png` (M01: no in-hero CTA, floating Concierge hidden, aligned rail), `03_home_world.png` (M02: floating Concierge visible above rail), `06_home_discovery_ribbon.png` (M04: floating Concierge visible), `08_home_ai_concierge.png` (M06: floating Concierge hidden), `10_home_footer.png` (Footer: floating Concierge hidden), `11_mobile_opening.png` (Mobile M01: floating Concierge hidden), `16_reduced_motion.png`, `17_no_js_fallback.png` (No-JS: painted dark editorial homepage, zero loading skeleton).
- **Genuine CDP Screencast WebM Recordings (scratch storage, not committed):**
  - `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp03c_verify\cxp03_forward_motion.webm`
  - `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp03c_verify\cxp03_reverse_motion.webm`
  - `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp03c_verify\cxp03_mobile_motion.webm`
- **Local Preview:** Run `pnpm start --port 3103` in `F:\Coding\Adora System Mega Project\adora-system-cxp03\apps\web` and open `http://localhost:3103/`.

## 10. Unresolved Findings & Release Recommendation

- **Unresolved (non-blocking for web RC):** 6 low/moderate Expo CLI transitive advisories in `apps/mobile` (`pnpm audit --prod`), and 16 justified `@next/next/no-img-element` warnings for SVG-masked cinematic plates.
- **Not Performed:** Real physical mobile device testing (all mobile metrics are headless Chrome CDP 4× CPU throttled); remote push/deployment (owner-controlled).
- **Release Recommendation:** **Ready for owner final review and approval** on `feature/adora-cxp03-homepage-integration`. `main` remains untouched and no merge/push/deploy occurred.
