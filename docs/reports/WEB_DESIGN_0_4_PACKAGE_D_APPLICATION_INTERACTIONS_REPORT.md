# ADORA — Web Design 0.4: Package D — Application Interactions Report

- **Package:** Web Design 0.4 — Package D (`Application Interactions`)
- **Repository:** `F:\Coding\Adora System Mega Project\adora-system`
- **Branch:** `main`
- **Base Commit (Package B):** `0a924be6e4687af0c0c88b3ffe2ee09e7c3173a2` (`feat(web): add cinematic editorial motion to adora homepage`)
- **Authoritative Contracts:**
  - `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md` (`INV-17` through `INV-20`, `P-6`)
  - `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_FINAL_APPROVAL.md` (Mandatory Errata `E-9`, `E-10`, Advisory Notes `N-4`, `N-7`, Bug Fix `B-5`)
  - `docs/reports/WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md`
  - `docs/reports/baseline_0_3_metrics.json`

---

## 1. Executive Summary

Package D brings responsive, accessible application interactions to the **AI Planner** (`/ai-planner`) and **Trip Itinerary** (`/trips` and `/trips/[slug]`) interfaces while preserving every functional, honesty, accessibility, and scroll-stability guarantee established in Web Design 0.3:

1. **AI Planner Message & Preview Entrances (`INV-17`, `INV-18`, `E-9`):**
   - User bubbles (`article[aria-label="Bạn"]`) enter with a `160ms var(--adora-ease-ui)` opacity-only fade (`0ms` delay, `transform: none`).
   - Scripted replies (`article[data-testid="scripted-reply"]`) and unsupported-input fallback cards (`article` containing `p[data-testid="unsupported-reply"]` per `E-9`) enter with a `200ms var(--adora-ease-ui) 80ms backwards` opacity-only fade on the outer `<article>`, ensuring all `DemoLabel` disclosures (`Phản hồi dựng sẵn · không phải AI`, `Thông báo hệ thống`) enter atomically with their cards.
   - Desktop Trip Preview (`div[data-testid="trip-preview"]`, keyed by `key={preview.slug}`) enters with `opacity: 0 -> 1` and a `6px` vertical rise (`var(--adora-distance-ui)`, `200ms var(--adora-ease-ui) 80ms backwards`).
   - Mobile Trip Preview (`section[data-testid="trip-preview-mobile"]`, keyed by `key={preview.slug}` per `E-9`) and Mobile Jumpbar (`nav[data-testid="mobile-planner-jumpbar"]`) use opacity-only entrances (`200ms` at `80ms` delay and `160ms` at `0ms` delay respectively, `transform: none`) inside the scroll column so `getBoundingClientRect()` scroll anchoring is never perturbed by a vertical transform.
   - Jumpbar scrolling (`scrollToElement`) dynamically evaluates `window.matchMedia("(prefers-reduced-motion: reduce)").matches` and `document.documentElement.dataset.motion === "off"` at click time (`behavior: reduced ? "auto" : "smooth"`).
2. **Welcome Suggestion Focus Strategy (`P-6` & Advisory Note `N-4`):**
   - Uses the actual `textareaRef` (`#planner-prompt`).
   - Keyboard (`Enter`/`Space`) and fine-pointer (`mouse`) activation restore focus to `textareaRef.current?.focus({ preventScroll: true })` (`document.activeElement.id === "planner-prompt"`) after the welcome block unmounts.
   - Coarse-pointer touch activation (`pointerType === "touch"`) focuses the newly created user-turn `<article aria-label="Bạn" tabIndex={-1}>` via `latestTurnRef.current?.focus({ preventScroll: true })` (`N-4`), preventing focus from falling back to `document.body` while avoiding raising the mobile OS virtual keyboard over the new reply.
