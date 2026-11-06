# ADORA — Web Design 0.4: Motion Specification v1.1 Reconciliation Report

**Date:** 2026-11-07
**Phase:** Web Design 0.4 — Motion Specification v1.1 Reconciliation
**Role:** Principal Motion Design Architect & Frontend Technical Specification Owner
**Authoritative Repository:** `F:\Coding\Adora System Mega Project\adora-system`
**Verified Baseline HEAD:** `c49595573f8b7214f414a589006b748d5d6babfb` (`feat(web): implement adora discovery planner and trip experiences`)
**Deliverable Specification:** `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md`
**Scope:** Documentation & Architecture Reconciliation Only (Zero Application Source Code Modified)

> **Evidence Classification Key:**
> - **`[OBSERVED]`** — Directly verified in repository files, configuration, or scripts at `c49595573f8b7214f414a589006b748d5d6babfb`.
> - **`[DOCUMENTED]`** — Recorded in `AGENTS.md`, `docs/design/`, or `docs/reports/`.
> - **`[INFERRED]`** — Derived from browser rendering mechanics, CSS specifications, React 19 / Next.js 16 `<Activity>` behavior, or Tailwind CSS v4 output.
> - **`[RECOMMENDATION]`** — Reconciled engineering specification or target budget in `ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md`.

---

## 1. Starting Git State

Before authoring the reconciled specification, the repository state was verified via command-local `safe.directory` Git commands (`[OBSERVED]`):
- **Branch:** `main`
- **HEAD Commit SHA:** `c49595573f8b7214f414a589006b748d5d6babfb`
- **Commit Subject:** `feat(web): implement adora discovery planner and trip experiences`
- **Tracked Working Tree Status:** Clean (`0` modified or staged tracked files).
- **Untracked Pre-Reconciliation Artifacts Present:**
  - `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md`
  - `docs/reports/WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md`
  - `docs/reports/WEB_DESIGN_0_4_MOTION_PLANNING_REPORT.md`

---

## 2. Review Documents & Source Files Consumed

### 2.1 Architecture, Governance & Review Documents
1. `AGENTS.md` (`[DOCUMENTED]`) — Repository ownership, frontend-first rules, honesty/demo constraints, and testing discipline.
2. `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md` (`[DOCUMENTED]`) — Original Motion Design Specification v1.0.
3. `docs/reports/WEB_DESIGN_0_4_MOTION_PLANNING_REPORT.md` (`[DOCUMENTED]`) — Original Web Design 0.4 motion planning report.
4. `docs/reports/WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md` (`[DOCUMENTED]`) — Independent architecture review by Claude Code (Opus 5.5) with verdict `APPROVED WITH REQUIRED REVISIONS` (`B-1` through `B-9` and `O-1` through `O-7`).
5. `docs/design/ADORA_Website_Design_Blueprint_v1.0/01_DESIGN_BLUEPRINT.md` (`[DOCUMENTED]`) — Approved visual and atmospheric design blueprint.
6. `docs/design/WEB_DESIGN_0_3_FRONTEND_ARCHITECTURE.md` & `docs/reports/WEB_DESIGN_0_3_ESSENTIAL_PAGES_REPORT.md` (`[DOCUMENTED]`) — Verified Web Design 0.3 architecture and 6-viewport verification baseline.

### 2.2 Application Source Files Audited (`[OBSERVED]`)
- `apps/web/next.config.ts` (`cacheComponents: true` at line 5).
- `apps/web/src/app/globals.css` (design tokens, `.image-reveal`, `.hero-scroll-line`, `@media (prefers-reduced-motion: reduce)`).
- `apps/web/src/components/home/{editorial-hero,brand-philosophy,destination-story,experience-story,ai-planner-section,how-it-works}.tsx`.
- `apps/web/src/components/layout/{site-header,site-footer}.tsx`.
- `apps/web/src/components/discovery/{destination-browser,experience-browser,experience-card,experience-grid,planner-cta}.tsx`.
- `apps/web/src/components/planner/planner-workspace.tsx` (scroll-anchoring `getBoundingClientRect()` logic at lines 66–89, welcome cards, mobile jumpbar, and reset handler).
- `apps/web/src/components/trips/{trip-card,itinerary-explorer}.tsx` (day tabs at lines 60–96 and activity accordion at lines 98–140).
- `scripts/verify_web_0_3.mjs` and `scripts/verify_homepage.mjs`.

