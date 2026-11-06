# ADORA Web Design 0.3 — Frontend Test Matrix

**Phase:** Web Design 0.3 — Complete Frontend Architecture & Essential Pages
**Date:** 2026-11-07
**Execution Mode:** Frontend-First (FastAPI, PostgreSQL/NeonDB, and Redis intentionally offline)

---

## 1. Toolchain & Static Verification Matrix

| ID | Verification Target | Command | Expected Outcome | Actual Outcome | Status |
|---|---|---|---|---|---|
| TC-01 | Frozen pnpm lockfile & supply-chain policy | `corepack pnpm@12.16.1 install --frozen-lockfile --offline` | Lockfile current; zero dependency upgrades | Exit 0 (`Done in 115ms using pnpm v12.16.1`) | PASS |
| TC-02 | Generated OpenAPI client TypeScript check | `corepack pnpm@12.16.1 --filter @adora/api-client typecheck` | Zero TypeScript errors | Exit 0 (`tsc -p tsconfig.json --noEmit`) | PASS |
| TC-03 | Generated OpenAPI client build | `corepack pnpm@12.16.1 --filter @adora/api-client build` | Clean emit | Exit 0 (`tsc -p tsconfig.json`) | PASS |
| TC-04 | Web TypeScript strict check | `corepack pnpm@12.16.1 --filter @adora/web typecheck` | Zero TypeScript errors across all new routes, components, and tests | Exit 0 (`tsc --noEmit`) | PASS |
| TC-05 | Web ESLint check | `corepack pnpm@12.16.1 --filter @adora/web lint` | Zero lint errors or warnings | Exit 0 (`eslint .`) | PASS |
| TC-06 | Next.js 16 production build | `corepack pnpm@12.16.1 --filter @adora/web build` | All 20 static/PPR route variants compile and prerender without backend connectivity | Exit 0 (20/20 static pages generated; `/` Partial Prerendered) | PASS |

---

## 2. Demo Data & View-Model Unit Test Matrix (`apps/web/src/lib/demo/demo-data.test.ts`)

Executed via `corepack pnpm@12.16.1 --filter @adora/web test` (`node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test "src/**/*.test.ts"`): **22 passed, 0 failed** across 5 suites.