3. **Itinerary Day-Panel Transitions (`INV-19`, `E-10`, `N-7`):**
   - The outer `<div role="tabpanel" id="day-panel-{day.day}" data-testid="day-panel">` remains a stable, unkeyed DOM node across day switches.
   - An inner `<div key={day.day}>` carries `data-day-panel-enter` **only after a genuine user day switch** via event-handler state `hasSwitched` set inside `selectDay` (`E-10`, lint-safe, zero initial-load animation).
   - `@keyframes adora-panel-in` (`220ms var(--adora-ease-ui) backwards`) starts at `opacity: 0.25` (`>= 0.2` per `N-7`) and `translate3d(0, var(--adora-distance-ui), 0)` (`6px` rise), eliminating blank flashes on rapid tab switching while updating `aria-selected`, keyboard focus (`ArrowLeft`/`ArrowRight`/`Home`/`End`), and `[data-testid="day-budget"]` synchronously (`0ms`).
   - `TripCard` (`apps/web/src/components/trips/trip-card.tsx`) tokenizes its border transition (`duration-[var(--adora-duration-fast)] ease-[var(--adora-ease-ui)]`) while preserving the shared `.image-reveal` hover contract.
4. **Three-Layer Activity Accordion (`INV-20`, `B-5`):**
   - Layer 1 (outer interpolation): `grid transition-[grid-template-rows,opacity] duration-[var(--adora-duration-ui)] ease-[var(--adora-ease-ui)]` toggling `grid-rows-[1fr] opacity-100` vs `grid-rows-[0fr] opacity-0` (`240ms`).
   - Layer 2 (clipping & accessibility): `<div id="activity-{id}" role="region" aria-label={activity.title} inert={!open} className="min-h-0 overflow-hidden">` remains mounted at all times so `aria-controls` always resolves to a live DOM node while `inert={!open}` removes collapsed links from keyboard Tab order and assistive technology trees.
   - Layer 3 (visual border & padding): `<div className="border-t border-[var(--adora-hairline)] px-4 py-5 sm:px-5">` sits inside the clipped region so collapsed height settles to `0px` (`<= 1px`).
5. **Next.js 16 `<Activity>` Replay Prevention:**
   - Every `[data-planner-enter]` and `[data-day-panel-enter]` animation is gated by `:not([data-entered="true"])` in CSS and latched via both `onAnimationEnd` (`event.target === event.currentTarget`) and a component `useEffect` cleanup that stamps `data-entered="true"` when Next.js `<Activity>` hides the route (`display: none`).

---

## 2. Modified Files

| File | Role in Package D |
| --- | --- |
| `apps/web/src/app/globals.css` | Added `@keyframes adora-planner-fade`, `@keyframes adora-preview-in`, `@keyframes adora-panel-in`, `:not([data-entered="true"])` rules for `[data-planner-enter]` and `[data-day-panel-enter]`, and fail-visible overrides under `html[data-motion="off"]`, `@media (prefers-reduced-motion: reduce)`, and `@media print`. |
| `apps/web/src/components/planner/planner-workspace.tsx` | Added `data-planner-enter` attributes (`user`, `reply`, `jumpbar`, `preview`), `key={preview.slug}` on desktop and mobile Trip Preview containers (`E-9`), `markEnteredOnAnimationEnd` + `<Activity>` hide cleanup latch, dynamic reduced-motion check in `scrollToElement`, and `P-6`/`N-4` welcome suggestion focus restoration. |
| `apps/web/src/components/trips/itinerary-explorer.tsx` | Added `hasSwitched` event-handler state in `selectDay` (`E-10`), inner keyed `[data-day-panel-enter]` wrapper inside stable `role="tabpanel"`, `<Activity>` hide cleanup latch, tokenized tab/chevron transitions, and the 3-layer CSS Grid activity accordion with `inert={!open}` (`INV-20`, `B-5`). |
| `apps/web/src/components/trips/trip-card.tsx` | Tokenized `<article>` border transition (`duration-[var(--adora-duration-fast)] ease-[var(--adora-ease-ui)]`) while preserving `.image-reveal`. |
| `scripts/verify_web_0_4.mjs` | Extended additively with `runPackageDApplicationSuite` and `capturePackageDEvidence` (`--capture-package-d-evidence` / `--capture-package-d-evidence-only`) while preserving all Package A and Package B suites unchanged. |

---

## 3. AI Planner Verification Results (`INV-17`, `INV-18`, `E-9`, `P-6`, `N-4`)

Verified via `scripts/verify_web_0_4.mjs` (`package-d-motion-telemetry.json`):

