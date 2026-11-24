# ADORA CXP-04C — Safe Production Integration Report

## A. Integration Verdict

**Verdict:** `ADORA CXP-04C — SAFE ATELIER INTEGRATION READY FOR OWNER REVIEW`

ADORA's approved Personal Journey Atelier (CXP-04A/B) is now integrated behind an explicit, rollback-safe preview switch (`NEXT_PUBLIC_ADORA_CONCIERGE_MODE=atelier`) within the existing single `ConciergeProvider` architecture and `/ai-planner` route. By default (when the variable is unset, empty, or invalid), ADORA preserves the exact UX-1 dialog and `/ai-planner` behavior. The CXP-03D cinematic homepage remains intact, homepage scroll and active Movement context are preserved with `0px` drift across open/close/Escape/Back flows, and no merge, push, or production activation has occurred.

---

## B. Git Baseline

- **Feature Branch:** `feature/adora-cxp04-concierge-experience`
- **Approved `main` & `origin/main` Baseline:** `a850bffe2aea54628cb56edbfd4b9fc3a623134f` (`docs(repo): record cxp-03d final main integration report`)
- **CXP-04A Checkpoint SHA:** `966244d80e585067ce331b3d8bfb8746a33e52b7` (`feat(web): prototype adora personal journey atelier`)
- **CXP-04B Checkpoint SHA:** `72dc2d6c29fb97d97fa5fce8092cf187f3b1ded4` (`feat(web): refine concierge atelier experience and integration readiness`)
- **CXP-04C Checkpoint SHA:** Recorded on `feature/adora-cxp04-concierge-experience` (`feat(web): integrate concierge atelier behind rollback-safe mode`) upon commit of this report and verified files.
- **Protected Untracked Archive:** `docs/reports/assets/unrestricted-creative.zip` remains untouched and excluded from Git.

---

## C. Architecture & Rollback-Safe Mode Switch

### Centralized Mode Selection (`apps/web/src/lib/concierge-atelier/mode.ts`)
- Exposes `resolveConciergeExperienceMode(rawValue)` returning `"ux1-dialog" | "atelier-workspace"`.
- Only exact `"atelier"` (trimmed) selects `"atelier-workspace"`. Missing, empty, uppercase, or unknown values resolve safely to `"ux1-dialog"`.
- No `localStorage`, cookies, or URL query overrides are used.
- **Next.js Client Bundle Semantics:** Because `NEXT_PUBLIC_ADORA_CONCIERGE_MODE` is inlined at compile/build time, toggling between UX-1 (`ux1-dialog`) and Atelier (`atelier-workspace`) requires rebuilding/restarting the server with the target environment variable (this is not a zero-restart runtime toggle).

### Single Provider Ownership (`apps/web/src/components/concierge/concierge-provider.tsx`)
- `ConciergeProvider` remains the single global owner (`ConciergeContext` + `useConcierge()`).
- Depending on compile-time `IS_ATELIER_MODE`:
  - `Ux1OnlyProvider` runs the preserved UX-1 `reducer` and lazy-loads `ConciergeDialog`.
  - `AtelierEnabledProvider` runs `atelierReducer`, lazy-loads `AtelierOverlayHost` (`apps/web/src/components/concierge/atelier-overlay-host.tsx`) only on open, preserves UX-1's `cinematicMovement` and `menuOpen` state, and shares `atelierState`/`atelierDispatch` with `/ai-planner`.

---

## D. Integrated Entry Points

