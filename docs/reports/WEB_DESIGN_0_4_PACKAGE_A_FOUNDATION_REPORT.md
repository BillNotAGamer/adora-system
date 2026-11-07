# ADORA Web Design 0.4 — Package A: Motion Foundation & Progressive Reveal Report

- **Date:** 2026-11-07
- **Phase:** Web Design 0.4 — Package A (Motion Foundation, Touch Hover Guard, `<Reveal>`, `BrandPhilosophy` Pilot & Incremental Verifier)
- **Authoritative Contract:** `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md` + `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_FINAL_APPROVAL.md` (Binding Errata `E-1`–`E-4`)
- **Status:** COMPLETE — ALL MANDATORY ACCEPTANCE GATES PASSED (`EXIT 0`)

> **Evidence Labels:**
> - **`[OBSERVED]`** — Verified directly in source files, Git state, HTTP responses, or Chrome DevTools Protocol (`Chrome/156.0.8078.80`) execution during Package A.
> - **`[INFERRED]`** — Derived from browser specifications, React 19 / Next.js 16 runtime semantics, or CSS Cascade / Transforms Level 2 specifications.
> - **`[UNVERIFIED]`** — Runtime behavior on engines or physical hardware not executed in this Windows Chromium laboratory environment (documented explicitly in §13 and §15).

---

## 1. Initial Branch and HEAD

- **Repository:** `F:\Coding\Adora System Mega Project\adora-system` `[OBSERVED]`
- **Branch:** `main` `[OBSERVED]`
- **Initial HEAD (Package A0 Closure):** `4b29de1173f08a5bc82eda498bd583008c95d93d` (`test(web): capture Web Design 0.3 pre-motion performance baseline`) `[OBSERVED]`
- **Preceding Checkpoints on `main`:**
  - `35a146fc7a6d95f257ba82902ade9ee3aecd802e` — `test(web): align homepage verifier with Web Design 0.3 contracts` `[OBSERVED]`
  - `87f2bf7de601e2689a71b3d543245c50c84e8271` — `docs(web): approve Web Design 0.4 motion specification v1.1` `[OBSERVED]`
  - `c49595573f8b7214f414a589006b748d5d6babfb` — `feat(web): implement adora discovery planner and trip experiences` (Web Design 0.3 application baseline) `[OBSERVED]`
- **Pre-Edit Integrity:** `git status --short -uall` was clean and `git diff c49595573f8b7214f414a589006b748d5d6babfb 4b29de1173f08a5bc82eda498bd583008c95d93d -- apps/web` was empty prior to Package A implementation `[OBSERVED]`.

---

## 2. File Inventory and Exact Changed Paths

Package A modifies or creates **five** files and adds **zero** npm dependencies:

| Status | Path | Purpose |
| :---: | :--- | :--- |
| `M` | `apps/web/src/app/globals.css` | Semantic motion tokens, mobile token overrides, touch-device `.image-reveal:hover img` media guard, progressive `[data-reveal]` CSS state rules, `stackOnMobile` override, `html[data-motion="off"]` kill switch, `@media (prefers-reduced-motion: reduce)`, and `@media print` guarantees |
| `A` | `apps/web/src/components/ui/reveal.tsx` | Zero-`useState`, SSR-safe polymorphic `<Reveal>` Client Component leaf implementing `E-1`, `E-2`, `E-3`, `N-1`, `N-2`, and `N-3` |
| `M` | `apps/web/src/components/home/brand-philosophy.tsx` | Package A pilot (`INV-06`) wrapping the three approved editorial blocks in `<Reveal>` (`0ms`, `80ms`, `160ms`) while keeping `BrandPhilosophy` a Server Component |
| `A` | `scripts/verify_web_0_4.mjs` | Dedicated zero-dependency CDP verifier (`E-4`) executing SSR/No-JS, `IntersectionObserver`, fail-visible, `<Activity>`, Strict Mode, and 6-viewport responsive/CSS suites |
| `A` | `docs/reports/WEB_DESIGN_0_4_PACKAGE_A_FOUNDATION_REPORT.md` | Package A engineering evidence and verification report |