| Check | Expected Contract | Measured Result | Status |
| --- | --- | --- | --- |
| Initial load (`1440×900` & `390×844`) | `scrollTop === 0`, both suggestions & opening message visible, `[data-testid="trip-preview-empty"]` visible on desktop, `0` running animations | `initialScrollTop: 0`, `allSuggestionsVisibleInLog: true`, `openingVisibleInLog: true`, `emptyPreviewPresent: true`, `activeAnimationsAtLoad: 0` | PASS |
| User bubble entrance (`INV-17`) | `160ms var(--adora-ease-ui)` opacity-only (`0ms` delay, `transform: none`) | `name: "adora-planner-fade"`, `duration: "0.16s"`, `delay: "0s"`, `transform: "none"` | PASS |
| Scripted reply entrance (`INV-17`) | `200ms var(--adora-ease-ui) 80ms backwards` opacity-only on outer `<article>` | `name: "adora-planner-fade"`, `duration: "0.2s"`, `delay: "0.08s"`, `transform: "none"` | PASS |
| Unsupported reply entrance (`E-9`) | Outer `<article data-planner-enter="reply">` uses `200ms` at `80ms` delay (`transform: none`), `DemoLabel` (`Thông báo hệ thống`) atomic at `t=0ms` | `dataPlannerEnter: "reply"`, `name: "adora-planner-fade"`, `duration: "0.2s"`, `delay: "0.08s"`, `hasDemoLabelAtT0: true` | PASS |
| Atomic non-streaming insert | Reply `textContent` length at `t=0ms` equals `t=settled`; `0` `aria-busy`; `1` `[aria-live]`; `0` external requests | `replyTextLengthAtT0: 804 === replyTextLengthAfterSettle: 804`, `ariaBusyCount: 0`, `liveRegionCount: 1`, `externalRequests: []` | PASS |
| Scroll anchoring stability | `\|scrollTop(t=0) - scrollTop(settled)\| <= 1px`, settled `userBubble.top - log.top` in `[8, 16]px` | Desktop: `196 -> 196` (`0px` delta), offset `12px`; Mobile: `210 -> 210` (`0px` delta), offset `12px` | PASS |
| Desktop Trip Preview (`INV-18`) | `adora-preview-in` (`200ms`, `80ms` delay, `6px` rise), remounts via `key={preview.slug}` when switching 3-day -> 2-day scenario | `name: "adora-preview-in"`, `duration: "0.2s"`, `delay: "0.08s"`, `previewRemountedByKey: true`, `previewDaysCount: 3 -> 2` | PASS |
| Mobile Preview & Jumpbar (`INV-18`, `E-9`) | Opacity-only (`transform: none`), Jumpbar `160ms` at `0ms`, Mobile Preview `200ms` at `80ms`, dynamic reduced-motion auto scroll | Jumpbar `0.16s` (`transform: "none"`), Mobile Preview `0.2s` at `0.08s` (`transform: "none"`), `previewVisibleInLog: true`, `replyOffsetPx: 12` | PASS |
| Welcome suggestion focus (`P-6`, `N-4`) | Keyboard (`Enter`) & mouse click focus `#planner-prompt`; touch tap (`pointerType: "touch"`) focuses user `<article tabIndex={-1}>` | Keyboard: `"planner-prompt"`, Mouse: `"planner-prompt"`, Touch: `activeIsUserTurn: true`, `activeIsNotPrompt: true` | PASS |
| Next.js `<Activity>` Back restore | Navigate `/ai-planner` -> `/trips/da-lat-3-ngay` -> `history.back()`: all items latched (`data-entered="true"`), `0` replayed animations, `scrollTop` preserved | `allLatched: true`, `runningPlannerAnimsCount: 0`, `scrollDeltaAfterBack: 0` (`1231 -> 1231`) | PASS |

---

## 4. Trip Itinerary Verification Results (`INV-19`, `INV-20`, `E-10`, `N-7`, `B-5`)

