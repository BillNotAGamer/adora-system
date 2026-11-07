# ADORA — Web Design 0.4: Package B — Homepage Cinematic Experience Report

- **Date:** 2026-11-08
- **Phase:** Web Design 0.4 — Package B (Homepage Cinematic & Editorial Choreography + Stalled Verifier Recovery)
- **Branch:** `main`
- **Starting Baseline HEAD:** `a54ee8c4f1a3842e2d120ca055ad3a8b6e1cf7f8` (`feat(web): establish adora motion foundation and progressive reveals`)
- **Pre-Motion Application Baseline:** `c49595573f8b7214f414a589006b748d5d6babfb` (Package A0 metrics at `4b29de1173f08a5bc82eda498bd583008c95d93d`)
- **Governing Specification:** `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md` + `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_FINAL_APPROVAL.md`

---

## 1. Executive Summary

Package B transforms the ADORA homepage (`/`) into a cohesive, luxury editorial experience across all seven chapters while preserving React Server Component (RSC) boundaries, zero-JavaScript/SSR fail-visible resilience, Largest Contentful Paint (`LCP`) element identity, `0.00` Cumulative Layout Shift (`CLS`), and strict honesty around preview/fallback content.

In addition to implementing `INV-03`, `INV-04`, `INV-05`, `INV-07`, `INV-08`, `INV-09`, `INV-10`, and `INV-11` (and preserving the Package A `INV-06` pilot in `BrandPhilosophy` untouched), this delivery resolved an interrupted browser-verification hang in `scripts/verify_web_0_4.mjs` caused by awaiting `load` events on offscreen `loading="lazy"` below-the-fold `next/image` elements while at `scrollY = 0`. All waits in `scripts/verify_web_0_4.mjs` are now bounded with explicit diagnostic timeouts, and all seven mandatory global regression gates exit `0`.

---

## 2. Changed Files & Preserved Boundaries

### Modified & Added Paths (`10` paths / `32` files including evidence)