**Untouched Protected Artifacts (`0` bytes changed `[OBSERVED]`):**
- `apps/web/package.json` and `pnpm-lock.yaml`
- `scripts/verify_web_0_3.mjs`
- `scripts/verify_homepage.mjs`
- `scripts/collect_web_motion_metrics.mjs`
- `docs/reports/baseline_0_3_metrics.json`
- All approved specification and review documents under `docs/design/` and `docs/reports/`

---

## 3. Motion Token Implementation (`apps/web/src/app/globals.css`)

Implemented in `:root` and `@media (max-width: 47.999rem)` per Specification v1.1 §B:

1. **Semantic Duration Tokens:**
   - `--adora-duration-instant: 120ms`
   - `--adora-duration-fast: 180ms`
   - `--adora-duration-ui: 240ms`
   - `--adora-duration-editorial: 420ms`
   - `--adora-duration-reveal: 680ms`
   - `--adora-duration-cinematic: 920ms`
   - `--adora-duration-image-hover: 1200ms`
2. **Purpose-Named Easing Tokens & Alias:**
   - `--adora-ease-editorial: cubic-bezier(0.22, 1, 0.36, 1)`
   - `--adora-ease-ui: cubic-bezier(0.25, 1, 0.5, 1)`
   - `--adora-ease-ambient: cubic-bezier(0.37, 0, 0.63, 1)`
   - `--adora-transition: var(--adora-duration-editorial) var(--adora-ease-editorial)` (backward-compatible alias verified at `0.42s` on `.editorial-link` across all six viewports `[OBSERVED]`).
3. **Spatial Distance, Scale & Stagger Ceiling Tokens:**
   - Desktop (`>= 48rem`): `--adora-distance-hero: 20px`, `--adora-distance-reveal: 22px`, `--adora-distance-card: 16px`, `--adora-distance-ui: 6px`, `--adora-scale-image-enter: 1.035`, `--adora-scale-image-hover: 1.025`, `--adora-stagger-tight: 60ms`, `--adora-stagger-editorial: 90ms`, `--adora-stagger-cap: 270ms`.
   - Mobile (`<= 47.999rem`): `--adora-distance-hero: 12px`, `--adora-distance-reveal: 14px`, `--adora-distance-card: 10px`, `--adora-distance-ui: 6px`, `--adora-scale-image-enter: 1.02`, `--adora-scale-image-hover: 1`, `--adora-stagger-tight: 40ms`, `--adora-stagger-editorial: 0ms`, `--adora-stagger-cap: 180ms`.
4. **Cascade & Focus Hygiene:**
   - `:focus-visible` outlines remain instant (`0ms`; no `outline` transition property).
   - `[data-reveal]` transitions animate only `opacity` and `transform` (never Tailwind CSS v4 individual `translate`, `rotate`, or `scale` properties) and settle to `transform: none`.
   - Zero persistent `will-change` declarations exist anywhere in `globals.css` (`0` non-`auto` elements observed across all six viewports `[OBSERVED]`).

---

## 4. `<Reveal>` Architecture and Lifecycle Safeguards (`apps/web/src/components/ui/reveal.tsx`)