| Check | Expected Contract | Measured Result | Status |
| --- | --- | --- | --- |
| Initial-load suppression (`E-10`) | `[data-day-panel-enter]` absent on initial load of `/trips/da-lat-3-ngay`, `0` running animations | `hasDayPanelEnterOnInitialLoad: false`, `panelAnimsOnInitialLoad: 0` | PASS |
| Stable `role="tabpanel"` & synchronous tab state | Outer `[data-testid="day-panel"]` DOM reference unchanged across click & keyboard (`ArrowRight`, `ArrowLeft`, `Home`, `End`) switches; `aria-selected`, focus, and `[data-testid="day-budget"]` synchronous at `t=0ms` | `stablePanelNode: true`, `stablePanelNodeAfterKeyboard: true`, `tab2SelectedAtT0: true`, budget `1.200.000 ₫ -> 1.500.000 ₫ -> 900.000 ₫` | PASS |
| Genuine day-switch entrance (`INV-19`, `N-7`) | `adora-panel-in` (`220ms`), initial `opacity >= 0.2` (`0.25`), vertical travel `<= 6px`, settled `opacity: "1"`, `transform: "none"` | `name: "adora-panel-in"`, `duration: "0.22s"`, `opacityAtT0: 0.25`, `tyAtT0: 6`, `settledOpacity: "1"`, `settledTransform: "none"`, `enteredLatch: true` | PASS |
| 3-Layer CSS Grid Accordion (`INV-20`, `B-5`) | Always-mounted `role="region"` (`aria-controls` always resolves), synchronous `aria-expanded`, collapsed `inert === true`, collapsed height `<= 1px` (`0px`), no DOM remount on toggle | `allAriaControlsResolve: true`, `firstCollapsedHeight: 0`, `firstCollapsedGridRows: "0px"`, `firstInertAtT0: true`, `sameRegionNodeAcrossToggle: true` | PASS |
| Keyboard Tab skip on collapsed region | Pressing `Tab` from collapsed activity button (`d1-coffee`, which contains `/experiences/ca-phe-nho-giot-cao-nguyen`) skips the `inert` link and focuses next activity button (`d1-lake`) | `secondRegionHasLink: true`, `secondRegionInert: true`, `activeIsThirdButton: true`, `activeInsideCollapsedSecondRegion: false` | PASS |
| Next.js `<Activity>` Back restore | Navigate `/trips/da-lat-3-ngay` -> `/experiences/...` -> `history.back()`: `data-entered="true"`, `0` running panel animations | `restoredPathname: "/trips/da-lat-3-ngay"`, `enteredLatch: true`, `runningPanelAnims: 0` | PASS |
| Reduced motion & 6-viewport matrix | Instant settle under `prefers-reduced-motion: reduce`; `scrollWidth === innerWidth` and `0` persistent `will-change` across `360`, `390`, `768`, `1024`, `1440`, `1920` | `panelAnimName: "none"`, `accordionTransitionDuration: "1e-05s"`, all 6 viewports × 3 routes `scrollWidth === innerWidth` & `nonAutoWillChange: 0` | PASS |

---

## 5. Performance Comparison vs. Pre-Motion Web Design 0.3 Baseline

Collected via unchanged `scripts/collect_web_motion_metrics.mjs --runs 5 --label package-d-application-interactions` into scratch and compared against immutable `docs/reports/baseline_0_3_metrics.json`:

### 5.1 Discrete Application Interaction Latencies (5 Cold Runs per Interaction)

| Interaction (`route`) | Profile | Web 0.3 Baseline Event Timing Median | Package D Event Timing Median | Package D Processing Median | Package D Double-rAF Next-Paint Median | Threshold (`<= 200ms`) |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `planner_scripted_prompt_select` (`/ai-planner`) | `desktop_unthrottled` | `24.0 ms` | `24.0 ms` (`+0.0 ms`) | `14.1 ms` | `15.6 ms` | PASS |
| `itinerary_day_switch` (`/trips/da-lat-3-ngay`) | `desktop_unthrottled` | `8.0 ms` | `16.0 ms` (`+8.0 ms`) | `2.6 ms` | `7.0 ms` | PASS |
| `itinerary_accordion_toggle` (`/trips/da-lat-3-ngay`) | `desktop_unthrottled` | `8.0 ms` | `8.0 ms` (`+0.0 ms`) | `0.0 ms` | `5.6 ms` | PASS |
| `destination_filter_select` (`/destinations`) | `desktop_unthrottled` | `8.0 ms` | `8.0 ms` (`+0.0 ms`) | `0.1 ms` | `5.4 ms` | PASS |
| `experience_category_select` (`/experiences`) | `desktop_unthrottled` | `8.0 ms` | `8.0 ms` (`+0.0 ms`) | `0.1 ms` | `6.4 ms` | PASS |
| `planner_scripted_prompt_select` (`/ai-planner`) | `mobile_lab_throttled` | `112.0 ms` | `128.0 ms` (`+16.0 ms`) | `117.6 ms` | `129.1 ms` | PASS |
| `itinerary_day_switch` (`/trips/da-lat-3-ngay`) | `mobile_lab_throttled` | `32.0 ms` | `48.0 ms` (`+16.0 ms`) | `14.8 ms` | `40.3 ms` | PASS |
| `itinerary_accordion_toggle` (`/trips/da-lat-3-ngay`) | `mobile_lab_throttled` | `24.0 ms` | `24.0 ms` (`+0.0 ms`) | `6.8 ms` | `16.1 ms` | PASS |

