# ADORA Web Design 0.3 — Complete Frontend Architecture & Essential Pages Report

**Date:** 2026-11-07
**Overall Status:** **COMPLETE** *(Frontend-First; Backend/Database regression explicitly **DEFERRED — NEONDB CONFIGURATION PENDING**)*
**Repository:** `F:\Coding\Adora System Mega Project\adora-system`

---

## 1. Executive Summary

Web Design 0.3 extends ADORA from the Web Design 0.2 editorial homepage into a connected, multi-page travel discovery, scripted AI planning, and trip itinerary frontend application ready for graduation-project demonstration.

Following an interrupted session recovery audit, the existing 41-file work-in-progress change set was preserved, audited, repaired where defects were identified, verified across all six target viewports (`360px`, `390px`, `768px`, `1024px`, `1440px`, `1920px`), and documented with 16 representative desktop and mobile screenshots.

All customer-facing routes (`/`, `/destinations`, `/destinations/[slug]`, `/experiences`, `/experiences/[slug]`, `/ai-planner`, `/trips`, `/trips/[slug]`) build and render without requiring Docker, PostgreSQL, NeonDB, Redis, or FastAPI. Every acceptance gate (`A` through `K`) passes for the frontend scope. In accordance with the instruction, Web Design 0.3 changes remain uncommitted in the working tree for project-owner review.

---

## 2. Initial Git State & Interrupted Session Recovery Audit

### 2.1 Initial Git Branch, HEAD, and Working Tree

- **Branch:** `main`
- **Verified HEAD:** `fe940951cb61e726fcc1bbb0afc285c544807ae9` (`test(web): finalize editorial homepage verification evidence`)
- **Recent History:**
  - `fe94095` — `test(web): finalize editorial homepage verification evidence`
  - `4fe1403` — `docs(web): record Web Design 0.2 closure`
  - `5d4f5a7` — `feat(web): implement adora editorial homepage design`
  - `91bb11c` — `feat: implement adora phase 1.2 catalog partner and geospatial`
- **Git Trust Policy:** Used command-local `-c safe.directory=F:/Coding/Adora System Mega Project/adora-system`; global Git configuration and Windows file ownership were not modified.

### 2.2 Previous-Agent Handoff Findings

At the time of model-quota interruption, the working tree contained 41 modified, deleted, or untracked files under `apps/web/`:

- **Preserved Complete Implementations:**
  - Typed local demo data layer (`apps/web/src/lib/demo/*`) and view-model boundary (`catalog-view-models.ts`) plus 22 unit tests (`demo-data.test.ts`).
  - Three newly generated and Sharp-optimized WebP photographs under `apps/web/public/images/discover/`.
  - Shared navigation (`SiteHeader`, `SiteFooter`) and UI primitives (`Breadcrumbs`, `DemoBadge`, `PageIntro`, `not-found.tsx`, `error.tsx`, `loading.tsx`).
  - Discovery routes (`/destinations`, `/destinations/[slug]`, `/experiences`, `/experiences/[slug]`), interactive AI Planner (`/ai-planner`), and Trip routes (`/trips`, `/trips/[slug]`).
- **Defects Identified and Repaired During Recovery & Visual Verification:**
  1. **Duplicate `"test"` script in `apps/web/package.json`:** Removed the duplicate `"test"` key left in the diff so only `"node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test \"src/**/*.test.ts\""` remains.
  2. **Mobile/Tablet Trip Preview Panel on `/ai-planner`:** Added an explicit stacked `xl:hidden` Trip Preview section (`[data-testid="trip-preview-mobile"]`) inside `PlannerWorkspace` so viewports below `1280px` receive a dedicated itinerary preview card alongside the desktop `xl:flex` sidebar.
  3. **Featured Destination CSS Grid Overlap on `/destinations` (`desktop-destinations.png`):** Added `lg:col-start-1 lg:row-start-1` to the featured Đà Lạt image container in `apps/web/src/app/destinations/page.tsx`. Without explicit row/column start, CSS Grid auto-placement pushed the image to row 2 beneath the `lg:col-start-8 lg:row-start-1` text card.
  4. **Initial Mobile Scroll Offset on `/ai-planner` (`mobile-ai-planner-initial.png`):** Updated `PlannerWorkspace`'s scroll `useEffect` so `log.scrollTop` remains `0` when `messages.length === 0` and only scrolls to `scrollHeight` after user/assistant messages are appended, preventing the welcome heading from being scrolled out of view on `390×844` mobile screens.
  5. **Non-Commercial Disclaimer Wording:** Standardized negative disclaimers on `/destinations/[slug]`, `/experiences`, and `/experiences/[slug]` to use `tồn kho` instead of `còn chỗ`, matching the homepage disclaimer and preventing false positives in commercial-claim scans.
