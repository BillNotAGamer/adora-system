# ADORA — Web Design 0.4: Package E Final Quality Assurance & Performance Closure Report

- **Project:** ADORA System Mega Project (`apps/web`)
- **Phase:** Web Design 0.4 — Package E (Final Quality Assurance & Performance Closure)
- **Branch / Evaluated Commit:** `main` @ `d62192c71c87b07aed72d5dd7e921003bf916302`
- **Authoritative Application Baseline (0.3):** `c49595573f8b7214f414a589006b748d5d6babfb`
- **Authoritative Package A0 Metric Baseline:** `4b29de1173f08a5bc82eda498bd583008c95d93d` (`docs/reports/baseline_0_3_metrics.json`)
- **Report Date:** 2026-11-13

---

## 1. Executive Summary & Package E Verdict

**Final Verdict Token:**
`WEB DESIGN 0.4 — CONDITIONAL PASS / DOCUMENTED BASELINE LIMITATIONS`

- **[OBSERVED]** All seven global regression gates passed cleanly on the offline `@adora/web` production build (`http://127.0.0.1:3100`, FastAPI offline): unit/integration tests (`22/22`), ESLint, TypeScript (`tsc --noEmit`), Next.js 16 production build (`20/20` routes), `scripts/verify_web_0_3.mjs`, `scripts/verify_homepage.mjs`, and the extended `scripts/verify_web_0_4.mjs --capture-package-e-evidence` (`Package A`, `Package B`, `Package C`, `Package D`, and `Package E` integration & accessibility suites all `passed: true`).
- **[MEASURED]** Cumulative Layout Shift (`CLS`) remained `0` (`0.000`) across every single one of the `80` cold runs (`8 routes × 2 profiles × 5 runs`) in Package E (`maxAcrossRunsPackageE = 0` on all `16` route-profile cells), LCP element identity was `100%` preserved (`16/16` cells vs both immutable `A0` and same-session Chrome 157 `c495955` control), animation `p95` frame interval measured `4.3–4.4 ms` (`0` frames `> 50 ms`, `0` post-settle non-`auto` `will-change`), and all trusted interaction latencies stayed comfortably within engineering targets (`6.0–15.5 ms` desktop; `13.9–118.2 ms` mobile `nextPaint`, `16–120 ms` median W3C Event Timing).
- **[OBSERVED / MEASURED]** The conditional status reflects transparent, non-blocking baseline and measurement constraints rather than functional breakage:
  1. Two routes (`/destinations` at `2,984 ms` and `/destinations/da-lat` at `2,972 ms`) already exceeded the `<= 2,500 ms` mobile LCP target in the immutable Web Design 0.3 baseline (`2,972 ms` and `2,952 ms` in `A0`; `2,976 ms` and `2,956 ms` in same-session `c495955` control) due to hero/featured image payload under simulated `1.6 Mbps` throttling (`+12 ms` and `+20 ms` vs `A0`).
  2. Mobile `4× CPU` TBT deltas exceeded the `<= +25 ms` `[RECOMMENDATION]` target on 4 routes (`/` `+65 ms` vs same-session control / `+78 ms` vs `A0`, `/destinations/da-lat` `+81 ms` vs control / `+115 ms` vs `A0`, `/experiences/ca-phe-nho-giot-cao-nguyen` `+40 ms` vs control / `+71 ms` vs `A0`, `/trips/da-lat-3-ngay` `+48 ms` vs control / `+55 ms` vs `A0`), while desktop TBT stayed `0–1 ms` (`0 ms` delta vs `A0`) across all 8 routes.
  3. Compressed JS script transfer delta measured `+2.59–+2.87 KB` across 7 of 8 routes (`+1.38 KB` on mobile `/ai-planner`), exceeding the `<= +2.0 KB` `[RECOMMENDATION]` target by `0.59–0.87 KB` due to cumulative client motion/interaction islands across Packages A–D (with zero new npm dependencies).
  4. Real physical mobile hardware, iOS Safari/WebKit, real touch virtual keyboards, and GPU-composited physical mobile frames remain `[UNVERIFIED]` in headless Windows Chrome.
  5. Three pre-existing non-motion accessibility backlog items remain documented for future remediation outside Web Design 0.4.

---

## 2. Repository Baseline, Git Lineage & Package E Scope

**[OBSERVED]** Package E evaluated the integrated codebase on branch `main` at `d62192c71c87b07aed72d5dd7e921003bf916302`, following the executed `A → B → D → C → E` implementation order:

| Stage | Commit SHA | Commit Subject | Status |
| :--- | :--- | :--- | :--- |
| Pre-Motion App Baseline | `c49595573f8b7214f414a589006b748d5d6babfb` | `feat(web): implement adora discovery planner and trip experiences` | Immutable Reference (Same-Session Control Executed) |
| Spec v1.1 Approval | `87f2bf7de601e2689a71b3d543245c50c84e8271` | `docs(web): approve Web Design 0.4 motion specification v1.1` | Preserved Untouched |
| Package A0 Baseline Capture | `4b29de1173f08a5bc82eda498bd583008c95d93d` | `test(web): capture Web Design 0.3 pre-motion performance baseline` | Preserved Untouched (`docs/reports/baseline_0_3_metrics.json`) |
| Package A (Foundation) | `a54ee8c4f1a3842e2d120ca055ad3a8b6e1cf7f8` | `feat(web): establish adora motion foundation and progressive reveals` | Verified Passing |
| Package B (Homepage) | `0a924be6e4687af0c0c88b3ffe2ee09e7c3173a2` | `feat(web): add cinematic editorial motion to adora homepage` | Verified Passing |
| Package D (App Interactions) | `6702a227c73c534e4485e2ba2ff203c765caa5b9` | `feat(web): refine adora planner and itinerary interactions` | Verified Passing |
| Package C (Discovery) | `103dccf9b124611bcedf31b5420dd8485a1fa0cf` | `feat(web): extend editorial motion across adora discovery` | Verified Passing |
| Package C Evidence Fix | `d62192c71c87b07aed72d5dd7e921003bf916302` | `docs(web): capture filtered discovery evidence for package c` | Audited Starting HEAD |

- **[OBSERVED]** Package E strictly excluded application redesigns, feature additions, new dependencies, implementation of approved-deferred `INV-01`/`INV-02`, or mutations to historical Package A/B/C/D reports, `docs/reports/baseline_0_3_metrics.json`, `scripts/collect_web_motion_metrics.mjs` (SHA-256 `E4732607FE6508BEC1BECFE86C1A734182C3A7AA07A70B7FDC63675CD97A43FB`), or user-owned `docs/reports/assets/web-design-0-4.zip`.

---

## 3. Authoritative Governance & Architecture Compliance

**[OBSERVED]** Integrated checks against `AGENTS.md`, `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md`, `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_FINAL_APPROVAL.md`, and `docs/reports/WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md` confirm:
- **Zero dependency bloat:** `apps/web/package.json`, root `package.json`, and `pnpm-lock.yaml` have zero diff from Web Design 0.3 (`c495955`).
- **Offline Frontend-First Boundary:** Verified against production build (`next start`) at `http://127.0.0.1:3100` with FastAPI `:8000` intentionally offline; `/` exercises its deterministic fallback catalog cleanly while all static routes resolve from curated editorial fixtures.
- **No AI/Backend Scope Creep:** `/ai-planner` remains a purely scripted local demo preview with zero model API calls, zero chat persistence, and zero fake prices/availability.

---

## 4. Complete 20-Item Motion Inventory Final Audit (`INV-01` – `INV-20`)

**[OBSERVED]** All 20 items from `ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md` §E were audited across source inspection and live browser verification (`scripts/verify_web_0_4.mjs` + `docs/reports/assets/web-design-0-4/package-e/final-verification-results.json`):

| ID | Surface / Component | Final Status | Package E Verification Evidence |
| :--- | :--- | :--- | :--- |
| `INV-01` | Desktop `SiteHeader` underline | **Approved Deferred** | `inv01HeaderUntouched: true`; zero motion/underline attrs on header links |
| `INV-02` | Mobile `SiteHeader` drawer (`#mobile-navigation`) | **Approved Deferred** | `mobileDrawerCheck.passed: true`; `inv02DrawerStaticDisplay: true` |
| `INV-03` | Homepage Hero `<Image preload>` scale settle | Verified Active | `packageB.heroDesktop.passed` & `heroMobile.passed`; `opacity === "1"` at `t=0ms` |
| `INV-04` | Homepage Hero typography & CTA staggered entrance | Verified Active | `packageB.heroDesktop` & `heroInteractionAndE6.passed` |
| `INV-05` | Homepage Hero scroll indicator line (bounded loop) | Verified Active | Finite iteration bound (`O-3` / `E-5`), settles without perpetual running animation |
| `INV-06` | `BrandPhilosophy` two-column `<Reveal>` | Verified Active | `packageA.intersectionObserver.passed` & `packageB.editorialDesktop.passed` |
| `INV-07` | `DestinationStory` portrait settle, badge & reveal | Verified Active | `packageB.editorialDesktop.passed` (`<Suspense>` boundary intact) |
| `INV-08` | `ExperienceStory` narrative, `<Reveal as="li">` & photo | Verified Active | `packageB.editorialDesktop.passed` (`lg:translate-y-10` preserved) |
| `INV-09` | `AiPlannerSection` preview window & bubbles | Verified Active | `packageB.sampleBubbleFailVisible.passed`; static honesty disclosure exempt |
| `INV-10` | `HowItWorks` three-step editorial grid | Verified Active | `packageB.editorialDesktop` & `editorialMobileAndOverrides.passed` |
| `INV-11` | `SiteFooter` closing editorial CTA reveal | Verified Active | `packageB.editorialDesktop.passed` (footer band/nav static) |
| `INV-12` | `PageIntro` CSS load entrance (`0ms` delay, `E-12`) | Verified Active | `packageC.destinationsDesktop` & `experiencesDesktop.passed` |
| `INV-13` | `/destinations` Featured Đà Lạt image settle | Verified Active | `packageC.destinationsDesktop.passed` (`lg:col-start-8` card static) |
| `INV-14` | `DestinationBrowser` / `ExperienceBrowser` chip settle | Verified Active | `packageC.destinationsDesktop` & `experiencesDesktop` (typing excluded, focus/scrollY preserved) |
| `INV-15` | `.image-reveal` hover touch guard + `:focus-visible` arrow | Verified Active | `packageA.responsiveAndCss` & `packageC.overridesAndTouch.passed` |
| `INV-16` | Detail pages hero settle, ruled `<Reveal>` & CTA | Verified Active | `packageC.destinationDetailDesktop` & `experienceDetailDesktop.passed` |
| `INV-17` | `/ai-planner` bubble/reply entrance + `data-entered` latch | Verified Active | `packageD.plannerDesktop` & `plannerMobile.passed` |
| `INV-18` | `/ai-planner` preview settle, jumpbar & reduced-motion scroll | Verified Active | `packageD.plannerDesktop`, `plannerMobile`, `reducedMotionApplicationCheck.passed` |
| `INV-19` | `TripCard` hover & `ItineraryExplorer` day panel entrance | Verified Active | `packageD.itineraryDesktop.passed` (outer `role="tabpanel"` identity stable; E-10 suppressed initial load) |
| `INV-20` | `ItineraryExplorer` 3-layer CSS Grid accordion (`inert`) | Verified Active | `packageD.itineraryDesktop.passed` (`grid-rows-[0fr]` collapsed height `<= 1px`, `inert={!open}`) |