- **Client Leaf Boundary:** `"use client"` leaf component accepting `as?: "div" | "li" | "section" | "article" | "figure"`, `variant?: "section" | "card" | "image"`, `delayMs?: number`, `stackOnMobile?: boolean`, `className?: string`, and `children: ReactNode`. Consuming sections remain React Server Components.
- **Typed Callback Ref (`N-2`):** Uses `useCallback((node: HTMLElement | null) => { ref.current = node; }, [])`, compiling cleanly under TypeScript 5.9.3 + `@types/react` 19 without `@ts-expect-error`.
- **Zero React State:** Uses `ref` and `revealedRef` only; mutates `el.dataset.reveal` imperatively (`0` `useState` calls; passes `eslint-plugin-react-hooks` v7 `set-state-in-effect` and `refs` rules).
- **Multi-Layer Fail-Visible Contract:**
  1. **SSR & Hydration:** Renders no `data-reveal` attribute; base style is `opacity: 1` and `transform: none`.
  2. **First Observer Callback Fold Decision:** Uses `{ threshold: 0, rootMargin: "100000px 0px -10% 0px" }`. Reads `entries[entries.length - 1]` (`E-1`). If `entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight`, marks `data-reveal="visible"` immediately without ever entering `"pending"`.
  3. **Pre-Callback Watchdog (`1500ms`):** Protects solely against `IntersectionObserver` failing to deliver its initial callback after mount.
  4. **Event-Driven Post-Pending Guard (Not a Time-Bounded Timeout):** Upon setting `data-reveal="pending"`, attaches passive `scroll`, `resize`, `hashchange`, and `visibilitychange` listeners, an element `focusin` listener, and a shared `document.body` `ResizeObserver` (`N-3`), and immediately schedules `onViewportEvent()` (`E-1`). Checks `rect.top <= window.innerHeight * 0.9 || rect.bottom <= 0` (`N-1` aligned to `-10%` `rootMargin`) while guarding against `display: none` (`el.getClientRects().length === 0`) and `disposed` state. Because this post-pending guard is event-driven rather than a timer, below-fold elements never pop in while the user sits stationary above the fold, while any scroll, resize, body-height shift, or focus change deterministically reveals eligible elements and disconnects all listeners/observers.
  5. **Preference & CSS Overrides:** Immediate `0ms` visibility under `:focus-within` + `focusin` (`data-reveal-instant`), `@media (prefers-reduced-motion: reduce)` + `matchMedia("change")`, `html[data-motion="off"]` + `MutationObserver`, `@media print`, and `typeof IntersectionObserver === "undefined"`.

---

## 5. Binding Errata `E-1` through `E-4` Compliance Matrix

| Erratum | Requirement Summary | Implementation Location | Browser Verification Result (`[OBSERVED]`) |
| :---: | :--- | :--- | :--- |
| **`E-1`** | Read `entries[entries.length - 1]`; call `onViewportEvent()` immediately upon setting `"pending"`; guard callback and viewport check with `disposed` flag set in cleanup | `apps/web/src/components/ui/reveal.tsx:100–230` | **PASS** — Batched `[staleBelowFold, newestIntersecting]` test (`erratumE1BatchedEntriesCheck`) immediately resolves all `3` units to `"visible"` (`opacity: "1"`); `0` listener leaks after cleanup |
| **`E-2`** | Keep `<Reveal delayMs>` capped via CSS `min(var(--reveal-delay, 0ms), var(--adora-stagger-cap))`; add `stackOnMobile` rendering `data-reveal-stack` with `@media (prefers-reduced-motion: no-preference) and (max-width: 47.999rem)` overriding `transition-delay: 0ms` without inline style defeat | `apps/web/src/components/ui/reveal.tsx:232–245`, `apps/web/src/app/globals.css:225–253` | **PASS** — `erratumE2StaggerAndStack` verified `--reveal-delay: 600ms` caps to `0.27s` (`1440×900`) and `0.18s` (`390×844`); `[data-reveal-stack]` with inline `--reveal-delay: 180ms` resolves to `0.18s` on desktop and `0s` on mobile |
| **`E-3`** | (a) Document motion-only wrapper class composition rule; (b) image variant leaves frame unscaled (`transform: none`) and scales inner `img` (`scale(var(--adora-scale-image-enter))`); (c) keep `.image-reveal img` `transition` unguarded outside `@media (hover: hover) and (pointer: fine)` | `apps/web/src/components/ui/reveal.tsx:8–15`, `apps/web/src/app/globals.css:187–223` | **PASS** — Verified `BrandPhilosophy` wrappers carry layout/border classes only; `.image-reveal img` retains `transitionDuration: "1.2s"` on both `1440×900` fine-pointer and `390×844` touch emulation |
| **`E-4`** | (a) Create `scripts/verify_web_0_4.mjs` in Package A; (b) assert on `#philosophy [data-reveal-variant]` units (`3` units); (c) inject temporary `tabindex="-1"` probe for `:focus-within` test; (d) fast jump `scrollTo(0, scrollHeight)` + `2` `rAF` frames leaves `0` pending elements in viewport | `scripts/verify_web_0_4.mjs` | **PASS** — `verify_web_0_4.mjs` exited `0`; `focusWithinPendingCheck` resolved `opacity: "0" -> "1"` (`0s`) and stayed `"visible"` after blur/removal; `fastScrollJumpTest` left `0` pending elements in viewport (`totalPendingAfterJump: 0`) |