- **Missing Deliverables Completed in This Session:**
  - Full Next.js 16 production build verification.
  - Automated multi-route, 6-viewport, and interactive browser verification (`scripts/verify_web_0_3.mjs`).
  - 16 desktop and mobile screenshots under `docs/reports/assets/web-design-0-3/`.
  - `docs/design/WEB_DESIGN_0_3_FRONTEND_ARCHITECTURE.md`, `docs/testing/WEB_DESIGN_0_3_TEST_MATRIX.md`, and this report.

---

## 3. Files Created, Modified, and Deleted

### Modified (`apps/web/`)
- `apps/web/package.json` — Added unit test script (`pnpm --filter @adora/web test`).
- `apps/web/tsconfig.json` — Enabled `allowImportingTsExtensions` for Node native TypeScript test execution.
- `apps/web/src/app/globals.css` — Added `.dark-cta` and `.filter-chip` (including `[aria-pressed="true"]`) utilities.
- `apps/web/src/app/layout.tsx` — Added accessible skip-to-content link (`#main-content`).
- `apps/web/src/app/page.tsx` — Added `id="main-content"` and updated `SiteFooter` import to `@/components/layout/site-footer`.
- `apps/web/src/app/ai-planner/page.tsx` — Replaced Phase 1.2 static skeleton with server-prepared `PlannerWorkspace`.
- `apps/web/src/components/home/editorial-hero.tsx` — Updated `SiteHeader` import and pointed secondary CTA to `/destinations`.
- `apps/web/src/components/home/destination-story.tsx` — Linked story CTA to `/destinations/da-lat`.
- `apps/web/src/components/home/experience-story.tsx` — Added CTA link to `/experiences`.

### Deleted (Consolidated into `src/components/layout/`)
- `apps/web/src/components/home/site-header.tsx` → replaced by `apps/web/src/components/layout/site-header.tsx`.
- `apps/web/src/components/home/site-footer.tsx` → replaced by `apps/web/src/components/layout/site-footer.tsx`.

### Added — Application Routes & Boundaries (`apps/web/src/app/`)
- `apps/web/src/app/destinations/page.tsx`
- `apps/web/src/app/destinations/[slug]/page.tsx`
- `apps/web/src/app/experiences/page.tsx`
- `apps/web/src/app/experiences/[slug]/page.tsx`
- `apps/web/src/app/trips/page.tsx`
- `apps/web/src/app/trips/[slug]/page.tsx`
- `apps/web/src/app/not-found.tsx`
- `apps/web/src/app/error.tsx`
- `apps/web/src/app/loading.tsx`

### Added — Shared, Discovery, Planner & Trip Components (`apps/web/src/components/`)
- `apps/web/src/components/layout/site-header.tsx`
- `apps/web/src/components/layout/site-footer.tsx`
- `apps/web/src/components/ui/breadcrumbs.tsx`
- `apps/web/src/components/ui/demo-badge.tsx`
- `apps/web/src/components/ui/page-intro.tsx`
- `apps/web/src/components/discovery/destination-browser.tsx`
- `apps/web/src/components/discovery/experience-browser.tsx`
- `apps/web/src/components/discovery/experience-card.tsx`
- `apps/web/src/components/discovery/experience-grid.tsx`
- `apps/web/src/components/discovery/planner-cta.tsx`
- `apps/web/src/components/planner/planner-workspace.tsx`
- `apps/web/src/components/trips/itinerary-explorer.tsx`
- `apps/web/src/components/trips/trip-card.tsx`

### Added — Demo Data, View Models, Assets, Verification & Documentation
- `apps/web/src/lib/catalog-view-models.ts`
- `apps/web/src/lib/demo/{types,destinations,experiences,trips,planner-scenarios,filters,text,index,demo-data.test}.ts`
- `apps/web/public/images/discover/{dalat-flower-greenhouse,dalat-lake-dusk,dalat-night-food}.webp`
- `scripts/verify_web_0_3.mjs`
- `docs/design/WEB_DESIGN_0_3_FRONTEND_ARCHITECTURE.md`
- `docs/testing/WEB_DESIGN_0_3_TEST_MATRIX.md`
- `docs/reports/WEB_DESIGN_0_3_ESSENTIAL_PAGES_REPORT.md`
- 16 PNG screenshots under `docs/reports/assets/web-design-0-3/`

No file under `services/`, `infrastructure/`, `apps/mobile/`, or `tests/` was modified.

---

## 4. Route Inventory