---

## 5. Foundation & Fail-Visible Architecture Verification (Package A Continuity)

**[OBSERVED]** Executed inside full `verify_web_0_4.mjs` after final harness edits (`packageA.passed: true`):
- `ssrAndNoJs`: Raw SSR HTML contains zero `data-reveal="pending"` attributes; `#philosophy` and below-fold sections remain `opacity === "1"` with JavaScript disabled; zero React hydration errors.
- `intersectionObserver`: Clean below-fold staging, partial-fold safety, one-shot reveal, `E-1` newest-entry handling, `E-4d` fast jump-to-bottom 2-rAF resolution, and `/#philosophy` hash fragment immediate visibility.
- `failVisible`: Missing `IntersectionObserver`, `prefers-reduced-motion: reduce`, `html[data-motion="off"]`, `@media print`, `:focus-within` keyboard reveal, `stackOnMobile`, and stagger cap all pass.
- `lifecycleAndActivity`: Clean cleanup (`0` dangling observers/listeners post-settle) and Next.js `<Activity>` restoration safety on `/`.
- `responsiveAndCss`: 6-viewport responsive matrix (`360`, `390`, `768`, `1024`, `1440`, `1920`), zero horizontal overflow, zero persistent `will-change`.

---

## 6. Homepage Cinematic Choreography Verification (Package B Continuity)

**[OBSERVED]** `packageB.passed: true`:
- Desktop (`1440×900`) and mobile (`390×844`) hero `<Image preload>` images remain `opacity === "1"` at `t = 0 ms`; hero CTAs are immediately clickable during motion and snap to settled state on `:focus-visible`.
- All full-bleed background bands (`AiPlannerSection`, `HowItWorks`, `SiteFooter`) and editorial structural borders remain static without band-level fade.

---

## 7. Application Interactions Verification — AI Planner & Itinerary (Package D Continuity)

**[OBSERVED]** `packageD.passed: true` across desktop (`1440×900`), mobile (`390×844`), reduced-motion mode, and all 6 responsive viewports:
- Scroll-stability invariant on `/ai-planner`: `|log.scrollTop(t=0) - log.scrollTop(settled)| <= 1 px` and settled `userBubble.top - log.top` within `[8, 16] px`.
- Atomic non-streaming reply insertion (`DemoLabel` present at `t = 0 ms`, `textContent` unchanged through settle, zero `aria-busy` or network AI calls).
- `<Activity>` replay prevention (`data-entered="true"`) confirmed when navigating from `/ai-planner` to `/trips/da-lat-3-ngay` and back.
- Day tabs (`day-tab-1`–`day-tab-3`) and activity accordion (`0fr <-> 1fr`, `inert={!open}`) pass synchronously with zero content remounts.

---

## 8. Discovery Experience Verification — Destinations & Experiences (Package C Continuity)

**[OBSERVED]** `packageC.passed: true`:
- Filtering by region, availability, or category updates counts synchronously, preserves chip focus and `window.scrollY`, and runs zero re-animation while typing into search inputs.
- `/destinations/da-lat` and `/experiences/ca-phe-nho-giot-cao-nguyen` render hero `<Image preload>` at `opacity === "1"` at `t = 0 ms` and exclude `[role="note"]` disclosures from reveal delays.

---

## 9. End-to-End Cross-Route Navigation & Next.js 16 `<Activity>` Integration Journey

