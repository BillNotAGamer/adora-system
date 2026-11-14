# ADORA — Post Web Design 0.4: H1 Accessibility Hardening Report

- **Project:** ADORA System Mega Project (`apps/web`)
- **Stage:** Post-0.4 H1 — Targeted Accessibility Hardening
- **Starting HEAD:** `main` @ `dcaa27de886de4339de37ff1b127131939b12fd3` (`test(web): complete Web Design 0.4 motion quality assurance`)
- **Authoritative Inputs:**
  - `docs/reports/WEB_DESIGN_0_4_PACKAGE_E_FINAL_QA_REPORT.md`
  - `docs/reports/assets/web-design-0-4/package-e/final-verification-results.json`
  - `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_FINAL_APPROVAL.md`
- **Target Scope:** Smallest safe corrections for the three confirmed accessibility defects, promotion of automated accessibility assertions in `scripts/verify_web_0_4.mjs`, zero motion-system or performance refactoring.
- **Report Date:** 2026-11-14

---

## 1. Initial Git State

- **Branch:** `main`
- **Starting HEAD:** `dcaa27de886de4339de37ff1b127131939b12fd3`
- **Recent History:**
  - `dcaa27d` `test(web): complete Web Design 0.4 motion quality assurance`
  - `d62192c` `docs(web): capture filtered discovery evidence for package c`
  - `103dccf` `feat(web): extend editorial motion across adora discovery`
  - `6702a22` `feat(web): refine adora planner and itinerary interactions`
  - `0a924be` `feat(web): add cinematic editorial motion to adora homepage`
- **Pre-existing Untracked Archive:** `docs/reports/assets/web-design-0-4.zip` (preserved untouched and unstaged).

---

## 2. Three Confirmed Root Causes

1. **Empty-State Reset Focus Loss (`DestinationBrowser` & `ExperienceBrowser`):**
   - `[data-testid="destination-empty"]` (`destination-browser.tsx`) and `[data-testid="experience-empty"]` (`experience-browser.tsx`) mount the `"Xoá bộ lọc"` `<button>` inside the conditional empty-state branch.
   - Clicking or keyboard-activating `"Xoá bộ lọc"` reset filter state and synchronously restored `results.length > 0`, unmounting the empty-state DOM subtree (including the focused `<button>`) with no focus handoff. The browser dropped focus to `document.body` (`beforeClickActiveTag: "BUTTON"` -> `afterClickActiveTag: "BODY"`).
