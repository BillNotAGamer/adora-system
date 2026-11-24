# ADORA — CXP-05A: THE FIRST LETTER — A CINEMATIC ENTRANCE REPORT

## 1. Executive Verdict

**Verdict:** `ADORA CXP-05A — CINEMATIC ENTRANCE READY FOR OWNER VISUAL REVIEW`

ADORA's flagship branded homepage entrance (**THE FIRST LETTER — A Singular Letter Becomes a World**) is implemented, verified, and isolated on feature branch `feature/adora-cxp05a-first-letter-entrance`.

On fresh desktop and mobile homepage entry, the visitor arrives in a deep velvety obsidian space (`#070a08`) anchored by a solitary monumental photographic letter **`A`** derived directly from the real production hero SVG mask over `/images/cxp01/highland-world.jpg` (`Playfair Display`, weight `500`) — never a red fill, flat gold imitation, or duplicated clone. A refined champagne hairline progress bar (`ENTERING ADORA` + tabular-nums `00%–100%`) tracks five real observable readiness gates (`hydration`, `fonts`, `heroMedia`, `geometry`, `stageReady`). Once readiness resolves to `100%`, the progress interface dissolves softly, and the solitary monumental **`A`** scales down and glides via a sculpted monotonic bezier (`cubic-bezier(0.58, 0.0, 0.18, 1.0)`, `1160ms`, zero bounce, zero overshoot) directly onto the exact live DOM-measured position of the first letter **`A`** in `ADORA` (`landingDeltaPx = { dx: 0, dy: 0, dw: 0, dh: 0 }` across all 8 tested viewports from `360×640` to `1920×1080`).

---

## 2. Starting Git Baseline

Verified during preflight before branching:

| Reference | Full SHA | Notes |
| --- | --- | --- |
| Local `main` | `f661f21cab1fc66b0a837693ab788400db072d59` | Includes CXP-04F merge (`ca38902de5b81a57710ba7a822e1011f5d46afe1`) + CXP-04F report commit |
| `origin/main` | `f661f21cab1fc66b0a837693ab788400db072d59` | Matched local `main` |
| Live remote `refs/heads/main` | `f661f21cab1fc66b0a837693ab788400db072d59` | Verified via `git ls-remote` |
| Working branch | `feature/adora-cxp05a-first-letter-entrance` | Branched cleanly from `f661f21cab1fc66b0a837693ab788400db072d59` |

Protected untracked archive `docs/reports/assets/unrestricted-creative.zip` was preserved untouched. No push, merge into `main`, or deployment was performed.

---

## 3. Existing Hero Glyph & Rendering Audit

Source forensics of `apps/web/src/app/page.tsx`, `apps/web/src/app/layout.tsx`, and `apps/web/src/components/creative-lab/cinematic-journey/cinematic-journey-experience.tsx` established:

- **Production render path**: `apps/web/src/app/page.tsx` renders `<CinematicJourneyExperience mode="production" ... />` with Partial Prerendering (`◐ /`) and a `<Suspense>` live catalog disclosure.
- **Wordmark architecture (Movement 01)**:
  - Layer 0 (`.cxp01-world-layer`): Full-bleed `<img src="/images/cxp01/highland-world.jpg" fetchPriority="high" decoding="sync" />` (`object-fit: cover`; `object-position: 36% 48%` desktop, `62% 48%` mobile).
  - Layer 2 (`.cxp01-veil-layer`): Full-viewport `<svg className="cxp01-veil-svg" preserveAspectRatio="xMidYMid slice">` (`viewBox="0 0 1600 900"` desktop; `viewBox="0 0 900 1600"` mobile).
  - Inside `<mask id="cxp02-adora-portal-mask" maskUnits="userSpaceOnUse">`:
    - Desktop (`>= 768px`): First **`A`** is already an independent `<text x="356" y="500" textAnchor="middle" fontFamily="var(--font-display), Georgia, serif" fontSize="315" fontWeight="500">A</text>`, while **`D O R A`** (`x=578, 814, 1044, 1256`) live inside `<g ref={secondaryLettersRef}>`.
    - Mobile (`< 768px`): Single monumental **`A`** at `<text x="450" y="955" fontSize="680" fontWeight="500">A</text>`.
  - Mask punches crisp vector cutouts through a blurred highland backdrop + dark radial vignette (`#141812` → `#070a08`) to reveal Layer 0 photography inside the letterforms.