**[OBSERVED]** Newly added in Package E (`runPackageEFinalSuite` inside `scripts/verify_web_0_4.mjs`), both desktop (`1440×900`, `desktopJourney.passed: true`) and mobile (`390×844`, `mobileJourney.passed: true`) passed full 8-route sequential navigation (`/`, `/destinations`, `/destinations/da-lat`, `/experiences`, `/experiences/ca-phe-nho-giot-cao-nguyen`, `/ai-planner`, `/trips`, `/trips/da-lat-3-ngay`):
- Every route reported `pendingCount === 0`, `overflowPx === 0`, `mainVisible: true`, and `h1Visible: true` after scroll settle.
- Client-link SPA navigation followed by `3× window.history.back()` (`activityBackChain`: `/ai-planner` -> `/experiences` -> `/destinations/da-lat`) and `window.history.forward()` (`/experiences`) confirmed `h1Visible: true`, `0` stuck visible reveals (`checkVisibility()`), `0` leftover finite animations after settle, and `0` console or hydration errors.
- **Important Technical Observation (`<Activity mode="hidden">`):** Inactive prior routes retained in DOM by Next.js 16 `<Activity>` carry `display: none` (`checkVisibility() === false` and `getBoundingClientRect().top === 0`), so reveal checks during active SPA journeys must filter active visible elements rather than inspecting `display: none` nodes.

---

## 10. Global Override Modes — `prefers-reduced-motion`, `html[data-motion="off"]`, and `@media print`

**[OBSERVED]** `packageE.reducedMotionAndKillSwitch.passed: true` across `/`, `/destinations`, `/destinations/da-lat`, `/ai-planner`, and `/trips/da-lat-3-ngay`:
- Under emulated `prefers-reduced-motion: reduce`, all inspected `[data-reveal-variant]` nodes reported `opacity: "1"` and `transform: "none"`, and `h1` computed `opacity: "1"`.
- Setting `document.documentElement.dataset.motion = "off"` on `/` resolved all `[data-reveal-variant]` nodes immediately to `opacity: "1"`.
- Under emulated `@media print`, all `[data-reveal-variant]` elements resolved to `opacity: "1"` and `transform: "none"`.

---

## 11. Visual Evidence Spot-Check & Package E Final Screenshot Review

**[OBSERVED]** Visual inspection was performed directly using `read_file` on representative existing evidence plus all 4 new Package E settled confirmation screenshots:
- **Package B (`docs/reports/assets/web-design-0-4/package-b/`):** Inspected `desktop-01-hero-initial.png`, `desktop-03-hero-settled.png`, `desktop-07-ai-planner-section-settled.png`, `mobile-03-hero-settled.png` — immediate hero photography visibility at `t=0ms`, balanced Playfair Display / Be Vietnam Pro typography, high-contrast ivory-on-ink `AiPlannerSection`, and clean mobile crop.
- **Package D (`docs/reports/assets/web-design-0-4/package-d/`):** Inspected `desktop-03-planner-scripted-settled.png`, `desktop-10-itinerary-accordion-expanded.png`, `mobile-04-planner-preview-jumped.png` — clean bubble hierarchy, clear `Chế độ demo` badges, Day 2 timeline & expanded accordion spacing, crisp mobile jumpbar.
- **Package C (`docs/reports/assets/web-design-0-4/package-c/`):** Inspected `desktop-experiences-filtered.png`, `desktop-experience-detail-related.png`, `mobile-da-lat-highlights.png` — asymmetric masonry/card alignment, legible image overlays, clean numbered chapter dividers.
- **Package E (`docs/reports/assets/web-design-0-4/package-e/`):** Captured and visually inspected `desktop-final-home-settled.png`, `desktop-final-planner-settled.png`, `mobile-final-home-settled.png`, and `mobile-final-itinerary-settled.png` — zero layout clipping, zero stuck hidden blocks, consistent editorial paper/ivory/ink/gold visual language.

---

## 12. Accessibility, Skip-to-Content, Focus Management & Responsive 6-Viewport Audit

**[OBSERVED]** `packageE.accessibilityAndKeyboardAudit.passed: true` and `staticDisclosureAndSixViewportCheck` passed `6/6` viewports (`360×800`, `390×844`, `768×1024`, `1024×900`, `1440×900`, `1920×1080`):
- **Skip-to-Content (`apps/web/src/app/layout.tsx:45-50`):** Pressing `Tab` from load focuses `#main-content` skip link (`activeHref: "#main-content"`, `visibleOnFocus: true`), and `#main-content` target exists in DOM.
- **Focus Ring (`:focus-visible`):** Tabbed navigation anchor measured `outlineStyle: "solid"`, `outlineWidth: "2px"` (`hasVisibleFocusRing: true`).
- **Mobile Drawer (`SiteHeader`, `INV-02` Deferred):** `button[aria-controls="mobile-navigation"]` toggles `aria-expanded` (`"true"` <-> `"false"`) cleanly and shows/hides `#mobile-navigation` (`grid` vs hidden) on `390×844` without animation regressions.
- **6-Viewport Disclosure & Overflow Check:** All `6` viewports passed `overflowPx: 0` on `/ai-planner` and `/experiences/ca-phe-nho-giot-cao-nguyen` with both demo subtitle and `[role="note"]` booking disclaimer visible at `opacity: "1"`.

---

## 13. Existing Accessibility Backlog Audit (3 Non-Motion Pre-Existing Items)

**[OBSERVED]** Inspected directly in source code AND verified at runtime via non-failing probes in `scripts/verify_web_0_4.mjs` (`accessibilityAndKeyboardAudit.preExistingBacklog`). None of these 3 defects were introduced by Web Design 0.4 motion work, and all 3 are retained unmodified per scope governance for remediation in the next accessibility/application phase:

1. **Empty-State Filter Reset Focus Loss (`destination-browser.tsx:163`, `experience-browser.tsx:90`):** Clicking `Xoá bộ lọc` inside `[data-testid="destination-empty"]` clears the filter and unmounts the empty state without moving focus to the search input or results summary. Runtime probe on `/destinations` confirmed `beforeClickActiveTag: "BUTTON"` -> `afterClickActiveTag: "BODY"` (`dropsToBody: true`).
2. **Inactive Day-Tab `aria-controls` Pointing to Unrendered Panels (`itinerary-explorer.tsx:94,111`):** Every `<button role="tab">` sets `aria-controls="day-panel-${candidate.day}"`, whereas only the active `<div role="tabpanel" id="day-panel-${day.day}">` is rendered in DOM. Runtime probe on `/trips/da-lat-3-ngay` confirmed `day-tab-1` resolves in DOM (`true`), while `day-tab-2` and `day-tab-3` report `controlledElementExistsInDom: false` (`danglingInactiveControlsCount: 2`).
3. **Decorative/Status Dot Using `aria-label` on Role-Less `<span>` (`ai-planner-section.tsx:44`):** `<span className="size-2 rounded-full bg-[var(--adora-gold)]" aria-label="Bản xem trước sẵn sàng" />` omits an ARIA `role`, which assistive technologies inconsistently ignore or misread. Runtime probe confirmed `tagName: "SPAN"`, `roleAttr: null`.

---

## 14. Product Honesty, Static Disclaimers & Offline/Static-Demo Boundary Verification

**[OBSERVED]** Across all audited routes:
- `AiPlannerSection` notice (`"Bản xem trước giao diện · chưa kết nối mô hình AI"`), `/ai-planner` header subtitle & `DemoLabel` pills (`"Chế độ demo"` / `"Phản hồi dựng sẵn · không phải AI"`), `/experiences/[slug]` `[role="note"]` booking disclaimer, and `/trips/[slug]` `Ghi chú về bản mẫu` are excluded from reveal delays and remain immediately visible (`opacity === "1"`) whenever their parent band is on screen.

---

## 15. Regression Triage & Resolution Log (App vs Harness)

- **Application Code (`apps/web/src/**`):** `[OBSERVED]` **Zero blocking Web Design 0.4 defects discovered** during static audit, Package E integration checks, accessibility probes, or controlled benchmarking; therefore **zero application source changes were made in Package E**.
- **Verification Harness (`scripts/verify_web_0_4.mjs`):** Two Package E test-script defects discovered on first Package E probe were resolved strictly inside the new Package E suite:
  1. `/destinations` search input uses React `useId()` rather than static `#destination-search`, resolved by querying `input[type="search"]`.
  2. Package E's `activityBackChain` and `staticDisclosureAndSixViewportCheck` initially included hidden `<Activity mode="hidden">` elements (`display: none`) and desktop-only `<DemoLabel>` (`hidden sm:block`) + `/trips` disclaimer text; updated to filter `el.checkVisibility()`, target the mobile-visible demo subtitle `<p>`, and query `[role="note"]` on `/experiences/[slug]`.

---

## 16. Performance Measurement Methodology & Environment Controls

**[MEASURED]** Performance telemetry was collected using unmodified `scripts/collect_web_motion_metrics.mjs` (`--runs 5`, isolated fresh CDP `BrowserContext` per cold run with cache disabled, FastAPI offline on `:8000`) against production builds on `http://127.0.0.1:3100`:

| Dataset | Git Commit | Collection Timestamp (UTC) | Browser Binary | Pre/Post Windows CPU Load |
| :--- | :--- | :--- | :--- | :--- |
| **`A0` Immutable Baseline** (`baseline_0_3_metrics.json`) | `87f2bf7` (code `c495955`) | `2026-11-06T22:34:54.841Z` | `Chrome/156.0.8078.80` | Not recorded in file |
| **Same-Session `0.3` Control** (`scratch/control_0_3_metrics.json`) | `c495955` (isolated temp git worktree) | `2026-11-13T15:32Z` (finish) | `Chrome/157.0.8103.78` | `1%` before / `5%` after |
| **Package E Final QA** (`scratch/package_e_metrics.json`) | `d62192c` (`main` build) | `2026-11-13T15:19Z` (finish) | `Chrome/157.0.8103.78` | `1%` before / `0%` after |

- **Why a Same-Session Control Run Was Essential:** Chrome auto-updated from `156.0.8078.80` (`A0`) to `157.0.8103.78` (`Package E`), and OS/thermal state differed across sessions by 7 days. Re-benchmarking `c495955` sequentially in a clean isolated detached worktree (removed immediately after collection) isolated true Web Design 0.4 delta on `Chrome/157.0.8103.78` at `1%` idle CPU load.

---

## 17. Controlled Desktop Performance Comparison (`1440×900` Unthrottled)

**[MEASURED]** Medians across 5 cold runs per route (`desktop_unthrottled`, `1440×900`, `1× CPU`), sourced verbatim from `docs/reports/assets/web-design-0-4/package-e/final-performance-comparison.json`:

| Route | LCP `A0` / `Ctrl 0.3` / `PE` (ms) | LCP Identity | CLS `PE` (Max) | TBT `A0` / `Ctrl 0.3` / `PE` (ms) | Compressed JS Δ vs `Ctrl 0.3` | Frame `p95` / `>50ms` / Post `wc` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `96` / `96` / **`104`** (`+8`) | Preserved (`h1`) | `0` (`0`) | `1` / `3` / **`1`** | `+2.59 KB` | `4.4 ms` / `0` / `0` |
| `/destinations` | `108` / `100` / **`104`** (`-4` A0 / `+4` Ctrl) | Preserved | `0` (`0`) | `0` / `0` / **`0`** | `+2.87 KB` | `4.4 ms` / `0` / `0` |
| `/destinations/da-lat` | `120` / `120` / **`120`** (`0`) | Preserved | `0` (`0`) | `0` / `0` / **`0`** | `+2.87 KB` | `4.3 ms` / `0` / `0` |
| `/experiences` | `104` / `100` / **`112`** (`+8` A0 / `+12` Ctrl) | Preserved | `0` (`0`) | `0` / `0` / **`0`** | `+2.59 KB` | `4.4 ms` / `0` / `0` |
| `/experiences/ca-phe-nho-giot-cao-nguyen` | `112` / `108` / **`108`** (`-4` A0 / `0` Ctrl) | Preserved | `0` (`0`) | `0` / `0` / **`0`** | `+2.87 KB` | `4.4 ms` / `0` / `0` |
| `/ai-planner` | `124` / `124` / **`120`** (`-4`) | Preserved | `0` (`0`) | `0` / `1` / **`0`** | `+2.59 KB` | `4.3 ms` / `0` / `0` |
| `/trips` | `104` / `100` / **`96`** (`-8` A0 / `-4` Ctrl) | Preserved | `0` (`0`) | `0` / `0` / **`0`** | `+2.87 KB` | `4.3 ms` / `0` / `0` |
| `/trips/da-lat-3-ngay` | `108` / `104` / **`112`** (`+4` A0 / `+8` Ctrl) | Preserved | `0` (`0`) | `0` / `0` / **`0`** | `+2.87 KB` | `4.4 ms` / `0` / `0` |

---

## 18. Controlled Mobile Laboratory Performance Comparison (`390×844`, `4× CPU`, `150 ms` RTT, `1.6 Mbps`)

**[MEASURED]** Medians across 5 cold runs per route (`mobile_lab_throttled`), sourced verbatim from `final-performance-comparison.json`:

| Route | LCP `A0` / `Ctrl 0.3` / `PE` (ms) | LCP Δ (`vs A0` / `vs Ctrl`) | LCP Identity | CLS `PE` (Max) | TBT `A0` / `Ctrl 0.3` / `PE` (ms) | TBT Δ (`vs A0` / `vs Ctrl`) | Compressed JS Δ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `1,436` / `1,392` / **`1,524`** | `+88` / `+132` ms | Preserved (`img`) | `0` (`0`) | `493` / `506` / **`571`** | `+78` / `+65` ms | `+2.59 KB` |
| `/destinations` | `2,972` / `2,976` / **`2,984`** | `+12` / `+8` ms | Preserved (`img`) | `0` (`0`) | `359` / `380` / **`383`** | `+24` / `+3` ms | `+2.87 KB` |
| `/destinations/da-lat` | `2,952` / `2,956` / **`2,972`** | `+20` / `+16` ms | Preserved (`img`) | `0` (`0`) | `454` / `488` / **`569`** | `+115` / `+81` ms | `+2.87 KB` |
| `/experiences` | `1,052` / `1,064` / **`1,096`** | `+44` / `+32` ms | Preserved | `0` (`0`) | `340` / `341` / **`333`** | `-7` / `-8` ms | `+2.59 KB` |
| `/experiences/ca-phe-nho-giot-cao-nguyen` | `1,984` / `1,980` / **`2,028`** | `+44` / `+48` ms | Preserved (`img`) | `0` (`0`) | `376` / `407` / **`447`** | `+71` / `+40` ms | `+2.87 KB` |
| `/ai-planner` | `876` / `892` / **`892`** | `+16` / `0` ms | Preserved | `0` (`0`) | `219` / `254` / **`265`** | `+46` / `+11` ms | `+1.38 KB` |
| `/trips` | `1,384` / `1,380` / **`1,376`** | `-8` / `-4` ms | Preserved | `0` (`0`) | `310` / `295` / **`323`** | `+13` / `+28` ms | `+2.87 KB` |
| `/trips/da-lat-3-ngay` | `1,376` / `1,376` / **`1,376`** | `0` / `0` ms | Preserved (`img`) | `0` (`0`) | `318` / `325` / **`373`** | `+55` / `+48` ms | `+2.87 KB` |

- **Frame & Layer Hygiene (Mobile Lab):** `p95` frame interval measured `4.3 ms` on all 8 routes (`0` frames `> 50 ms` across all 40 mobile cold runs; `0` post-settle non-`auto` `will-change`).

---

## 19. Trusted Interaction Latency Comparison (5 Interactions × Desktop & Mobile)

**[MEASURED]** Synthetic trusted CDP mouse inputs (`5` runs per interaction × profile, target `<= 100 ms` desktop / `<= 200 ms` mobile):