---

## 6. Touch-Device Hover Guard Result (`INV-15` P0)

- **Desktop Fine-Pointer (`1440×900`, `mobile: false`, `touch: false`):** `matchMedia('(hover: hover) and (pointer: fine)').matches === true`; `.image-reveal img` `transitionDuration === "1.2s"`; dispatching CDP `mouseMoved` onto `#destinations .image-reveal` matched `:hover` and animated `img` scale (`scaleX: 1.0187` at `+300ms` into the `1.2s` curve) `[OBSERVED]`.
- **Mobile Touch Emulation (`390×844`, `mobile: true`, `touch: true`):** `matchMedia('(hover: hover) and (pointer: fine)').matches === false`, `matchMedia('(hover: none)').matches === true`; `.image-reveal img` retained `transitionDuration === "1.2s"` (`E-3c`); dispatching CDP `touchStart` + `touchEnd` + synthesized `mouseMoved` left `getComputedStyle(img).transform === "none"` (no sticky zoom latch) `[OBSERVED]`.

---

## 7. `BrandPhilosophy` Pilot Results (`INV-06`)

- `apps/web/src/components/home/brand-philosophy.tsx` remains a React Server Component with zero copy, typography, spacing, or semantic heading changes `[OBSERVED]`.
- Outer `<section id="philosophy" className="adora-section bg-[var(--adora-paper)]">` stays static (`opacity: "1"`, `transform: "none"`).
- Three non-nested `<Reveal>` units (`delayMs={0}`, `delayMs={80}`, `delayMs={160}`) stage at `data-reveal="pending"` (`matrix(1, 0, 0, 1, 0, 22)` on desktop) when below the fold, transition over `0.68s` (`0s`, `0.08s`, `0.16s` delays), and settle to `data-reveal="visible"`, `opacity: "1"`, `transform: "none"` with `CLS = 0` `[OBSERVED]`.
- Scrolling away to the bottom, returning to `y = 0`, and scrolling back to `#philosophy` preserves `data-reveal="visible"` (`one-shot` permanence) `[OBSERVED]`.
- Direct anchor navigation to `http://127.0.0.1:3100/#philosophy` renders `#philosophy` in viewport with all `3` units immediately `data-reveal="visible"` (`anyVisibleUnitEverPending: false`) `[OBSERVED]`.
- Natural partial-fold load on `768×1024` tablet portrait (`firstUnitTop = 944px` inside `1024px` viewport, below the `-10%` `921.6px` observer margin) immediately resolves the partially visible unit to `data-reveal="visible"` (`anyPartiallyVisibleEverPending: false`) `[OBSERVED]`.

---

## 8. SSR and Hydration Verification

- **Raw SSR HTML (`fetch("http://127.0.0.1:3100/")`):** HTTP `200`; `0` `data-reveal=` state attributes (`hasAnyDataRevealStateAttr: false`); `3` `data-reveal-variant="section"` wrappers; exact philosophy heading and body copy present `[OBSERVED]`.
- **Blocked Client JS Bundles (`Network.setBlockedURLs(["*/_next/static/chunks/*.js"])` at `1440×900` and `390×844`):** With all external client hydration scripts blocked, `#philosophy` and all `3` `[data-reveal-variant]` units lay out visibly on screen (`width > 0`, `height > 0`, `opacity: "1"`, `transform: "none"`, `anyDataRevealAttr: false`) `[OBSERVED]`.
- **Full Browser Script Disablement (`Emulation.setScriptExecutionDisabled(true)`):** Verified `#philosophy` and all `3` units exist in DOM with `anyDataRevealAttr: false`, `opacity: "1"`, and `transform: "none"`. **Nuance `[OBSERVED]`:** Because `/` uses Next.js 16 Partial Prerendering (`cacheComponents: true`) alongside a root `apps/web/src/app/loading.tsx` boundary, Next.js streams `<main>` inside `<div hidden id="S:1">` and swaps it into `<template id="B:1">` via React's inline `$RC("B:1","S:1")` `<script>`. Disabling inline `<script>` execution in Chromium prevents Next.js's own `S:1 -> B:1` stream swap on `◐` routes (a framework-level `loading.tsx` streaming behavior pre-existing from Web Design 0.3, independent of `<Reveal>`).
- **Hydration Cleanliness:** `0` React hydration warnings or console/runtime errors across all production and development test runs `[OBSERVED]`.