---

## 3. Blocking Items `B-1` Through `B-9` Resolution Matrix

All nine blocking items (`B-1` through `B-9`) identified in Section 12 of `WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md` have been fully resolved in `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md`:

| ID | Blocking Review Finding | v1.1 Resolution Summary | Spec v1.1 Location | Status |
| :--- | :--- | :--- | :--- | :---: |
| **`B-1`** | `<Reveal>` used `rect.top > innerHeight * 0.92` (hiding elements in the bottom 8% of the viewport), relied on React `useState` inside `useEffect` (which fails `eslint-plugin-react-hooks` v7 `set-state-in-effect` at Error), lacked polymorphic `as`/`className` support, and needed fail-visible protections (`watchdog`, `:focus-within`, `@media print`, Strict Mode / `<Activity>` idempotence) plus protection against a persistent `pending` state. | Replaced `<Reveal>` with a zero-`useState` imperative DOM dataset contract (`el.dataset.reveal`) using `revealedRef = useRef(false)`. Uses `threshold: 0` and `rootMargin: "100000px 0px -10% 0px"`. In the **first IO callback**, elements are staged `pending` **only** if `!entry.isIntersecting && entry.boundingClientRect.top >= window.innerHeight` (100% below fold). Supports `as?: "div" \| "li" \| "section" \| "article" \| "figure"` and `className`. Adds multi-layer fail-visible guards: `1500ms` pre-callback watchdog + **post-pending passive `scroll`/`resize`/`hashchange`/`visibilitychange` viewport check** + `:focus-within` + `@media print` + `@media (prefers-reduced-motion: reduce)`. | Sections A.3, C.2, G (Package A) | **RESOLVED** |
| **`B-2`** | CSS cascade conflicts: Tailwind v4 emits individual `translate`/`rotate`/`scale` properties (`lg:translate-y-10`, `rotate-180`); `animation-fill-mode: forwards` overrides `:hover` on `.image-reveal img`; non-`none` settled transforms create stacking contexts; permanent `will-change` wastes GPU memory; fading full-bleed colored `<section>` backgrounds causes paper-colored flashes. | Added explicit CSS Cascade & Transform Composition contract: animate only `opacity` and `transform` (plus accordion `grid-template-rows`); never animate `translate`/`rotate`/`scale`; use `animation-fill-mode: backwards` on load settles so settled state is `transform: none`; `[data-reveal="visible"]` settles to `transform: none`; prohibit static `will-change`; never fade full-bleed colored `<section>`/`<footer>` containers (`AiPlannerSection`, `HowItWorks`, `PlannerCta`, `SiteFooter`). | Sections A.4, C.1 | **RESOLVED** |
| **`B-3`** | Next.js 16 (`cacheComponents: true`) preserves visited routes in `<Activity>` (`display: none`). Navigating Back toggles `display: none -> block`, which restarts CSS `@keyframes` on mounted elements (such as `/ai-planner` chat bubbles) and can confuse DOM queries that do not check visibility. | Added dedicated Next.js 16 `<Activity>` safety contract: `<Reveal>` short-circuits via `revealedRef.current` and CSS transitions; `/ai-planner` turns and day panels set `data-entered="true"` on `onAnimationEnd` with CSS scoped to `:not([data-entered="true"])`; browser verification scripts after client-side navigation must filter with `el.checkVisibility()`. | Section C.3, `INV-17`, `INV-18`, `INV-19` | **RESOLVED** |
| **`B-4`** | `PlannerWorkspace` anchors scroll via `getBoundingClientRect()` (`planner-workspace.tsx:77–80`), not `offsetTop`. Any `translateY` on messages inside `role="log"` or height animation on the jumpbar skews `scrollTop`. Jumpbar smooth scroll must check reduced motion at click time. | Corrected the `getBoundingClientRect()` explanation; mandated **strict opacity-only (`transform: none`)** for all elements inside `role="log"` (user bubble `160ms` at `0ms`; reply & mobile preview `200ms` at `+80ms`) and for `[data-testid="mobile-planner-jumpbar"]` (`160ms`). Desktop sidebar preview (`xl:flex`, outside `role="log"`) keeps `6px` rise at `+80ms`. Jumpbar click checks `matchMedia("(prefers-reduced-motion: reduce)").matches` dynamically. Added all 9 Section 8.5 regression assertions to Package D gates. | Sections C.4, D.3, `INV-17`, `INV-18`, G (Package D) | **RESOLVED** |
| **`B-5`** | In `ItineraryExplorer`, placing `border-t` and `py-5` (`40px`) directly on the `overflow-hidden` child of a `grid-rows-[0fr]` wrapper leaves `41px` visible when collapsed. Also `inert={!open}` makes `aria-hidden={!open}` redundant. | Specified the exact **3-layer accordion DOM structure**: (1) outer `grid transition-[grid-template-rows,opacity]` (`0fr`/`1fr`), (2) middle `<div id="activity-..." role="region" aria-label={...} inert={!open} className="min-h-0 overflow-hidden">`, (3) inner `<div className="border-t border-[var(--adora-hairline)] px-4 py-5 sm:px-5">`. Collapsed height is `0px` (`<= 1px` gate). | Section C.5, `INV-20`, G (Package D) | **RESOLVED** |
| **`B-6`** | Spec v1.0 listed "Web Design 0.3 Verified Baseline" values for `CLS`, `LCP`, and `INP` that were not measured in 0.3, claimed "zero LCP penalty" as a fact rather than a target, and proposed measuring `INP` via untrusted `el.click()`. | Replaced unmeasured baseline claims with an explicit **Package A Pre-Code Baseline Capture** at `c495955` (`docs/reports/baseline_0_3_metrics.json`). Restated hero LCP behavior as a design target verified via `largest-contentful-paint` element identity and `startTime`. Adopted trusted CDP `Input.dispatchMouseEvent` / `dispatchKeyEvent` + `PerformanceObserver({ type: "event", durationThreshold: 16 })` for INP proxy. | Section F.1, F.2, G (Package A & E) | **RESOLVED** |
| **`B-7`** | Demo/honesty disclosures must never be hidden behind standalone reveal delays, and no pulsing "live" indicators or fake streaming states may appear. | Added mandatory **Disclosure Exemption & Product Honesty Rules** in Section A.5 covering all 5 disclosure locations (`ExperienceStory`, `AiPlannerSection`, `/experiences/[slug]`, `PlannerWorkspace`, and all `DemoBadge`/`DemoLabel` instances). | Section A.5, `INV-08`, `INV-09`, `INV-16`, `INV-17` | **RESOLVED** |
| **`B-8`** | Reconcile all item-level review dispositions across `INV-01` through `INV-20` (defer `INV-02`, scope `INV-13`, `INV-14`, `INV-16`, `INV-17`, `INV-18`, `INV-19`, `INV-20`, and reject 5 sub-proposals). | Reconciled all 20 inventory items with 15 explicit fields per item and documented all 5 rejected sub-proposals. | Section E (`INV-01` – `INV-20`), Section 5 of this report | **RESOLVED** |
| **`B-9`** | Remove focus-ring transitions from `--adora-duration-instant` (`:focus-visible` must be `0ms`), and enforce `--adora-stagger-cap` (`270ms` / `180ms`) in CSS via `min()`. | Removed focus outlines from `--adora-duration-instant`; enforced stagger ceiling via `min(calc(var(--stagger-index, 0) * var(--adora-stagger-step)), var(--adora-stagger-cap))` and `min(var(--reveal-delay, 0ms), var(--adora-stagger-cap))`. | Sections B.1, B.3, C.2 | **RESOLVED** |