- **Typography**: Self-hosted Next.js `Playfair_Display` (`--font-display`) and `Be_Vietnam_Pro` (`--font-body`).
- **Existing Concierge & Fallback**: Official Personal Journey Atelier runs via `ConciergeProvider`; reduced-motion renders `<main data-cxp02-mode="reduced-motion">`; no-JS renders `<noscript><style>{NO_JS_FALLBACK_CSS}</style></noscript>`.

---

## 4. Chosen Design & Animation Architecture

### Unified Single-Glyph Mask Choreography (Zero Clones, Zero Duplication)
Instead of animating a detached clone overlay and swapping it at landing (which risks subpixel seams, font rasterization drift, texture jump, or 1-frame duplication), CXP-05A drives the **actual production hero `<text>A</text>` directly inside `#cxp02-adora-portal-mask`**:

1. **Same glyph, same font, same photographic source**: During Scene I–IV, `<g ref={entranceFirstAGroupRef} data-cxp05-first-a>` transforms the single real hero `<text>A</text>` inside `#cxp02-adora-portal-mask`, while `<rect ref={entranceDarknessRef} fill="#070a08" />` inside the masked veil deepens the surrounding canvas to velvety obsidian `#070a08`.
2. **Zero duplicate image downloads**: Layer 0's existing `<img src="/images/cxp01/highland-world.jpg" />` shines directly through the monumental centered **`A`** (with a warm-obsidian CSS radial base beneath it while streaming on slow networks). `highlandRequestCount === 1` verified in Chrome Performance Resource Timing.
3. **Cohesive modular decomposition** (no external animation framework added):
   - `apps/web/src/components/entrance/first-letter-choreography.ts` — pure deterministic readiness weighting, navigation policy, cubic-bezier easing, responsive start composition, and flight frame math.
   - `apps/web/src/components/entrance/first-letter-choreography.test.ts` — unit tests covering all invariants.
   - `apps/web/src/components/entrance/first-letter-boot-script.tsx` — route-scoped first-paint inline boot script with fail-open 4.8s watchdog.
   - `apps/web/src/components/entrance/first-letter-entrance.css` — scoped `.cxp05-*` styles & zero-flash first-paint CSS guards.
   - `apps/web/src/components/entrance/first-letter-hud.tsx` — editorial progress hairline, `ENTERING ADORA`, tabular-nums percentage, `role="progressbar"`, and polite `role="status"` announcements.
   - `apps/web/src/components/entrance/use-first-letter-entrance.ts` — lifecycle coordinator, live DOM/SVG geometry measurement, resize retargeting, scroll/inert lock with scrollbar-gutter compensation, fail-open recovery, and telemetry.

---

## 5. Exact `A` Source & Target Mapping

Because SVG elements inside `<defs>/<mask>` return zeroed `getBoundingClientRect()` in Blink/Chromium, a zero-pixel invisible measurement anchor (`<text ref={heroFirstAAnchorRef} data-cxp05-target-anchor fill="none" pointerEvents="none" />`) is placed in the same `<svg className="cxp01-veil-svg">` with identical `x`, `y`, `fontSize`, `fontWeight`, and `fontFamily`.