| Route | Concrete Pre-Rendered Paths | HTTP Status | Description |
|---|---|---|---|
| `/` | `/` | 200 | Editorial homepage with Suspense-streamed Catalog fallback |
| `/destinations` | `/destinations` | 200 | Featured Đà Lạt composition + filterable 4-destination index |
| `/destinations/[slug]` | `/destinations/da-lat` | 200 | Complete Đà Lạt editorial detail page |
| `/experiences` | `/experiences` | 200 | Filterable 6-experience asymmetric gallery |
| `/experiences/[slug]` | `rung-thong-binh-minh`, `ca-phe-nho-giot-cao-nguyen`, `vuon-hoa-nha-kinh`, `hoang-hon-ben-ho`, `bua-toi-pho-dem`, `ngam-doi-trong-suong` | 200 | Editorial experience detail with tips, related items, and non-booking notice |
| `/ai-planner` | `/ai-planner` | 200 | Scripted AI Planner demo workspace with Trip Preview |
| `/trips` | `/trips` | 200 | My Trips demonstration library + future-account empty state |
| `/trips/[slug]` | `da-lat-3-ngay`, `da-lat-cuoi-tuan-2-ngay` | 200 | Day-by-day itinerary with WAI-ARIA tabs and activity accordions |
| Unknown / coming-soon | `/unknown-route`, `/destinations/hoi-an`, `/destinations/unknown-slug`, `/experiences/unknown-slug`, `/trips/unknown-slug` | 404 / `notFound()` (`noindex`) | Branded 404 page (`Trang này không tồn tại.`) |

---

## 5. Design System Continuity

All new routes strictly preserve the approved ADORA Design Blueprint v1.0 tokens:

- **Typography:** Self-hosted `Playfair Display` (`.font-editorial`) for display titles and `Be Vietnam Pro` for UI controls and long-form Vietnamese reading.
- **Palette:** Ink `#171a19`, Ivory `#f3efe7`, Paper `#faf8f3`, Gold `#b39a70`, Sage `#586c65`, Mist `#c8d7db`, Secondary Text `#46524d`, and Hairline `#cec8bc`.
- **Two Experience Families:**
  - **Discovery UI (`/destinations*`, `/experiences*`):** Generous whitespace, asymmetric 12-column grids, deliberate aspect-ratio contrast (`wide`, `tall`, `square`), and oversized serif headings.
  - **Application UI (`/ai-planner`, `/trips*`):** Functional density, clear metadata rows, WAI-ARIA tabs/accordions, and distraction-free reading without forced full-screen heroes.

---

## 6. Destination Pages Implementation

- **`/destinations`:** Opens with `PageIntro` and an `editorial` provenance badge, followed by a 12-column asymmetric feature for Đà Lạt (`lg:col-span-8` image overlapped by an `lg:col-span-5 lg:col-start-8` paper card) with links to `/destinations/da-lat` and `/trips/da-lat-3-ngay`. Below, `DestinationBrowser` renders a numbered editorial index of 4 entries (`Đà Lạt` as available; `Hội An`, `Sa Pa`, and `Phú Quốc` explicitly labeled `Sắp ra mắt · cảm hứng biên tập` with no links or fabricated detail content).
- **`/destinations/da-lat`:** Renders a full-bleed hero with overlay header and breadcrumbs, an editorial lead-in with suitability tags, a 4-point numbered highlights grid, the 6 Đà Lạt experiences in an asymmetric gallery, a 3-day itinerary preview linking to `/trips/da-lat-3-ngay`, and a closing `PlannerCta` band.

---

## 7. Experience Pages Implementation

- **`/experiences`:** Pairs `PageIntro` with `ExperienceBrowser`, providing live search and 6 category chips (`Tất cả (6)`, `Thiên nhiên (1)`, `Ẩm thực & cà phê (2)`, `Văn hoá (1)`, `Thư giãn (1)`, `Hoạt động nhẹ (1)`). Results render in `ExperienceGrid` (alternating 7/5 and 5/7 12-column rows).
- **`/experiences/[slug]`:** Displays breadcrumbs, category/destination eyebrow, oversized serif title, wide editorial photograph, two-paragraph narrative, structured metadata `<dl>` (qualitative best moment, pace, suitability, and link to `/destinations/da-lat`), practical tips, links to featuring demo trips (`/trips/da-lat-3-ngay`, `/trips/da-lat-cuoi-tuan-2-ngay`), an explicit `Đặt chỗ · chưa khả dụng` note, and 3 related experiences.

---

## 8. AI Planner Demo Interface (`/ai-planner`)

`PlannerWorkspace` upgrades the Phase 1.2 static preview into a functional, deterministic demonstration:

- **Sidebar:** ADORA home link, `Cuộc trò chuyện demo mới` reset button, clickable scripted prompts, discovery navigation (`/`, `/destinations`, `/experiences`, `/trips`), and a labeled placeholder account indicator (`Chưa kết nối · khu vực giữ chỗ`).
- **Scripted Scenario (`Lên kế hoạch chuyến đi 3 ngày tới Đà Lạt.` / `Plan a 3-day trip to Da Lat.`):** Clicking the suggestion card or submitting a normalized exact match renders the user bubble and a labeled scripted response (`Phản hồi dựng sẵn · không phải AI`) with step list, 3-day breakdown, and a CTA button to `/trips/da-lat-3-ngay`.
- **Trip Preview Panel:** Populates on desktop (`xl:flex`, `[data-testid="trip-preview"]`) and stacks below the conversation on mobile/tablet (`xl:hidden`, `[data-testid="trip-preview-mobile"]`), showing cover image, destination, duration, day summaries, and a link to `/trips/da-lat-3-ngay`.
- **Unsupported Prompts:** Submitting any arbitrary text renders `[data-testid="unsupported-reply"]`, explaining that ADORA is in demo mode with no AI model connected and offering one-click buttons for the supported scenarios. Zero network calls to Gemini or external AI services occur.

---

## 9. Trip Management & Itinerary UI (`/trips` & `/trips/[slug]`)

- **`/trips`:** Displays a prominent notice (`Bạn chưa đăng nhập và chưa lưu chuyến đi nào`), two `TripCard` items (`Đà Lạt — 3 ngày chậm` and `Đà Lạt — cuối tuần 2 ngày`), and a dashed empty-state card (`[data-testid="trips-empty-state"]`) for future authenticated accounts.
- **`/trips/da-lat-3-ngay` (`ItineraryExplorer`):**
  - Header summary with status pill (`Bản mẫu minh hoạ`), `DemoBadge` (`Dữ liệu demo cục bộ`), cover image, and 4-column metadata bar (`Đà Lạt`, `3 ngày`, `Chậm, nhiều thiên nhiên`, `10` activities).
  - WAI-ARIA `tablist` for Days 1–3 supporting click and `ArrowLeft`/`ArrowRight`/`Home`/`End` keyboard switching.
  - Vertical timeline of activities ordered by period (`Sáng`, `Trưa`, `Chiều`, `Tối`) with expandable accordion details, representative area notes (`khu vực đại diện, không phải địa chỉ`), and links to `/experiences/[slug]`.
  - Sticky summary sidebar showing illustrative integer VND budgets (`1.200.000 ₫`, `1.500.000 ₫`, `900.000 ₫`; total `3.600.000 ₫`) and explicit non-AI / non-quote disclaimers.

---

## 10. Demo Data Architecture

Centralized under `apps/web/src/lib/demo/` and protected by 22 unit tests in `demo-data.test.ts`. All slugs, cross-references (`destination.experienceSlugs`, `destination.tripSlug`, `activity.experienceSlug`, `scenario.tripSlug`), asset paths, chronological period orderings, and integer VND budgets are validated automatically. `apps/web/src/lib/catalog-view-models.ts` provides a clean normalization boundary for future live Catalog integration.

---

## 11. Interactive Behavior Verified

All interactive controls were exercised in headless Chrome (`scripts/verify_web_0_3.mjs`):

1. **Destination Filters:** Region (`Ven biển` → `2 / 4`), availability (`Đã có nội dung` → `1 / 4`), no-match search (`"khong-ton-tai"` → empty state), and `Xoá bộ lọc` (`4 / 4`).
2. **Experience Filters:** Category chip (`Ẩm thực & cà phê (2)` → `2 / 6`), no-match search (`"khong-co-ket-qua"` → empty state), and `Xoá bộ lọc` (`6 / 6`).
3. **AI Planner Scripted Flow, Unsupported Input & Reset:** Verified initial empty preview, 3-day Đà Lạt prompt activation, desktop and mobile Trip Preview population, honest unsupported-prompt fallback, and conversation reset.
4. **Itinerary Day Tabs & Accordions:** Verified Day 1 → Day 2 click (`1.500.000 ₫`), activity accordion toggle (`aria-expanded` `"false"` → `"true"`), and keyboard `ArrowRight` → Day 3 (`900.000 ₫`).

---

## 12. Responsive Verification (6 Widths × 8 Routes)

Verified at `360×800`, `390×844`, `768×1024`, `1024×900`, `1440×900`, and `1920×1080` across `/`, `/destinations`, `/destinations/da-lat`, `/experiences`, `/experiences/ca-phe-nho-giot-cao-nguyen`, `/ai-planner`, `/trips`, and `/trips/da-lat-3-ngay` (48 route-viewport checks total):