---

## 4. Optional Items `O-1` Through `O-7` Disposition Matrix

Each optional recommendation (`O-1` through `O-7`) from Section 12 of `WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md` was evaluated and incorporated into v1.1:

| ID | Optional Review Recommendation | Disposition | Technical Rationale & Integration in v1.1 |
| :--- | :--- | :---: | :--- |
| **`O-1`** | Rename easing tokens by role (since `cubic-bezier(0.22, 1, 0.36, 1)` is quintic, not exponential) and drop `--adora-ease-linear`. | **ADOPTED** | Renamed to `--adora-ease-editorial`, `--adora-ease-ui`, and `--adora-ease-ambient` in Section B.2; dropped unused `--adora-ease-linear`; preserved `--adora-transition` alias. |
| **`O-2`** | Record the supersession of the Blueprint's draft motion token names and the `700ms -> 1200ms` hover deviation. | **ADOPTED** | Documented in Section B.4, explaining how Web Design 0.2/0.3 standardized on `--adora-*` names and `1200ms` `.image-reveal img` hover zoom (`globals.css:20, 164`). |
| **`O-3`** | Bound the hero scroll-line loop (`.hero-scroll-line`) to `<= 5s` (WCAG 2.2.2). | **ADOPTED (P2 in Package B)** | Specified `animation-iteration-count: 2` (`2 × 2.2s = 4.4s <= 5.0s`) settling at `scaleY(1), opacity: 0.75` in `INV-05`, ensuring `document.getAnimations()` reaches `0` after `4.5s`. |
| **`O-4`** | Set a motion budget per page/section to prevent repetition across five Discovery routes. | **ADOPTED** | Formalized in Section A.4: max 1 reveal depth per section (never nested `<Reveal>` inside `<Reveal>`), max 4 stagger steps (`<= 270ms`), and `0ms` mobile stagger on single-column stacked grids. |
| **`O-5`** | Fix pre-existing planner focus loss (`P-6`) inside Package D; log tab `aria-controls` and span `aria-label` items for a later a11y pass. | **ADOPTED** | Added explicit `P-6` remediation in Section C.4 and Package D (moving focus to `#planner-prompt` when a welcome suggestion card is clicked); logged the two non-motion a11y items in Section 12 of this report. |
| **`O-6`** | Correct factual slip in v1.0 Section H.1 ("5 of the 6 homepage sections"): **all six** homepage section components are Server Components `[OBSERVED]`. | **ADOPTED** | Corrected in Section D.1 (`EditorialHero`, `BrandPhilosophy`, `DestinationStory`, `ExperienceStory`, `AiPlannerSection`, and `HowItWorks` are all Server Components). |
| **`O-7`** | Add a motion kill switch for demo rehearsals (`html[data-motion="off"]`) in addition to reduced-motion emulation. | **ADOPTED** | Added `html[data-motion="off"]` in Sections B.5 and C.2, sharing the reduced-motion CSS block and `<Reveal>` immediate-visible check at zero runtime cost. |