1. **Live Destination Measurement**: Reads `heroFirstAAnchor.getBoundingClientRect()` (live viewport rect), `heroFirstAAnchor.getBBox()` (live SVG optical center `(targetCx, targetCy)`), and `veilSvg.getScreenCTM()` (live affine matrix accounting for `preserveAspectRatio="xMidYMid slice"` and viewport size).
2. **Optical Start Composition**: Converts Playfair Display's SVG line-box height to uppercase cap height (`opticalCapHeight = height * 0.54`), centers horizontally at `clientWidth * 0.5`, balances vertically above the progress HUD (`44%` height desktop, `39%–42%` mobile), and maps `(startScreenX, startScreenY)` into SVG user-space via `ctm.inverse()`.
3. **Scrollbar Gutter Compensation**: While `overflow: hidden` locks scrolling during entrance, `document.body.style.paddingRight` compensates `window.innerWidth - document.documentElement.clientWidth` (15px on Windows desktop) against `#070a08` background, eliminating the 7.5px horizontal scrollbar-reappearance shift at landing.
4. **Measured Geometry Proof (Final Verified Run)**:

| Viewport | Start Scale | Target Rect (`left, top, w×h`) | Landing Rect (`left, top, w×h`) | Landing Delta (`dx, dy, dw, dh`) |
| --- | --- | --- | --- | --- |
| `1440×900` (Desktop) | `1.4320×` | `162.5, 160, 212×419` | `162.5, 160, 212×419` | `0, 0, 0, 0 px` |
| `390×844` (Mobile) | `1.1200×` | `74.0, 116.76, 242×477` | `74.0, 116.76, 242×477` | `0, 0, 0, 0 px` |
| `360×640` | `1.1819×` | `184×361` | Exact match | `0, 0, 0, 0 px` |
| `360×800` | `1.1200×` | `230×452` | Exact match | `0, 0, 0, 0 px` |
| `430×932` | `1.1200×` | `267×526` | Exact match | `0, 0, 0, 0 px` |
| `768×1024` | `1.3200×` | `242×476` | Exact match | `0, 0, 0, 0 px` |
| `1024×768` | `1.3200×` | `182×357` | Exact match | `0, 0, 0, 0 px` |
| `1920×1080` | `1.3200×` | `255×502` | Exact match | `0, 0, 0, 0 px` |

Font verification: `firstAFont === anchorFont === '"Playfair Display", "Playfair Display Fallback", Georgia, serif'`. At completion, `transform` is removed completely (`firstATransformCleared: true`).

---

## 6. Loading Readiness Model

The percentage represents **Movement 01 entrance experience readiness** across 5 observable gates (not total network bytes):

| Stage | Weight | Observable Condition | Bounded Fail-Open Limit |
| --- | --- | --- | --- |
| `hydration` | `15%` | Client runtime mounted & `__ADORA_CXP05_OWNED__ = true` | Immediate |
| `fonts` | `25%` | `document.fonts.ready` + `Playfair Display` weight `500` loaded | `2200ms` → `"degraded"` |
| `heroMedia` | `35%` | Live Movement 01 `highland-world.jpg` loaded (`naturalWidth > 0`) & `img.decode()` resolved | `3800ms` / `onerror` → `"degraded"` |
| `geometry` | `15%` | Responsive `isMobile` synced, `getScreenCTM()` valid, target `A` rect measured | `1200ms` → `"degraded"` |
| `stageReady` | `10%` | Initial Movement 01 frame committed (`requestAnimationFrame`) after gates 1–4 | Immediate |

- **Honesty invariant**: `computeWeightedReadiness()` caps output at `<= 94%` whenever any gate is pending or degraded. Under throttled network verification (`highland-world.jpg` delayed), the UI genuinely held at **`55%`** (`heroMediaStage: "pending"`) until the image finished loading and decoding.
- **Hard ceiling**: `4500ms` overall safety ceiling prevents indefinite stalls.

---

## 7. First-Paint & No-JS Strategy