| Path | Role in Package B |
| :--- | :--- |
| `apps/web/src/app/globals.css` | Added `--adora-distance-hero` (`20px` desktop / `12px` mobile), `@keyframes adora-image-settle` (`INV-03`), `@keyframes adora-hero-heading-rise` & `@keyframes adora-load-rise` (`INV-04`), bounded `1.5`-iteration `scroll-line` (`INV-05` / `E-5`), stationary `.image-reveal[data-reveal]` container-fade + inner `img` scale rules (`INV-07` / `E-3b`), pure-CSS `[data-sample-bubble]` opacity stagger (`INV-09` / `E-8b`), and reduced-motion / `[data-motion="off"]` / `:focus-visible` / `:focus-within` / `@media print` fail-visible overrides. |
| `apps/web/src/components/home/editorial-hero.tsx` | Pure Server Component (`E-6`). Added `overflow-x-hidden` on `<section>`, `data-image-settle=""` on `<Image preload>` (`INV-03`), `adora-hero-heading-rise` (`0ms` delay, `opacity: 1` from `t = 0ms`) on eyebrow and `<h1>` (`INV-04`), and `adora-load-rise` (`--stagger-index` `1`, `2`, `3`) on lead copy, primary CTA, and secondary CTA. |
| `apps/web/src/components/home/destination-story.tsx` | Wrapped stationary `.image-reveal` frame in `<Reveal variant="image">` (`E-3b`), elevated `-bottom-6` coordinate badge classes directly onto `<Reveal variant="card" delayMs={160}>` (`E-8a`), and wrapped right-column narrative blocks in `<Reveal delayMs={80} stackOnMobile>` and `<Reveal delayMs={160} stackOnMobile>` (`INV-07`). |
| `apps/web/src/components/home/experience-story.tsx` | Wrapped header + lead disclaimer at `delayMs={0}` (`E-8c`), placed `<Reveal variant="card" delayMs={index * 90} stackOnMobile>` **inside** each `<li className="border-b ...">` (`E-7`), kept provenance note + CTA **outside** any `<Reveal>` (`E-8c`), and wrapped the right-column `.image-reveal` frame (`delayMs={120}`) and caption (`delayMs={180}`) while keeping outer column `lg:translate-y-10` static (`INV-08`). |
| `apps/web/src/components/home/ai-planner-section.tsx` | Kept ink `<section>` static (`opacity: 1`), wrapped left column (including `"Bản xem trước giao diện · chưa kết nối mô hình AI"`) in `<Reveal delayMs={0}>`, wrapped right preview card in `<Reveal delayMs={100} stackOnMobile>`, and tagged the two static sample bubbles with `data-sample-bubble="1"` and `data-sample-bubble="2"` (`INV-09` / `E-8b`). |
| `apps/web/src/components/home/how-it-works.tsx` | Kept `<section>` and `<ol>` static, wrapped header in `<Reveal delayMs={0}>`, and placed `<Reveal variant="card" delayMs={index * 90} stackOnMobile>` **inside** each `<li>` (`INV-10` / `E-7`). |
| `apps/web/src/components/layout/site-footer.tsx` | Kept `<footer>` and `<nav aria-label="Điều hướng chân trang">` static and immediately interactive; wrapped interior closing CTA grid (`showCta`) in `<Reveal delayMs={0}>` (`INV-11`). |
| `scripts/verify_web_0_4.mjs` | Retained all Package A suites (`[1/4]..[4/4]`), added `Package B [1/1]` (`INV-03`–`INV-11` & `E-5`–`E-8`), added bounded CDP command timeout (`25s`) and bounded per-section image/animation helpers (`__adoraWaitImages`, `__adoraWaitAnims`), hardened `heroInteractionAndE6` across pre-hydration MPA and post-hydration SPA `<Activity>` navigation, and added deterministic `--capture-package-b-evidence` screenshot/frame-sequence capture. |
| `docs/reports/assets/web-design-0-4/package-b/*` | `22` desktop (`1440×900`) and mobile (`390×844`) PNG screenshots + `hero-motion-frame-sequence.json` (`23` files total). |
| `docs/reports/WEB_DESIGN_0_4_PACKAGE_B_HOMEPAGE_CINEMATIC_REPORT.md` | This engineering and verification report. |

### Intentionally Untouched Files (`[OBSERVED]`)

- `apps/web/src/components/home/brand-philosophy.tsx` (`INV-06` pilot preserved byte-identical to Package A)
- `apps/web/src/components/ui/reveal.tsx` (Package A `<Reveal>` client boundary preserved byte-identical)
- `apps/web/package.json` & `pnpm-lock.yaml` (`0` new dependencies added)
- `scripts/collect_web_motion_metrics.mjs` (`SHA-256: e4732607fe6508bec1becfe86c1a734182c3a7aa07a70b7fdc63675cd97a43fb`)
- `docs/reports/baseline_0_3_metrics.json` (`SHA-256: 545961c66f93fd8b62e7a523adf3...` byte-identical)
- `scripts/verify_web_0_3.mjs`, `scripts/verify_homepage.mjs`, `docs/reports/assets/web-design-0-2/`, and `docs/reports/assets/web-design-0-3/`

---

## 3. Motion Inventory Implementation Summary (`INV-03`–`INV-11`)

