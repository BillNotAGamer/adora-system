# ADORA — Web Design 0.4: Package C — Discovery Experience Report

- **Package:** Web Design 0.4 — Package C (`Discovery Experience`)
- **Repository:** `F:\Coding\Adora System Mega Project\adora-system`
- **Branch:** `main`
- **Base Commit (Package D):** `6702a227c73c534e4485e2ba2ff203c765caa5b9` (`feat(web): refine adora planner and itinerary interactions`)
- **Authoritative Contracts:**
  - `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md` (`INV-12` through `INV-16`, `D-1`, Gates `G0` and Package C acceptance gates)
  - `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_FINAL_APPROVAL.md` (Mandatory Errata `E-6`, `E-7`, `E-11`, `E-12`; Advisory Notes `N-5`, `N-6`; Bug Fix `B-7`)
  - `docs/reports/WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md`
  - `docs/reports/baseline_0_3_metrics.json` (immutable pre-motion Web Design 0.3 performance baseline)

---

## 1. Executive Summary

Package C extends the ADORA Web Design 0.4 editorial motion language across the **Destination** (`/destinations`, `/destinations/[slug]`) and **Experience** (`/experiences`, `/experiences/[slug]`) discovery surfaces while preserving server-first SSR fail-visibility, LCP paint readiness, filtering responsiveness, and all existing Web Design 0.3 contracts:

1. **Discovery `PageIntro` CSS Load Entrance (`INV-12`, Errata `E-6`, `E-12`, Decision `D-1`):**
   - Updated `apps/web/src/components/ui/page-intro.tsx` as a pure Server Component (no `"use client"` wrapper or client-side animation latch). Note that `/trips` (`apps/web/src/app/trips/page.tsx`) does not render `<PageIntro>` and remains untouched.
   - Left-column eyebrow uses `.adora-intro-rise` (`480ms var(--adora-ease-editorial) backwards`, `0ms` delay) while `<h1>` uses `.adora-intro-heading-rise` (`480ms var(--adora-ease-editorial) backwards`, `0ms` delay, keeping `opacity: 1` from `0ms` so `<h1>` never stalls LCP if selected as the largest contentful paint element).
   - Right-column body copy and optional `aside` (`DemoBadge`) use `.adora-intro-rise` at **`0ms` delay**, guaranteeing `DemoBadge` disclosure enters simultaneously with the left heading column per Erratum `E-12`. Focus states on `.adora-intro-heading-rise:focus-visible` and `.adora-intro-rise:focus-visible` force immediate settlement (`opacity: 1; transform: none; animation: none`).
   - Verified Next.js 16 `<Activity>` Back navigation from `/destinations/da-lat` to `/destinations` leaves `<h1>`, right-column `DemoBadge`, and Featured image visible (`checkVisibility() === true`, computed `opacity === "1"`).

2. **Featured Đà Lạt Image Settle (`INV-13`):**
   - Added `data-image-settle="featured"` on the preloaded Featured Đà Lạt `<Image preload>` inside `apps/web/src/app/destinations/page.tsx`.
   - `@keyframes adora-featured-settle` animates strictly `transform: scale(1.02) -> none` over `760ms var(--adora-ease-editorial) backwards`, maintaining `opacity: 1` from `0ms` so desktop (`104ms`) and mobile (`2,996ms`) LCP readiness is preserved.
   - The outer `.image-reveal` frame (`aspect-[4/5] sm:aspect-[16/11] lg:aspect-[16/10]`) and the overlapping right-hand paper card (`lg:col-start-8 lg:row-start-1`) remain geometrically static (`transform: none`).

3. **Chip-Scoped Browser Filter & Empty State Settle (`INV-14`, Advisory Note `N-5`):**
   - `DestinationBrowser` (`apps/web/src/components/discovery/destination-browser.tsx`) derives `chipSettleKey = `${filter.region}-${filter.availability}``, **explicitly excluding `filter.query`**, and binds `key={chipSettleKey}` + `data-filter-settle=""` on `ol[data-testid="destination-results"]` and `key={`${chipSettleKey}-empty`}` + `data-filter-settle=""` on `div[data-testid="destination-empty"]`.
   - `ExperienceBrowser` (`apps/web/src/components/discovery/experience-browser.tsx`) passes `filterSettleKey={filter.category}` to `ExperienceGrid` (`apps/web/src/components/discovery/experience-grid.tsx`), applying `key={filterSettleKey}` + `data-filter-settle=""` on `ul[data-testid="experience-results"]` and `key={`${filter.category}-empty`}` + `data-filter-settle=""` on `div[data-testid="experience-empty"]`.
   - `@keyframes adora-filter-settle` runs an opacity-only `0.5 -> 1` transition over `220ms var(--adora-ease-ui) backwards` (`transform: none`), leaving `<input type="search">` continuously mounted with unbroken caret focus during typing and preventing keystroke flicker.