- `FirstLetterBootScript` (`#adora-cxp05-boot`) is emitted **only** inside `apps/web/src/app/page.tsx` right before `<CinematicJourneyExperience />` (zero footprint on `/ai-planner`, `/destinations/*`, `/experiences/*`, `/trips/*`).
- Runs synchronously before `<main>` paints:
  - Skips on non-`/` paths, hash deep links, `scrollY > 16`, `back_forward` navigation, or `window.__ADORA_CXP05_PLAYED__`.
  - Sets `document.documentElement.dataset.cxp05Entrance = "pending"` (or `"reduced"` when `prefers-reduced-motion: reduce` or `data-motion="off"`).
  - Schedules a `4800ms` inline watchdog to remove `dataset.cxp05Entrance` if client JS fails to claim ownership.
- `suppressHydrationWarning` is set solely on `<html>` in `apps/web/src/app/layout.tsx` to prevent hydration warnings from the early `data-cxp05-entrance` attribute.
- **No-JS fallback**: Inline script never executes when JS is disabled; `data-cxp05-entrance` is never set; `<noscript><style>{NO_JS_FALLBACK_CSS}</style></noscript>` renders the full visible homepage (`openingPaintedHeight: 558px`, `discoveryOpacity: "1"`, `h1Count: 1`).

---

## 8. Transition Lifecycle

| Scene | Phase | Duration / Trigger | Visual Behavior |
| --- | --- | --- | --- |
| I — The Arrival | `pending` → `loading` | First paint → mount (~6–14ms) | `#070a08` canvas → solitary centered monumental photographic `A` + hairline bar |
| II — The Preparation | `loading` | Velocity-smoothed until all 5 gates ready (~636ms local) | Smooth tabular progress `00% → 100%` (`ENTERING ADORA`); holds below 100% if asset pending |
| III — Completion | `complete-hold` → `dissolving-ui` | `220ms` poise + `280ms` dissolve | `100%` acknowledged; progress bar & label dissolve gently downward |
| IV — The Transformation | `transforming` | `1160ms` (`cubic-bezier(0.58, 0.0, 0.18, 1.0)`) | Monumental `A` scales down (`1.432× → 1.0×` desktop, `1.12× → 1.0×` mobile) and glides to live target `A`; obsidian shroud opens (`u = 0.22..0.86`); desktop `D → O → R → A` awaken sequentially after `A` clears `D`'s corridor (`u = 0.48..0.92`); header, frame, subtitle, scroll cue, and bottom rail settle (`u = 0.62..0.98`) |
| V — The World Revealed | `complete` | Instant handoff at `u = 1` (`~2305ms` total) | Inline SVG/CSS overrides cleared, HUD unmounted, scroll lock & `inert` removed, `data-cxp05-entrance="complete"` |

---

## 9. Responsive & Reduced-Motion Behavior

- **Desktop (`768px – 1920px+`)**: Centered monumental `A` (`1.32× – 1.432×`) glides leftward to the leftmost `A` of `ADORA`, awakening `D O R A` in its wake.
- **Mobile (`360×640`, `360×800`, `390×844`, `430×932`)**: `useIsomorphicLayoutEffect` syncs `isMobile` before first visible frame so the portrait `900×1600` viewBox is active immediately; monumental `A` (`1.12× – 1.182×`) settles cleanly into Movement 01's vertical mobile `A` with generous space for the progress bar and zero horizontal overflow.
- **Live Resize**: `window.resize` recomputes live target rects & HUD placement during loading and retargets cleanly if resized mid-flight.
- **Reduced Motion (`prefers-reduced-motion: reduce` & `html[data-motion="off"]`)**: Policy switches to `"reduced"`; zero spatial flight (`flightDurationMs: 0`); displays a calm static `ADORA` lockup + progress bar and crossfades (`240ms`, or `0ms` for `data-motion="off"`) into `<main data-cxp02-mode="reduced-motion">`.

---

## 10. Accessibility

