# ADORA Web Design 0.4 — Motion Design Planning & Architecture Report

**Date:** 2026-11-07
**Phase:** Web Design 0.4 Preparation (Design & Architecture Planning Only)
**Repository:** `F:\Coding\Adora System Mega Project\adora-system`
**Verified Baseline Commit:** `c49595573f8b7214f414a589006b748d5d6babfb` (`feat(web): implement adora discovery planner and trip experiences`)
**Specification Document:** `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md`
**Application Code Modified:** **None** *(zero source, CSS, dependency, or database changes)*

---

## 1. Verified Git State and Web Design 0.3 Closure SHA

Before authoring the Web Design 0.4 motion specification, the repository state was verified via command-local Git commands (`git -c "safe.directory=F:/Coding/Adora System Mega Project/adora-system" ...`):

- **Current Branch:** `main`
- **Verified HEAD SHA:** `c49595573f8b7214f414a589006b748d5d6babfb`
- **Most Recent Commit Subject:** `feat(web): implement adora discovery planner and trip experiences`
- **Recent Commit History:**
  - `c495955` — `feat(web): implement adora discovery planner and trip experiences` *(Web Design 0.3 official closure: 66 files, 4,839 insertions, 246 deletions)*
  - `fe94095` — `test(web): finalize editorial homepage verification evidence` *(Web Design 0.2 closure)*
  - `4fe1403` — `docs(web): record Web Design 0.2 closure`
  - `5d4f5a7` — `feat(web): implement adora editorial homepage design`
  - `91bb11c` — `feat: implement adora phase 1.2 catalog partner and geospatial`
- **Pre-Planning Working Tree Status:** `nothing to commit, working tree clean`

---

## 2. Existing Frontend Audit (`apps/web`)

A comprehensive source and DOM audit was performed across `apps/web`:

### 2.1 Existing Motion Primitives (`apps/web/src/app/globals.css`)
- **Transition Token:** `--adora-transition: 420ms cubic-bezier(0.22, 1, 0.36, 1)`.
- **Editorial Link (`.editorial-link`):** Transitions `gap` (`0.75rem -> 1rem`) and `color` (`-> --adora-gold`) over `--adora-transition`.
- **CTA Buttons (`.light-cta`, `.dark-cta`):** Color/background hover transitions (`420ms`).
- **Filter Chips (`.filter-chip`):** `200ms ease` transitions on `background-color`, `color`, and `border-color`.
- **Image Hover (`.image-reveal img`):** `transform: scale(1.025)` over `1.2s cubic-bezier(0.22, 1, 0.36, 1)` (currently active on all `.image-reveal:hover` without a `@media (hover: hover)` touch guard).
- **Hero Scroll Indicator (`.hero-scroll-line`):** `scroll-line 2.2s ease-in-out infinite` (`scaleY(0.35 <-> 1)`, `opacity: 0.35 <-> 1`).
- **Reduced Motion (`@media (prefers-reduced-motion: reduce)`):** Sets `html { scroll-behavior: auto; }` and collapses `animation-duration` and `transition-duration` to `0.01ms !important` with `animation-iteration-count: 1 !important`.

### 2.2 Existing Route & Component Structure
- **Server Components (Default):**
  - `/` (`src/app/page.tsx`) and all six homepage sections (`EditorialHero`, `BrandPhilosophy`, `DestinationStory`, `ExperienceStory`, `AiPlannerSection`, `HowItWorks`), plus `SiteFooter`.
  - `/destinations` (`src/app/destinations/page.tsx`) and `/destinations/[slug]` (`src/app/destinations/[slug]/page.tsx`).
  - `/experiences` (`src/app/experiences/page.tsx`), `/experiences/[slug]` (`src/app/experiences/[slug]/page.tsx`), `ExperienceCard`, `ExperienceGrid`, and `PlannerCta`.
  - `/trips` (`src/app/trips/page.tsx`), `/trips/[slug]` (`src/app/trips/[slug]/page.tsx`), and `TripCard`.
  - Shared UI primitives: `Breadcrumbs`, `DemoBadge`, `PageIntro`.