| Entry Point | Mode OFF (`ux1-dialog`, Default) | Mode ON (`atelier-workspace`) |
| :--- | :--- | :--- |
| **Site Header (`SiteHeader` desktop CTA)** | Opens UX-1 `ConciergeDialog` (`Your Travel Concierge`) | Opens fullscreen `<dialog class="cxp04-dialog-host">` with `ConciergeAtelierExperience` (`variant="overlay"`) |
| **Mobile Menu (`#mobile-navigation`)** | Closes mobile drawer; opens UX-1 `ConciergeDialog` | Closes mobile drawer; opens fullscreen Atelier; closes cleanly restoring focus |
| **Floating Trigger (`ConciergeFloatingTrigger`)** | Visible only on `/` Movements `02–05` (and catalog routes); unmounts while open | Same `02–05` visibility contract; hidden during Movement `01`, `06`, Footer, and while overlay is open |
| **Movement 06 Finale (`JourneyConciergeActs`)** | Inline CTA opens UX-1 `ConciergeDialog` | Inline CTA opens fullscreen Atelier (`variant="overlay"`) preserving Movement 06 scroll position |
| **`/ai-planner` Route (`ai-planner/page.tsx`)** | Renders original static demo `PlannerWorkspace` | Renders shared `AtelierRouteWorkspace` (`variant="route"`) without duplicate dialog |
| **`/creative-lab/concierge-experience`** | Remains accessible standalone prototype (`variant="lab"`) | Remains accessible standalone prototype (`variant="lab"`) |

---

## E. Overlay Lifecycle, Scroll Preservation, Accessibility & Browser History

- **Scroll Lock & Cinematic Context Preservation:** `AtelierOverlayHost` locks `document.documentElement.style.overflow = "hidden"` and uses `overscroll-behavior: contain` inside the `<dialog>` top layer without calling `window.scrollTo`. Measured `scrollDeltaPx` across Movements `01`–`06` open/close cycles was **`0px`**.
- **Focus Management & Inertness:** `<dialog>.showModal()` natively marks the background homepage inert. Initial focus lands on the overlay heading (`<h2>` with `tabIndex={-1}` via `headingRef.current?.focus({ preventScroll: true })`) with zero focus stealing on message updates. `Tab`/`Shift+Tab` is contained within visible overlay controls. Closing restores focus synchronously/on commit to the originating trigger (using a double-`rAF` fallback so remounted `a.concierge-floating` or mobile menu buttons receive focus safely).
- **Browser Back / Forward:** Opening the overlay pushes at most one same-URL history entry (`{ adoraConciergeOverlay: true }`) guarded against double-clicks. Browser Back closes the overlay without leaving `/`; Browser Forward reopens it with session state intact. Clicking Close or pressing Escape pops that synthetic history entry via `window.history.back()`. Clicking in-overlay `<Link>` routes (`/ai-planner`, `/trips/...`, `/destinations/da-lat`) closes cleanly via `navigating: true` without invoking `history.back()`.
- **No-`<dialog>` Fallback:** `ConciergeTrigger` preserves fallback navigation straight to `/ai-planner` when `HTMLDialogElement.prototype.showModal` is unavailable.

---

## F. Draft & State Lifecycle

- `atelierState` is completely isolated from UX-1 `state` (`@/lib/concierge/state`) and stored solely in client session React memory inside `AtelierEnabledProvider` (no `localStorage`, URL params, or server persistence).
- Routine close and reopen on `/` or client-side navigation from `/` → `/ai-planner` preserves active state (`phasePersisted: "refinement"` verified across Movement re-openings).
- Direct reload (`F5`) on `/ai-planner` or clicking **Bắt đầu lại** resets cleanly to `initialAtelierState`.
- Unsupported free-text requests are stored verbatim in `freeNotes` with `unsupported-notice` and never converted into confirmed facts or fake bookings.

---

## G. `/ai-planner` Dual-Mode Verification

- **Mode OFF:** `title: "AI Planner (demo) · ADORA"`, `#planner-prompt` present, zero Atelier DOM nodes (`hasAtelierRoot: false`).
- **Mode ON:** `title: "Personal Journey Atelier · ADORA"`, single `<h1>`, `variant="route"`, zero open overlay dialogs (`openDialogs: 0`), zero internal codenames (`exposesInternalCodename: false`), safe `← Trang chủ` fallback link instead of blind `history.back()`, and working reload (`Page.reload()` verified).

---

## H. CXP-03D Cinematic Homepage Preservation

