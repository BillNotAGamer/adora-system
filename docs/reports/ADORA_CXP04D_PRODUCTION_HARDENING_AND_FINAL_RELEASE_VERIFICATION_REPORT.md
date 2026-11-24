# ADORA CXP-04D — Production Hardening & Final Release Verification Report

## A. Executive Verdict

**Final Verdict:** `ADORA CXP-04D — DEFAULT-OFF INTEGRATION READY / ACTIVATION GATES PENDING`

- **Gate A — Default-OFF Integration Readiness (PASS / READY):** The CXP-04 Personal Journey Atelier integration is hardened, verified across both build modes, and safe for owner-approved integration onto local `main` with `ux1-dialog` as the default production experience.
- **Gate B — Default-ON Activation Readiness (PENDING OWNER & PHYSICAL-DEVICE VALIDATION):** Default production activation remains explicitly disabled (`NEXT_PUBLIC_ADORA_CONCIERGE_MODE` unset). Real physical-device verification (iOS Safari / Android Chrome soft-keyboard behavior) and owner deployment sign-off are required before enabling Atelier by default.

---

## B. Git Baseline & Checkpoints

- **Repository:** `F:\Coding\Adora System Mega Project\adora-system`
- **Current Branch:** `feature/adora-cxp04-concierge-experience`
- **Approved `main` & `origin/main` Baseline:** `a850bffe2aea54628cb56edbfd4b9fc3a623134f` (`docs(repo): record cxp-03d final main integration report`)
- **Verified Ancestry:**
  - CXP-04A Prototype: `966244d80e585067ce331b3d8bfb8746a33e52b7`
  - CXP-04B Refinement: `72dc2d6c29fb97d97fa5fce8092cf187f3b1ded4`
  - CXP-04C Safe Integration: `3c4e6c099990c3af1155863c139738ab4dca2360`
  - **CXP-04D Implementation Hardening Commit:** `40150fadd333fe666fc8f1b7e69aae0e279a6761` (`fix(web): harden concierge atelier lifecycle and release readiness`)
  - Final documentation + visual evidence commit SHA is reported in the terminal handoff output immediately following commit.
- **Worktree Policy:** Single repository worktree (`F:/Coding/Adora System Mega Project/adora-system`). Zero duplicate worktrees created.
- **Protected Untracked Archive Integrity:** `docs/reports/assets/unrestricted-creative.zip` verified untouched (`SHA-256: ab9bcd436ee8e65b314927da3d822519279fda9b2d5a69220881731efe00408b`). Existing untracked `docs/reports/assets/cxp04c.zip` also preserved untouched.

---

## C. Source-Level Architecture Findings

- Verified single global `ConciergeProvider` (`apps/web/src/components/concierge/concierge-provider.tsx`) dispatching cleanly between compile-time `Ux1OnlyProvider` (`IS_ATELIER_MODE === false`) and `AtelierEnabledProvider` (`IS_ATELIER_MODE === true`).
- Only one active Concierge runtime mounts in any build; no second provider exists.
- Mode resolver (`apps/web/src/lib/concierge-atelier/mode.ts`) reads `process.env.NEXT_PUBLIC_ADORA_CONCIERGE_MODE` (`"atelier"` trimmed lowercase only -> `"atelier-workspace"`; missing/empty/uppercase/unknown -> `"ux1-dialog"`).
- Lazy loading via `import("./atelier-overlay-host")` defers Atelier UI CSS and image loading until user trigger activation.

---

## D. Defects Identified & Resolved

1. **P0 — Stale History Marker on Reload & In-Overlay Navigation (`concierge-provider.tsx`)**
   - **Root Cause:** Reloading the browser while the overlay history entry (`adoraConciergeOverlay: true`) was active left that flag in `window.history.state`, and clicking in-overlay `<Link>` routes (`/ai-planner`, `/trips/...`) could leave an obsolete overlay entry in Back history.
   - **Fix:** Added `withoutOverlayHistoryFlag()` mount cleanup (stripping stale `adoraConciergeOverlay` on full reload while preserving Next.js history fields) and `close(false, { navigating: true })` history replacement before route transitions, synchronous `isOpenRef.current` guards against double-clicks, and live `window.location.pathname` reads in `popstate`.
   - **Regression:** Verified across History Stress Scenarios A–F in `scripts/verify_cxp04c_integration.mjs`.