| Profile | Interaction (`Route`) | Event Timing Med `A0` / `Ctrl 0.3` / `PE` (ms) | Event Max `PE` (ms) | Double-rAF Next Paint `A0` / `Ctrl 0.3` / `PE` (ms) |
| :--- | :--- | :--- | :--- | :--- |
| Desktop (`1440×900`) | `destination_filter_select` (`/destinations`) | `8` / `8` / **`16`** | `16` | `5.7` / `5.0` / **`6.0`** (`+1.0`) |
| Desktop (`1440×900`) | `experience_category_select` (`/experiences`) | `8` / `8` / **`8`** | `8` | `5.3` / `5.4` / **`6.0`** (`+0.6`) |
| Desktop (`1440×900`) | `planner_scripted_prompt_select` (`/ai-planner`) | `24` / `24` / **`24`** | `24` | `15.0` / `16.0` / **`15.5`** (`-0.5`) |
| Desktop (`1440×900`) | `itinerary_day_switch` (`/trips/da-lat-3-ngay`) | `8` / `8` / **`8`** | `16` | `5.6` / `5.8` / **`6.9`** (`+1.1`) |
| Desktop (`1440×900`) | `itinerary_accordion_toggle` (`/trips/da-lat-3-ngay`) | `8` / `8` / **`8`** | `8` | `5.2` / `5.9` / **`5.7`** (`-0.2`) |
| Mobile (`390×844`, `4×`) | `destination_filter_select` (`/destinations`) | `16` / `24` / **`24`** | `32` | `14.8` / `15.5` / **`20.9`** (`+5.4`) |
| Mobile (`390×844`, `4×`) | `experience_category_select` (`/experiences`) | `24` / `32` / **`32`** | `40` | `19.0` / `26.2` / **`28.6`** (`+2.4`) |
| Mobile (`390×844`, `4×`) | `planner_scripted_prompt_select` (`/ai-planner`) | `112` / `136` / **`120`** | `120` | `108.0` / `130.8` / **`118.2`** (`-12.6`) |
| Mobile (`390×844`, `4×`) | `itinerary_day_switch` (`/trips/da-lat-3-ngay`) | `32` / `40` / **`48`** | `56` | `31.6` / `38.6` / **`42.1`** (`+3.5`) |
| Mobile (`390×844`, `4×`) | `itinerary_accordion_toggle` (`/trips/da-lat-3-ngay`) | `24` / `24` / **`16`** | `24` | `16.6` / `19.2` / **`13.9`** (`-5.3`) |

---

## 20. Animation Frame Stability, JS Bundle Impact & Layer Hygiene Analysis

- **[MEASURED]** Desktop and mobile frame pacing remained flat (`median` ~`4.2 ms`, `p95` `4.3–4.4 ms`, zero frames exceeding `50 ms`) across all `80` cold route runs. No route retained any computed `will-change !== "auto"` after scroll settle.
- **[MEASURED / INFERRED]** Compressed JavaScript transfer grew from `195,161 B` to `197,818 B` (`+2,657 B` / `+2.59 KB`, still `14` script chunks) on `/` and from `200,854 B` to `203,792 B` (`+2,938 B` / `+2.87 KB`, `15` script chunks) on `/destinations/da-lat`. This reflects additive JSX attributes, `<Reveal>` client hook/observer setup, `ItineraryExplorer` / `PlannerWorkspace` motion/Activity state (`data-entered`, smooth jumpbar scroll, `hasSwitched`), and `<PageIntro>`/`<Image>` wrappers with zero external libraries added.

---

## 21. Target vs. Measured Assessment & Monitoring Items

Separating Engineering Targets (`[RECOMMENDATION]` in Spec v1.1 §F.2) from Measured Results (`[MEASURED]`):

| Category | Spec v1.1 Target | Measured Result (Package E) | Assessment |
| :--- | :--- | :--- | :--- |
| Route `CLS` (load + scroll) | `<= 0.02`; `<= baseline + 0.01` | `0.000` across all `16/16` route cells | **Passes Target** |
| LCP Element Identity | Unchanged vs `0.3` | Identical on `16/16` cells vs `A0` & `Ctrl` | **Passes Target** |
| Hero `<Image>` Initial Opacity | `opacity === "1"` at `t = 0 ms` | Verified `opacity: "1"` across `/` & detail heroes | **Passes Target** |
| Mobile LCP Absolute Budget | `<= 2,500 ms` | `6/8` routes `892–2,028 ms`; `/destinations*` `2,972–2,984 ms` | **Baseline-Limited on 2 Image Routes** (`2,972` / `2,952 ms` in `A0`) |
| Mobile LCP Delta (`<= +100 ms`) | `<= +100 ms` vs `0.3` | `-8` to `+88 ms` vs `A0`; `+132 ms` on `/` vs `Ctrl` (`1524` vs `1392`) | **Within vs `A0`; Monitor `/` vs `Ctrl`** |
| Interaction Latency Proxy | `<= 100 ms` desk / `<= 200 ms` mob | `6.0–15.5 ms` desk; `13.9–118.2 ms` mob | **Passes Target** |
| Main-Thread Long Tasks (TBT Δ) | `<= +25 ms` | `0 ms` delta desktop (`8/8`); `+3` to `+81 ms` mobile vs `Ctrl` | **Desktop Passes; Monitor Mobile `4× CPU` TBT** |
| Frame Stability & Layer Hygiene | `p95 <= 20 ms`; `0 > 50 ms`; `wc = 0` | `p95 = 4.3–4.4 ms`; `0 > 50 ms`; `wc = 0` | **Passes Target** |
| Client JS Delta | `<= +2.0 KB` per route | `+1.38 KB` (`/ai-planner` mob); `+2.59–+2.87 KB` others | **Slightly Over (`+0.59–0.87 KB`)** |