| ID | Suite | Test Case | Expected Behavior | Actual Result | Status |
|---|---|---|---|---|---|
| UT-01 | `demo data integrity` | Unique URL-safe slugs | All destination, experience, and trip slugs match `/^[a-z0-9]+(?:-[a-z0-9]+)*$/` and are unique | Verified across 4 destinations, 6 experiences, 2 trips | PASS |
| UT-02 | `demo data integrity` | Destination → experience & trip links | Every `experienceSlugs` and `tripSlug` entry resolves to a valid record belonging to that destination | All 6 Đà Lạt experiences and `da-lat-3-ngay` resolve | PASS |
| UT-03 | `demo data integrity` | Experience & trip → destination links | Every experience and trip references an existing `destinationSlug` | All records resolve to `da-lat` | PASS |
| UT-04 | `demo data integrity` | Coming-soon destinations | `hoi-an`, `sa-pa`, and `phu-quoc` have `image: null`, `tripSlug: null`, empty `experienceSlugs`, and empty `description`; `getAvailableDestinations()` returns only `["da-lat"]` | Verified | PASS |
| UT-05 | `demo data integrity` | Image asset existence | Every `src` referenced by destinations, experiences, and trips exists in `apps/web/public/` with non-trivial Vietnamese `alt` text (`> 10` chars) | All 6 WebP files (`3` in `/images/home/`, `3` in `/images/discover/`) verified on disk | PASS |
| UT-06 | `demo data integrity` | Explicit provenance labels | Destinations and experiences carry `"editorial"`; trips carry `"demo-fixture"` | Verified | PASS |
| UT-07 | `itineraries` | Sequential day numbering | `trip.days.length === trip.durationDays` and days are numbered `1..N` | Verified for 3-day and 2-day trips | PASS |
| UT-08 | `itineraries` | Chronological period ordering | Within every day, activity periods (`morning` → `noon` → `afternoon` → `evening`) never move backwards | Verified across all days | PASS |
| UT-09 | `itineraries` | Unique activity IDs & experience links | Activity IDs are unique per trip and non-null `experienceSlug` values resolve | Verified across 10 activities (3-day) and 6 activities (2-day) | PASS |
| UT-10 | `itineraries` | Illustrative integer VND budgets | Per-day budgets are positive integers; `getTripBudgetTotalVnd` equals the sum of days; `formatVnd(1200000)` formats as `1.200.000 ₫` | Verified (`3.600.000 ₫` for 3-day; `2.100.000 ₫` for 2-day) | PASS |
| UT-11 | `itineraries` | Non-AI and non-quote disclaimers | Every trip's `planNotes` states `không do AI tạo ra` and `không phải báo giá` | Verified | PASS |
| UT-12 | `itineraries` | Reverse lookup `getTripsFeaturingExperience` | Returns both trips for `hoang-hon-ben-ho` | Returns `["da-lat-3-ngay", "da-lat-cuoi-tuan-2-ngay"]` | PASS |
| UT-13 | `planner scenarios` | Scenario → trip resolution | Every `PlannerScenario.tripSlug` resolves to an existing `Trip` and has non-empty steps | Verified for `dalat-3-days` and `dalat-slow-weekend` | PASS |
| UT-14 | `planner scenarios` | Exact normalized prompt matching | Matches Vietnamese prompt, uppercase/accent-varied input, and English alias `"Plan a 3-day trip to Da Lat."` | Verified | PASS |
| UT-15 | `planner scenarios` | Rejection of arbitrary/partial prompts | Returns `undefined` for empty strings, `"Hello"`, `"Lên kế hoạch chuyến đi 5 ngày tới Hội An"`, `"Đà Lạt"`, `"Plan a trip to Paris"` | Verified (all return `undefined`) | PASS |
| UT-16 | `planner scenarios` | Vietnamese text normalization | `normalizeText("Đà Lạt — Sương!") === "da lat suong"` | Verified | PASS |
| UT-17 | `discovery filters` | Default filters return full collection | `filterDestinations` returns 4; `filterExperiences` returns 6 | Verified | PASS |
| UT-18 | `discovery filters` | Destination region, availability, and query filters | `ven-bien` → `["hoi-an", "phu-quoc"]`; `available` → `["da-lat"]`; query `"da lat"` → `["da-lat"]`; `"zzzz"` → `[]` | Verified | PASS |
| UT-19 | `discovery filters` | Experience category chips & search | Category counts sum to 6 with no zero-count category; query `"ca phe"` matches `ca-phe-nho-giot-cao-nguyen` | Verified | PASS |
| UT-20 | `discovery filters` | Related experiences exclusion | `getRelatedExperiences(slug)` never includes `slug` itself and returns `[]` for unknown slug | Verified | PASS |
| UT-21 | `catalog view-model boundary` | Catalog DTO mapping | `fromCatalogDestination` maps API DTO and tags `source: "catalog-api"` with coordinates | Verified | PASS |
| UT-22 | `catalog view-model boundary` | Demo destination mapping | `fromDemoDestination` tags `source: "demo"` and sets `coordinates: null` without inventing coordinates | Verified | PASS |

---

## 3. Route & Not-Found HTTP Verification Matrix (`scripts/verify_web_0_3.mjs`)

Tested against the production Next.js server (`next start -p 3100`) with port `8000` (FastAPI) unoccupied.