---

## 5. Inventory Changes Summary (`INV-01` Through `INV-20`)

### 5.1 Item-by-Item Reconciliation Table

| ID | Surface | v1.0 Priority | v1.1 Priority & Package | Review Disposition & Key Technical Changes in v1.1 |
| :--- | :--- | :---: | :---: | :--- |
| **`INV-01`** | `SiteHeader` desktop underline | P2 | **P2** (Optional / Package C-F) | **APPROVE.** Unchanged (`scaleX(0 -> 1)`, `240ms var(--adora-ease-editorial)`). Focus outline stays `0ms`. |
| **`INV-02`** | `SiteHeader` mobile drawer | P2 | **Deferred** | **DEFER.** Preserves synchronous `open ? "grid" : "hidden"` so `verify_web_0_3.mjs:643` (`display === "grid"`) is untouched. |
| **`INV-03`** | `EditorialHero` background image | P0 | **P0 — Package B** | **APPROVE.** `opacity: 1` from `0ms`; `scale(1.035 -> none)` with `animation-fill-mode: backwards`. |
| **`INV-04`** | `EditorialHero` typography & CTAs | P0 | **P0 — Package B** | **APPROVE.** 4-step rise (`0/60/120/180ms` desktop, `0/40/80/120ms` mobile) with `backwards` fill and `min()` stagger cap. |
| **`INV-05`** | `EditorialHero` scroll indicator | P0 | **P0 (Existing) / P2 (`O-3` bound in Package B)** | **APPROVE.** Bound to `2` iterations (`4.4s <= 5s` WCAG 2.2.2) settling at `scaleY(1)`. |
| **`INV-06`** | `BrandPhilosophy` reveal | P0 | **P0 — Package A (Pilot)** | **APPROVE.** Designated as the Package A pilot section for browser verification of `<Reveal>`. |
| **`INV-07`** | `DestinationStory` reveal | P0 | **P0 — Package B** | **APPROVE.** Settles to `transform: none` so `-bottom-6` coordinate badge containing block is unshifted; compatible with `<Suspense>` stream swap. |
| **`INV-08`** | `ExperienceStory` reveal | P0 | **P1 — Package B** | **APPROVE.** Moved from P0 to P1. Uses `<Reveal as="li">` for `<ol>` semantics, inner wrapper inside `lg:translate-y-10` column (`B-2`), and zero delay on pricing disclaimer (`B-7`). |
| **`INV-09`** | `AiPlannerSection` reveal | P0 | **P1 — Package B** | **APPROVE.** Moved from P0 to P1. Outer `bg-[var(--adora-ink)]` `<section>` stays `opacity: 1` (`B-2`); demo notice has zero extra delay (`B-7`); inner sample bubbles use CSS delay on parent reveal rather than nested `<Reveal>` (`O-4`). |
| **`INV-10`** | `HowItWorks` reveal | P0 | **P1 — Package B** | **APPROVE.** Moved from P0 to P1. Outer `bg-[var(--adora-ivory)]` stays `opacity: 1`; steps use `<Reveal as="li">` preserving `md:first:pl-0 md:last:pr-0` (`B-1`); `0ms` mobile stagger. |
| **`INV-11`** | `SiteFooter` closing CTA | P0 | **P1 — Package B** | **APPROVE.** Moved from P0 to P1. Reveals inner CTA grid only; outer `<footer>` and utility nav stay `opacity: 1`. |
| **`INV-12`** | `PageIntro` load entrance | P1 | **P1 — Package C** | **APPROVE.** `0ms` delay on `h1` and `DemoBadge`; `60ms` delay on aside copy; `animation-fill-mode: backwards`. |
| **`INV-13`** | `/destinations` featured Đà Lạt | P1 | **P2 — Package C** | **APPROVE WITH CHANGES.** Moved to P2. Image scale settle (`1.02 -> none`, `760ms`) approved; **overlapping paper card rise rejected** (stays static `transform: none`). |
| **`INV-14`** | `DestinationBrowser` & `ExperienceBrowser` filter settle | P1 | **P1 — Package C** | **APPROVE WITH CHANGES.** Keyed by chip selection only (**`filter.query` excluded from `key`**); **opacity-only (`0.5 -> 1`, `220ms`, zero `translateY`)**. |
| **`INV-15`** | `.image-reveal` touch guard & `ExperienceCard` hover | P1 | **P0 (Touch Guard in Package A) / P1 (Keyboard Parity in Package C)** | **APPROVE.** Touch guard elevated to P0 in Package A (`@media (hover: hover) and (pointer: fine)`); `ExperienceCard` arrow nudge mirrored on `:focus-visible` in Package C. |
| **`INV-16`** | `/destinations/da-lat` & `/experiences/[slug]` detail reveals | P1 | **P1 — Package C** | **APPROVE WITH CHANGES.** Reduced reveal density (`O-4`), opt-in `ExperienceGrid reveal={true}`, `PlannerCta` inner-only reveal (`B-2`), and `/experiences/[slug]` pricing disclaimer exempt from standalone delay (`B-7`). |
| **`INV-17`** | `/ai-planner` user bubble & reply entrance | P0 | **P0 — Package D** | **APPROVE WITH CHANGES.** Changed to **opacity-only (`0 -> 1`, zero `transform`)** (`160ms` user bubble at `0ms`; `200ms` reply at `+80ms`); added `data-entered` `<Activity>` latch (`B-3`) and `P-6` welcome suggestion focus fix (`O-5`); **rejected `12deg` `Compass` icon rotation**. |
| **`INV-18`** | `/ai-planner` Trip Preview & mobile jumpbar | P0 | **P0 (Fades) / P1 (Smooth Scroll) — Package D** | **APPROVE WITH CHANGES.** Mobile preview enters **with reply at `+80ms`** (opacity-only); mobile jumpbar is **opacity-only (`160ms`)**; desktop preview (`xl:flex`) uses `opacity` + `6px` rise at `+80ms`; jumpbar click checks reduced motion dynamically. |
| **`INV-19`** | `TripCard` hover & `ItineraryExplorer` day panel | P1 | **P1 — Package D** | **APPROVE WITH CHANGES.** **Rejected separate `1.02 / 800ms` `TripCard` hover variant** (uses standard `.image-reveal`). `key={day.day}` moved to an **inner wrapper `<div>`** inside `role="tabpanel"` so `[data-testid="day-panel"]` stays stable. |
| **`INV-20`** | `ItineraryExplorer` activity accordion | P1 | **P1 — Package D** | **APPROVE WITH REQUIRED 3-LAYER STRUCTURE.** Uses 3-layer CSS Grid `0fr <-> 1fr` wrapper with inner padding/border child and `inert={!open}` (`0px` collapsed height). |