2. **P1 — Mobile Short-Viewport / Virtual Keyboard Composer Clipping (`concierge-atelier.css`)**
   - **Root Cause:** Below `1024px`, `.cxp04-workspace` had `min-height: calc(100svh - 6.9rem)`, which pinned height to large viewport `svh` instead of shrinking inside the overlay's `100dvh`, pushing `#cxp04-composer-input` offscreen when emulated viewport height dropped to `460px`.
   - **Fix:** Overrode `.cxp04-root--overlay .cxp04-workspace { flex: 1; min-height: 0; }` with `flex-shrink: 0` on chrome/composer bars and `overscroll-behavior: contain` on internal scroll containers.
   - **Regression:** Verified `textareaVisibleInShortViewport: true` and `submitVisibleInShortViewport: true` at `390×460`.

3. **P0 — WAI-ARIA Day Navigation Tabs & Focus-Visible Polish (`atelier-journey-canvas.tsx`, `atelier-overlay-host.tsx`, `concierge-atelier.css`)**
   - **Fix:** Implemented roving `tabIndex`, `aria-controls`/`aria-labelledby`, `ArrowLeft`/`ArrowRight`/`Home`/`End` keyboard handlers, non-color `(Đang xem)` screen-reader indicator, `aria-describedby` dialog description, and `:focus-visible`-aware heading focus styling.
   - **Regression:** Verified `dayTabsA11y.ok: true` and `tabStaysInsideDialog: true`.

4. **P1 — Mobile WebM Aspect-Ratio Distortion & Short Duration (`verify_cxp04c_integration.mjs`)**
   - **Root Cause:** Mobile recording reused a `1440×900` Chrome window (`390×244`), and CDP's event-only `image2pipe` collapsed static dwell times into ~3s.
   - **Fix:** Spawned a dedicated `--window-size=390,844` headless Chrome instance for mobile recording and implemented wall-clock synchronized `10 fps` frame sampling plus actual VP9 PNG-frame decode probing.

---

## E. Browser History & Overlay Lifecycle

| Scenario | Verified Behavior |
| :--- | :--- |
| **A — 10 Repeated Open/Close Cycles** | `historyLenDelta: 0`, `maxDialogs: 1`, `residualLockFound: false`, `scrollDeltaPx: 0` |
| **B — Open → Back → Forward** | Back closes (`path: "/"`, `openDialogs: 0`); Forward reopens (`openDialogs: 1`) |
| **C — Overlay → `/ai-planner` → Back** | Preserves shared draft (`phase: "refinement"`, `variant: "route"`, `openDialogs: 0`); Back returns to `/` with `openDialogs: 0` |
| **D — Overlay → `/trips/da-lat-3-ngay`** | Closes cleanly, `overflow: ""`, `openDialogs: 0` |
| **E — Reload While Overlay Open** | Resets cleanly (`openDialogs: 0`, `hasStaleMarker: false`); subsequent Open/Close stays on `/` |
| **F — Rapid Double-Click** | `afterDoubleClickDialogs: 1` (single dialog only) |

---

## F. Scroll & Focus Integrity

- **Scroll Drift Across All 6 Movements (`m01_header`, `m02_float`, `m03_float`, `m04_float`, `m05_float`, `m06_finale`):** `scrollDeltaPx: 0` on every open/Open-state/close cycle (`yBefore = yWhileOpen = yAfter`: `0`, `3182`, `4493`, `6084`, `7488`, `8986`).
- **Focus Containment & Restoration:** Initial focus lands on overlay heading; `Tab`/`Shift+Tab` stays inside `dialog.cxp04-dialog-host[open]`; double-`rAF` restores focus safely across desktop header, remounted floating trigger, mobile menu toggle fallback, and Movement 06.

---

## G. Draft & State Lifecycle