| ID | Route | Expected Behavior | Actual Result | Status |
|---|---|---|---|---|
| RT-01 | `/` | HTTP 200; renders editorial fallback (`API tạm ngoại tuyến`) | HTTP 200; fallback visible | PASS |
| RT-02 | `/destinations` | HTTP 200; renders featured Đà Lạt + 4-item index | HTTP 200 | PASS |
| RT-03 | `/destinations/da-lat` | HTTP 200; renders Đà Lạt editorial detail | HTTP 200 | PASS |
| RT-04 | `/experiences` | HTTP 200; renders 6 Đà Lạt experiences | HTTP 200 | PASS |
| RT-05 | `/experiences/rung-thong-binh-minh` | HTTP 200; renders experience detail | HTTP 200 | PASS |
| RT-06 | `/experiences/ca-phe-nho-giot-cao-nguyen` | HTTP 200; renders experience detail | HTTP 200 | PASS |
| RT-07 | `/experiences/vuon-hoa-nha-kinh` | HTTP 200; renders experience detail | HTTP 200 | PASS |
| RT-08 | `/experiences/hoang-hon-ben-ho` | HTTP 200; renders experience detail | HTTP 200 | PASS |
| RT-09 | `/experiences/bua-toi-pho-dem` | HTTP 200; renders experience detail | HTTP 200 | PASS |
| RT-10 | `/experiences/ngam-doi-trong-suong` | HTTP 200; renders experience detail | HTTP 200 | PASS |
| RT-11 | `/ai-planner` | HTTP 200; renders interactive demo workspace | HTTP 200 | PASS |
| RT-12 | `/trips` | HTTP 200; renders demo trip library + empty state | HTTP 200 | PASS |
| RT-13 | `/trips/da-lat-3-ngay` | HTTP 200; renders 3-day Đà Lạt itinerary | HTTP 200 | PASS |
| RT-14 | `/trips/da-lat-cuoi-tuan-2-ngay` | HTTP 200; renders 2-day Đà Lạt weekend draft | HTTP 200 | PASS |
| RT-15 | `/unknown-route` | HTTP 404; `noindex` meta; custom 404 heading (`Trang này không tồn tại.`) | HTTP 404; `noindex: true`; custom heading present | PASS |
| RT-16 | `/destinations/unknown-slug` | Renders `notFound()` boundary (`noindex` meta + custom 404 heading) | `noindex: true`; custom 404 heading present | PASS |
| RT-17 | `/destinations/hoi-an` (coming-soon slug) | Refuses to fabricate detail page; renders `notFound()` boundary | `noindex: true`; custom 404 heading present | PASS |
| RT-18 | `/experiences/unknown-slug` | Renders `notFound()` boundary (`noindex` meta + custom 404 heading) | `noindex: true`; custom 404 heading present | PASS |
| RT-19 | `/trips/unknown-slug` | Renders `notFound()` boundary (`noindex` meta + custom 404 heading) | `noindex: true`; custom 404 heading present | PASS |

---

## 4. Responsive Viewport Matrix (6 Widths × 8 Representative Routes = 48 Checks)

Checked via headless Chrome DevTools Protocol (`scripts/verify_web_0_3.mjs`) at `360×800`, `390×844`, `768×1024`, `1024×900`, `1440×900`, and `1920×1080` across `/`, `/destinations`, `/destinations/da-lat`, `/experiences`, `/experiences/ca-phe-nho-giot-cao-nguyen`, `/ai-planner`, `/trips`, and `/trips/da-lat-3-ngay`.

| Viewport | Routes Checked | `scrollWidth === innerWidth` | `h1Count === 1` & `mainCount === 1` | All Images Loaded (`naturalWidth > 0`) | Forbidden Commercial Claims | Console / Runtime / Network Errors | Status |
|---|---:|---|---|---|---|---|---|
| `360×800` | 8 | 8/8 (`360 === 360`) | 8/8 | All complete | 0 | 0 | PASS |
| `390×844` | 8 | 8/8 (`390 === 390`) | 8/8 | All complete | 0 | 0 | PASS |
| `768×1024` | 8 | 8/8 (`768 === 768`) | 8/8 | All complete | 0 | 0 | PASS |
| `1024×900` | 8 | 8/8 (`1024 === 1024`) | 8/8 | All complete | 0 | 0 | PASS |
| `1440×900` | 8 | 8/8 (`1440 === 1440`) | 8/8 | All complete | 0 | 0 | PASS |
| `1920×1080` | 8 | 8/8 (`1920 === 1920`) | 8/8 | All complete | 0 | 0 | PASS |

---

## 5. Interactive UI, Accessibility & Resilience Verification Matrix