| ID | Surface | Contract Implemented | Verified Telemetry (`verify_web_0_4.mjs`) |
| :---: | :--- | :--- | :--- |
| **`INV-03`** | `EditorialHero` `<Image preload>` | CSS `@keyframes adora-image-settle` (`920ms var(--adora-ease-editorial) backwards`) scaling `1.035 -> 1` on desktop and `1.02 -> 1` on mobile (`< 768px`), clipped inside `overflow-x-hidden` `<section>`, with `opacity: 1` from `t = 0ms` and `will-change: auto` after settle. Attribute `data-image-settle=""` preserves the exact 4-class `elementIdentity` recorded in `baseline_0_3_metrics.json`. | Desktop `t=0ms`: `scaleX=1.035`, `opacity="1"`; Mobile `t=0ms`: `scaleX=1.02`, `opacity="1"`; Settled: `transform="none"`, `willChange="auto"` `[OBSERVED]`. |
| **`INV-04`** | `EditorialHero` Typography & CTAs | Because `baseline_0_3_metrics.json` recorded `h1` (`"Đi xa hơn. Hiểu sâu hơn."`) as desktop `/` LCP (`96ms`), both the eyebrow and `<h1>` enter at `0ms` delay using transform-only `@keyframes adora-hero-heading-rise` (`opacity: 1` at `t = 0ms`, `translate3d(0, 20px, 0) -> none` desktop / `12px` mobile, `680ms`). Supporting copy (`1`), primary CTA (`2`), and secondary CTA (`3`) use `@keyframes adora-load-rise` at `60 / 120 / 180ms` desktop and `40 / 80 / 120ms` mobile (`--adora-stagger-step`). `<h1>` retains a single child `<em>` (no character/word splitting). `:focus-visible` immediately cancels `animation` (`opacity: 1; transform: none`). | `h1` `t=0ms`: `opacity="1"`, `ty=20` (desktop) / `ty=12` (mobile), `childElementTags=["EM"]`; delays `0.06s / 0.12s / 0.18s` (desktop) & `0.04s / 0.08s / 0.12s` (mobile); focus check `opacityOnFocus="1"`, `transformOnFocus="none"`, `outlineStyle="solid"` `[OBSERVED]`. |
| **`INV-05`** | `.hero-scroll-line` (`E-5`) | Replaced infinite loop with `animation: scroll-line 2.2s var(--adora-ease-ambient) 1.5;` (`3.3s` total, `fill-mode: none`), terminating naturally at the `50%` midpoint (`scaleY(1)`, `opacity: 1`) matching static base CSS with zero snap and `0` active animations after `3.3s`. Hidden below `1024px` (`hidden lg:flex`). | Desktop `t=1500ms`: `scaleY=0.8147`, `activeAnims=1`; `t=3287.5ms`: `scaleY=0.9996`, `opacity=1`; Post-settle: `transform="none"`, `opacity="1"`, `scrollLineActiveAnims=0` `[OBSERVED]`. |
| **`INV-06`** | `BrandPhilosophy` (`#philosophy`) | Preserved untouched from Package A (`3` `<Reveal>` units at `0 / 80 / 160ms`). | `sectionBreakdown.philosophy === 3`, one-shot reveal and partial-fold safety intact `[OBSERVED]`. |
| **`INV-07`** | `DestinationStory` (`#destinations`) | `4` `<Reveal>` units: stationary `<Reveal variant="image" className="image-reveal ...">` (`0ms`, `E-3b`: outer frame `opacity: 0 -> 1` with `transform: none` while inner `img` settles `scale(1.035) -> none` over `1200ms`), `<Reveal variant="card" delayMs={160} className="absolute -bottom-6 ...">` (`E-8a`), heading/tagline `<Reveal delayMs={80} stackOnMobile>`, and narrative/CTA `<Reveal delayMs={160} stackOnMobile>`. | Frame `677.77×813.31` pre/post identical (`0.00px` drift), `badgePosition="absolute"`, `badgeParentTransform="none"`, `badgeOverlapsBottomPx=24`, `imgTransitionDuration="1.2s"` `[OBSERVED]`. |
| **`INV-08`** | `ExperienceStory` (`#experiences`) | `6` `<Reveal>` units: left header + lead disclaimer (`delayMs={0}`, `E-8c`), `3` `<Reveal variant="card" delayMs={index * 90} stackOnMobile>` wrappers **inside** static `<li>` rows (`E-7`), right image frame `<Reveal variant="image" delayMs={120}>` (`E-3b`), and caption `<Reveal delayMs={180} stackOnMobile>`. Provenance note + CTA remain **outside** `<Reveal>` (`E-8c`). Outer right column keeps static `lg:translate-y-10` (`0px 40px`). | `expLiMetricsBefore` vs `After` `relTop` (`1 / 70 / 139`) & `height` (`69px`) `0.00px` drift; `provenanceOutsideReveal=true`, `provenanceOpacityWhilePending="1"`, `imageAboveTextOnMobile=true`, `imageColumnTranslatePreserved="0px 40px"` `[OBSERVED]`. |
| **`INV-09`** | `AiPlannerSection` (`E-8b`) | `2` `<Reveal>` units (`nestedReveals === 0`): left narrative + honesty notice (`delayMs={0}`), right preview card (`delayMs={100}`, `stackOnMobile`). Inside `[data-reveal][data-sample-bubbles-card]`, `[data-sample-bubble="1"]` and `["2"]` transition **opacity only** (`transform: none`, `420ms var(--adora-ease-ui)`) at `+80ms` / `+160ms` relative to the card (`0.18s` / `0.26s` desktop, `0.08s` / `0.16s` mobile). Gold status dot has `0` animations; full Vietnamese text present in DOM from `t = 0ms`. | `nestedRevealsInPreview=0`, `goldDotAnimations=0`, desktop delays `["0.18s", "0.26s"]`, mobile delays `["0.08s", "0.16s"]`, `bubbleProperties=["opacity", "opacity"]`, `bubbleTransforms=["none", "none"]`, `bubbleTextsBefore === bubbleTextsAfter` `[OBSERVED]`. |
| **`INV-10`** | `HowItWorks` (`#how-it-works`) | `4` `<Reveal>` units: header (`delayMs={0}`) + `3` `<Reveal variant="card" delayMs={index * 90} stackOnMobile>` wrappers **inside** `<ol> > <li>` (`E-7`), preserving `md:first:pl-0` (`0px`), `md:last:pr-0` (`0px`), and static vertical `border-r` dividers (`1px / 1px / 0px`). | `howLiMetricsBefore` vs `After` (`width=414.94px`, `height=276px`, `relTop=1px`) `0.00px` drift; mobile `0ms` delay via `stackOnMobile` `[OBSERVED]`. |
| **`INV-11`** | `SiteFooter` (`showCta`) | `1` `<Reveal>` unit wrapping only the interior closing CTA grid (`delayMs={0}`). Outer `<footer>` and bottom `<nav aria-label="Điều hướng chân trang">` remain static (`opacity: 1`, `transform: none`) and immediately clickable on both `/` (`showCta=true`) and routes with `showCta=false`. | `footerNavStatic === true`, `sectionBreakdown.footer === 1`, `totalHomepage === 20` `[OBSERVED]`. |

