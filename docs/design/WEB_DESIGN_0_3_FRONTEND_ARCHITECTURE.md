# ADORA Web Design 0.3 — Frontend Architecture & Essential Pages

**Phase:** Web Design 0.3
**Strategy:** Frontend-First
**Creative Direction:** Luxury Editorial × Cinematic Travel × Intelligent Planning
**Framework:** Next.js 16.4.3 (App Router, Cache Components & Partial Prefetching enabled), React 19.3.0, TypeScript 5, Tailwind CSS v4

---

## 1. Purpose and Scope

Web Design 0.3 extends ADORA from a single-route editorial homepage into a connected, multi-page travel discovery, scripted AI planning, and trip itinerary frontend application suitable for graduation-project presentation.

Because PostgreSQL/PostGIS will be provisioned later on NeonDB and backend business workflows are intentionally out of scope for this phase, Web Design 0.3 is engineered to run with zero dependency on Docker, PostgreSQL, Redis, or FastAPI. Every customer-facing page renders deterministically using typed local demonstration fixtures or curated editorial copy, while preserving compatibility with the generated `@adora/api-client` contract on the homepage.

No booking transaction, inventory reservation, payment gateway, voucher workflow, live LLM/Gemini integration, or persistent user account state is introduced.

---

## 2. Route Architecture

All customer-facing routes follow Next.js 16 App Router conventions under `apps/web/src/app/`:

| Route | App Router File | Rendering Mode | Purpose |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Partial Prerender (`◐`, 5m revalidate) | Editorial homepage with Suspense-streamed Catalog fallback |
| `/destinations` | `src/app/destinations/page.tsx` | Static (`○`) | Destination discovery featuring Đà Lạt and labeled coming-soon inspirations |
| `/destinations/[slug]` | `src/app/destinations/[slug]/page.tsx` | Static via `generateStaticParams` (`/destinations/da-lat`) | Editorial destination detail with highlights, experiences, and 3-day itinerary preview |
| `/experiences` | `src/app/experiences/page.tsx` | Static (`○`) | Curated experience discovery with category and search filtering |
| `/experiences/[slug]` | `src/app/experiences/[slug]/page.tsx` | Static via `generateStaticParams` (6 slugs) | Editorial experience detail with qualitative guidance, related items, and non-booking notice |
| `/ai-planner` | `src/app/ai-planner/page.tsx` | Static (`○`) | Interactive scripted AI Travel Planner demonstration with Trip Preview panel |
| `/trips` | `src/app/trips/page.tsx` | Static (`○`) | My Trips demonstration library and future-account empty state |
| `/trips/[slug]` | `src/app/trips/[slug]/page.tsx` | Static via `generateStaticParams` (2 slugs) | Day-by-day trip itinerary with WAI-ARIA tabs, activity accordions, and illustrative integer VND budgets |
| `not-found` | `src/app/not-found.tsx` | Static (`○`) | Branded 404 boundary for unknown or coming-soon slugs |
| `error` | `src/app/error.tsx` | Client Error Boundary | Recoverable segment error boundary (`role="alert"`) |
| `loading` | `src/app/loading.tsx` | Server Loading Boundary | Accessible skeleton fallback (`aria-busy="true"`) |

### Slug Resolution and Not-Found Policy

- Dynamic route segments (`[slug]`) await `params: Promise<{ slug: string }>` in accordance with Next.js 16 conventions.
- Only destinations with `status === "available"` (`da-lat`) are returned by `generateStaticParams()` and allowed to render on `/destinations/[slug]`. Requesting a coming-soon slug (such as `/destinations/hoi-an`) or an unknown slug calls `notFound()`, returning HTTP 404 with the branded not-found view instead of fabricating destination pages.
- All six Đà Lạt experience slugs and both demonstration trip slugs (`da-lat-3-ngay`, `da-lat-cuoi-tuan-2-ngay`) are statically generated at build time; unknown slugs invoke `notFound()`.

---

## 3. Navigation Model

Navigation connects the complete graduation-demo flow without dead links (`href="#"`) or unimplemented routes:

```text
Homepage (/)
 ├──► Destinations (/destinations) ──► Destination Detail (/destinations/da-lat)
 │                                      ├──► Experience Detail (/experiences/[slug])
 │                                      ├──► Trip Itinerary (/trips/da-lat-3-ngay)
 │                                      └──► AI Planner (/ai-planner)
 ├──► Experiences (/experiences) ────► Experience Detail (/experiences/[slug])
 │                                      ├──► Parent Destination (/destinations/da-lat)
 │                                      ├──► Featuring Trips (/trips/[slug])
 │                                      └──► AI Planner (/ai-planner)
 ├──► AI Planner (/ai-planner) ──────► Scripted Prompt ──► Trip Preview ──► Trip Detail (/trips/[slug])
 └──► My Trips (/trips) ─────────────► Trip Detail (/trips/da-lat-3-ngay, /trips/da-lat-cuoi-tuan-2-ngay)
```

### Shared Header and Footer

- **`SiteHeader` (`src/components/layout/site-header.tsx`)**:
  - Supports two visual variants via `tone`: `"overlay"` (translucent over dark cinematic hero imagery on `/` and `/destinations/[slug]`) and `"solid"` (warm paper surface with hairline border on discovery index, experience detail, and trip pages).
  - Highlights the active top-level section (`current?: "destinations" | "experiences" | "trips"`) using `aria-current="page"` and a muted gold underline (`--adora-gold`).
  - Exposes primary links (`/destinations`, `/experiences`, `/trips`, `/#how-it-works`) and the primary action (`Plan with Adora AI` → `/ai-planner`).
  - Provides a 44×44 px mobile menu disclosure button with `aria-expanded`, `aria-controls="mobile-navigation"`, and state-specific Vietnamese labels.
- **`SiteFooter` (`src/components/layout/site-footer.tsx`)**:
  - Renders the full closing editorial CTA on `/` and `/destinations` (`showCta = true`) and a compact navigation footer (`showCta = false`) on detail and utility pages.
  - Exposes direct links to `/`, `/destinations`, `/experiences`, `/ai-planner`, and `/trips`.

---

## 4. Two Experience Families & Design System Continuity

All pages inherit the authoritative design tokens defined in `src/app/globals.css`:

- **Typography:** `Playfair Display` (`--font-display`, `.font-editorial`) for expressive headings and `Be Vietnam Pro` (`--font-body`) for body copy, controls, and application density, both self-hosted via `next/font/google` with `latin` and `vietnamese` subsets.
- **Color Palette:** Ink (`#171a19`), Ivory (`#f3efe7`), Paper (`#faf8f3`), Gold (`#b39a70`), Sage (`#586c65`), Mist (`#c8d7db`), Secondary Text (`#46524d`), and Hairline (`#cec8bc`).
- **Layout Geometry:** Maximum container width `85rem` (`1360px`), fluid horizontal gutter `clamp(1.25rem, 4vw, 4.5rem)`, and responsive vertical section spacing.

### 4.1 Discovery UI (`/`, `/destinations`, `/destinations/[slug]`, `/experiences`, `/experiences/[slug]`)

- Uses oversized editorial typography, asymmetric multi-column compositions, deliberate aspect-ratio variety (`wide`, `tall`, `square`), and generous whitespace.
- Avoids repetitive dashboard card grids:
  - `/destinations` pairs a 12-column featured Đà Lạt story with a numbered editorial index.
  - `/experiences` uses an alternating 7/5 and 5/7 12-column asymmetric gallery (`ExperienceGrid`).

### 4.2 Application UI (`/ai-planner`, `/trips`, `/trips/[slug]`)

- Uses the same typography and color tokens, but prioritizes scannable hierarchy, structured metadata bars, predictable interactive controls, and compact information density without forcing full-bleed cinematic heroes onto functional workspaces.

---

## 5. Component Boundaries (Server vs. Client)

Server Components are the default across all routes. Client boundaries (`"use client"`) are small, isolated leaves dedicated to genuine interactive state:

| Component | Path | Boundary | Responsibility |
|---|---|---|---|
| `SiteHeader` | `src/components/layout/site-header.tsx` | Client | Mobile navigation disclosure toggle |
| `SiteFooter` | `src/components/layout/site-footer.tsx` | Server | Footer navigation and optional closing CTA |
| `Breadcrumbs` | `src/components/ui/breadcrumbs.tsx` | Server | Hierarchical trail with `aria-current="page"` |
| `DemoBadge` | `src/components/ui/demo-badge.tsx` | Server | Explicit provenance pill (`Nội dung biên tập` / `Dữ liệu demo cục bộ`) |
| `PageIntro` | `src/components/ui/page-intro.tsx` | Server | Shared editorial header for discovery index routes |
| `DestinationBrowser` | `src/components/discovery/destination-browser.tsx` | Client | Search input, region chips, availability chips, and empty-state reset |
| `ExperienceCard` | `src/components/discovery/experience-card.tsx` | Server | Asymmetric experience tile with responsive `next/image` |
| `ExperienceGrid` | `src/components/discovery/experience-grid.tsx` | Server | 12-column staggered editorial layout |
| `ExperienceBrowser` | `src/components/discovery/experience-browser.tsx` | Client | Category chips with live counts, search input, and empty-state reset |
| `PlannerCta` | `src/components/discovery/planner-cta.tsx` | Server | Dark editorial band linking discovery pages to `/ai-planner` |
| `PlannerWorkspace` | `src/components/planner/planner-workspace.tsx` | Client | Scripted demo conversation, prompt matching, reset, mobile drawer, and Trip Preview panel |
| `TripCard` | `src/components/trips/trip-card.tsx` | Server | Summary card for `/trips` |
| `ItineraryExplorer` | `src/components/trips/itinerary-explorer.tsx` | Client | WAI-ARIA day `tablist`/`tabpanel` and activity disclosure accordions |
| ` ErrorPage` | `src/app/error.tsx` | Client | Next.js required client error boundary |

No global store (Redux, Zustand, React Context) was added for Web Design 0.3.

---

## 6. Demo Data Model & Provenance

All demonstration data is centralized under `apps/web/src/lib/demo/`:

- `types.ts`: Strict TypeScript definitions (`Destination`, `Experience`, `Trip`, `ItineraryDay`, `ItineraryActivity`, `PlannerScenario`, `DemoProvenance`).
- `destinations.ts`: 1 available destination (`da-lat`) with complete editorial narrative, highlights, and linked slugs, plus 3 coming-soon inspiration records (`hoi-an`, `sa-pa`, `phu-quoc`) that intentionally omit detail content, images, and commercial claims.
- `experiences.ts`: 6 curated Đà Lạt experiences spanning 5 categories (`nature`, `food-coffee`, `culture`, `relaxation`, `activity`), with qualitative timing/pace guidance and tips.
- `trips.ts`: 2 structured Đà Lạt itineraries (`da-lat-3-ngay` and `da-lat-cuoi-tuan-2-ngay`) ordered by day (`1..N`) and period of day (`morning` → `noon` → `afternoon` → `evening`), with illustrative integer VND budgets (`formatVnd`) and explicit non-commercial disclaimers.
- `planner-scenarios.ts`: 2 deterministic scripted scenarios (`dalat-3-days` and `dalat-slow-weekend`), exact-match prompt normalization (`normalizeText`), and the honest unsupported-input fallback message (`UNSUPPORTED_PROMPT_REPLY`).
- `filters.ts` & `text.ts`: Pure, accent-insensitive Vietnamese search and category/region filter functions shared by the UI and unit tests.
- `demo-data.test.ts`: 22 Node test runner unit tests verifying slug uniqueness, relational integrity, image file existence under `apps/web/public/`, chronological day/period ordering, integer VND formatting, filter accuracy, and prompt matching.

### Visual Assets Added in Web Design 0.3

Three original editorial photographs were generated for ADORA and converted with `sharp` to quality-80 WebP under `apps/web/public/images/discover/`:

| File | Dimensions | Size | Used For |
|---|---:|---:|---|
| `dalat-flower-greenhouse.webp` | 1264×848 | 187,806 B | `vuon-hoa-nha-kinh` experience |
| `dalat-lake-dusk.webp` | 1264×848 | 60,724 B | `hoang-hon-ben-ho` experience & 2-day trip cover |
| `dalat-night-food.webp` | 896×1200 | 120,808 B | `bua-toi-pho-dem` experience |

The three existing homepage WebP assets under `apps/web/public/images/home/` are also reused with deliberate focal-point crops where appropriate.

---

## 7. AI Planner Demo Behavior

`/ai-planner` is a deterministic, transparent frontend demonstration:

1. **Initial State:** Displays the sidebar (brand link, `Cuộc trò chuyện demo mới` reset button, scripted conversation suggestions, discovery navigation, and labeled non-functional account placeholder), header with `Chế độ demo` badge, introductory prompt cards, opening assistant message, composer, and an empty Trip Preview panel (`[data-testid="trip-preview-empty"]`).
2. **Scripted Scenario (`Plan a 3-day trip to Da Lat.` / `Lên kế hoạch chuyến đi 3 ngày tới Đà Lạt.`):** Selecting a suggested prompt—or typing an exact normalized match—appends the user message and a labeled scripted reply (`Phản hồi dựng sẵn · không phải AI`) with step breakdown, day-by-day summary, and a direct CTA to `/trips/da-lat-3-ngay`. Simultaneously, the Trip Preview panel populates on desktop (`xl:flex`, `[data-testid="trip-preview"]`) and stacks below the conversation on mobile/tablet (`xl:hidden`, `[data-testid="trip-preview-mobile"]`).
3. **Unsupported Input Handling:** Submitting any arbitrary text that does not match a predefined scenario renders a clearly labeled system notice (`[data-testid="unsupported-reply"]`) explaining that live AI is not connected and offering one-click buttons for the supported demo scenarios. No fake generative answer or network request is ever made.
4. **Reset:** Clicking `Cuộc trò chuyện demo mới` clears the conversation log, resets the active scenario and Trip Preview panel, and returns focus to the composer.
5. **IME-Safe Composer:** `Enter` submits when not holding `Shift` and when ` !event.nativeEvent.isComposing`, preventing premature submission while typing Vietnamese diacritics (Telex/VNI).

---

## 8. Trip Itinerary UI

- **`/trips`:** Presents the two local demo trips (`Đà Lạt — 3 ngày chậm` and `Đà Lạt — cuối tuần 2 ngày`) alongside an explicit notice that the visitor is not signed in and that no trips are saved to an account, plus a dashed empty-state card illustrating where future saved trips will appear.
- **`/trips/[slug]` (`ItineraryExplorer`):**
  - Implements a WAI-ARIA `tablist` (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, roving `tabIndex`, and `ArrowLeft`/`ArrowRight`/`Home`/`End` keyboard navigation) to switch days.
  - Displays each day's activities along a vertical timeline with accessible disclosure buttons (`aria-expanded`, `aria-controls`), representative area labels (`khu vực đại diện, không phải địa chỉ`), and links to the corresponding `/experiences/[slug]` detail page.
  - Shows illustrative per-day and total budgets in integer VND with explicit disclaimers that accommodation, transport, and live quotes are excluded.

---

## 9. Responsive Strategy & Accessibility Conventions

- **Target Viewports Verified:** `360×800`, `390×844`, `768×1024`, `1024×900`, `1440×900`, and `1920×1080`.
- **Overflow Protection:** Root and page containers enforce `overflow-x: clip` and `min-w-0` flex/grid children so `scrollWidth === innerWidth` across all six widths.
- **Landmarks & Headings:** Every route renders a skip-to-content link (`#main-content`), exactly one `main` landmark, and one page-level `h1` followed by sequential `h2`/`h3` headings.
- **Interactive Semantics:** Filter chips use `aria-pressed`; live result counters use `role="status"` and `aria-live="polite"`; conversation history uses `role="log"`; itinerary days use `role="tablist"`/`role="tab"`/`role="tabpanel"`; activity disclosures use `aria-expanded`.
- **Focus & Touch Targets:** Global `:focus-visible` uses a 2 px solid `--adora-gold` outline with 4 px offset; primary buttons, links, filter chips, and mobile toggles meet a minimum 44 px (`min-h-11` / `size-11`) hit target.
- **Reduced Motion:** `@media (prefers-reduced-motion: reduce)` disables smooth scroll and collapses CSS transition and animation durations to `0.01ms`.

---

## 10. Future API Integration Boundaries & Deferred Capabilities

- **Homepage Catalog Boundary (`src/lib/catalog.ts`):** Continues to query `GET /api/v1/destinations` and `GET /api/v1/offers` with a 1.8 s timeout and 5-minute revalidation, falling back cleanly to editorial copy when FastAPI is offline.
- **View-Model Normalization (`src/lib/catalog-view-models.ts`):** Provides `DestinationSummaryViewModel` (`fromCatalogDestination` and `fromDemoDestination`) so future phases can connect `/destinations` to live Catalog API responses without leaking raw backend DTOs into UI components or conflating demo fixtures with live records.
- **Explicitly Deferred to Later Phases:**
  - NeonDB PostgreSQL/PostGIS and Redis connectivity verification (`DEFERRED — NEONDB CONFIGURATION PENDING`).
  - Web Design 0.4 advanced scroll choreography and motion timelines.
  - Web Design 0.5 end-to-end graduation-demo orchestration.
  - Live Gemini AI itinerary generation, chat streaming, and conversation persistence.
  - Dated inventory checks, booking reservations, payment callbacks, and voucher issuance.