---

## 9. Reduced-Motion, Kill-Switch, Print & Focus Checks

Verified in `scripts/verify_web_0_4.mjs` (`failVisible.passed === true` `[OBSERVED]`):
- **`prefers-reduced-motion: reduce` at initial load:** All `3` units immediately resolve to `data-reveal="visible"`, `opacity: "1"`, `transform: "none"`, `everEnteredPending: false`.
- **`prefers-reduced-motion: reduce` toggled after hydration:** With `3` units in `"pending"`, toggling reduced motion immediately resolves `opacity: "1"`, `transform: "none"`, and settles `data-reveal="visible"`.
- **`html[data-motion="off"]` pre- and post-hydration:** Pre-hydration never enters `"pending"`; post-hydration synchronously forces `opacity: "1"` and `transform: "none"` via CSS and settles `data-reveal="visible"` via `MutationObserver`.
- **`@media print`:** Emulating `media: "print"` while `3` units are `"pending"` immediately computes `opacity: "1"` and `transform: "none"` on all `3` units.
- **Missing `IntersectionObserver`:** Deleting `window.IntersectionObserver` before page scripts run produces `0` errors and resolves all `3` units to `data-reveal="visible"`, `opacity: "1"`, `transform: "none"`.
- **Keyboard Focus (`E-4c`):** Focusing an injected `<span tabindex="-1">` inside a `"pending"` unit (`opacityBefore: "0"`) immediately resolves `opacity: "1"`, `transform: "none"`, `transitionDuration: "0s"`, `data-reveal: "visible"`, and retains `opacity: "1"` after `blur()` and probe removal.

---

## 10. Next.js 16 `<Activity>` and React 19 Strict Mode Results

- **`<Activity>` Post-Reveal Back Navigation (`1440×900` production):** After scrolling `#philosophy` into view (`activeRevealObservers: 3 -> 0`, `scrollListeners: 3 -> 0`), clicking header link `/destinations` and executing `history.back()` restored `/` with all `3` visible `#philosophy` units remaining `data-reveal="visible"`, `opacity: "1"`, `transform: "none"`, and `0` active observers/listeners `[OBSERVED]`.
- **`<Activity>` Pending-State Hide & Restore (`1440×900` production):** Navigating from unscrolled `/` (`3` pending units) to `/destinations` cleaned up all `<Reveal>` subscriptions while hidden (`activeObserversWhileHidden: 0`, `scrollListenersWhileHidden: 0`); `history.back()` re-observed the pending units and revealed all `3` cleanly upon scrolling (`activeObserversAfterReveal: 0`) `[OBSERVED]`.
- **React 19 Development Strict Mode (`next dev` on isolated port `127.0.0.1:3105`):** Executed `ADORA_STRICT_DEV_URL=http://127.0.0.1:3105 node scripts/verify_web_0_4.mjs --strict-dev-only` and terminated `next dev` afterward. Observed `ioConstructed: 6` (`7` total before filtering, `6` `<Reveal>` observers across `3` instances × `2` Strict Mode effect passes) with `activeObserversWhilePending: 3` (zero leaked duplicate observers from first pass), `pendingRemaining: 0` after scroll, and `activeObserversAfterReveal: 0` `[OBSERVED]`.

---

## 11. Six-Width Browser Verification

Executed on `http://127.0.0.1:3100` across all six required viewports (`responsiveAndCss.passed === true` `[OBSERVED]`):