### 5.2 Explicitly Rejected Sub-Proposals (`B-8`)
1. **Mobile Drawer Grid-Row Animation (`INV-02`):** Deferred/rejected for 0.4 to preserve `verify_web_0_3.mjs:643` (`display === "grid"`).
2. **`/destinations` Overlapping Paper Card Vertical Rise (`INV-13`):** Rejected to avoid stacking-context/z-index shifts over the 12-column grid overlap.
3. **Including `filter.query` in Filter Animation `key` & `translateY` on Filter Lists (`INV-14`):** Rejected to prevent keystroke remounts and layout jitter.
4. **Welcome Suggestion Card `Compass` Icon `12deg` Rotation & `translateY` Inside `role="log"` (`INV-17`):** Rejected to preserve editorial restraint and `getBoundingClientRect()` scroll-anchoring accuracy.
5. **Second `1.02 / 800ms` Image Hover Scale Variant on `TripCard` & Keying the Outer `role="tabpanel"` Node (`INV-19`):** Rejected in favor of standard `.image-reveal` (`1.025 / 1200ms`) and keying an inner wrapper inside `role="tabpanel"`.

---

## 6. Corrected `<Reveal>` Contract Summary & Persistent-Pending Resolution

### 6.1 Core Architectural Contract (`B-1`)
- **Zero React State (`eslint-plugin-react-hooks` v7 Safe):** Uses `useRef` (`ref` and `revealedRef`) and imperative `el.dataset.reveal` mutation so `react-hooks/set-state-in-effect` (configured at Error in Next.js 16.4.3) passes cleanly (`[OBSERVED]`).
- **SSR & Hydration Safe:** Server HTML has no `data-reveal` attribute (`opacity: 1`).
- **First `IntersectionObserver` Callback Fold Check (`100%` Fold):** Configured with `{ threshold: 0, rootMargin: "100000px 0px -10% 0px" }`. Elements with `entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight` settle to `data-reveal="visible"` immediately on the first callback and never pass through `"pending"`.
- **Polymorphic Composition:** Supports `as?: "div" | "li" | "section" | "article" | "figure"` and `className?: string` passthrough so CSS Grid placement and `<ol> > <li>` / `:first-child` selectors (`how-it-works.tsx:37`) never break.