- `scripts/verify_cxp03_homepage.mjs` passed cleanly after all CXP-04C changes:
  - Floating Concierge hidden in Movement `01`, Movement `06`, and Footer; visible in Movements `02–05` (both forward and reverse scroll on desktop and mobile).
  - Scroll restoration intact (`beforeReloadY: 5803 === afterReloadY: 5803`).
  - No-JS SSR fallback verified (`hasH1: true`, `hasFooter: true`, `openingPaintedHeight: 558`).
  - Reduced-motion (`prefers-reduced-motion: reduce` and `data-motion="off"`) verified cleanly.

---

## I. Test & Performance Results

### Static & Unit Checks (`apps/web`)
| Check | Command | Result |
| :--- | :--- | :--- |
| TypeScript (`tsc --noEmit`) | `pnpm typecheck` | **PASS** (0 errors) |
| ESLint (`eslint .`) | `pnpm lint` | **PASS** (0 errors; 0 warnings in CXP-04 files) |
| Unit Tests (`node --test`) | `pnpm test` | **PASS** (**57/57 tests** across **6 suites** — includes 2 new CXP-04C rollback-mode tests in `mode.test.ts` + 7 CXP-04B tests in `engine.test.ts`) |
| Production Build (Mode OFF) | `pnpm build` (unset env) | **PASS** (Next.js 16.4.6 Turbopack; 23 routes) |
| Production Build (Mode ON) | `NEXT_PUBLIC_ADORA_CONCIERGE_MODE=atelier pnpm build` | **PASS** (Next.js 16.4.6 Turbopack; 23 routes) |

### Browser Verification (Matched Builds on Port `3105`)
- **Mode OFF Verification:**
  - `scripts/verify_concierge.mjs`: **PASS** across all 6 viewports (`360`, `390`, `768`, `1024`, `1440`, `1920`), `errors: []`.
  - `scripts/verify_cxp03_homepage.mjs`: **PASS**, `lcpMs: 180`, `cls: 0`, `longTaskMs: 0`, `jsTransferKB: 286`.
  - `scripts/verify_cxp04_atelier.mjs`: **PASS** (`/creative-lab/concierge-experience` intact).
  - `scripts/verify_cxp04c_integration.mjs` (`CXP04C_MODE=off`): **PASS** (UX-1 dialog opened, `#planner-prompt` verified, `0` errors).
- **Mode ON Verification (`scripts/verify_cxp04c_integration.mjs`, `CXP04C_MODE=on`):**
  - **PASS** with `0` console errors, `0` page errors, `0` failed requests.
  - All Movements `01–06` + mobile menu triggers tested (`scrollDeltaPx: 0` on every open/close cycle).
  - Browser Back closed overlay cleanly (`path: "/"`, `openDialogs: 0`, `scrollY: 3182`), Browser Forward reopened (`openDialogs: 1`), duplicate click guarded (`duplicateGuardCount: 1`).
  - Adaptive branching (`destination`, `hasInferred: true`) and VND recalculation (`15.620.000 ₫ → 9.910.000 ₫`) verified inside integrated overlay.
  - Zero horizontal overflow across all **7 viewports** (`360×640`, `390×844`, `430×932`, `768×1024`, `1024×768`, `1440×900`, `1920×1080`).

### Bundle / Lazy-Loading Comparison (`verify_cxp04c_integration.mjs` Desktop `1440×900`)
- **Mode OFF initial JS on `/` before opening Concierge:** `294,983 bytes` (`verify_concierge.mjs` scoped `1440px` measurement: `287,347 bytes` vs pre-CXP-04C `273,260 bytes`, `+14 KB` raw from mode/chunking boundaries with `0 ms` long tasks).
- **Mode ON initial JS on `/` before opening Concierge:** `294,915 bytes` (practically identical to Mode OFF because `AtelierOverlayHost`, `ConciergeAtelierExperience`, and Atelier CSS are lazily loaded on open).
- **Mode ON lazy JS delta upon opening Atelier:** `+12,851 bytes`.

---

## J. Visual Evidence