- Client React memory only inside `AtelierEnabledProvider` (no `localStorage`, no URL query persistence, no backend writes).
- Routine close/reopen and `/` → `/ai-planner` client navigation preserve active draft; **Bắt đầu lại** (`resetRestoredInvitation: true`) and full page reload reset cleanly.
- Mode isolation preserved (`UX-1` and `Atelier` state namespaces never read or write each other).

---

## H. Mobile, Accessibility & Physical Device Status

- **Overflow Audit (8 Viewports with Overlay Open):** `360×640`, `360×800`, `390×844`, `430×932`, `768×1024`, `1024×768`, `1440×900`, `1920×1080` all `ok: true` with `ctaVisible: true`.
- **Short-Viewport Emulated Keyboard (`390×460`):** `textareaVisibleInShortViewport: true`, `submitVisibleInShortViewport: true`.
- **Day Tabs Keyboard A11y & Modal Semantics:** Verified via Chromium accessibility DOM assertions; note automated checks do not substitute for full screen-reader/WCAG manual audits.
- **Physical Device Status:** **`PHYSICAL DEVICE VERIFICATION PENDING`** (no physical iOS Safari or Android Chrome device attached in this environment). Real soft-keyboard resize, iOS rubber-banding, and IME behavior must be spot-checked by the owner prior to enabling Atelier by default.

---

## I. Reduced Motion Verification

Captured from independent media conditions on `/`:
- `prefers-reduced-motion: no-preference`: `matchesReduce: false`, `btnTransitionDuration: "0.18s, 0.18s"`
- `prefers-reduced-motion: reduce`: `matchesReduce: true`, `btnTransitionDuration: "0s"`, `hasOverlay: true`
- Note: Static pixels between `02_integrated_desktop_invitation.png` and `11_reduced_motion_workspace.png` are expected to match cleanly when idle (identical content and framing with transitions disabled at `0s`).

---

## J. Performance & Lazy-Loading Comparison (`measure_cxp04d_perf.mjs`, 5 Cache-Disabled Samples per Profile)

| Profile | Viewport (CPU) | Median LCP (Range) | Max CLS | JS Transfer (Pre-Open) | CSS Transfer | Img Transfer | Long Tasks (Count / Max) | Lazy Open Delta |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CXP-04D Mode OFF** | `1440×900` (`1×`) | `148 ms` (`144–188 ms`) | `0` | `295,290 B` | `25,836 B` | `2,244,384 B` | `0 / 0 ms` | — |
| **CXP-04D Mode OFF** | `390×844` (`4×`) | `236 ms` (`208–328 ms`) | `0` | `265,895 B` | `25,836 B` | `2,244,384 B` | `6 / 190 ms` | — |
| **CXP-04D Mode ON** | `1440×900` (`1×`) | `148 ms` (`128–168 ms`) | `0` | `295,220 B` | `25,886 B` | `2,244,384 B` | `0 / 0 ms` | `+13,309 B` JS, `+78,502 B` Img, `32 ms` open-to-paint |
| **CXP-04D Mode ON** | `390×844` (`4×`) | `224 ms` (`216–340 ms`) | `0` | `265,825 B` | `25,886 B` | `2,244,384 B` | `6 / 186 ms` | `+13,309 B` JS, `+36,124 B` Img, `95 ms` open-to-paint |

- **Limitation Disclosure:** Approved `main` baseline was not separately rebuilt inside `adora-system` to honor the WSC-01 zero-worktree cleanup policy; historical CXP-03D `jsTransferKB` was `272 KB` (vs `~295 KB` transfer / `~287 KB` in `verify_concierge.mjs`). Localhost measurements are comparative release checks, not real-device field Core Web Vitals.

---

## K. Dependency Security

- Installed `next` version verified: `16.4.6` (`react@19.3.0`). Online advisory search confirms `16.4.6` has **0 direct CVEs** and includes October/November 2026 Next.js security patches (`GHSA-673q-mjm6-r5xr`, `CVE-2026-96889`, `GHSA-mfr8-8qww-v76h`, `GHSA-vc7v-qv4w-wrv8`).
- `pnpm install --frozen-lockfile`: **PASS** (`Lockfile passes supply-chain policies`).
- `pnpm --filter @adora/web audit --prod`: **PASS** (`No known vulnerabilities found`).
- Root `pnpm audit --prod`: 6 advisories (`1 low`, `5 moderate`: `glob`, `minimatch`, `node-forge`), **all isolated to `apps/mobile` (`expo` / `expo-router` CLI tooling)**, zero impact on `@adora/web`.