### 6.2 Analysis & Resolution of the Persistent Pending State Failure Mode
- **Failure Mode Identified:** In the review's initial pseudocode (`WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md:364–378`), `clearTimeout(watchdog)` executed on the first `IntersectionObserver` callback even when the element was below the fold and transitioned to `el.dataset.reveal = "pending"`. If the browser subsequently failed to deliver a second `IntersectionObserver` callback when the user or test script scrolled down (e.g., due to background-tab throttling, rapid programmatic scroll jumps, or intersection observer edge cases), the element had no remaining timer or fallback listener and could remain stuck at `data-reveal="pending"` (`opacity: 0`) permanently.
- **Reconciled Multi-Layer Fail-Visible Policy in v1.1 (Section C.2):**
  1. **Pre-Callback Watchdog (`1500ms`):** Protects the pre-observation window if the initial `IntersectionObserver` callback never fires.
  2. **Post-Pending Passive Viewport Guard (`scroll`, `resize`, `hashchange`, `visibilitychange`):** When an element enters `el.dataset.reveal = "pending"`, `<Reveal>` attaches passive window listeners (coalesced via `requestAnimationFrame`) that check `rect.top <= window.innerHeight * 0.92 || rect.bottom <= 0`. If true while the document is visible, `reveal()` is invoked immediately and all listeners/observers disconnect.
  3. **CSS Multi-Layer Overrides:** `:focus-within`, `@media print`, `@media (prefers-reduced-motion: reduce)`, and `html[data-motion="off"]` force `opacity: 1; transform: none;` in `0ms`.

---

## 7. Next.js 16 `<Activity>` Route Preservation Safety (`B-3`)