4. **Card Keyboard Focus Parity & Touch Hover Guard (`INV-15`, Erratum `E-11`):**
   - In `apps/web/src/components/discovery/experience-card.tsx`, moved Tailwind `group` from the non-focusable `<article>` wrapper onto `<Link className="group block">` so `group-focus-visible:` utilities actually activate on keyboard Tab focus (`E-11`).
   - Added `transition-[transform,translate,color] duration-[260ms] ease-[var(--adora-ease-editorial)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--adora-gold)] group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:text-[var(--adora-gold)]` to `<ArrowUpRight>` in both `ExperienceCard` and `DestinationBrowser` (note Tailwind v4 compiles `translate-x-0.5` / `-translate-y-0.5` to standalone CSS `translate`, verified in Chromium at `translate: 2px -2px` and `color: rgb(179, 154, 112)` on keyboard Tab).
   - Preserved Package A's `@media (hover: hover) and (pointer: fine)` guard on `.image-reveal:hover img` (`matchesHoverHover === false` on touch simulation).

5. **Detail Page Reveals, Opt-In Grid & Ruled-List Containment (`INV-16`, `E-7`, `N-6`, `B-7`):**
   - `ExperienceGrid` gains `reveal?: boolean` (default `false`, preserved `false` on `/experiences` index) and renders `<Reveal as="li" variant="card" delayMs={(index % 2) * 90} stackOnMobile>` only when opted in (`<ExperienceGrid experiences={experiences} reveal />` on `/destinations/[slug]`).
   - `PlannerCta` (`apps/web/src/components/discovery/planner-cta.tsx`) keeps its dark `<section className="bg-[var(--adora-ink)] ...">` stationary (`opacity: 1`) while wrapping its inner `.adora-container` grid in `<Reveal>`.
   - `/destinations/[slug]` (`apps/web/src/app/destinations/[slug]/page.tsx`) applies `data-image-settle=""` on hero `<Image preload>`, `adora-hero-heading-rise` (`opacity: 1`) on `<h1>`, `0ms` `.adora-load-rise` on hero eyebrow/tagline/`DemoBadge`, `<Reveal>` on section headings and intro metadata group, `<Reveal>` **inside** each ruled `<li>` in highlights (`01`–`04`) and 3-day itinerary previews (`E-7`), while keeping long-form `destination.description` prose paragraphs (`N-6`) and the editorial disclaimer static at `opacity: 1`.
   - `/experiences/[slug]` (`apps/web/src/app/experiences/[slug]/page.tsx`) applies `0ms` hero eyebrow/tagline/`DemoBadge` entrance + `adora-hero-heading-rise` on `<h1>` + `data-image-settle=""` on hero `<Image preload>`, `<Reveal>` on `#story-heading` and `#related-heading`, `<Reveal as="li" variant="card" delayMs={index * 90} stackOnMobile>` on unruled related experience cards, while leaving long-form `experience.description` prose and the entire `<aside aria-label="Thông tin gợi ý">` (including `role="note"` `Đặt chỗ · chưa khả dụng` per `N-6` and `B-7`) permanently at `opacity: 1`.

---

## 2. Modified & Created Files