- **Client Components (`"use client"` Islands):**
  - `SiteHeader` (`src/components/layout/site-header.tsx`) — mobile menu toggle (`isOpen`).
  - `DestinationBrowser` (`src/components/discovery/destination-browser.tsx`) — search, region, and availability filtering.
  - `ExperienceBrowser` (`src/components/discovery/experience-browser.tsx`) — search and category chip filtering.
  - `PlannerWorkspace` (`src/components/planner/planner-workspace.tsx`) — scripted AI Planner conversation, prompt matching, Trip Preview panels (`[data-testid="trip-preview"]`, `[data-testid="trip-preview-mobile"]`), and mobile jumpbar (`[data-testid="mobile-planner-jumpbar"]`).
  - `ItineraryExplorer` (`src/components/trips/itinerary-explorer.tsx`) — WAI-ARIA `tablist` day switcher (`#day-tab-1..3`, `[data-testid="day-panel"]`) and activity accordions (`button[aria-controls="activity-..."]`).

### 2.3 Identified Motion Gaps for Web Design 0.4
1. **Static Chapter Transitions on Discovery Pages:** Scrolling through `/`, `/destinations`, `/destinations/da-lat`, `/experiences`, and `/experiences/[slug]` currently has no chapter entrance rhythm beyond static hover states.
2. **Abrupt Filter Swaps:** Clicking region/availability/category chips in `DestinationBrowser` and `ExperienceBrowser` swaps the DOM list instantaneously without a visual settle.
3. **Abrupt Mounts in Application UI:**
   - In `PlannerWorkspace` (`/ai-planner`), newly submitted user bubbles, scripted replies, and the Trip Preview panel mount in a single frame without a `200ms–260ms` entrance transition.
   - In `ItineraryExplorer` (`/trips/[slug]`), switching day tabs (`#day-tab-1..3`) or expanding an activity accordion (`#activity-...`) mounts/unmounts content abruptly.
4. **Missing `@media (hover: hover)` Guard on `.image-reveal:hover img`:** Touch devices can latch `:hover` on tap unless hover zoom is scoped to `(hover: hover) and (pointer: fine)`.

---

## 3. Creative Direction

**Thesis:** *Luxury Editorial × Cinematic Travel × Intelligent Planning*

Using https://www.snamitravel.com/ strictly as a high-level reference for calm editorial pacing (with zero copied code, assets, or proprietary timelines), ADORA's motion language is built around two contrasting registers:
- **Discovery UI (`/`, `/destinations*`, `/experiences*`):** Slow, unhurried deceleration (`cubic-bezier(0.22, 1, 0.36, 1)`, `480ms–920ms`), restrained vertical travel (`12px–22px`), and subtle photographic scale settles (`1.035 -> 1.0`) that evoke mist lifting over Đà Lạt highlands.
- **Application UI (`/ai-planner`, `/trips*`):** Crisp, immediate, functional transitions (`cubic-bezier(0.25, 1, 0.5, 1)`, `180ms–260ms`, `6px–10px` travel) that reinforce user agency, preserve focus, and never simulate fake AI streaming.

---

## 4. Proposed Motion Architecture

### 4.1 Zero-Dependency Platform Architecture
In accordance with `docs/design/ADORA_Website_Design_Blueprint_v1.0/01_DESIGN_BLUEPRINT.md` Section 5 (*"Do not add GSAP, Lenis, Framer Motion or a canvas renderer simply to imitate the reference"*), Web Design 0.4 introduces **zero external npm dependencies** (`pnpm-lock.yaml` and `apps/web/package.json` remain unchanged):

1. **CSS Custom-Property Token Scale (`apps/web/src/app/globals.css`):**
   - Durations: `--adora-duration-instant` (`120ms`), `--adora-duration-fast` (`180ms`), `--adora-duration-ui` (`260ms`), `--adora-duration-editorial` (`420ms`), `--adora-duration-reveal` (`680ms`), `--adora-duration-cinematic` (`920ms`), `--adora-duration-image-hover` (`1200ms`).
   - Easings: `--adora-ease-out-expo` (`cubic-bezier(0.22, 1, 0.36, 1)`), `--adora-ease-out-quart` (`cubic-bezier(0.25, 1, 0.5, 1)`), `--adora-ease-in-out-sine` (`cubic-bezier(0.37, 0, 0.63, 1)`).
   - Responsive distances & staggers (`--adora-distance-*`, `--adora-stagger-*`) automatically scaled down for mobile (`< 768px`).
2. **Progressive `<Reveal>` Client Leaf (`apps/web/src/components/ui/reveal.tsx`):**
   - A ~65-line Client Component wrapper that accepts Server Component `children` without forcing the parent section or page to become a Client Component.
   - **SSR-Safe Progressive Enhancement:** Renders visible (`data-reveal="visible"`) by default in SSR HTML. On client hydration, only elements currently below the viewport fold (`rect.top > window.innerHeight * 0.92`) under `(prefers-reduced-motion: no-preference)` enter `data-reveal="pending"` and animate to `data-reveal="visible"` on first `IntersectionObserver` entry (`once: true`, `observer.disconnect()`).