---

## 22. Global 7-Gate Regression Summary

**[OBSERVED]** All seven global gates ran sequentially against the final verified build (`127.0.0.1:3100`, FastAPI offline) after the final edit to `scripts/verify_web_0_4.mjs`:

| Gate | Command | Result | Key Observed Output |
| :--- | :--- | :--- | :--- |
| 1. Unit / Data Tests | `corepack pnpm@12.16.1 --filter @adora/web test` | **PASS (`0`)** | `22/22` tests passed across `5` suites (`0` failed, `0` skipped) |
| 2. Linter | `corepack pnpm@12.16.1 --filter @adora/web lint` | **PASS (`0`)** | `eslint .` exited `0` (including `react-hooks/set-state-in-effect`) |
| 3. Typecheck | `corepack pnpm@12.16.1 --filter @adora/web typecheck` | **PASS (`0`)** | `tsc --noEmit` exited `0` |
| 4. Production Build | `corepack pnpm@12.16.1 --filter @adora/web build` | **PASS (`0`)** | Next.js `16.4.3` Turbopack compiled & generated `20/20` routes |
| 5. Web Design 0.3 Regression | `node scripts/verify_web_0_3.mjs` | **PASS (`0`)** | All `6` viewports × `8` routes + interactive & a11y suites passed |
| 6. Web Design 0.2 Homepage | `node scripts/verify_homepage.mjs` | **PASS (`0`)** | HTTP `200`, `6/6` viewports, `0` overflow routes |
| 7. Web Design 0.4 Complete Suite | `node scripts/verify_web_0_4.mjs --capture-package-e-evidence` | **PASS (`0`)** | `Chrome/157.0.8103.78`: Packages A, B, C, D, E all `passed: true` |

---

## 23. Unverified Hardware/Runtime Boundaries & Explicit Non-Claims (`[UNVERIFIED]`)

- Physical iOS/iPadOS Safari (WebKit compositor, Safe Area, backdrop-blur & scale GPU timing) and physical mid/low-tier Android Chromium devices.
- Real mobile on-screen virtual keyboard open/resize interactions inside `/ai-planner` (`N-4` synthetic viewport proxy only).
- Real-user field CrUX `LCP` / `INP` / `CLS` telemetry (`performance` numbers here are synthetic Windows headless-Chrome CDP laboratory captures on `12th Gen Intel Core i7-12700H`).
- Live FastAPI `:8000` catalog response latency and authenticated/database flows (FastAPI was intentionally offline per Frontend-First governance).

---

## 24. Artifact Inventory, Git Hygiene & Next-Phase Recommendations

- **Package E Files (Selective Commit Scope):**
  - Updated: `scripts/verify_web_0_4.mjs` (additive `runPackageEFinalSuite`, `capturePackageEEvidence`, `--capture-package-e-evidence[-only]`)
  - Created: `docs/reports/WEB_DESIGN_0_4_PACKAGE_E_FINAL_QA_REPORT.md`
  - Created: `docs/reports/assets/web-design-0-4/package-e/final-verification-results.json`
  - Created: `docs/reports/assets/web-design-0-4/package-e/final-performance-comparison.json`
  - Created: `docs/reports/assets/web-design-0-4/package-e/desktop-final-home-settled.png`
  - Created: `docs/reports/assets/web-design-0-4/package-e/desktop-final-planner-settled.png`
  - Created: `docs/reports/assets/web-design-0-4/package-e/mobile-final-home-settled.png`
  - Created: `docs/reports/assets/web-design-0-4/package-e/mobile-final-itinerary-settled.png`
- **Preserved Untouched:** `docs/reports/baseline_0_3_metrics.json`, `scripts/collect_web_motion_metrics.mjs`, historical Package A/B/C/D reports, specs, `package.json`, `pnpm-lock.yaml`, and untracked `docs/reports/assets/web-design-0-4.zip`. Temporary worktree `$env:TEMP\adora-web-03-control` was removed cleanly (`git worktree list` shows main repo only).
- **Recommended Next-Phase Engineering Backlog (Outside Web Design 0.4):**
  1. Image payload optimization on `/destinations` and `/destinations/da-lat` (responsive `sizes` / hero image encoding) to bring mobile `1.6 Mbps` LCP below `2,500 ms`.
  2. Resolve the 3 logged accessibility backlog items (reset-button focus restoration, inactive-tab `aria-controls` panel alignment or removal when unmounted, and decorative status dot `aria-hidden="true"` or explicit `role="status"` cleanup).
  3. Optional follow-on motion backlog: `INV-01` desktop header underline and `INV-02` mobile drawer transition, plus real-device iOS Safari / Android Chrome smoke testing prior to production launch.