| File | Role in Package C |
| :--- | :--- |
| `apps/web/src/app/globals.css` | Added `adora-featured-settle`, `adora-intro-heading-rise`, `adora-intro-rise`, `adora-filter-settle` keyframes + `@media (prefers-reduced-motion: no-preference)`, `html[data-motion="off"]`, `@media (prefers-reduced-motion: reduce)`, and `@media print` fail-visible overrides |
| `apps/web/src/components/ui/page-intro.tsx` | Pure-CSS `0ms` load entrance across both columns (LCP-safe `h1` + simultaneous `DemoBadge`) |
| `apps/web/src/app/destinations/page.tsx` | Added `data-image-settle="featured"` on Featured Đà Lạt `<Image preload>` |
| `apps/web/src/components/discovery/experience-card.tsx` | Moved `group` to `<Link>`; added keyboard `:focus-visible` `ArrowUpRight` translate + gold tint transition |
| `apps/web/src/components/discovery/experience-grid.tsx` | Added opt-in `reveal?: boolean` (`false` default) and `filterSettleKey?: string` |
| `apps/web/src/components/discovery/destination-browser.tsx` | Chip-only `chipSettleKey` settle on results & empty state + `ArrowUpRight` `:focus-visible` parity |
| `apps/web/src/components/discovery/experience-browser.tsx` | Passed `filterSettleKey={filter.category}` to `ExperienceGrid` and `data-filter-settle` on `experience-empty` |
| `apps/web/src/components/discovery/planner-cta.tsx` | Static ink band `<section>`, inner `.adora-container` `<Reveal>` |
| `apps/web/src/app/destinations/[slug]/page.tsx` | Hero load entrance + `data-image-settle`, heading/list-group reveals, inner-`<li>` reveals for highlights & trip days (`E-7`), opt-in `<ExperienceGrid reveal />`, static prose & disclaimer (`N-6`) |
| `apps/web/src/app/experiences/[slug]/page.tsx` | `0ms` hero `h1` + `DemoBadge` entrance + `data-image-settle`, static prose & `<aside>` / `role="note"` (`N-6`, `B-7`), related card grid `<Reveal>` |
| `scripts/verify_web_0_4.mjs` | Added `runPackageCDiscoverySuite`, `capturePackageCEvidence`, `--capture-package-c-evidence`, `--capture-package-c-evidence-only`, and `summary.packageC` |
| `docs/reports/assets/web-design-0-4/package-c/*` | 16 desktop (`1440x900`) & mobile (`390x844`) PNG screenshots + `package-c-telemetry.json` |
| `docs/reports/WEB_DESIGN_0_4_PACKAGE_C_DISCOVERY_EXPERIENCE_REPORT.md` | This Package C engineering & verification report |

---

## 3. Deferred Scope, Pre-existing Observations & Explicit Non-Changes

- **Deferred `INV-01` (`SiteHeader` desktop nav underline):** Per Package C instructions, `apps/web/src/components/layout/site-header.tsx` was left untouched; `INV-01` remains deferred and documented here for subsequent header/polish scheduling.
- **Explicit Non-Changes:** No modifications were made to `apps/web/package.json`, `pnpm-lock.yaml`, homepage components/sections, `/ai-planner`, `/trips`, `/trips/[slug]`, `docs/reports/baseline_0_3_metrics.json`, `scripts/collect_web_motion_metrics.mjs`, earlier package reports, or untracked `docs/reports/assets/web-design-0-4.zip`.
- **Pre-existing Empty-State Reset Button Focus Observation (`INV-14`):** During interactive filtering on `/destinations` and `/experiences`, typing in the search input preserves input mount state and focus cleanly. Clicking the conditional `Xoá bộ lọc` button inside `destination-empty` or `experience-empty` unmounts the empty-state panel as default results return; per Package C scoping, this pre-existing reset-button focus transition was observed and preserved without redesigning browser state/focus architecture.

---

## 4. Seven-Gate Verification Summary

All 7 mandatory verification gates executed and passed against clean local production builds (`pnpm --filter @adora/web build`, `next start --hostname 127.0.0.1 --port 3100`, FastAPI offline):

| Gate | Command / Check | Outcome | Observed Result |
| :--- | :--- | :--- | :--- |
| Gate 1 | `pnpm --filter @adora/web test` | **PASS** | `22/22` tests across `5` suites passed (`0` failed, `0` skipped) |
| Gate 2 | `pnpm --filter @adora/web lint` | **PASS** | `eslint .` exited with code `0` |
| Gate 3 | `pnpm --filter @adora/web typecheck` | **PASS** | `tsc --noEmit` exited with code `0` |
| Gate 4 | `pnpm --filter @adora/web build` | **PASS** | `next build` compiled & statically generated all `20/20` pages (`exit 0`) |
| Gate 5 | `node scripts/verify_web_0_3.mjs` (to scratch dir) | **PASS** | Exited `0` across all 6 viewports (`360`–`1920`) and routes |
| Gate 6 | `node scripts/verify_homepage.mjs` (to scratch dir) | **PASS** | Exited `0` (`homepageStatus: 200`, `destinationsStatus: 200`, `aiPlannerStatus: 200`, `0` runtime errors across all 6 viewports) |
| Gate 7 | `node scripts/verify_web_0_4.mjs` (full A + B + C + D suite) | **PASS** | Exited `0`: `packageA.passed: true`, `packageB.passed: true`, `packageC.passed: true`, `packageD.passed: true`, `futurePackages.packageE: { implemented: false, executed: false }` |