With `cacheComponents: true` in `apps/web/next.config.ts:5` `[OBSERVED]`, Next.js 16 hides visited routes in `<Activity>` (`display: none`) rather than unmounting them.
1. **`<Reveal>` Transitions:** Because `<Reveal>` uses CSS transitions (`[data-reveal="visible"]`) and short-circuits at the start of `useEffect` when `revealedRef.current === true`, navigating Back to a visited Discovery route preserves all revealed sections at `opacity: 1` without re-animating.
2. **One-Shot Keyframe Latch (`data-entered="true"`):** Because `display: none -> block` replays CSS `@keyframes`, `/ai-planner` turn elements (`INV-17`, `INV-18`) and `/trips/[slug]` day panel wrappers (`INV-19`) set `e.currentTarget.dataset.entered = "true"` on `onAnimationEnd` (with `e.target === e.currentTarget` guard) and scope keyframe selectors to `:not([data-entered="true"])`.
3. **Visibility-Scoped Test Queries:** `scripts/verify_web_0_4.mjs` will filter DOM queries after client-side navigation with `el.checkVisibility()` so hidden `<Activity>` trees are ignored.

---

## 8. AI Planner Scrolling & Bounding-Box Safety (`B-4`, `O-5`)

1. **`getBoundingClientRect()` Invariance:** `PlannerWorkspace` calculates `targetTop` using `turnRect.top - logRect.top` (`planner-workspace.tsx:77–80` `[OBSERVED]`). Making all entrances inside `role="log"` (`article[aria-label="Bạn"]`, `scripted-reply`, `unsupported-reply`, `trip-preview-mobile`) and the sibling `mobile-planner-jumpbar` **strictly opacity-only (`transform: none`)** guarantees that `turnRect.top`, `logRect.top`, and `log.scrollHeight` are 100% identical at `t = 0ms` and `t = 280ms` (`|Δ scrollTop| <= 1px`).
2. **Compressed Turn Timing:** User bubble fades in at `0ms` (`160ms` duration); reply, mobile preview, and desktop preview enter together at `+80ms` (`200ms` duration, settled by `280ms`).
3. **Focus Loss Fix (`P-6` / `O-5`):** Submitting a welcome suggestion card calls `inputRef.current?.focus({ preventScroll: true })` so keyboard focus lands deterministically on `#planner-prompt` instead of falling back to `document.body`.

---

## 9. Activity Accordion 3-Layer Structure (`B-5`)

To prevent `border-t` (`1px`) and `py-5` (`40px`) on `itinerary-explorer.tsx:121` from remaining `41px` tall when `grid-template-rows` is `0fr`, Specification v1.1 mandates the 3-layer hierarchy:
1. **Layer 1 (Grid Track & Opacity Interpolation):** `<div className={cn("grid transition-[grid-template-rows,opacity] duration-[240ms] ease-[var(--adora-ease-ui)]", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>`
2. **Layer 2 (Zero-Height Clip & Accessibility Region):** `<div id={`activity-${activity.id}`} role="region" aria-label={activity.title} inert={!open} className="min-h-0 overflow-hidden">`
3. **Layer 3 (Visual Border & Padding):** `<div className="border-t border-[var(--adora-hairline)] px-4 py-5 sm:px-5">...</div>`

When `open === false`, Layer 1 and Layer 2 collapse to `0px` (`<= 1px` gate), `inert` removes collapsed links from tab order and the accessibility tree, and `button[aria-controls]` always references a mounted DOM ID.

---

## 10. Baseline Measurement Plan (`B-6`)

Before modifying any application file in Package A, a baseline measurement pass will be executed against `c49595573f8b7214f414a589006b748d5d6babfb` and saved to `docs/reports/baseline_0_3_metrics.json`:
- **Conditions:** Production build (`next build` + `next start`), FastAPI offline, 5 cold runs per route across all 8 routes at `390×844` (throttled: `4×` CPU, `150ms` RTT, `1.6 Mbps` down) and `1440×900` (unthrottled).
- **Metrics Recorded:**
  1. `LCP` timestamp and element identity (`tagName`, `src` / text).
  2. `CLS` across initial load + full-page scroll pass (`!hadRecentInput`).
  3. `INP` lab proxy using **trusted CDP input** (`Input.dispatchMouseEvent` / `Input.dispatchKeyEvent`) + `PerformanceObserver({ type: "event", durationThreshold: 16 })`.
  4. Main-thread `longtask` count and duration.
  5. Compressed JS script transfer bytes per route (`Network.loadingFinished`).