### 5.2 Route LCP, CLS, TBT, and JS Transfer Medians

| Route | Profile | Baseline LCP | Package D LCP | Delta | Package D CLS | Package D TBT | Compressed JS Transfer |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/ai-planner` | `desktop_unthrottled` | `124 ms` | `116 ms` | `-8 ms` (`-6.5%`) | `0.000` | `0 ms` | `197,530 B` (`14` scripts) |
| `/trips` | `desktop_unthrottled` | `104 ms` | `96 ms` | `-8 ms` (`-7.7%`) | `0.000` | `0 ms` | `203,504 B` (`15` scripts) |
| `/trips/da-lat-3-ngay` | `desktop_unthrottled` | `108 ms` | `96 ms` | `-12 ms` (`-11.1%`) | `0.000` | `0 ms` | `203,504 B` (`15` scripts) |
| `/` | `desktop_unthrottled` | `96 ms` | `112 ms` | `+16 ms` (`+16.7%`) | `0.000` | `4 ms` | `197,530 B` (`14` scripts) |
| `/ai-planner` | `mobile_lab_throttled` | `876 ms` | `880 ms` | `+4 ms` (`+0.5%`) | `0.000` | `231 ms` | `174,717 B` (`11` scripts) |
| `/trips` | `mobile_lab_throttled` | `1,384 ms` | `1,384 ms` | `+0 ms` (`0.0%`) | `0.000` | `312 ms` | `203,504 B` (`15` scripts) |
| `/trips/da-lat-3-ngay` | `mobile_lab_throttled` | `1,376 ms` | `1,388 ms` | `+12 ms` (`+0.9%`) | `0.000` | `336 ms` | `203,504 B` (`15` scripts) |
| `/` | `mobile_lab_throttled` | `1,436 ms` | `1,456 ms` | `+20 ms` (`+1.4%`) | `0.000` | `521 ms` | `197,530 B` (`14` scripts) |

### 5.3 Performance Interpretation & Limitations

- **Original Web Design 0.3 Baseline vs. Package D Measurements & Absolute Deltas:**
  - All Package D discrete interaction medians remain well under the `<= 200 ms` mobile and `<= 100 ms` desktop thresholds (`0.0` to `+16.0 ms` vs. `docs/reports/baseline_0_3_metrics.json`). Specifically, mobile `planner_scripted_prompt_select` moved from `112.0 ms` to `128.0 ms` (`+16.0 ms`, not an improvement over the 0.3 baseline), mobile `itinerary_day_switch` moved from `32.0 ms` to `48.0 ms` (`+16.0 ms`), and mobile `itinerary_accordion_toggle` remained unchanged at `24.0 ms` (`+0.0 ms`).
  - Route LCP medians across all four routes stay within `-12 ms` (`-11.1%`) to `+20 ms` (`+1.4%`) of the true 0.3 baseline (`CLS = 0.000` on every run).
  - Compressed client JS transfer in Package D matches `174,717 B` (`+1,409 B` vs. `0.3`) on mobile `/ai-planner`, `197,530 B` (`+2,369 B` vs. `0.3`) on desktop `/` and `/ai-planner`, and `203,504 B` (`+2,650 B` vs. `0.3`) on `/trips*` (of which `+394 B` on `/` & `/ai-planner` and `+675 B` on `/trips*` are incremental Package D additions over Package B). Cumulative JS budget audit remains part of Package E.
- **Laboratory Uncertainty:** Event Timing durations are quantized to `8 ms` multiples by Chromium's W3C Event Timing implementation, and all values reflect 5 cold synthetic headless-Chrome runs on a single Windows workstation (`4×` CDP CPU throttling on mobile), not field CrUX telemetry or physical mobile hardware GPU profiling.
- **Unresolved Package B Cross-Session CPU Contention:** Although Package D recorded mobile `/` LCP at `1,456 ms` (`+20 ms` vs. `1,436 ms` in `baseline_0_3_metrics.json`), Package B's earlier contended mobile `/` LCP variance (`1,932 ms` in `package_b_metrics.json` under sustained external host CPU load) is **not** considered definitively resolved by this single-session run and remains open for final multi-run cross-session evaluation in **Package E**.

---

## 6. Visual Evidence (`docs/reports/assets/web-design-0-4/package-d/`)

All 20 screenshots and the telemetry JSON were generated by `node scripts/verify_web_0_4.mjs --capture-package-d-evidence` and visually inspected:

- **Desktop (`1440×900`):**
  - `desktop-01-planner-initial.png` — Initial `/ai-planner` state (`scrollTop = 0`, welcome suggestions, opening message, empty preview aside).
  - `desktop-02-planner-turn-mid.png` — Mid-entrance (`t = 100ms`) showing user bubble anchored `12px` from top of `role="log"`, focus ring on `#planner-prompt`, and scripted reply + desktop Trip Preview fading in atomically with `DemoLabel`.
  - `desktop-03-planner-scripted-settled.png` — Settled 3-day Đà Lạt scripted reply and desktop Trip Preview.
  - `desktop-04-planner-2day-preview-settled.png` — Settled 2-day Đà Lạt scenario switch (`key={preview.slug}` preview transition).
  - `desktop-05-planner-unsupported-settled.png` — Settled unsupported-input fallback card (`Thông báo hệ thống`).
  - `desktop-06-trips-index-settled.png` — `/trips` index with tokenized `TripCard`.
  - `desktop-07-itinerary-day1-initial.png` — `/trips/da-lat-3-ngay` initial load on Day 1 (zero initial-load panel animation, first activity open).
  - `desktop-08-itinerary-day2-mid.png` — Day 2 switch mid-entrance (`t = 70ms`, `opacity >= 0.25`, synchronous budget `1.500.000 ₫`).
  - `desktop-09-itinerary-day2-settled.png` — Day 2 settled state.
  - `desktop-10-itinerary-accordion-expanded.png` — Day 2 with first activity collapsed (`0px`) and second activity expanded.