Additional dependency & integrity verification:
- `git diff apps/web/package.json pnpm-lock.yaml`: empty (zero added dependencies).

---

## 5. Package C Automated Verifier Telemetry (`runPackageCDiscoverySuite`)

Key observed assertions from `docs/reports/assets/web-design-0-4/package-c/package-c-telemetry.json` and full Gate 7 (`gate7_0_4.json`):

- **`destinationsDesktop` (`passed: true`):**
  - `loadProbe`: `h1AnimationName: "adora-intro-heading-rise"`, `h1Duration: "0.48s"`, `h1Delay: "0s"`, `h1Opacity: "1"`, `eyebrowDelay: "0s"`, `rightColAnimationName: "adora-intro-rise"`, `rightColDelay: "0s"`, `featuredImgAnimationName: "adora-featured-settle"`, `featuredImgDuration: "0.76s"`, `featuredImgOpacity: "1"`, `featuredFrameTransform: "none"`, `featuredCardTransform: "none"`.
  - `filterProbe`: chip selection remounted `[data-testid="destination-results"]` with `adora-filter-settle` (`0.22s`, `transform: "none"`); typing in search preserved DOM node (`typingRemounted: false`, `typingRestartedSettle: false`, focus retained); empty state (`[data-testid="destination-empty"]`) settled with `adora-filter-settle` (`opacity: "1"`).
  - `backProbe` (`<Activity>`): navigating `/destinations -> /destinations/da-lat -> history.back()` restored `/destinations` with `h1Visible: true`, `rightColVisible: true`, `featuredImgVisible: true`.
- **`experiencesDesktop` (`passed: true`):**
  - `focusAndStaticCheck`: keyboard Tab focused `<Link>` (`matchesFocusVisible: true`); `<ArrowUpRight>` moved with `translate: "2px -2px"`, `color: "rgb(179, 154, 112)"`, `transitionDuration: "0.26s"`; `/experiences` index kept `indexRevealNodes: 0` across all `6` cards.
  - `filterCheck`: chip filter applied `adora-filter-settle` (`0.22s`, `transform: "none"`); typing kept list mounted (`typingRemounted: false`); `experience-empty` settled with `adora-filter-settle` (`opacity: "1"`).
- **`destinationDetailDesktop` (`passed: true`):**
  - `loadProbe`: `heroImgSettle: true` (`opacity: "1"`), `h1Opacity: "1"`, `h1Delay: "0s"`, `badgeDelay: "0s"`, `proseReveals: 0`, `highlightLiWithReveal: 0`, `highlightInnerReveals: 4`, `tripLiWithReveal: 0`, `tripInnerReveals: 3`, `gridLiReveals: 6`, `ctaSectionHasReveal: false`, `ctaInnerHasReveal: true`.
  - `afterScroll`: `pendingCount: 0`, `visibleCount: 18`, `hiddenVisibleCheck: 0`, `horizontalOverflowPx: 0`.
- **`experienceDetailDesktop` (`passed: true`):**
  - `loadProbe`: `heroImgSettle: true` (`opacity: "1"`), `h1Opacity: "1"`, `h1Delay: "0s"`, `rightHeroDelay: "0s"`, `proseReveals: 0`, `asideReveals: 0`, `asideHasReveal: false`, `noteOpacity: "1"`, `relatedReveals: 3`.
  - `afterScroll`: `pendingCount: 0`, `visibleCount: 6`, `hiddenVisibleCheck: 0`, `horizontalOverflowPx: 0`.
- **`overridesAndTouch` (`passed: true`):**
  - Reduced motion (`390x844`): `h1Opacity: "1"`, `h1AnimName: "none"`, `h1AnimDuration: "0s"`, `imgOpacity: "1"`, `imgTransform: "none"`. Touch media check: `matchesHoverHover: false`, `imgTransitionDuration: "1e-05s"`.
- **6-Viewport Matrix (`360, 390, 768, 1024, 1440, 1920` across 4 discovery routes):**
  - All 6 viewports passed with `horizontalOverflowPx: 0`, `pendingCount: 0`, and `0` console/runtime/hydration errors.