| Viewport | `scrollWidth` (Pre / Post) | Hero `img` & `h1` Initial Opacity | Pending After Scroll | `#philosophy` Settled (`opacity: 1`, `transform: none`) | Homepage `CLS` | Non-`auto` `will-change` | Errors |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `360×800` | `360 / 360` | `1 / 1` | `0` | `true` | `0` | `0` | `0` |
| `390×844` | `390 / 390` | `1 / 1` | `0` | `true` | `0` | `0` | `0` |
| `768×1024` | `768 / 768` | `1 / 1` | `0` | `true` | `0` | `0` | `0` |
| `1024×900` | `1024 / 1024` | `1 / 1` | `0` | `true` | `0` | `0` | `0` |
| `1440×900` | `1440 / 1440` | `1 / 1` | `0` | `true` | `0` | `0` | `0` |
| `1920×1080` | `1920 / 1920` | `1 / 1` | `0` | `true` | `0` | `0` | `0` |

Unrelated routes (`/ai-planner` and `/trips/da-lat-3-ngay`) confirmed `0` `[data-reveal]`/`[data-reveal-variant]` nodes, `0` active animations, and `0` non-`auto` `will-change` elements `[OBSERVED]`.

---

## 12. All Global Regression Gate Outcomes

All seven mandatory gates in Section 9 were executed against the production build (`127.0.0.1:3100`, FastAPI offline) and exited `0` `[OBSERVED]`:

1. `corepack pnpm@12.16.1 --filter @adora/web test` — **PASS** (`22/22` tests across `5` suites)
2. `corepack pnpm@12.16.1 --filter @adora/web lint` — **PASS** (`exit 0`)
3. `corepack pnpm@12.16.1 --filter @adora/web typecheck` — **PASS** (`exit 0`, zero `@ts-expect-error`)
4. `corepack pnpm@12.16.1 --filter @adora/web build` — **PASS** (`exit 0`, `20/20` static/PPR routes built)
5. `node scripts/verify_web_0_3.mjs` — **PASS** (`exit 0`, 6 viewports × 8 routes + interactive & accessibility suites)
6. `node scripts/verify_homepage.mjs` — **PASS** (`exit 0`, 6 viewports + Contracts A–D + reduced-motion checks)
7. `node scripts/verify_web_0_4.mjs` — **PASS** (`exit 0`, all Package A suites green)

---

## 13. Performance Observations and Limitations

To verify Section 10 without touching `docs/reports/baseline_0_3_metrics.json`, `scripts/collect_web_motion_metrics.mjs` was executed **unchanged** (`--runs 3 --label package-a-foundation-check`) into an external scratch file (`package_a_metrics.json`) and compared against the committed 5-run Package A0 baseline (`4b29de1173f08a5bc82eda498bd583008c95d93d`) `[OBSERVED]`:

| Metric | Package A0 Pre-Motion Baseline (`baseline_0_3_metrics.json`) | Post-Package-A Scratch Check (`3` cold runs) | Observed Delta / Assessment |
| :--- | :--- | :--- | :--- |
| **Client JS Compressed Transfer (`/`)** | `195,161 B` (`desktop` & `mobile`) | `196,810 B` (`desktop` & `mobile`) | **`+1,649 B` (`+1.61 KiB`)**, within `<= +2.0 KB` target (`0 B` delta on mobile `/ai-planner`) |
| **Homepage `/` LCP (`1440×900` unthrottled)** | `96 ms` (`h1`) | `124 ms` (`h1`) | `+28 ms` (`<= +100 ms` target); LCP element identity unchanged (`h1`) |
| **Homepage `/` LCP (`390×844` 4× CPU / 1.6 Mbps)** | `1,436 ms` (`img`) | `1,472 ms` (`img`) | `+36 ms` (`<= +100 ms` target); LCP element identity unchanged (`img`) |
| **Pre-Existing High Mobile LCP Routes** | `/destinations`: `2,972 ms`<br>`/destinations/da-lat`: `2,952 ms` | `/destinations`: `2,948 ms` (`-24 ms`)<br>`/destinations/da-lat`: `2,952 ms` (`0 ms`) | Unchanged within lab variance; image loading untouched |
| **Route & Scroll CLS (`16/16` route × profile cells)** | `0` (`0.00000`) | `0` (`0.00000`) | **`0` layout shift** across all 8 routes × 2 profiles |
| **Desktop Trusted Interaction Latency (`5` flows)** | `8 ms` (`4` flows), `24 ms` (`planner`) | `8 ms` (`4` flows), `24 ms` (`planner`) | **`0 ms` delta** across all 5 desktop interactions |
| **Mobile `4×` CPU Trusted Interaction Latency** | `16–32 ms` (`4` flows), `112 ms` (`planner`) | `24–40 ms` (`4` flows), `128 ms` (`planner`) | All `<= 200 ms` ceiling (`+0` to `+16 ms` 3-run lab variance) |
| **Non-`auto` `will-change` Count** | `0` | `0` | **`0`** across all 16 route × profile cells |