### Committed Integrated Screenshots (`docs/reports/assets/cxp04c/`)
1. `01_home_m01_closed.png` — Movement 01 Atelier closed
2. `02_home_m02_floating.png` — Movement 02 floating Concierge visible
3. `03_home_m02_atelier_open.png` — Movement 02 fullscreen Atelier open (with initial heading focus ring)
4. `04_overlay_invitation.png` — Atelier Invitation inside production overlay
5. `05_overlay_discovery.png` — Atelier Guided Discovery (`destination`, `inferred` companion)
6. `06_overlay_interpretation.png` — Atelier Interpretation checkpoint
7. `07_overlay_journey_reveal.png` — Atelier Journey Reveal inside production overlay
8. `08_overlay_refinement.png` — Atelier Refinement & VND breakdown
9. `09_home_restored.png` — Homepage restored at Movement 02 (`scrollDeltaPx: 0`)
10. `10_ai_planner_atelier_on.png` — `/ai-planner` in Atelier mode ON
11. `11_ai_planner_ux1_off.png` — `/ai-planner` in UX-1 mode OFF
12. `12_mobile_atelier_invitation.png` — Mobile Atelier Invitation (`390×844`)
13. `13_mobile_conversation.png` — Mobile conversation (`390×844`)
14. `14_mobile_journey_canvas.png` — Mobile Journey Canvas (`390×844`)
15. `15_reduced_motion_workspace.png` — Reduced-motion workspace
16. `16_no_js_homepage_regression.png` — No-JS homepage regression

### External Scratch Video Recordings (Kept Outside Git)
- **Desktop Integration Walkthrough:** `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp04c_verify\cxp04c_desktop_integration.webm` (36 frames, `409,876 bytes`)
- **Mobile Integration Walkthrough:** `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp04c_verify\cxp04c_mobile_integration.webm` (52 frames, `104,214 bytes`)

---

## K. Risks & Limitations

- **Release-Blocking Defects:** None.
- **Remaining Manual-Device Tests:** Real physical iOS Safari and Android Chrome soft-keyboard viewport behavior (`visualViewport` + composer bar positioning while typing) cannot be fully emulated in headless desktop Chromium and should be spot-checked on real devices before production promotion.
- **Non-Blocking Visual Polish:** Initial heading focus ring in `03_home_m02_atelier_open.png` renders clearly for keyboard/accessibility compliance; styling can be refined to `:focus-visible` only if preferred for pointer opens during CXP-04D.
- **Deliberate Demo Limitations & Future Backend Work:** Scripted Đà Lạt fixtures only; zero live AI inference, FastAPI Concierge endpoints, partner pricing/inventory, or database persistence (Product Engineering Phase 1B remains paused).

---

## L. Owner Preview Launch & Rollback Instructions (Also Handoff for CXP-04D)

### 1. Default UX-1 Mode (Current Production Default — Mode OFF)
```powershell
cd "F:\Coding\Adora System Mega Project\adora-system\apps\web"
Remove-Item Env:NEXT_PUBLIC_ADORA_CONCIERGE_MODE -ErrorAction SilentlyContinue
pnpm build
pnpm start --port 3100
```
- Open `http://localhost:3100` (opens classic UX-1 `ConciergeDialog`) and `http://localhost:3100/ai-planner` (classic UX-1 demo).

### 2. Atelier Preview Mode (Explicitly Enabled — Mode ON)
```powershell
cd "F:\Coding\Adora System Mega Project\adora-system\apps\web"
$env:NEXT_PUBLIC_ADORA_CONCIERGE_MODE = "atelier"
pnpm build
pnpm start --port 3100
```
- Open `http://localhost:3100` (all triggers open Personal Journey Atelier) and `http://localhost:3100/ai-planner` (integrated route view).

### 3. Safe Rollback to UX-1
- Clear or unset `NEXT_PUBLIC_ADORA_CONCIERGE_MODE` (`Remove-Item Env:NEXT_PUBLIC_ADORA_CONCIERGE_MODE`), rebuild (`pnpm build`), and restart the server. No persistent `.env` files or browser `localStorage` keys need cleanup.

### Next Checkpoint (CXP-04D, Pending Owner Approval)
- Physical device keyboard spot-check, setting default build/env policy if owner chooses to promote Atelier on `main`, and final local-main integration verification.