---

## 6. Performance Comparison Against Immutable Package A0 Baseline

Measured using the unmodified `scripts/collect_web_motion_metrics.mjs --runs 5 --label package-c-discovery-experience` harness and compared against `docs/reports/baseline_0_3_metrics.json`:

### 6.1 Route Load & Frame Medians (5 Cold Runs per Cell)

| Profile | Route | A0 -> PC LCP Median | A0 -> PC CLS Median | A0 -> PC TBT Median | A0 -> PC Compressed JS | A0 -> PC rAF P95 | Max `will-change` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `desktop_unthrottled` | `/` | `96 -> 112ms` | `0 -> 0` | `1 -> 3ms` | `195,161 -> 197,818 B` | `4.4 -> 4.3ms` | `0` |
| `desktop_unthrottled` | `/destinations` | `108 -> 104ms` | `0 -> 0` | `0 -> 0ms` | `200,854 -> 203,792 B` | `4.4 -> 4.3ms` | `0` |
| `desktop_unthrottled` | `/destinations/da-lat` | `120 -> 124ms` | `0 -> 0` | `0 -> 0ms` | `200,854 -> 203,792 B` | `4.5 -> 4.4ms` | `0` |
| `desktop_unthrottled` | `/experiences` | `104 -> 100ms` | `0 -> 0` | `0 -> 0ms` | `195,161 -> 197,818 B` | `4.4 -> 4.4ms` | `0` |
| `desktop_unthrottled` | `/experiences/ca-phe-nho-giot-cao-nguyen` | `112 -> 104ms` | `0 -> 0` | `0 -> 0ms` | `200,854 -> 203,792 B` | `4.4 -> 4.4ms` | `0` |
| `desktop_unthrottled` | `/ai-planner` | `124 -> 120ms` | `0 -> 0` | `0 -> 0ms` | `195,161 -> 197,818 B` | `4.4 -> 4.3ms` | `0` |
| `desktop_unthrottled` | `/trips` | `104 -> 104ms` | `0 -> 0` | `0 -> 0ms` | `200,854 -> 203,792 B` | `4.4 -> 4.4ms` | `0` |
| `desktop_unthrottled` | `/trips/da-lat-3-ngay` | `108 -> 108ms` | `0 -> 0` | `0 -> 0ms` | `200,854 -> 203,792 B` | `4.4 -> 4.4ms` | `0` |
| `mobile_lab_throttled` | `/` | `1,436 -> 1,480ms` | `0 -> 0` | `493 -> 558ms` | `195,161 -> 197,818 B` | `4.3 -> 4.3ms` | `0` |
| `mobile_lab_throttled` | `/destinations` | `2,972 -> 2,996ms` | `0 -> 0` | `359 -> 455ms` | `200,854 -> 203,792 B` | `4.3 -> 4.3ms` | `0` |
| `mobile_lab_throttled` | `/destinations/da-lat` | `2,952 -> 2,964ms` | `0 -> 0` | `454 -> 607ms` | `200,854 -> 203,792 B` | `4.3 -> 4.3ms` | `0` |
| `mobile_lab_throttled` | `/experiences` | `1,052 -> 1,180ms` | `0 -> 0` | `340 -> 427ms` | `195,161 -> 197,818 B` | `4.3 -> 4.3ms` | `0` |
| `mobile_lab_throttled` | `/experiences/ca-phe-nho-giot-cao-nguyen` | `1,984 -> 2,012ms` | `0 -> 0` | `376 -> 425ms` | `200,854 -> 203,792 B` | `4.3 -> 4.3ms` | `0` |
| `mobile_lab_throttled` | `/ai-planner` | `876 -> 932ms` | `0 -> 0` | `219 -> 268ms` | `173,308 -> 174,717 B` | `4.3 -> 4.3ms` | `0` |
| `mobile_lab_throttled` | `/trips` | `1,384 -> 1,388ms` | `0 -> 0` | `310 -> 375ms` | `200,854 -> 203,792 B` | `4.3 -> 4.3ms` | `0` |
| `mobile_lab_throttled` | `/trips/da-lat-3-ngay` | `1,376 -> 1,380ms` | `0 -> 0` | `318 -> 378ms` | `200,854 -> 203,792 B` | `4.3 -> 4.3ms` | `0` |