---

## 4. Binding Final-Approval Errata Compliance (`E-5`–`E-8` & `E-1`–`E-4`)

- **`E-5` (Finite `1.5`-Iteration Scroll Line):** `.hero-scroll-line` runs `2.2s × 1.5 = 3.3s` with `animation-fill-mode: none`, ending continuously at `50%` (`scaleY(1)`, `opacity: 1`) so removal of keyframe styles produces zero visual snap and leaves `document.getAnimations()` empty `[OBSERVED]`.
- **`E-6` (Pure Server Component Hero):** `apps/web/src/components/home/editorial-hero.tsx` has no `"use client"`, no React hooks, and no `data-entered` / `onAnimationEnd` client latch (`hasClientLatchAttr === false`). Verified under Next.js 16 `<Activity>` forward (`/ai-planner`) and `history.back()` (`restoredPathname === "/"`, `restoredH1Visible === true`, `restoredImgVisible === true`) `[OBSERVED]`.
- **`E-7` (Static Editorial List Dividers):** In both `ExperienceStory` and `HowItWorks`, `<ol>` and `<li>` elements carry zero `[data-reveal]` attributes; `border-b` and `md:border-r` hairlines remain `opacity: 1` and `transform: none` throughout reveal transitions (`0.00px` coordinate delta) `[OBSERVED]`.
- **`E-8a` (`DestinationStory` Coordinate Badge Positioning):** `<Reveal variant="card" delayMs={160}>` carries `absolute -bottom-6 right-4 ...` directly (`getComputedStyle(badge).position === "absolute"` inside `relative` column with `transform === "none"`, overlapping bottom edge by `24px`) `[OBSERVED]`.
- **`E-8b` (`AiPlannerSection` Pure-CSS Sample Bubbles):** Zero nested `<Reveal>` components (`querySelectorAll('[data-reveal-variant] [data-reveal-variant]').length === 0`); bubbles are fail-visible under No-JS, `prefers-reduced-motion: reduce`, `html[data-motion="off"]`, `:focus-within`, and `@media print` `[OBSERVED]`.
- **`E-8c` (`ExperienceStory` Disclosures):** Lead disclaimer enters at `0ms` with the section heading (`leadDisclaimerDelay === "0ms"`); bottom provenance note (`"Nội dung biên tập tạm thời..."` / `"Từ danh mục công khai ADORA..."`) sits outside all `<Reveal>` wrappers (`provenanceOpacityWhilePending === "1"`) `[OBSERVED]`.
- **`E-1`–`E-4` Retained:** Top `100000px` `IntersectionObserver` `rootMargin` (`fastScrollJumpTest` passed), `stackOnMobile` `0ms` mobile override (`stackedUnitCount === 10`, `allStackedZeroDelayOnMobile === true`), fine-pointer hover guard (`transformAfterTap === "none"` on `390×844` touch), and `1200ms` post-mount fail-visible watchdog all remain green in `Package A [1/4]..[4/4]` `[OBSERVED]`.