---

## 11. Reconciled Package Execution Order

Implementation will proceed strictly in the order **`Package A → Package B → Package D → Package C → Package E`**, with a separate Git checkpoint after each package and a documentation checkpoint prior to Package A:
1. **Pre-Implementation Documentation Checkpoint:** Commit `ADORA_MOTION_DESIGN_SPECIFICATION_V1.md`, `WEB_DESIGN_0_4_MOTION_PLANNING_REPORT.md`, `WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md`, `ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md`, and `WEB_DESIGN_0_4_SPEC_V1_1_REVISION_REPORT.md`.
2. **Package A — Foundation, Baseline Capture, Tokens, `<Reveal>` & Pilot (`BrandPhilosophy` `INV-06`, Touch Guard `INV-15` P0).**
3. **Package B — Homepage Cinematic & Editorial Choreography (`INV-03`, `INV-04`, `INV-05`, `INV-07`–`INV-11`).**
4. **Package D — Application Interactions (`/ai-planner` `INV-17`, `INV-18`, `P-6` focus fix; `/trips*` `INV-19`, `INV-20`).**
5. **Package C — Discovery Experience (`INV-12`, `INV-13`, `INV-14`, `INV-15` keyboard parity, `INV-16`, plus optional `INV-01`).**
6. **Package E — Browser QA (`scripts/verify_web_0_4.mjs`), Performance Comparison vs. Baseline, Settled Screenshots & Final Report.**

---

## 12. Remaining Technical Questions & Logged Non-Motion Backlog Items

- **Open Architectural Questions:** **None.** All technical disagreements and edge cases between v1.0 and the Claude Code architecture review are deterministically resolved in v1.1.
- **Logged Pre-Existing Non-Motion Accessibility Items (`O-5`):**
  1. `apps/web/src/components/trips/itinerary-explorer.tsx:73` (`[OBSERVED]`): Unselected day tabs carry `aria-controls="day-panel-N"` for inactive day numbers while only the active day's panel ID is rendered. Because `INV-19` keeps the single active `role="tabpanel"` pattern, updating `aria-controls` on unselected tabs (or binding all tabs to a single stable `id="itinerary-day-panel"`) is logged as a low-risk non-motion accessibility cleanup.
  2. `apps/web/src/components/home/ai-planner-section.tsx:38` (`[OBSERVED]`): `<span className="h-2.5 w-2.5 rounded-full bg-[var(--adora-gold)]" aria-label="Decorative status dot" />` places an `aria-label` on a non-interactive `<span>` without a role (`aria-hidden="true"` is cleaner). Logged as a pre-existing markup note outside motion scope.

---

## 13. Files Created in This Reconciliation

Only the two authorized documentation deliverables were created:
1. `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md`
2. `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_REVISION_REPORT.md`

All prior artifacts (`docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md`, `docs/reports/WEB_DESIGN_0_4_MOTION_PLANNING_REPORT.md`, and `docs/reports/WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md`) were preserved untouched.

---

## 14. Final Git State

- **Branch:** `main`
- **HEAD Commit SHA:** `c49595573f8b7214f414a589006b748d5d6babfb`
- **Modified Tracked Files:** `0` (application code, `globals.css`, test scripts, `package.json`, and `pnpm-lock.yaml` are completely untouched).
- **Untracked Documentation Files in Working Tree (`5`):**
  - `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md`
  - `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md`
  - `docs/reports/WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md`
  - `docs/reports/WEB_DESIGN_0_4_MOTION_PLANNING_REPORT.md`
  - `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_REVISION_REPORT.md`

---

## 15. Readiness for Focused Claude Code Approval

`docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md` resolves every blocking item (`B-1` through `B-9`), incorporates all seven optional recommendations (`O-1` through `O-7`), eliminates the persistent-pending `<Reveal>` failure mode via a multi-layer fail-visible contract, protects Next.js 16 `<Activity>` route preservation and `/ai-planner` `getBoundingClientRect()` scroll anchoring, defines the 3-layer CSS Grid accordion structure, and establishes the Package A baseline measurement gate at `c495955`.

`WEB DESIGN 0.4 SPECIFICATION V1.1 — READY FOR FOCUSED ARCHITECTURE APPROVAL`