### 6.2 Trusted Interaction Latency Medians (5 Runs per Cell)

| Profile | Interaction | A0 -> PC Event Timing Median | A0 -> PC Event Timing Max | A0 -> PC Next-Paint Median |
| :--- | :--- | :--- | :--- | :--- |
| `desktop_unthrottled` | `destination_filter_select` (`/destinations`) | `8 -> 8ms` | `8 -> 16ms` | `5.7 -> 5.9ms` |
| `desktop_unthrottled` | `experience_category_select` (`/experiences`) | `8 -> 8ms` | `8 -> 16ms` | `5.3 -> 6.2ms` |
| `desktop_unthrottled` | `planner_scripted_prompt_select` (`/ai-planner`) | `24 -> 24ms` | `24 -> 24ms` | `15.0 -> 16.1ms` |
| `desktop_unthrottled` | `itinerary_day_switch` (`/trips/da-lat-3-ngay`) | `8 -> 16ms` | `8 -> 16ms` | `5.6 -> 7.7ms` |
| `desktop_unthrottled` | `itinerary_accordion_toggle` (`/trips/da-lat-3-ngay`) | `8 -> 8ms` | `8 -> 8ms` | `5.2 -> 5.8ms` |
| `mobile_lab_throttled` | `destination_filter_select` (`/destinations`) | `16 -> 24ms` | `24 -> 24ms` | `14.8 -> 18.8ms` |
| `mobile_lab_throttled` | `experience_category_select` (`/experiences`) | `24 -> 32ms` | `24 -> 40ms` | `19.0 -> 26.0ms` |
| `mobile_lab_throttled` | `planner_scripted_prompt_select` (`/ai-planner`) | `112 -> 136ms` | `112 -> 224ms` | `108.0 -> 130.6ms` |
| `mobile_lab_throttled` | `itinerary_day_switch` (`/trips/da-lat-3-ngay`) | `32 -> 56ms` | `48 -> 72ms` | `31.6 -> 49.9ms` |
| `mobile_lab_throttled` | `itinerary_accordion_toggle` (`/trips/da-lat-3-ngay`) | `24 -> 24ms` | `24 -> 24ms` | `16.6 -> 15.8ms` |

Cumulative compressed JS delta across Packages A + B + D + C remains `<= +2,938 B` (`+2.9 kB` on routes up to `203,792 B`), CLS remained `0` across all 16 route/profile cells, `will-change` stayed `0`, desktop discovery LCP improved or stayed within `4ms` (`-4ms` on `/destinations` and `/experiences`, `-8ms` on `/experiences/ca-phe-nho-giot-cao-nguyen`), and mobile 4x-throttled image-LCP routes (`/destinations`, `/destinations/da-lat`) moved `+24ms` / `+12ms` (`< 1%`) relative to A0.

---

## 7. Visual Evidence Index (`docs/reports/assets/web-design-0-4/package-c/`)

- Desktop (`1440x900`): `desktop-destinations-top.png`, `desktop-destinations-featured.png`, `desktop-destinations-filtered.png`, `desktop-experiences-focus.png`, `desktop-da-lat-hero.png`, `desktop-da-lat-highlights.png`, `desktop-experience-detail-story.png`, `desktop-experience-detail-related.png`
- Mobile (`390x844`): `mobile-destinations-top.png`, `mobile-destinations-featured.png`, `mobile-destinations-filtered.png`, `mobile-experiences-top.png`, `mobile-da-lat-hero.png`, `mobile-da-lat-highlights.png`, `mobile-experience-detail-story.png`, `mobile-experience-detail-related.png`
- Machine Telemetry: `docs/reports/assets/web-design-0-4/package-c/package-c-telemetry.json`

Representative desktop and mobile captures (`desktop-destinations-top.png`, `desktop-destinations-featured.png`, `desktop-experiences-focus.png`, `desktop-da-lat-highlights.png`, `mobile-da-lat-hero.png`, `mobile-experience-detail-story.png`) were visually inspected: `PageIntro` columns and `DemoBadge` align cleanly at full contrast, the Featured Đà Lạt frame and overlapping paper card remain crisp without transform drift, keyboard `:focus-visible` shifts and tints `<ArrowUpRight>` gold, and detail highlights and `<aside>` disclosures maintain balanced editorial spacing.

---

## 8. Verdict

**PACKAGE C — DISCOVERY EXPERIENCE COMPLETE / READY FOR PACKAGE E**