Verified live during and after entrance:
- `role="progressbar"` with `aria-label="Preparing ADORA"`, `aria-valuemin="0"`, `aria-valuemax="100"`, and live `aria-valuenow`.
- Concise polite live region (`role="status" aria-live="polite" aria-atomic="true"`) announces `"Preparing ADORA"` on entry and `"ADORA is ready"` on completion (does not spam percentage ticks).
- Background `<SiteHeader>` wrapper and `.cxp02-runway` receive `inert` while entrance is active (`headerInert: true`, `runwayInert: true`), preventing invisible keyboard focus traps; both become non-inert (`false`) and HUD unmounts (`hudRemoved: true`) upon completion.
- Scroll wheel, touchmove, and scroll-key events are temporarily intercepted and fully torn down on completion or unmount.

---

## 11. Failure Recovery

- **Image failure (`highland-world.jpg` blocked)**: Verified via CDP `Fetch.failRequest`. Readiness records `stages.heroMedia = "degraded"` and `outcome = "degraded"`, never falsely celebrates `100%`, exits cleanly into the functional homepage (`hudRemoved: true`, `overflowRestored: true`, `hasAtelierTrigger: true`).
- **Font / geometry / hard timeouts**: Bounded waits (`2200ms` font, `1200ms` geometry, `3800ms` media, `4500ms` hard ceiling) plus `4800ms` inline boot watchdog guarantee visitors are never stranded.
- **Rapid mid-load navigation**: Navigating from `/` at `t = 220ms` to `/destinations/da-lat` cleans up `data-cxp05-entrance`, restores `overflow`, leaves `inertCount: 0`, and leaves no orphaned HUD.
- **bfcache (`pageshow.persisted`) & Strict Mode**: `window.__ADORA_CXP05_PLAYED__` is set only on completion/skip (preserving React Strict Mode double-mount), and `pageshow` with `persisted: true` clears any active entrance immediately.

---

## 12. Tests & Browser Outcomes

All automated gates executed against the final polished build (`58bf4f10feb0512f147b1590985eb08a24e50f8c` source tree):

| Gate | Command | Result |
| --- | --- | --- |
| Frozen install | `pnpm install --frozen-lockfile` | **PASS** |
| Prod security audit | `pnpm --filter @adora/web audit --prod` | **PASS** (`No known vulnerabilities found`) |
| Unit test suite | `pnpm --filter @adora/web test` | **PASS** (`55 pass, 0 fail` across 6 suites, including 5 new CXP-05A suites) |
| TypeScript | `pnpm --filter @adora/web typecheck` | **PASS** (`0 errors`) |
| ESLint | `pnpm --filter @adora/web lint` | **PASS** (`0 errors`, 16 pre-existing `<img>` warnings in `creative-lab/`) |
| Production build | `pnpm --filter @adora/web build` | **PASS** (`22/22` routes built cleanly) |
| CXP-05A Entrance Verifier | `node scripts/verify_cxp05a_entrance.mjs` | **PASS** (all 14 scenarios, 8 viewports, 0 console/page/network errors) |
| CXP-03 Homepage Regression | `node scripts/verify_cxp03_homepage.mjs` | **PASS** (0 errors, 6 Movements, scroll restoration, reduced-motion, no-JS) |
| CXP-04F Official Atelier Regression | `node scripts/verify_cxp04c_integration.mjs` | **PASS** (0 errors, 6 Movements 0px scroll delta, history stress A–E, `/creative-lab/concierge-experience` 404) |

*(Note: `verify_cxp03_homepage.mjs` and `verify_cxp04c_integration.mjs` were updated solely to wait for the documented CXP-05A entrance completion (`__ADORA_CXP05_TELEMETRY__.phase === "complete" | "skipped"`) before running their unmodified homepage and Atelier assertions.)*

---

## 13. Performance Implications & Honest Tradeoffs

Measured on `next start --port 3105` via `verify_cxp03_homepage.mjs` and `verify_cxp05a_entrance.mjs`:

| Metric | Pre-CXP-05A Baseline (`verify_cxp03`) | Post-CXP-05A (`verify_cxp03` / `verify_cxp05a`) | Delta / Notes |
| --- | --- | --- | --- |
| Initial JS transfer | `278 KB` | `283 KB` | **`+5 KB`** (zero third-party animation library added) |
| CSS transfer | `23 KB` | `24 KB` | **`+1 KB`** |
| Hero image transfer | `2192 KB` | `2192 KB` | **`0 KB`** (`highlandRequestCount: 1`, zero duplicate image requests) |
| CLS | `0` | `0.0003` | Effectively zero |
| Long Tasks | `0 ms` | `0 ms` | Smooth 60fps SVG transform loop |
| `lcpMs` | `416 ms` | `228 ms` | Hero `<img>` remains in DOM at high priority |
| Time to interactive Movement 01 | Immediate (~`419 ms`) | **`~2305 ms`** (`readyAtMs: 636 ms` + `220ms` hold + `280ms` UI exit + `1160ms` flight) | **Intentional brand tradeoff**: fresh homepage entry holds scroll/nav interaction for ~2.3s on fast connections to perform the signature entrance; skipped on repeat SPA visits, back/forward, deep links, and restored scroll. |

---

## 14. Visual Evidence Inventory

All assets captured from the final polished production build (`docs/reports/assets/cxp05a/`):

### Continuous Real-Time WebM Recordings (20 fps, VP9, `decodeOk: true`)
1. **Desktop (`1440×900`)**: `docs/reports/assets/cxp05a/cxp05a_desktop_entrance.webm`
   - Metadata: `1440×900`, `SAR 1:1`, `DAR 1440:900`, `20 fps`, `183 frames`, `9.15s`, `1,085,124 bytes`
   - SHA-256: `cb57c3720626b4b555a6b66cd9985affe293054f8a2dcc806e9c6f1283844234`
   - Covers: Fresh load → centered monumental `A` → progress bar → `100%` → progress exit → `A` flight → `A`-to-`ADORA` handoff → settled Movement 01 → smooth scroll into Movement 02.
2. **Mobile (`390×844`)**: `docs/reports/assets/cxp05a/cxp05a_mobile_entrance.webm`
   - Metadata: `390×844`, `SAR 1:1`, `DAR 390:844`, `20 fps`, `65 frames`, `3.25s`, `89,585 bytes`
   - SHA-256: `453c8a36cdf9f838d491ab6a01c328dc9269becd9c9c23f59c3a46c017d76050`
   - Covers: Fresh portrait mobile load → centered monumental `A` → progress bar → `100%` → vertical settle into Movement 01 mobile `A` & copy.

### Milestone Screenshots (`docs/reports/assets/cxp05a/`)
- `01_desktop_initial_a.png` (`20,596 B`, sha256 `1957c67e...`) — Desktop initial centered `A` & progress bar
- `02_desktop_mid_progress.png` (`20,705 B`, sha256 `2e5847dd...`) — Desktop loading mid-progress (~44%)
- `03_desktop_100_percent.png` (`122,415 B`, sha256 `4d25eb81...`) — Desktop photographic `A` at `100%` completion
- `04_desktop_a_mid_flight.png` (`312,057 B`, sha256 `31f16a13...`) — Desktop solitary `A` mid-flight across emerging highlands
- `05_desktop_final_landing.png` (`1,000,707 B`, sha256 `473f4413...`) — Desktop final `A`-to-`ADORA` landing handoff
- `06_desktop_settled_hero.png` (`996,730 B`, sha256 `91f07fe3...`) — Desktop settled approved Movement 01
- `07_mobile_initial_a.png` (`16,849 B`, sha256 `5b9da719...`) — Mobile `390×844` initial monumental `A`
- `08_mobile_mid_flight.png` (`144,054 B`, sha256 `84a32f2b...`) — Mobile `390×844` mid-flight photographic `A`
- `09_mobile_settled_hero.png` (`271,273 B`, sha256 `2366d86d...`) — Mobile `390×844` settled Movement 01
- `10_reduced_motion_settled.png` (`950,627 B`, sha256 `4f4daf80...`) — Reduced-motion settled homepage
- `11_no_js_homepage.png` (`558,064 B`, sha256 `fc673902...`) — No-JS fallback homepage (no blocking loader)