---

## 5. Stalled Browser Verification Recovery & Hardening

### 5.1 Root Cause of Interrupted Session Stall (`[OBSERVED]`)
Inspection of `task-971.log` showed that all five assertion suites (`Package A [1/4]..[4/4]` and `Package B [1/1]`) had already completed, and execution stalled at the start of `capturePackageBEvidence()` in `scripts/verify_web_0_4.mjs`. At `window.scrollY === 0`, the original helper evaluated:
```js
await Promise.all(
  Array.from(document.images).map((img) =>
    img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; })
  )
);
```
Because below-the-fold `next/image` assets (`dalat-pine-trail.webp` in `#destinations` and `highland-coffee-ritual.webp` in `#experiences`) render with native `loading="lazy"`, Chromium intentionally defers fetching them while offscreen at `scrollY = 0`. Without a timeout, `Promise.all` waited forever for `onload` events that cannot fire before scrolling.

### 5.2 Deterministic Fixes Applied in `scripts/verify_web_0_4.mjs`
1. **Bounded CDP Command Timeout (`25,000 ms`):** Added per-command timeout enforcement in `createCdpConnection.send()` so no CDP call can hang silently.
2. **Section-Scoped Bounded Image & Animation Waits (`6,000 ms`):** Added `window.__adoraWaitImages(root, label, 6000)` and `window.__adoraWaitAnims(root, label, 6000)` with explicit diagnostic errors naming the stalled image URL or animation. At `scrollY = 0`, `capturePackageBEvidence` waits only on eager `#hero` images; lazy images in `#destinations` and `#experiences` are awaited **after** scrolling each section into the viewport.
3. **Pre-Hydration MPA vs. Post-Hydration SPA Race Fix (`heroInteractionAndE6`):** Replaced an in-page async `Runtime.evaluate` navigation loop (which could throw `Inspected target navigated or closed` under heavy CPU load if the early entrance CTA click triggered native MPA `<a href="/ai-planner">` navigation prior to `<Link>` hydration) with trusted host-side `Input.dispatchMouseEvent` + resilient Node polling, followed by an explicit hydrated `<Activity>` SPA forward + `history.back()` verification pass.

---

## 6. Art-Direction & Visual Inspection Review (`22` Screenshots)

All `22` PNG screenshots in `docs/reports/assets/web-design-0-4/package-b/` (`11` desktop `1440×900` + `11` mobile `390×844`) were directly inspected:

- **Hero Sequence (`01-hero-initial`, `02-hero-mid`, `03-hero-settled` — Desktop & Mobile):** At `01` (`t ≈ 0ms`), the misty highlands photograph and Vietnamese `<h1>` (`"Đi xa hơn. Hiểu sâu hơn."`) are immediately at full opacity (`1.0`) with subtle initial scale (`1.035` desktop / `1.02` mobile) and vertical offset (`20px` / `12px`), while supporting copy and CTAs have not yet entered. At `02` (`140ms`), supporting copy and primary CTA (`Plan with Adora AI`) are mid-entrance with clean legibility and zero clipping. At `03` (`settled`), all elements rest crisp on the editorial baseline, and on desktop the right-edge scroll line (`Cuộn để khám phá`) stands settled at full `48px` height (`scaleY(1)`, `opacity: 1`).
- **`BrandPhilosophy` (`04-brand-philosophy-settled`):** Two-column thesis and body paragraphs align cleanly with generous whitespace and intact Package A typography.
- **`DestinationStory` (`05a-destination-mid-reveal`, `05b-destination-settled`):** During `05a` (`240ms`), the 4:5 portrait frame remains completely stationary while the pine-trail photograph, right-column `"Đà Lạt"` narrative (`80ms`/`160ms`), and `-bottom-6` coordinate card (`"CAO NGUYÊN VIỆT NAM · 11°56′N"`, `160ms`) fade smoothly into place. In `05b`, all elements settle at `opacity: 1` with exact `24px` bottom badge overlap.
- **`ExperienceStory` (`06-experience-settled`):** Desktop preserves left narrative + right `lg:translate-y-10` offset photograph; mobile stacks photograph + caption cleanly above the narrative (`order-1` / `order-2`), with crisp static `1px` row dividers (`01`–`03`) and clear editorial fallback disclosure.
- **`AiPlannerSection` (`07-ai-planner-section-settled`):** Deep ink band shows zero flash, legible `"BẢN XEM TRƯỚC GIAO DIỆN · CHƯA KẾT NỐI MÔ HÌNH AI"` disclosure, static gold status dot, and settled user/assistant sample bubbles.
- **`HowItWorks` (`08-how-it-works-settled`) & `SiteFooter` (`09-footer-cta-settled`) & Full Page (`10-full-page-settled`):** Three-column desktop grid (with static vertical dividers) and single-column mobile stack render with balanced rhythm, Vietnamese diacritics intact, and zero horizontal overflow across all six tested widths (`360`, `390`, `768`, `1024`, `1440`, `1920`).

---

## 7. `<Suspense>` Catalog Resilience (Offline & Mock Online)

1. **FastAPI Offline (`127.0.0.1:8000` unreachable, `1800ms` timeout):** Verified in `verify_web_0_4.mjs`, `verify_web_0_3.mjs`, and `verify_homepage.mjs`. `HomeCatalogContent` resolves deterministically to editorial fallback data (`"Gợi ý biên tập · API tạm ngoại tuyến"`) with `CLS = 0` and all `20` homepage `<Reveal>` units settling to `opacity: 1, transform: none` `[OBSERVED]`.
2. **Deterministic Mock Catalog Swap (`420ms` simulated FastAPI response matching OpenAPI `DestinationListResponse` & `OfferListResponse`):** Verified on both `/` (below-the-fold stream completion) and `/#destinations` (in-view stream swap while user views `#destinations`): `cls === 0`, `revealUnitCount === 20`, `allRevealsSettledVisible === true`, `"Từ danh mục công khai ADORA · không phải cam kết tồn kho theo ngày"` provenance rendered at `opacity: 1`, followed by clean `apps/web/.next` offline rebuild so zero mock cache artifacts remain `[OBSERVED]`.

---

## 8. Global Regression Gates (`7/7 PASS`)

All seven mandatory gates executed against the clean offline production build (`http://127.0.0.1:3100`, FastAPI offline) and exited `0` `[OBSERVED]`:

1. `corepack pnpm@12.16.1 --filter @adora/web test` — **PASS** (`22/22` unit tests across `5` suites)
2. `corepack pnpm@12.16.1 --filter @adora/web lint` — **PASS** (`exit 0`)
3. `corepack pnpm@12.16.1 --filter @adora/web typecheck` — **PASS** (`exit 0`)
4. `corepack pnpm@12.16.1 --filter @adora/web build` — **PASS** (`exit 0`, `20/20` routes built cleanly)
5. `node scripts/verify_web_0_3.mjs` — **PASS** (`exit 0`, 8 routes × 6 viewports + planner/itinerary/filter/a11y checks; output directed to scratch so `web-design-0-3` assets remained untouched)
6. `node scripts/verify_homepage.mjs` — **PASS** (`exit 0`, 6 viewports + Contracts A–D + reduced-motion checks; output directed to scratch so `web-design-0-2` assets remained untouched)
7. `node scripts/verify_web_0_4.mjs` — **PASS** (`exit 0`, `packageA.passed === true` & `packageB.passed === true`)

---

## 9. Performance Comparison vs. `baseline_0_3_metrics.json`

`scripts/collect_web_motion_metrics.mjs` was executed **unchanged** (`--runs 5 --label package-b-homepage-cinematic`) into an external scratch file (`80` cold route runs across `16` route × profile cells + `50` trusted-CDP interaction runs across `10` cells) and compared against `docs/reports/baseline_0_3_metrics.json` (`4b29de1173f08a5bc82eda498bd583008c95d93d`) `[OBSERVED]`:

| Metric | Web Design 0.3 Baseline (`baseline_0_3_metrics.json`) | Package B (`5` cold runs, scratch) | Delta / Budget Assessment |
| :--- | :--- | :--- | :--- |
| **Desktop `/` LCP Element Identity** | `h1.font-editorial.mt-7.max-w-[13ch].text-[clamp(3.2rem,9.2vw,8.25rem)].leading-[0.89]` (`"Đi xa hơn. Hiểu sâu hơn."`) | **Identical `h1` element & descriptor** | **PASS — Unchanged (`INV-04` `0ms` opacity-`1` rise)** |
| **Mobile `/` LCP Element Identity** | `img.-z-30.object-cover.object-[61%_center].sm:object-center` (`adora-highlands-hero.webp&w=828&q=75`) | **Identical `img` element & URL** | **PASS — Unchanged (`INV-03` `opacity: 1` from `t=0ms`)** |
| **Desktop `/` LCP Median (`1440×900` unthrottled)** | `96 ms` | `192 ms` | **`+96 ms`** (`<= +100 ms` target; untouched routes shifted `+36` to `+48 ms` due to host CPU load, yielding `~+52 ms` normalized delta) |
| **Mobile `/` LCP Median (`390×844` `4×` CPU / `1.6 Mbps`)** | `1,436 ms` | `1,932 ms` | **`<= 2,500 ms` ceiling PASS** (`+496 ms` raw under `68–79%` external host CPU load; see Host CPU Normalization note below) |
| **Route & Scroll `CLS` (`16/16` route × profile cells)** | `0` (`0.00000`) | **`0` (`0.00000`)** | **PASS — `0.00` initial load & full-page scroll pass across all 80 cold runs** |
| **Client JS Compressed Transfer (`/`)** | `195,161 B` (`14` scripts) | `197,136 B` (`14` scripts) | **PASS — `+1,975 B` (`+1.93 KiB` vs `0.3`, `+326 B` over Package A)**, within `<= +2.0 KB` (`2,048 B`) budget |
| **Animation Frame Interval (`/` `rAF` sample)** | `4.2 ms` median / `4.4 ms` `p95` (`0` frames `> 50ms`) | **`4.2 ms` median / `4.3 ms` `p95`** (`0` post-load frames `> 50ms`) | **PASS — `p95 <= 20 ms`, `0` post-settle `will-change !== "auto"`** |
| **Desktop Trusted Interactions (`5` flows)** | `8–24 ms` Event Timing | `8–32 ms` Event Timing (`5.1–20.0 ms` double-`rAF` next paint) | **PASS — All well within `<= 100 ms` desktop ceiling** |