---

## L. Complete Regression Matrix

| Suite / Command | Result | Key Metrics |
| :--- | :--- | :--- |
| `pnpm typecheck` (`apps/web`) | **PASS** (`exit 0`) | 0 TypeScript errors |
| `pnpm lint` (`apps/web`) | **PASS** (`exit 0`) | 0 errors; 0 warnings in CXP-04 files |
| `pnpm test` (`apps/web`) | **PASS** (`exit 0`) | **57/57 tests** across **6 suites** |
| `pnpm build` (Mode OFF & Mode ON) | **PASS** (`exit 0`) | Next.js `16.4.6` Turbopack; 23 routes |
| `scripts/verify_concierge.mjs` (Mode OFF + final rollback) | **PASS** (`exit 0`) | All 6 viewports (`360–1920`), `0` errors |
| `scripts/verify_cxp03_homepage.mjs` (Mode OFF) | **PASS** (`exit 0`) | Floating `02–05` visibility, scroll restoration `5803=5803`, no-JS SSR |
| `scripts/verify_cxp04_atelier.mjs` (Mode OFF + final rollback) | **PASS** (`exit 0`) | `/creative-lab/concierge-experience` 5-state & 8-viewport pass |
| `scripts/verify_cxp04c_integration.mjs` (`on` & `off`) | **PASS** (`exit 0`) | History A–F, `scrollDeltaPx: 0`, A11y tabs, WebM encode & decode |
| Lab routes HTTP smoke (`/typography-world`, `/cinematic-journey`, `/concierge-experience`) | **PASS** (`200`) | All 3 HTTP `200` |

---

## M. Visual Evidence & Provenance

### Committed Screenshots (`docs/reports/assets/cxp04d/`)
- `01_home_before_open.png` (`995,195 B`, SHA-256 `b9c676aca2849cc073fcf73d077dd41f4b9380b298c76ed345efaf43a71eca67`)
- `02_integrated_desktop_invitation.png` (`387,850 B`, SHA-256 `b06d964e5848dc71b3d17378c450b6d249eee3c37777364a775e164bedb61858`)
- `03_integrated_interpretation.png` (`156,470 B`, SHA-256 `a746544bb337ebe079bfa3b0f0584998798d289188bcd10b32dccb8ce0d77018`)
- `04_integrated_journey_reveal.png` (`308,554 B`, SHA-256 `f82420a05738870916904ec37f78695a2a698b3d8d25630b81307e21e24c8eff`)
- `05_integrated_refinement_cost.png` (`310,400 B`, SHA-256 `3151217ab53a8a8b895217aab4abff3db36b6a2afb66882fc7ccc387c09be366`)
- `06_home_after_close.png` (`1,027,813 B`, SHA-256 `af03fea2be82ef1ecb1bedfabd0bd66dc9543673f0b96248818b2764758d3687`)
- `07_mobile_invitation_360x640.png` (`122,089 B`, SHA-256 `7d93eb289a8af092b1443a70e1d886e8d1b83c31454df47d5cd13ee3894aae4e`)
- `08_mobile_conversation_390x844.png` (`15,072 B`, SHA-256 `d6a32ed12a902990b197de653e1fb897d1219dfa23509ce8c6aadcce3ea3241f`)
- `09_mobile_journey_canvas.png` (`190,799 B`, SHA-256 `00989b7446a9892219f79cc51acaf49385545db23fc8fdf11ec1e21ec39dc263`)
- `10_keyboard_focus_state.png` (`387,719 B`, SHA-256 `ebaf5b048dd2b21fde522bf427bcf67b4e0c9286fa9726ac6acf5997fe5993cf`)
- `11_reduced_motion_workspace.png` (`387,850 B`, SHA-256 `b06d964e5848dc71b3d17378c450b6d249eee3c37777364a775e164bedb61858`)
- `12_ai_planner_mode_on.png` (`311,354 B`, SHA-256 `85491b1699a4603fa2fe5bddd3cbadd8e55aea6e7a8efff6e6713c23d2b81d3b`)
- `13_ai_planner_mode_off.png` (`33,642 B`, SHA-256 `9d7ce6aa3630a32ff57c6366945589e0fcd237c5c055af08111cec9882303977`)
- `14_no_js_homepage.png` (`558,027 B`, SHA-256 `cd23b0c196f6d73dfd3ff6ba83f0d5b71857d8e524e90d7134f3215ddec96f7e`)