- `document.documentElement.scrollWidth === window.innerWidth` on all 48 checks (zero horizontal overflow).
- `h1Count === 1` and `mainCount === 1` on all 48 checks.
- All images completed loading with `naturalWidth > 0`.
- Zero console errors, uncaught exceptions, or network failures.

---

## 13. Accessibility Findings

- **Landmarks & Skip Link:** First `Tab` press focuses `#main-content` (`Bỏ qua tới nội dung chính`); every route renders one `<main id="main-content">` and one `<h1>`.
- **Keyboard & Focus Visibility:** Mobile menu toggle receives a `2px solid` gold focus outline (`--adora-gold`), opens with `Space` (`aria-expanded="true"`), and exposes all 5 navigation links. Itinerary day tabs implement roving `tabIndex` and arrow-key navigation.
- **Reduced Motion:** Under emulated `prefers-reduced-motion: reduce`, `scrollBehavior` is `"auto"` and transition durations collapse to `1e-05s`.

---

## 14. Screenshot Evidence

All 16 screenshots (8 views × Desktop `1440×900` and Mobile `390×844`) are stored under `docs/reports/assets/web-design-0-3/` and were visually inspected:

| View | Desktop (`1440×900`) | Mobile (`390×844`) |
|---|---|---|
| 1. Destination listing (`/destinations`) | [desktop-destinations.png](assets/web-design-0-3/desktop-destinations.png) | [mobile-destinations.png](assets/web-design-0-3/mobile-destinations.png) |
| 2. Destination detail (`/destinations/da-lat`) | [desktop-destination-detail.png](assets/web-design-0-3/desktop-destination-detail.png) | [mobile-destination-detail.png](assets/web-design-0-3/mobile-destination-detail.png) |
| 3. Experience listing (`/experiences`) | [desktop-experiences.png](assets/web-design-0-3/desktop-experiences.png) | [mobile-experiences.png](assets/web-design-0-3/mobile-experiences.png) |
| 4. Experience detail (`/experiences/ca-phe-nho-giot-cao-nguyen`) | [desktop-experience-detail.png](assets/web-design-0-3/desktop-experience-detail.png) | [mobile-experience-detail.png](assets/web-design-0-3/mobile-experience-detail.png) |
| 5. AI Planner initial (`/ai-planner`) | [desktop-ai-planner-initial.png](assets/web-design-0-3/desktop-ai-planner-initial.png) | [mobile-ai-planner-initial.png](assets/web-design-0-3/mobile-ai-planner-initial.png) |
| 6. AI Planner scripted demo (`/ai-planner`) | [desktop-ai-planner-scripted.png](assets/web-design-0-3/desktop-ai-planner-scripted.png) | [mobile-ai-planner-scripted.png](assets/web-design-0-3/mobile-ai-planner-scripted.png) |
| 7. My Trips (`/trips`) | [desktop-trips.png](assets/web-design-0-3/desktop-trips.png) | [mobile-trips.png](assets/web-design-0-3/mobile-trips.png) |
| 8. Trip itinerary detail (`/trips/da-lat-3-ngay`) | [desktop-trip-detail.png](assets/web-design-0-3/desktop-trip-detail.png) | [mobile-trip-detail.png](assets/web-design-0-3/mobile-trip-detail.png) |

---

## 15. Automated Test & Verification Results

| Command | Outcome |
|---|---|
| `corepack pnpm@12.16.1 install --frozen-lockfile --offline` | **PASS** (exit 0; lockfile up to date) |
| `corepack pnpm@12.16.1 --filter @adora/api-client typecheck` | **PASS** (exit 0) |
| `corepack pnpm@12.16.1 --filter @adora/api-client build` | **PASS** (exit 0) |
| `corepack pnpm@12.16.1 --filter @adora/web test` | **PASS** (22/22 unit tests across 5 suites) |
| `corepack pnpm@12.16.1 --filter @adora/web typecheck` | **PASS** (exit 0) |
| `corepack pnpm@12.16.1 --filter @adora/web lint` | **PASS** (exit 0) |
| `corepack pnpm@12.16.1 --filter @adora/web build` | **PASS** (exit 0; 20/20 static pages generated) |
| `node scripts/verify_web_0_3.mjs` | **PASS** (exit 0; 14 HTTP 200 routes, 5 not-found routes, 48 viewport checks, interactive & a11y suite) |

---

## 16. Next.js Production Build Results

`next build` (Next.js 16.4.3 with Turbopack, `cacheComponents: true`, `partialPrefetching: true`) compiled in ~3.5s and generated all 20 static pages in ~1.1s:

- `/` — Partial Prerender (`◐`, 5m revalidate, 1y expire)
- `/_not-found`, `/ai-planner`, `/destinations`, `/experiences`, `/trips` — Static (`○`)
- `/destinations/da-lat` — Static (`○`) via `generateStaticParams`
- `/experiences/[slug]` (6 Đà Lạt experiences) — Static (`○`) via `generateStaticParams`
- `/trips/da-lat-3-ngay`, `/trips/da-lat-cuoi-tuan-2-ngay` — Static (`○`) via `generateStaticParams`

---

## 17. Backend-Independent Rendering Verification

All builds and browser checks ran with port `8000` (FastAPI) unoccupied and with no Docker, PostgreSQL, NeonDB, or Redis process running. `/` degraded cleanly to its labeled editorial fallback, and all new Discovery, AI Planner, and Trip routes rendered from local typed fixtures with zero failed network requests and zero requests to Gemini or external AI hosts.

---

## 18. Performance Observations

- Server Components remain the default; only `SiteHeader`, `DestinationBrowser`, `ExperienceBrowser`, `PlannerWorkspace`, `ItineraryExplorer`, and `ErrorPage` hydrate as Client Components.
- The three new WebP assets under `apps/web/public/images/discover/` total `369,338 B` (`187,806 B` + `60,724 B` + `120,808 B`), delivered through `next/image` with responsive `sizes` and `preload` limited to primary above-the-fold candidates.
- No new npm dependency was added.

---

## 19. Known Limitations

1. **Pre-Production Generated Imagery:** Both the 3 homepage images and the 3 new discovery images (`dalat-flower-greenhouse.webp`, `dalat-lake-dusk.webp`, `dalat-night-food.webp`) are AI-generated editorial assets for graduation-project demonstration and require brand/legal review before any commercial use. (A fourth requested waterfall image hit a model quota limit during the previous session; the sixth experience `ngam-doi-trong-suong` uses a distinct highland crop of `adora-highlands-hero.webp`.)
2. **Single Full Destination Dataset:** Only Đà Lạt has full detail content; Hội An, Sa Pa, and Phú Quốc are intentionally coming-soon inspiration entries so no unverified catalog depth is fabricated.
3. **Scripted AI Planner:** `/ai-planner` supports only predefined demonstration scenarios and does not persist conversations or invoke a language model.
4. **Lighthouse CLI:** Not installed in this environment; no Lighthouse score is claimed.

---

## 20. Deferred Features

- **Database & Backend Regression (`DEFERRED — NEONDB CONFIGURATION PENDING`):** PostgreSQL/PostGIS, Redis, Alembic, and the 41 backend `pytest` tests were not executed.
- **Web Design 0.4:** Advanced scroll choreography, reveal timelines, and cinematic page transitions.
- **Web Design 0.5:** End-to-end graduation-demo orchestration.
- **Future Backend Phases:** Live Gemini integration, dated inventory, booking reservations, payment processing, and vouchers.

---

## 21. Final Git Status

- **Branch:** `main`
- **HEAD:** `fe940951cb61e726fcc1bbb0afc285c544807ae9`
- **Working Tree:** All Web Design 0.3 source, asset, test, verifier, screenshot, and documentation changes are left uncommitted and reviewable in the working tree as instructed. No commit or remote push was performed.

---

## 22. Acceptance Gates & Readiness for Web Design 0.4

| Gate | Status | Evidence |
|---|---|---|
| **Gate A — Repository Integrity** | **PASS** | HEAD `fe94095` preserved; zero changes to backend, migrations, mobile, or lockfile |
| **Gate B — Route Coverage** | **PASS** | `/`, `/destinations`, `/destinations/[slug]`, `/experiences`, `/experiences/[slug]`, `/ai-planner`, `/trips`, `/trips/[slug]`, and 404 boundaries verified |
| **Gate C — Navigation** | **PASS** | Full graduation-demo loop connected via `SiteHeader`, `SiteFooter`, breadcrumbs, and contextual CTAs |
| **Gate D — Visual Cohesion** | **PASS** | 16 desktop/mobile screenshots inspected; Playfair Display, Be Vietnam Pro, and v1.0 color tokens preserved |
| **Gate E — Discovery Experience** | **PASS** | Destination and Experience pages render with working search, region, availability, and category filters |
| **Gate F — AI Planner Demo** | **PASS** | Scripted 3-day Đà Lạt scenario, desktop/mobile Trip Preview, unsupported-prompt notice, and reset verified |
| **Gate G — Trip Experience** | **PASS** | `/trips` overview and `/trips/da-lat-3-ngay` WAI-ARIA day tabs, activity accordions, and integer VND budgets verified |
| **Gate H — Responsive & Accessibility** | **PASS** | 48 viewport checks across 6 widths (`scrollWidth === innerWidth`), keyboard focus, ARIA states, and reduced motion verified |
| **Gate I — Frontend Quality** | **PASS** | Frozen install, API-client build, 22 unit tests, ESLint, TypeScript, and Next.js production build pass |
| **Gate J — Backend Independence** | **PASS** | Verified with FastAPI, PostgreSQL/NeonDB, Docker, and Redis offline |
| **Gate K — Documentation & Evidence** | **PASS** | Architecture doc, test matrix, 16 screenshots, verifier script, and this report completed |
| *Backend / Database Regression* | **DEFERRED** | `DEFERRED — NEONDB CONFIGURATION PENDING` (not represented as passed) |