Verification summary JSON saved during capture: `%TEMP%\adora-cxp05a-scratch\verify_cxp05a_entrance.json`.

---

## 15. Remaining Risks

1. **Physical iOS Safari / Android Chrome validation**: All browser tests ran in headless Chromium on Windows. Real iOS Safari `svh`/address-bar dynamics and SVG `<mask>` GPU compositing frame pacing on mid-range mobile devices should be spot-checked on hardware before public release.
2. **Perceived time-to-interactive tradeoff**: Fresh visits to `/` intentionally hold interaction for ~2.3s on fast connections to perform the entrance choreography. If the owner prefers a slightly brisker sweep (e.g., ~1.8s total by shortening `MAX_PROGRESS_SPEED_PER_SEC` / `FLIGHT_DURATION_MS`), both constants are isolated in `use-first-letter-entrance.ts`.

---

## 16. Exact Files Changed

### Created
- `apps/web/src/components/entrance/first-letter-choreography.ts`
- `apps/web/src/components/entrance/first-letter-choreography.test.ts`
- `apps/web/src/components/entrance/first-letter-boot-script.tsx`
- `apps/web/src/components/entrance/first-letter-entrance.css`
- `apps/web/src/components/entrance/first-letter-hud.tsx`
- `apps/web/src/components/entrance/use-first-letter-entrance.ts`
- `scripts/verify_cxp05a_entrance.mjs`
- `docs/reports/assets/cxp05a/*` (11 PNGs + 2 WebMs)
- `docs/reports/ADORA_CXP05A_THE_FIRST_LETTER_CINEMATIC_ENTRANCE_REPORT.md`

### Modified
- `apps/web/src/app/layout.tsx` (added `suppressHydrationWarning` on `<html>` only)
- `apps/web/src/app/page.tsx` (mounted route-scoped `<FirstLetterBootScript />`)
- `apps/web/src/components/creative-lab/cinematic-journey/cinematic-journey-experience.tsx` (minimal production-only SVG/img refs, zero-pixel target geometry anchor, `<FirstLetterHud />`, `inert` background lock)
- `scripts/verify_cxp03_homepage.mjs` (added `waitForEntranceComplete` after `/` navigation)
- `scripts/verify_cxp04c_integration.mjs` (added `waitForEntranceComplete` after `/` navigation)

---

## 17. Full Feature Commit SHA

- **Implementation & Evidence Commit**: `58bf4f10feb0512f147b1590985eb08a24e50f8c` (`feat(web): introduce cinematic first-letter entrance`)
- **Report Commit**: Committed immediately after on `feature/adora-cxp05a-first-letter-entrance` (exact final branch HEAD reported in terminal handoff).

---

## 18. Final Git Status

- Active branch: `feature/adora-cxp05a-first-letter-entrance`
- Local `main` & `origin/main`: untouched at `f661f21cab1fc66b0a837693ab788400db072d59`
- Untracked files: only protected `docs/reports/assets/unrestricted-creative.zip`

---

## 19. Preview Instructions

From `F:\Coding\Adora System Mega Project\adora-system` on branch `feature/adora-cxp05a-first-letter-entrance`:

```powershell
pnpm --filter @adora/web build
pnpm --filter @adora/web exec next start --port 3000
```

Open `http://localhost:3000/` in a fresh browser tab (or hard-refresh at top of page) to experience **THE FIRST LETTER** live. Review the recorded desktop and mobile WebM files directly in `docs/reports/assets/cxp05a/`.

---

## 20. Owner Acceptance Recommendation

**Recommended Action:** Review `docs/reports/assets/cxp05a/cxp05a_desktop_entrance.webm`, `docs/reports/assets/cxp05a/cxp05a_mobile_entrance.webm`, and the milestone frames (`01`–`11`). Upon creative sign-off of pacing and visual reveal, proceed to a dedicated local-`main` integration checkpoint (`CXP-05B` / merge) plus physical mobile hardware spot-check.