### Host CPU Contention Normalization (`[OBSERVED]`)
During the 5-run `package_b_metrics.json` capture, Windows WMI (`Win32_Processor`) reported sustained `68%–79%` external workstation CPU utilization pinned at `2,700 MHz` base clock (without `4.7 GHz` Turbo Boost). Consequently, **every untouched control route** exhibited an identical `~2.0×` main-thread CPU scaling factor under `4×` CDP throttling:
- Untouched `/trips` (`0` `<Reveal>` nodes): `longTasks.medianTotalLongTaskTimeMs` scaled `410 ms -> 812 ms` (**`1.980×`**).
- Untouched `/trips/da-lat-3-ngay` (`0` `<Reveal>` nodes): `418 ms -> 879 ms` (**`2.103×`**), day-switch `32 ms -> 88 ms`.
- Untouched `/ai-planner` (`0` `<Reveal>` nodes): prompt-select `112 ms -> 232 ms` (`207.2 ms` JS processing under contended `4×` CPU).
- Modified `/` (`20` `<Reveal>` nodes + Hero CSS keyframes): `longTasks.medianTotalLongTaskTimeMs` scaled `593 ms -> 1,177 ms` (**`1.985×`** — identical to untouched `/trips`'s `1.980×`). Because `adora-highlands-hero.webp` (`w=828`) finishes transferring at `~1,150 ms` on the simulated `1.6 Mbps` link, the host-stretched initial hydration task (`450 ms -> 836 ms`) accounted for the `+496 ms` raw mobile `/` LCP shift while remaining well below the `2,500 ms` mobile budget.

---

## 10. Evidence Manifest & Explicit Limitations

### Evidence Directory (`docs/reports/assets/web-design-0-4/package-b/`)
- Desktop (`1440×900`): `desktop-01-hero-initial.png`, `desktop-02-hero-mid.png`, `desktop-03-hero-settled.png`, `desktop-04-brand-philosophy-settled.png`, `desktop-05a-destination-mid-reveal.png`, `desktop-05b-destination-settled.png`, `desktop-06-experience-settled.png`, `desktop-07-ai-planner-section-settled.png`, `desktop-08-how-it-works-settled.png`, `desktop-09-footer-cta-settled.png`, `desktop-10-full-page-settled.png`
- Mobile (`390×844`): `mobile-01-hero-initial.png`, `mobile-02-hero-mid.png`, `mobile-03-hero-settled.png`, `mobile-04-brand-philosophy-settled.png`, `mobile-05a-destination-mid-reveal.png`, `mobile-05b-destination-settled.png`, `mobile-06-experience-settled.png`, `mobile-07-ai-planner-section-settled.png`, `mobile-08-how-it-works-settled.png`, `mobile-09-footer-cta-settled.png`, `mobile-10-full-page-settled.png`
- Frame Timeline Telemetry: `hero-motion-frame-sequence.json`

### Limitations & Deferred Scope
- **`[OBSERVED]`:** Headless Chromium (`Chrome/156.0.8078.80`, Windows 11) verification, 6-viewport geometry, SSR/No-JS/reduced-motion/print/focus overrides, offline + mock `<Suspense>` streaming, and 5-run CDP performance metrics were executed directly against the production build.
- **`[INFERRED]`:** Safari/WebKit and Firefox/Gecko parity follows standard CSS Animations, Transitions, and `IntersectionObserver` specifications.
- **`[UNVERIFIED]`:** Physical iOS/Android GPU compositor telemetry, field CrUX metrics, and live PostgreSQL/FastAPI runtime (deferred per Frontend-First phase discipline). Application surface motion (`/ai-planner` `INV-17`/`INV-18` and `/trips*` `INV-19`/`INV-20`) is intentionally deferred to **Package D**, and Discovery route rollout (`INV-12`–`INV-16`) to **Package C**.