**Measurement Limitations:**
- Synthetic headless-Chromium (`Chrome/156.0.8078.80`) metrics on a single Windows workstation measure controlled pre/post deltas and **do not** constitute real-user CrUX telemetry or physical mobile GPU frame-pacing evidence `[UNVERIFIED]`.
- All background `next start` and `next dev` processes were terminated after verification, and scratch artifacts remain outside the Git repository.

---

## 14. Final Code and Git Integrity

- **Scope Discipline:** Zero Package B, C, D, or E choreography (hero keyframes, remaining homepage sections, Discovery pages, AI Planner turn fades, Trip Preview transitions, or accordion animations) was implemented.
- **Zero Dependencies Added:** `git diff apps/web/package.json pnpm-lock.yaml` is empty.
- **Baseline Integrity Preserved:** `docs/reports/baseline_0_3_metrics.json` and `scripts/collect_web_motion_metrics.mjs` (`SHA-256: e4732607fe6508bec1becfe86c1a734182c3a7aa07a70b7fdc63675cd97a43fb`) are byte-for-byte unchanged from `4b29de1173f08a5bc82eda498bd583008c95d93d`.
- **Single Package A Commit:** All five Package A paths pass `git diff --cached --check` and are committed together under `feat(web): establish adora motion foundation and progressive reveals`.

---

## 15. Known Limitations & Items Deferred to Later Packages

1. **Homepage Hero & Remaining Homepage Reveals (Deferred to Package B):**
   - `EditorialHero` image settle (`INV-03`), hero typography rise (`INV-04`, subject to the `0ms` eyebrow+`h1` merge condition because desktop `/` LCP is `h1`), `1.5`-iteration scroll-line bound (`INV-05` / `E-5`), `DestinationStory` (`INV-07` / `E-8a`), `ExperienceStory` (`INV-08` / `E-7` / `E-8c`), `AiPlannerSection` (`INV-09` / `E-8b`), `HowItWorks` (`INV-10` / `E-7`), and `SiteFooter` CTA (`INV-11`).
2. **Application Surface Choreography (Deferred to Package D):**
   - `/ai-planner` opacity-only bubble/reply/jumpbar/preview entrances (`INV-17`, `INV-18`, `E-9`), welcome prompt focus remediation (`O-5` / `N-4`), `ItineraryExplorer` user-switched day-panel entrance (`INV-19` / `E-10` / `N-7`), and 3-layer CSS Grid accordion (`INV-20`).
3. **Discovery Rollout & Keyboard Card Parity (Deferred to Package C):**
   - `PageIntro` single-step `0ms` load entrance (`INV-12` / `E-12`), `/destinations` featured image settle (`INV-13`), chip-keyed filter list settle (`INV-14` / `N-5`), `ExperienceCard` keyboard `:focus-visible` parity (`INV-15` P1 / `E-11`), and detail page reveals (`INV-16` / `N-6`).
4. **Cross-Engine Runtime Caveat (`[UNVERIFIED]`):**
   - Automated browser verification in Package A executed on Chromium (`Chrome/156.0.8078.80` on Windows). WebKit (Safari/iOS) and Gecko (Firefox) behavior for `100000px` top `rootMargin` and physical touch interaction remain `[INFERRED]` from W3C specifications rather than executed on physical Apple/Firefox devices.