| ID | Area | Scenario Tested in Browser | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| UI-01 | `/destinations` filters | Click `Ven biển` chip → click `Đã có nội dung` chip → search `"khong-ton-tai"` → click `Xoá bộ lọc` | Counts update `4/4` → `2/4` → `1/4` → empty state (`[data-testid="destination-empty"]`) → `4/4` | Exact match (`Hiển thị 4 / 4`, `2 / 4`, `1 / 4`, empty state visible, reset `4 / 4`) | PASS |
| UI-02 | `/experiences` filters | Click `Ẩm thực & cà phê (2)` chip → search `"khong-co-ket-qua"` → click `Xoá bộ lọc` | Counts update `6/6` → `2/6` → empty state (`[data-testid="experience-empty"]`) → `6/6` | Exact match (`Hiển thị 6 / 6`, `2 / 6`, empty state visible, reset `6 / 6`) | PASS |
| UI-03 | `/ai-planner` initial state | Open `/ai-planner` on desktop (`1440×900`) and mobile (`390×844`) | Initial empty preview (`[data-testid="trip-preview-empty"]`) visible; welcome heading at top of viewport | Verified on both desktop and mobile | PASS |
| UI-04 | `/ai-planner` scripted scenario | Select `"Lên kế hoạch chuyến đi 3 ngày tới Đà Lạt."` | Renders `[data-testid="scripted-reply"]`, populates desktop `[data-testid="trip-preview"]` and mobile `[data-testid="trip-preview-mobile"]` with link to `/trips/da-lat-3-ngay` | Verified (`scriptedReplyVisible: true`, `tripPreviewVisible: true`, `mobilePreviewVisible: true`, `tripLinkHref: "/trips/da-lat-3-ngay"`) | PASS |
| UI-05 | `/ai-planner` unsupported prompt | Submit `"Plan a 5-day trip to Tokyo with live flights"` | Renders `[data-testid="unsupported-reply"]` stating `chưa kết nối mô hình AI`; makes zero external AI requests | Verified (`unsupportedHonest: true`, `externalAiRequests: []`) | PASS |
| UI-06 | `/ai-planner` conversation reset | Click `Cuộc trò chuyện demo mới` | Clears messages, removes `[data-testid="scripted-reply"]`, restores `[data-testid="trip-preview-empty"]` | Verified (`resetEmptyPreview: true`, `scriptedAfterReset: false`) | PASS |
| UI-07 | `/trips/da-lat-3-ngay` day switching & accordion | View Day 1 → click `#day-tab-2` → toggle `#activity-d2-lunch` accordion → press `ArrowRight` key on tab | Day 1 (`1.200.000 ₫`) → Day 2 (`aria-selected="true"`, `1.500.000 ₫`, accordion `false` → `true`) → Day 3 (`900.000 ₫`) | Verified across all steps | PASS |
| A11Y-01 | Skip link & keyboard focus | Press `Tab` from top of `/destinations` at `390×844` | First `Tab` focuses `#main-content` skip link; third `Tab` focuses `button[aria-controls="mobile-navigation"]` with `2px solid` outline | Verified (`skipLinkFocused: "#main-content"`, `outlineStyle: "solid"`, `outlineWidth: "2px"`) | PASS |
| A11Y-02 | Mobile menu ARIA disclosure | Press `Space` on focused menu toggle | `aria-expanded` becomes `"true"`, `#mobile-navigation` displays `grid` with 5 navigation links (`/destinations`, `/experiences`, `/trips`, `/#how-it-works`, `/ai-planner`) | Verified | PASS |
| A11Y-03 | Reduced motion | Emulate `prefers-reduced-motion: reduce` | `scrollBehavior: "auto"`, image transition duration collapsed to `1e-05s` | Verified | PASS |

---

## 6. Explicitly Deferred Backend & Database Verification

| Check | Status | Reason |
|---|---|---|
| FastAPI `pytest` suite (41 database/Redis tests) | **DEFERRED — NEONDB CONFIGURATION PENDING** | Docker Desktop / local PostgreSQL / NeonDB intentionally not required during Frontend-First Web Design 0.3 |
| Alembic zero-drift & schema audit against live DB | **DEFERRED — NEONDB CONFIGURATION PENDING** | No migration or backend file was modified in Web Design 0.3 |
| Live Catalog API homepage integration | **DEFERRED — NEONDB CONFIGURATION PENDING** | Offline fallback verified; live API state awaits NeonDB provisioning |