**Readiness for Web Design 0.4:** Web Design 0.3 is **COMPLETE** and ready for owner review and Git closure, after which Web Design 0.4 may begin.

---

## 23. Post-Review Targeted AI Planner Visual Polish & Final Verification

Following project-owner review of the initial 16 screenshots, a targeted visual and interaction audit was executed on `/ai-planner` (`apps/web/src/components/planner/planner-workspace.tsx`) without altering any Discovery or Trip routes.

### 23.1 Visual Audit Findings: Confirmed vs. Non-Reproducible Issues

1. **Issue A — Initial Desktop Composition (`1440×900`):**
   - **Finding (Confirmed Layout/Rhythm Issue, Not Z-Index Overlap):** The bottom composer is a flex sibling below `div[role="log"]` (`logRect.bottom <= composerRect.top`), so it does not overlap `role="log"` in z-space. However, in the initial empty state (`messages.length === 0`), the combination of outer `py-8`, inner `sm:py-10`, a standalone `48px` Bot icon block, `mt-7` eyebrow, two-line `clamp(2.2rem,4.4vw,3.6rem)` heading, `mt-8` prompt grid (`min-h-24`), and `gap-6` pushed the opening `ADORA Planner` message (`Tin nhắn mở đầu · dựng sẵn`) down to `y ≈ 583px` inside a `688px` scroll viewport — slicing across the first line of paragraph text at the bottom edge of `role="log"`.
2. **Issue B — Mobile Conversation Composition (`390×844`):**
   - **Finding (Confirmed Vertical Spacing & Card Density Issue):** At `390×844`, `log.scrollTop` was `0` (no accidental initial scroll) and the composer did not cover the scroll container, but the tall stacked welcome rhythm (`py-8` + `py-4`, stacked `flex-col min-h-24 p-5` prompt buttons) pushed the second suggested prompt to the very bottom edge of the scroll viewport and hid the opening `ADORA Planner` message entirely below the fold.
3. **Issue C — Scripted Demo Discoverability (`390×844` & `1440×900`):**
   - **Finding (Confirmed Scroll-Target & Duplicate-List Issue):**
     - On message submission, `useEffect` previously set `log.scrollTop = log.scrollHeight`. On mobile (`390×844`), because `[data-testid="trip-preview-mobile"]` sits at the bottom of `role="log"`, scrolling to `scrollHeight` jumped past both the selected user prompt bubble and the scripted assistant reply (`[data-testid="scripted-reply"]`), displaying only the Trip Preview card. On desktop (`1440×900`), `scrollHeight` also scrolled the user's selected prompt bubble above the top fold.
     - Additionally, `[data-testid="scripted-reply"]` rendered the full 3-day itinerary table on `< xl` viewports immediately above `[data-testid="trip-preview-mobile"]` (which renders the same 3-day list), making a single turn ~`1,250px` tall on mobile.

### 23.2 Exact Source Changes

- **`apps/web/src/components/planner/planner-workspace.tsx`:**
  1. **Turn-Aware Scroll Positioning (`latestTurnRef`):** Replaced `log.scrollTop = log.scrollHeight` on message submission with geometry-based scrolling to `latestTurnRef.current` (`article[aria-label="Bạn"]`), anchoring the newly submitted user prompt at the top of `role="log"` while keeping `log.scrollTop = 0` when `messages.length === 0`.
  2. **Intentional Initial Welcome Rhythm (Desktop & Mobile):**
     - Paired the `Bot` emblem (`size-9`) inline with the `Bản demo có kịch bản` eyebrow (`flex items-center gap-3`).
     - Adjusted the welcome heading scale (`text-[clamp(1.8rem,3.6vw,2.85rem)] leading-[1.04]`) and tightened container padding (`py-3.5 sm:py-6`, `gap-3 sm:gap-5`).
     - Made suggested prompt cards horizontal on mobile (`flex items-start gap-3 p-3.5 sm:min-h-20 sm:flex-col sm:p-4`) and compacted the composer (`rows={1}`, `min-h-11`, `pb-[max(0.875rem,env(safe-area-inset-bottom))]`).
     - **Result:** At both `1440×900` and `390×844`, the welcome heading, both suggested prompts, and the entire opening `ADORA Planner` message card fit completely within the initial visible viewport (`scrollTop === 0`).
  3. **Scripted Demo Discoverability & Mobile Jumpbar (`[data-testid="mobile-planner-jumpbar"]`):**
     - Added a `Kịch bản dựng sẵn` badge to user bubbles that match a predefined scenario.
     - Added a lightweight, accessible `<nav data-testid="mobile-planner-jumpbar" className="... xl:hidden">` bar beneath the header when a Trip Preview is active, with buttons to scroll directly to `Phản hồi kịch bản` or `Xem trước (3 ngày)` and a direct `Lịch trình ↗` link.
     - Scoped the inline 3-day table inside `[data-testid="scripted-reply"]` to `xl:block` so mobile/tablet viewports do not duplicate the 3-day list directly above `[data-testid="trip-preview-mobile"]`.
     - **Result:** After selecting the 3-day Đà Lạt scenario on both `1440×900` and `390×844`, the user immediately sees (1) the selected predefined prompt bubble, (2) the scripted `ADORA Planner` response and `Mở lịch trình · Đà Lạt — 3 ngày chậm` CTA, and (3) the illustrative Trip Preview (`[data-testid="trip-preview"]` on desktop and `[data-testid="trip-preview-mobile"]` + jumpbar on mobile).