- **Mobile (`390×844`):**
  - `mobile-01-planner-initial.png` through `mobile-10-itinerary-accordion-expanded.png` (including `mobile-04-planner-preview-jumped.png` showing the Jumpbar-scrolled inline mobile Trip Preview).
- **Telemetry:**
  - `package-d-motion-telemetry.json`

---

## 7. Global Regression Gates Summary

| Gate | Command | Result |
| --- | --- | --- |
| Gate 1 — Unit Tests | `corepack pnpm@12.16.1 --filter @adora/web test` | PASS (`22/22` tests, `5/5` suites, `EXIT 0`) |
| Gate 2 — Lint | `corepack pnpm@12.16.1 --filter @adora/web lint` | PASS (`0` errors, `0` warnings, `EXIT 0`) |
| Gate 3 — Typecheck | `corepack pnpm@12.16.1 --filter @adora/web typecheck` | PASS (`EXIT 0`) |
| Gate 4 — Production Build | `corepack pnpm@12.16.1 --filter @adora/web build` | PASS (`20/20` static/PPR routes generated, `EXIT 0`) |
| Gate 5 — Web 0.3 Verifier | `node scripts/verify_web_0_3.mjs` (output redirected to scratch) | PASS (`EXIT 0`) |
| Gate 6 — Web 0.2 Homepage Verifier | `node scripts/verify_homepage.mjs` (output redirected to scratch) | PASS (`EXIT 0`) |
| Gate 7 — Web 0.4 Motion Verifier | `node scripts/verify_web_0_4.mjs` (Package A + Package B + Package D) | PASS (`packageA: true`, `packageB: true`, `packageD: true`, `EXIT 0`) |