3. **Declarative Keyframes & Grid Interpolation for Application Islands:**
   - Filter results (`DestinationBrowser`, `ExperienceBrowser`), AI Planner messages/previews (`PlannerWorkspace`), and itinerary day panels (`ItineraryExplorer`) use lightweight CSS `@keyframes` triggered by React `key` transitions.
   - Activity accordions in `ItineraryExplorer` use CSS Grid row-track interpolation (`grid-template-rows: 0fr <-> 1fr` + `opacity: 0 <-> 1` over `240ms`) with `inert={!open}` and `aria-hidden={!open}` when collapsed.

---

## 5. Route-by-Route Motion Inventory Summary

The complete 20-item technical matrix (`INV-01` through `INV-20`) is defined in Section L of `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md`. Summary by route:

| Route | Experience Family | Key Proposed Motion Behaviors |
| :--- | :--- | :--- |
| `/` | Discovery | Preloaded hero photo scale settle (`1.035 -> 1.0`, `920ms`, `opacity: 1` from `0ms`); 4-step hero typography stagger (`680ms`); once-per-visit scroll reveals across `BrandPhilosophy`, `DestinationStory`, `ExperienceStory` (`01–03` stagger), `AiPlannerSection` (preview window + sample bubble stagger), `HowItWorks` (3-column stagger), and `SiteFooter` closing CTA. |
| `/destinations` | Discovery | `PageIntro` load entrance (`480ms`); featured Đà Lạt photo scale settle (`760ms`) + overlapping paper card rise (`520ms`); `DestinationBrowser` filter chip transitions (`180ms`) and result-list settle (`220ms`). |
| `/destinations/da-lat` | Discovery | Hero photo scale settle (`920ms`) + breadcrumb/title/badge stagger (`680ms`); scroll reveals on `Giới thiệu`, 4-item `Điểm nhấn` grid (`80ms` stagger), `ExperienceGrid` rows, 3-day itinerary preview, and `PlannerCta`. |
| `/experiences` | Discovery | `PageIntro` load entrance (`480ms`); `ExperienceBrowser` category chip transitions (`180ms`) and asymmetric gallery settle (`240ms`); pointer-guarded `.image-reveal` hover zoom (`1200ms`) + `ArrowUpRight` nudge (`260ms`). |
| `/experiences/[slug]` | Discovery | Header load settle (`480ms`); `21:9` hero photo scale settle (`820ms`); narrative + metadata `<dl>` scroll reveal; 3 related experience cards staggered (`80ms`); `PlannerCta` reveal. |
| `/ai-planner` | Application | Zero initial load delay (`scrollTop = 0`); prompt card hover (`Compass` `12deg` rotation, `220ms`); user bubble entrance (`200ms`, `8px` rise); scripted/unsupported reply entrance (`260ms`, `10px` rise, `80ms` delay — **no fake streaming**); desktop/mobile Trip Preview crossfade (`260ms`); mobile jumpbar smooth scroll. |
| `/trips` | Application | Header load settle (`420ms`); `TripCard` border/image hover feedback; static immediate readability for demo notice and empty-state card. |
| `/trips/[slug]` | Application | Header & cover photo load settle; synchronous `role="tablist"` keyboard/click switching with `240ms` `role="tabpanel"` (`[data-testid="day-panel"]`) crossfade + `8px` rise; `240ms` `grid-template-rows: 0fr <-> 1fr` activity accordion disclosure with `180deg` chevron rotation. |

---

## 6. Accessibility and Performance Strategy

1. **Zero LCP Penalty on Hero Images:** Primary `<Image preload>` elements on `/`, `/destinations`, `/destinations/da-lat`, `/experiences/[slug]`, and `/trips/[slug]` never animate `opacity` from `0`. Only `transform: scale(...)` is animated on the composited layer so the browser records LCP on first image paint.
2. **Strict `prefers-reduced-motion: reduce` Enforcement:**
   - CSS media query collapses all durations to `0.01ms !important`, disables smooth scroll (`scroll-behavior: auto !important`), and forces `[data-reveal] { opacity: 1 !important; transform: none !important; }`.
   - `<Reveal>` checks `window.matchMedia("(prefers-reduced-motion: reduce)").matches` in JS and bypasses `pending` staging altogether.