- **`scripts/verify_web_0_3.mjs`:**
  - Added automated bounding-box assertions verifying `initialScrollTop === 0`, `initialBothSuggestionsFullyVisible === true`, `initialOpeningMessageFullyVisible === true` (desktop), `composerDoesNotOverlapLog === true` (mobile), `userBubbleVisibleInLog === true`, `scriptedReplyVisibleInLog === true`, `mobileJumpbarVisible === true`, and `mobilePreviewVisibleInLog === true`.

### 23.3 Post-Review Verification Results & Updated Screenshots

| Check | Command | Outcome |
|---|---|---|
| Web Unit Tests | `corepack pnpm@12.16.1 --filter @adora/web test` | **PASS** (22/22 tests) |
| Web ESLint | `corepack pnpm@12.16.1 --filter @adora/web lint` | **PASS** (exit 0) |
| Web TypeScript | `corepack pnpm@12.16.1 --filter @adora/web typecheck` | **PASS** (exit 0) |
| Web Production Build | `corepack pnpm@12.16.1 --filter @adora/web build` | **PASS** (exit 0; 20/20 static pages) |
| Browser & Geometry Suite (6 widths) | `node scripts/verify_web_0_3.mjs` | **PASS** (exit 0; all 48 route-viewport checks + AI Planner bounding-box checks pass) |

Updated screenshot evidence under `docs/reports/assets/web-design-0-3/`:
- [desktop-ai-planner-initial.png](assets/web-design-0-3/desktop-ai-planner-initial.png) (`1440×900` initial state — welcome block, both prompt cards, and opening message 100% visible)
- [mobile-ai-planner-initial.png](assets/web-design-0-3/mobile-ai-planner-initial.png) (`390×844` initial state — welcome block, both prompt cards, and opening message 100% visible at `scrollTop = 0`)
- [desktop-ai-planner-scripted.png](assets/web-design-0-3/desktop-ai-planner-scripted.png) (`1440×900` scripted state — user prompt bubble, scripted reply with CTA, and right-hand Trip Preview visible simultaneously)
- [mobile-ai-planner-scripted.png](assets/web-design-0-3/mobile-ai-planner-scripted.png) (`390×844` scripted state — mobile jumpbar, user prompt bubble, scripted reply with CTA, and Trip Preview header visible simultaneously)

### 23.4 Remaining Limitations

- `/ai-planner` remains an honest, deterministic client-side demonstration with zero language-model calls, network persistence, or live pricing/inventory calculation.
- Advanced scroll choreography and motion transitions remain scoped to Web Design 0.4.

### 23.5 Phase 0.3 Final Closure & Handoff Status

- **Frontend Closure Status:** `WEB DESIGN 0.3 — FRONTEND COMPLETE / GIT CLOSURE VERIFIED`
- **Backend / Database Regression Status:** `DEFERRED — NEONDB CONFIGURATION PENDING`
- **Previous Verified HEAD:** `fe940951cb61e726fcc1bbb0afc285c544807ae9` (`test(web): finalize editorial homepage verification evidence`)
- **Closure Commit Subject:** `feat(web): implement adora discovery planner and trip experiences`
- **Next Phase Readiness:** All customer-facing routes, typed demonstration fixtures, interactive filters, scripted AI Planner workspace, itinerary explorer, unit tests, 6-viewport browser verification checks, and 16 desktop/mobile screenshots are verified and committed on `main`, ready for Web Design 0.4.