### External Scratch Screen Recordings & Manifest (Kept Outside Git)
- **Desktop Integration Video:** `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp04d_verify\cxp04d_desktop_integration.webm` (`vp9`, `1280×800`, `SAR 1:1`, `DAR 1280:800`, `10 fps`, `158` frames, `15.8s`, `913,261 B`, `decodeOk: true`)
- **Mobile Integration Video (Browser-Emulated):** `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp04d_verify\cxp04d_mobile_integration.webm` (`vp9`, **`390×844`**, `SAR 1:1`, `DAR 390:844`, `10 fps`, `110` frames, `11.0s`, `227,897 B`, `decodeOk: true`)
- **Provenance Manifest:** `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp04d_verify\cxp04d_evidence_manifest.json`

---

## N. Rollback Drill (OFF → ON → OFF)

1. Built & verified **Mode OFF** (`NEXT_PUBLIC_ADORA_CONCIERGE_MODE` unset) — `verify_concierge.mjs`, `verify_cxp03_homepage.mjs`, `verify_cxp04_atelier.mjs`, `verify_cxp04c_integration.mjs --mode off`, `measure_cxp04d_perf.mjs` (`exit 0`).
2. Stopped server, rebuilt & verified **Mode ON** (`NEXT_PUBLIC_ADORA_CONCIERGE_MODE=atelier`) — `verify_cxp04c_integration.mjs --mode on`, `measure_cxp04d_perf.mjs` (`exit 0`).
3. Stopped server, unset env variable, rebuilt **Mode OFF** (`pnpm build`), and re-verified `verify_concierge.mjs`, `verify_cxp04_atelier.mjs`, and `verify_cxp04c_integration.mjs --mode off` (`exit 0`). Build state remains safely on UX-1 default.

---

## O. Remaining Risks & Public Route Exposure

- **Critical Integration Blockers:** None (Gate A ready).
- **Default-ON Activation Blockers:** Pending physical iOS Safari & Android Chrome soft-keyboard check and owner activation approval.
- **Public Creative-Lab Exposure Note:** `/creative-lab/*` routes use `noindex, nofollow` metadata; note that `noindex` does not enforce access control if deployed publicly. Gating or removing `/creative-lab/*` before public production deployment is recommended in a later deployment step.
- **Deliberate Prototype Limitations:** Scripted Đà Lạt fixtures only; no live LLM, pricing, booking, or persistence.

---

## P. Release Recommendation & Q. Owner Preview Instructions

- **Recommendation:** CXP-04E local-main integration can proceed under Gate A (with UX-1 default intact and Atelier opt-in via `NEXT_PUBLIC_ADORA_CONCIERGE_MODE=atelier`) once the owner completes visual review.

### Owner Preview Commands (Do Not Run Both Servers Concurrently on `.next`)
**Mode OFF (Default UX-1):**
```powershell
Set-Location "F:\Coding\Adora System Mega Project\adora-system\apps\web"
Remove-Item Env:NEXT_PUBLIC_ADORA_CONCIERGE_MODE -ErrorAction SilentlyContinue
pnpm build
pnpm start --port 3100
```
**Mode ON (Atelier Preview):**
```powershell
Set-Location "F:\Coding\Adora System Mega Project\adora-system\apps\web"
$env:NEXT_PUBLIC_ADORA_CONCIERGE_MODE = "atelier"
pnpm build
pnpm start --port 3100
```
Stop the server cleanly with `Ctrl+C` before rebuilding into the other mode.