2. **Dangling Inactive-Tab `aria-controls` References (`ItineraryExplorer`):**
   - Every `<button role="tab">` rendered `aria-controls={`day-panel-${candidate.day}`}`, whereas `ItineraryExplorer` mounts only a single active `<div role="tabpanel">` (`day-panel-${day.day}`).
   - Inactive tabs (`day-tab-2`, `day-tab-3` on initial load) pointed to nonexistent IDs (`danglingInactiveControlsCount: 2` in Package E's runtime probe).
3. **Invalid `aria-label` on Role-Less Decorative Span (`AiPlannerSection`):**
   - `ai-planner-section.tsx` rendered `<span className="size-2 rounded-full bg-[var(--adora-gold)]" aria-label="Bản xem trước sẵn sàng" />` with `roleAttr: null`.
   - Generic `<span>` elements without an explicit ARIA role cannot reliably carry `aria-label` (ARIA 1.2 prohibited attribute / inconsistent AT exposure), and `"Bản xem trước sẵn sàng"` risked implying readiness despite the section's explicit static notice (`"Bản xem trước giao diện · chưa kết nối mô hình AI"`).

---

## 3. Exact Source Modifications

| File | Exact Change |
| :--- | :--- |
| `apps/web/src/components/discovery/destination-browser.tsx` | Imported `useRef`; added `const searchInputRef = useRef<HTMLInputElement>(null)`; attached `ref={searchInputRef}` to the persistent `<input id={searchId} type="search">`; added `resetFilters()` calling `setFilter(DEFAULT_DESTINATION_FILTER)` and `searchInputRef.current?.focus({ preventScroll: true })`; wired `"Xoá bộ lọc"` button `onClick={resetFilters}`. |
| `apps/web/src/components/discovery/experience-browser.tsx` | Imported `useRef`; added `const searchInputRef = useRef<HTMLInputElement>(null)`; attached `ref={searchInputRef}` to the persistent `<input id={searchId} type="search">`; added `resetFilters()` calling `setFilter(DEFAULT_EXPERIENCE_FILTER)` and `searchInputRef.current?.focus({ preventScroll: true })`; wired `"Xoá bộ lọc"` button `onClick={resetFilters}`. |
| `apps/web/src/components/trips/itinerary-explorer.tsx` | Set `aria-controls="itinerary-day-panel"` on every `<button role="tab">` and fixed the single `<div role="tabpanel">` element `id` to `"itinerary-day-panel"`, keeping `aria-labelledby={`day-tab-${day.day}`}` dynamically bound to the selected day. |
| `apps/web/src/components/home/ai-planner-section.tsx` | Replaced `aria-label="Bản xem trước sẵn sàng"` on the decorative header dot `<span className="size-2 rounded-full bg-[var(--adora-gold)]">` with `aria-hidden="true"`. |
| `scripts/verify_web_0_4.mjs` | Added `runH1AccessibilityProfile` across `desktop_normal` (`1440×900`), `mobile_normal` (`390×844`), `desktop_reduced_motion`, and `desktop_motion_off`; promoted all three Package E diagnostic probes to failing assertions inside `accessibilityAndKeyboardAudit.passed`. |

**Untouched Invariants:** `reveal.tsx`, `editorial-hero.tsx`, `globals.css`, `baseline_0_3_metrics.json`, `collect_web_motion_metrics.mjs`, historical Package A/B/C/D/E reports, dependencies, and `pnpm-lock.yaml` were not modified.

---

## 4. Tab ARIA Design Decision and Rationale

Evaluated against the **WAI-ARIA Authoring Practices Guide (APG) Tabs Pattern** (`https://www.w3.org/WAI/ARIA/apg/patterns/tabs/`):

- **Candidate Approaches Evaluated:**
  - **Approach A (Chosen) — Shared Stable Panel ID (`id="itinerary-day-panel"`):** All tabs reference `aria-controls="itinerary-day-panel"`, which resolves unconditionally to the single persistent `<div role="tabpanel" id="itinerary-day-panel" data-testid="day-panel">` while `aria-labelledby={`day-tab-${day.day}`}` updates synchronously to name the active day.
  - **Approach B (Not Chosen) — Selected-Tab-Only `aria-controls`:** Keep `id={`day-panel-${day.day}`}` and omit `aria-controls` on inactive tabs (`selected ? ... : undefined`).
- **Decision Rationale:**
  1. WAI-ARIA APG specifies: *"Each element with role `tab` has the property `aria-controls` referring to its associated `tabpanel` element."* Because ADORA intentionally uses a single stable outer `tabpanel` node swapping day content internally (required by Package D's `stablePanelNode` and `E-10` motion invariants), Approach A accurately models the DOM: every tab truly controls `#itinerary-day-panel`.
  2. Unlike Approach B, inactive tabs retain valid, resolvable `aria-controls` IDREFs on initial load and after every pointer/keyboard switch (`danglingInactiveControlsCount === 0`) without introducing duplicate hidden `tabpanel` nodes that would complicate `[data-testid="day-panel"]` stability.
  3. `aria-labelledby` updates synchronously (`day-tab-1` ↔ `day-tab-2` ↔ `day-tab-3`), preserving clear accessible panel naming on focus.

---

## 5. Reset-Button Focus Behavior (Before / After)

| State / Interaction | Before (Package E `dcaa27d`) | After (H1 Hardening) |
| :--- | :--- | :--- |
| Pre-activation focused element (`Xoá bộ lọc`) | `<button>` inside `[data-testid="...-empty"]` | `<button>` inside `[data-testid="...-empty"]` |
| Pointer click on `Xoá bộ lọc` (`/destinations` & `/experiences`) | `document.activeElement.tagName === "BODY"` (`dropsToBody: true`) | `document.activeElement === searchInput` (`tagName: "INPUT"`, React `useId()` ID preserved, `dropsToBody: false`) |
| Keyboard `Enter` activation (CDP `keyDown`/`keyUp` with `text: "\r"`) | Dropped to `BODY` on unmount | Restores results, clears input query, focuses `<input type="search">`, `scrollDelta === 0 px` |
| Keyboard `Space` activation (CDP `keyDown`/`keyUp` with `text: " "`) | Dropped to `BODY` on unmount | Restores results, clears input query, focuses `<input type="search">`, `scrollDelta === 0 px` |
| Mobile viewport (`390×844`) with scroll offset before reset | Focus lost to `BODY` | Focus moves cleanly to `<input>` via `focus({ preventScroll: true })`, `scrollDelta === 0 px` |

All filter state transitions, `role="status"` counts, `data-filter-settle` chip keys, typing stability (`listBeforeType === listAfterType`), and search input DOM identity remain unchanged.

---

## 6. Status-Dot Semantics

- **Element (`ai-planner-section.tsx:44`):** `<span className="size-2 rounded-full bg-[var(--adora-gold)]" aria-hidden="true" />`.
- **Verification Results:**
  - `legacyAriaLabelPresent: false` (no `span[aria-label="Bản xem trước sẵn sàng"]` anywhere in DOM).
  - Visual gold dot remains rendered (`dotFound: true`, `"Planning preview"` visible at `opacity: 1`).
  - Honest disclaimer `"Bản xem trước giao diện · chưa kết nối mô hình AI"` remains visible (`opacity: 1`).
  - `ariaHidden: "true"`, `hasAriaLabel: false`, `prohibitedGenericAriaLabelCount: 0` on `/` across desktop, mobile, reduced motion, and `data-motion="off"`.

---

## 7. Automated Accessibility Assertions (`scripts/verify_web_0_4.mjs`)

1. **Promoted Package E Backlog Probes inside `desktopAccessibilityAudit`:**
   - Asserts `backlogResetFocus.triggeredEmpty && afterResetFocusTag === "INPUT"` (failing `accessibilityAndKeyboardAudit.passed` if focus falls to `BODY`).
   - Asserts `backlogTabAria.length > 0 && danglingInactiveControlsCount === 0`.
   - Asserts `statusDot.present && !statusDot.legacyAriaLabelPresent && statusDot.ariaHidden === "true" && !statusDot.hasAriaLabel`.
2. **Added Multi-Profile Hardening Matrix (`h1HardeningProfiles`):**
   - Runs across `desktop_normal` (`1440×900`), `mobile_normal` (`390×844`), `desktop_reduced_motion`, and `desktop_motion_off` (`html[data-motion="off"]`).
   - Exercises both `DestinationBrowser` (`/destinations`) and `ExperienceBrowser` (`/experiences`) with `Enter`, `Space`, and `.click()`, enforcing `activeIsSearchInput`, `!dropsToBody`, `inputValueCleared`, `resultsVisible`, `emptyGone`, and `scrollDelta <= 2`.
   - Exercises `ItineraryExplorer` (`/trips/da-lat-3-ngay`) on initial load, Day 2 click, `ArrowRight`, `ArrowLeft`, `Home`, and `End`, enforcing `danglingControlsCount === 0`, `allControlsMatchPanel`, `selectedTabCount === 1`, `stablePanelNode`, and `labelledbyMatchesSelected`.
   - Enforces visible-tree scoping (`el.checkVisibility?.() ?? true`) for Next.js 16 `<Activity>` compatibility and bounded CDP waits.

---

## 8. React / Next.js Compatibility Findings

- **React `19.3.0` Event & Commit Ordering:** Invoking `searchInputRef.current?.focus({ preventScroll: true })` in `resetFilters()` synchronously shifts focus from the empty-state `<button>` to the persistent `<input>` before React commits the unmount of `[data-testid="...-empty"]`. Verified directly in Chromium `157.0.8103.78` under `Enter`, `Space`, and click with zero `setTimeout` workarounds needed.
- **Next.js `16.4.3` `<Activity>` & SSR:** `useId()` (`_R_2slubtb_` on `/destinations`, `_R_2klubtb_` on `/experiences`) and `id="itinerary-day-panel"` hydrate with zero warnings across all routes (`hydrationWarnings: []` in `desktopJourney`, `mobileJourney`, `packageC`, and `packageD`). Package D's day-panel entrance (`adora-panel-in`), E-10 initial load suppression, `0fr <-> 1fr` `inert` accordion, and `Activity` Back/Forward retention continue to pass.

---

## 9. Global Regression Gates (`127.0.0.1:3100`, FastAPI `:8000` Offline)

| # | Command | Result | Observed Evidence |
| :---: | :--- | :---: | :--- |
| 1 | `corepack pnpm@12.16.1 --filter @adora/web test` | **PASS (`0`)** | `22/22` tests passed across `5` suites (`0` failed, `0` skipped) |
| 2 | `corepack pnpm@12.16.1 --filter @adora/web lint` | **PASS (`0`)** | `eslint .` exited `0` cleanly |
| 3 | `corepack pnpm@12.16.1 --filter @adora/web typecheck` | **PASS (`0`)** | `tsc --noEmit` exited `0` cleanly |
| 4 | `corepack pnpm@12.16.1 --filter @adora/web build` | **PASS (`0`)** | Next.js `16.4.3` Turbopack compiled & generated `20/20` routes |
| 5 | `node scripts/verify_web_0_3.mjs` | **PASS (`0`)** | All `6` viewports × `8` routes + filter, planner, itinerary & accessibility checks passed (`errors: []`) |
| 6 | `node scripts/verify_homepage.mjs` | **PASS (`0`)** | `200` status, `6/6` viewports, `scrollWidth === width`, keyboard & reduced motion passed (`errors: []`) |
| 7 | `node scripts/verify_web_0_4.mjs` | **PASS (`0`)** | `Chrome/157.0.8103.78`: `packageA: true`, `packageB: true`, `packageC: true`, `packageD: true`, `packageE: true`, `accessibilityAndKeyboardAudit.passed: true`, all `4/4` `h1HardeningProfiles` passed (`scrollDelta: 0`) |

---

## 10. Responsive Verification

- Verified `desktop_normal` (`1440×900`) and `mobile_normal` (`390×844`) directly in `h1HardeningProfiles` with full interactive keyboard + pointer coverage (`0 px` reset scroll jump on both desktop and mobile).
- Verified `6/6` viewports (`360×800`, `390×844`, `768×1024`, `1024×900`, `1440×900`, `1920×1080`) with `0 px` horizontal overflow in `verify_web_0_3.mjs`, `verify_homepage.mjs`, `verify_web_0_4.mjs` Package A/C/D viewport matrices, and Package E `staticDisclosureAndSixViewportCheck`.

---

## 11. Known Limitations

- All verification executed against headless Windows Chrome (`Chrome/157.0.8103.78`) using DOM/ARIA inspection and synthetic CDP keyboard/pointer events.
- Physical screen readers (NVDA, JAWS, VoiceOver, TalkBack) and physical mobile touch/keyboard hardware were **not** executed in this session and remain unverified.
- Headless Chrome does not expose a dedicated synthetic screen-reader announcement buffer; ARIA conformance rests on live DOM role/attribute invariants (`aria-controls`, `aria-labelledby`, `aria-selected`, `aria-hidden`, and `document.activeElement`).

---

## 12. Selective Staging Scope & Git Hygiene

- **Authorized H1 Commit Scope:**
  - `apps/web/src/components/discovery/destination-browser.tsx`
  - `apps/web/src/components/discovery/experience-browser.tsx`
  - `apps/web/src/components/trips/itinerary-explorer.tsx`
  - `apps/web/src/components/home/ai-planner-section.tsx`
  - `scripts/verify_web_0_4.mjs`
  - `docs/reports/POST_0_4_H1_ACCESSIBILITY_HARDENING_REPORT.md`
- **Preserved Unstaged / Untouched Outside H1 Checkpoint:**
  - User-owned untracked `docs/reports/assets/web-design-0-4.zip` (untouched, not staged).
  - Historical `docs/reports/assets/web-design-0-2/*.png` and `docs/reports/assets/web-design-0-3/*.png` side-effect screenshots rewritten when Gates 5 & 6 ran (left unstaged without destructive Git rollback).

---

## 13. Deferred Work for H2 / H3 Performance Hardening

Per H1 scope boundaries, performance refactoring remains deferred to H2/H3:
1. Compress / re-encode `dalat-pine-trail.webp` under `apps/web/public/images` (`~371.9 KB` source / `~290.7 KB` cached at `w=828&q=75`) to reduce mobile `1.6 Mbps` LCP on `/destinations` (`2,984 ms`) and `/destinations/da-lat` (`2,972 ms`) below `2,500 ms`.
2. Consolidate per-instance observer setup in `apps/web/src/components/ui/reveal.tsx` into shared module-level observers to reduce mobile `4× CPU` TBT deltas (`+40` to `+81 ms` vs Chrome 157 `0.3` control).
3. Perform controlled ablation of `.hero-grain` (`mix-blend-mode: soft-light`) vs `[data-image-settle]` vs `<Reveal>` Task 1 load to isolate and trim the `+132 ms` mobile `/` LCP delta (`1,524 ms` vs `1,392 ms`).