3. **Synchronous ARIA & Keyboard Focus:**
   - Interactive state attributes (`aria-expanded`, `aria-selected`, `aria-pressed`) and programmatic `.focus()` calls execute synchronously in React event handlers (`0ms`), never inside `onTransitionEnd` or `setTimeout`.
   - Collapsed accordion panels (`open === false`) carry `inert` and `aria-hidden="true"` so keyboard `Tab` traversal never enters hidden links.
4. **Touch Device Hover Protection:** `.image-reveal:hover img` scale transitions are wrapped in `@media (hover: hover) and (pointer: fine)` so mobile/tablet touch taps do not trigger sticky zoom states.

---

## 7. Risks and Tradeoffs

| Risk | Likelihood | Impact | Mitigation in Specification |
| :--- | :---: | :---: | :--- |
| **Risk 1: Scroll-reveal elements staying at `opacity: 0` during fast scroll or headless screenshot capture** | Medium | High | `<Reveal>` defaults to `visible` in SSR, only stages elements below `window.innerHeight * 0.92`, and latches `visible` permanently on first intersection (`threshold: 0.12–0.18`). |
| **Risk 2: Hero fade-in delaying Largest Contentful Paint (`LCP`)** | Medium | High | Prohibited `opacity: 0` on `<Image preload>`; hero images use `opacity: 1` with subtle `scale(1.035 -> 1.0)` only. |
| **Risk 3: Accordion `grid-template-rows` breaking existing `verify_web_0_3.mjs` DOM assertions** | Low | Medium | `verify_web_0_3.mjs` checks `button[aria-controls="activity-d2-lunch"]` `aria-expanded` (`"false" -> "true"`), which remains synchronous; inner panel keeps `id="activity-..."` and `role="region"`. |
| **Risk 4: AI Planner message animations disturbing `latestTurnRef` scroll bounding-box checks** | Medium | High | Keep message `translateY` small (`6px–10px`) and compute `scrollToElement` using layout `offsetTop` (which is unaffected by CSS `transform: translateY`), preserving 100% of the Web Design 0.3 bounding-box assertions. |

---

## 8. Implementation Priorities (P0 / P1 / P2)

- **P0 — Essential (Core Foundation, Homepage & AI Planner):**
  - `M-01`: Motion tokens, keyframes, touch hover guard, and reduced-motion rules in `apps/web/src/app/globals.css`.
  - `M-02`: `<Reveal>` Client Leaf (`apps/web/src/components/ui/reveal.tsx`).
  - `M-03`: Homepage hero load sequence and 7-chapter scroll choreography (`/`).
  - `M-04`: AI Planner message entrance, Trip Preview crossfade, and smooth jumpbar scroll (`/ai-planner`).
- **P1 — High Visual Impact (Discovery & Trip Pages):**
  - `M-05`: Discovery pages load & scroll choreography (`/destinations`, `/destinations/[slug]`, `/experiences`, `/experiences/[slug]`).
  - `M-06`: Discovery filter settle transitions (`DestinationBrowser`, `ExperienceBrowser`).
  - `M-07`: Trip itinerary day panel transition and smooth activity accordion (`ItineraryExplorer`).
- **P2 — Optional Refinement:**
  - `M-08`: Desktop header link hairline underline and smooth mobile menu disclosure (`SiteHeader`).

---

## 9. Files Created in This Planning Task

Only the two requested markdown planning documents were created:

1. `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md`
2. `docs/reports/WEB_DESIGN_0_4_MOTION_PLANNING_REPORT.md`

No application source file, CSS file, test file, package manifest, lockfile, or backend/database file was modified. No Git commit was created.

---

## 10. Readiness for Independent Claude Code Architecture Review

The Motion Design Specification (`docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md`) provides:
- Concrete CSS custom-property token definitions (`--adora-duration-*`, `--adora-ease-*`, `--adora-distance-*`, `--adora-scale-*`, `--adora-stagger-*`).
- Explicit separation between Discovery UI and Application UI motion.
- A zero-dependency, RSC-preserving implementation pattern (`<Reveal>` + CSS keyframes/grid interpolation).
- A 20-item route-by-route motion inventory (`INV-01` through `INV-20`) with exact triggers, durations, easings, responsive adaptations, reduced-motion fallbacks, and test criteria.
- Explicit performance, LCP, CLS, keyboard focus, and `prefers-reduced-motion` acceptance gates across all six target viewports (`360`, `390`, `768`, `1024`, `1440`, `1920`).

`WEB DESIGN 0.4 MOTION SPECIFICATION — READY FOR ARCHITECTURE REVIEW`
