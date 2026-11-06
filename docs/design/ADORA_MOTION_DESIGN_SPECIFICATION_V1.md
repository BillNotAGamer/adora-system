# ADORA — Motion Design Specification v1.0 (Web Design 0.4)

**Status:** PROPOSED SPECIFICATION — READY FOR ARCHITECTURE REVIEW (No Application Code Modified)
**Date:** 2026-11-07
**Phase:** Web Design 0.4 Preparation
**Repository:** `F:\Coding\Adora System Mega Project\adora-system`
**Verified Baseline HEAD:** `c49595573f8b7214f414a589006b748d5d6babfb` (`feat(web): implement adora discovery planner and trip experiences`)
**Target Application:** `apps/web` (Next.js 16.4.3 App Router, React 19.3.0, Tailwind CSS v4, TypeScript 5)
**Creative Direction:** *Luxury Editorial × Cinematic Travel × Intelligent Planning*
**Primary Creative Reference:** https://www.snamitravel.com/ *(atmospheric pacing and editorial restraint reference only; zero copied code, branding, assets, or proprietary timelines)*

---

## A. Motion Design Principles

ADORA's motion system serves the core product thesis: **a quiet, tactile travel journal during discovery, and a composed, responsive software instrument during planning**. Motion is never ornamental noise; every transition must earn its place by reinforcing one of five design responsibilities:

### 1. Atmospheric Pacing Over Mechanical Choreography
Inspired by the unhurried editorial cadence of luxury print and slow highland travel in Đà Lạt, Discovery motion uses long, smooth deceleration curves (`cubic-bezier(0.22, 1, 0.36, 1)`) and small vertical travel distances (`12px–24px`). Elements settle into place like mist clearing over a ridgeline rather than snapping or bouncing. Spring physics, overshoot (`cubic-bezier` values `> 1.0`), and playful elastic bounces are strictly prohibited across all ADORA surfaces.

### 2. Two Distinct Motion Families: Discovery vs. Application
ADORA enforces a hard architectural boundary between its two experience families:

| Dimension | Discovery Experience (`/`, `/destinations*`, `/experiences*`) | Application Experience (`/ai-planner`, `/trips*`) |
| :--- | :--- | :--- |
| **Emotional Register** | Cinematic, contemplative, editorial, atmospheric | Purposeful, immediate, legible, trustworthy |
| **Typical Duration** | `420ms – 900ms` (with `1200ms` image hover scale) | `150ms – 280ms` |
| **Spatial Travel** | `14px – 24px` vertical rise; `1.04 → 1.0` image curtain settle | `6px – 10px` vertical settle; `0deg → 180deg` disclosure rotation |
| **Scroll Reveals** | Selective once-per-visit chapter entrances via `IntersectionObserver` | **None** — workspace controls, tabs, and logs are immediately present |
| **Primary Goal** | Guide the eye through narrative chapters and photography | Confirm user intent, maintain spatial orientation, preserve focus |

### 3. Progressive Enhancement & SSR-Visible Content First
Because ADORA is built on Next.js 16 Server Components (`cacheComponents: true`), **no text or image may ever be rendered invisible (`opacity: 0`) in static SSR HTML without a fail-safe**. Scroll-triggered reveals apply initial off-screen staging only after client hydration confirms that:
1. `(prefers-reduced-motion: no-preference)` matches, and
2. `IntersectionObserver` is available, and
3. The element is currently below the initial viewport fold (`rect.top > window.innerHeight * 0.92`).

Elements already inside the initial viewport on page load (such as `PageIntro` on `/destinations`, `/experiences`, and `/trips`) never flash from visible to hidden after hydration.

### 4. Compositor-Friendly Execution & Zero Layout Shift
All continuous or entrance animations are restricted to GPU-composited properties (`opacity` and `transform: translate3d / scale`) or bounded CSS Grid row-track interpolation (`grid-template-rows: 0fr -> 1fr` for user-triggered accordions). Animating `top`, `left`, `margin`, `padding`, `width`, or `font-size` is prohibited so Cumulative Layout Shift (`CLS`) remains `0.00`.

### 5. Honest Product Semantics
Motion in `/ai-planner` must never impersonate a live generative LLM. Scripted responses enter as a single composed card (`240ms` fade + `8px` rise) rather than character-by-character typewriter streaming or fake "thinking…" skeleton pulses.

---

## B. Motion Tokens

Web Design 0.2 and 0.3 established a single transition variable (`--adora-transition: 420ms cubic-bezier(0.22, 1, 0.36, 1)`) in `apps/web/src/app/globals.css`. Web Design 0.4 expands this into a complete, semantic CSS custom-property token scale in `:root`.

### B.1 Duration Tokens

| CSS Custom Property | Value | Role & Rationale |
| :--- | :--- | :--- |
| `--adora-duration-instant` | `120ms` | Active button press feedback, focus ring transitions, filter chip border hover |
| `--adora-duration-fast` | `180ms` | Application UI state changes: filter chip selection (`aria-pressed`), tab highlight, mobile drawer close |
| `--adora-duration-ui` | `260ms` | Application content transitions: AI Planner message entrance, Trip Preview reveal, itinerary day panel crossfade, activity accordion expansion |
| `--adora-duration-editorial` | `420ms` | Editorial link gap/color transitions (preserves existing `--adora-transition`), CTA fill transitions, filtered grid crossfade |
| `--adora-duration-reveal` | `680ms` | Discovery chapter and card scroll-reveal entrances (`opacity` + `translateY`) |
| `--adora-duration-cinematic` | `920ms` | Homepage & Destination Detail hero typography entrance and unmasked photo curtain settle |
| `--adora-duration-image-hover` | `1200ms` | Slow, luxurious photographic scale on pointer hover (`.image-reveal img`) |

### B.2 Easing Curves

| CSS Custom Property | Value | Curve Profile & Usage |
| :--- | :--- | :--- |
| `--adora-ease-out-expo` | `cubic-bezier(0.22, 1, 0.36, 1)` | **Primary ADORA signature curve.** Fast, confident departure with a long, gentle settle. Used for all editorial entrances, image settles, and `.editorial-link`. |
| `--adora-ease-out-quart` | `cubic-bezier(0.25, 1, 0.5, 1)` | Snappier deceleration for Application UI transitions (chat bubbles, itinerary day panels, accordions, mobile menu drawer). |
| `--adora-ease-in-out-sine` | `cubic-bezier(0.37, 0, 0.63, 1)` | Symmetrical breathing curve used exclusively for ambient loops (`.hero-scroll-line`). |
| `--adora-ease-linear` | `linear` | Color and opacity-only micro-transitions (`120ms–180ms`) where velocity shaping is unnecessary. |

### B.3 Spatial Transform, Scale & Stagger Tokens

| CSS Custom Property | Desktop / Tablet (`>= 768px`) | Mobile (`< 768px`) | Usage & Rationale |
| :--- | :--- | :--- | :--- |
| `--adora-distance-hero` | `20px` | `12px` | Vertical rise for hero `h1` and lead copy on initial load |
| `--adora-distance-reveal` | `22px` | `14px` | Vertical rise for below-the-fold Discovery section headers and story blocks |
| `--adora-distance-card` | `18px` | `12px` | Vertical rise for staggered `ExperienceCard`, highlight items, and `HowItWorks` steps |
| `--adora-distance-ui` | `8px` | `6px` | Subtle vertical rise for AI Planner turns, Trip Preview updates, and itinerary day panels |
| `--adora-scale-image-enter` | `1.035` | `1.02` | Initial scale for hero and featured editorial photography before settling to `1.0` |
| `--adora-scale-image-hover` | `1.025` | `1.0` *(hover gated by `@media (hover: hover)`)* | Pointer hover zoom inside `.image-reveal` |
| `--adora-stagger-tight` | `60ms` | `40ms` | Stagger interval between hero child elements (eyebrow → `h1` → lead → CTAs) |
| `--adora-stagger-editorial` | `90ms` | `60ms` | Stagger interval between sibling items in multi-column grids (`HowItWorks`, highlights, related cards) |
| `--adora-stagger-cap` | `270ms` *(max 4 items)* | `180ms` *(max 4 items)* | Hard ceiling on cumulative stagger delay so no item ever feels sluggish |

### B.4 Reduced-Motion Token Override (`@media (prefers-reduced-motion: reduce)`)

When the operating system or browser reports `prefers-reduced-motion: reduce`:
1. All duration tokens resolve to `0.01ms`.
2. All spatial transform distances (`--adora-distance-*`) resolve to `0px`.
3. All initial scale tokens (`--adora-scale-*`) resolve to `1`.
4. The existing global rule in `apps/web/src/app/globals.css` (`animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important;`) remains intact as a hard safety net, augmented by `[data-reveal] { opacity: 1 !important; transform: none !important; }`.

---

## C. Homepage Motion Choreography (`/`)

The homepage (`apps/web/src/app/page.tsx`) is ADORA's flagship Discovery surface. Its choreography is structured as a sequence of seven calm editorial chapters.

### C.1 Site Navigation (`SiteHeader` in `src/components/layout/site-header.tsx`)
- **Initial Load:** Renders immediately at `opacity: 1` with zero entrance delay so navigation is interactive from the first paint (`0ms`).
- **Desktop Link Hover:** Primary links (`Điểm đến`, `Trải nghiệm`, `Chuyến đi mẫu`, `Cách hoạt động`) gain an animated bottom underline hairline (`transform: scaleX(0) -> scaleX(1)`, `transform-origin: left`, `240ms var(--adora-ease-out-expo)`) alongside their existing color transition. Active route (`aria-current="page"`) keeps a persistent `--adora-gold` underline (`scaleX(1)`).
- **Mobile Disclosure Drawer (`#mobile-navigation`):** Replaces the abrupt `hidden`/`grid` toggle with a composed height + opacity disclosure (`grid-template-rows: 0fr -> 1fr` + `opacity: 0 -> 1` over `240ms var(--adora-ease-out-quart)`), while keeping `hidden` / `inert` when closed so collapsed links cannot be tab-focused.

### C.2 Cinematic Hero & Headline Sequence (`EditorialHero` in `src/components/home/editorial-hero.tsx`)
- **Background Photograph (`/images/home/adora-highlands-hero.webp`):**
  - **CRITICAL LCP RULE:** The `<Image preload>` element itself **must never start at `opacity: 0`**, which would artificially penalize Largest Contentful Paint (`LCP`). Instead, the image renders immediately at `opacity: 1` and performs a subtle GPU-composited scale settle (`transform: scale(var(--adora-scale-image-enter)) -> scale(1)` over `920ms var(--adora-ease-out-expo)`).
- **Typography & CTA Stagger Sequence (CSS `@keyframes adora-hero-rise`, `680ms var(--adora-ease-out-expo)`):**
  - **Step 1 (`0ms` delay):** Eyebrow (`Du lịch, được thiết kế sâu hơn`) — `opacity: 0 -> 1`, `translateY(12px -> 0)`.
  - **Step 2 (`60ms` delay):** `h1` (`Đi xa hơn. Hiểu sâu hơn.`) — `opacity: 0 -> 1`, `translateY(var(--adora-distance-hero) -> 0)`.
  - **Step 3 (`120ms` delay):** Supporting lead paragraph — `opacity: 0 -> 1`, `translateY(16px -> 0)`.
  - **Step 4 (`180ms` delay):** Primary CTA (`Plan with Adora AI`) + secondary link (`Khám phá điểm đến`) — `opacity: 0 -> 1`, `translateY(12px -> 0)`.
- **Scroll Indicator (`Cuộn để khám phá`):** Retains the existing `.hero-scroll-line` keyframe (`2.2s ease-in-out infinite`) on `lg:flex`.

### C.3 Brand Philosophy (`BrandPhilosophy` in `src/components/home/brand-philosophy.tsx`)
- **Trigger:** Enters viewport at `threshold: 0.18` (`rootMargin: "0px 0px -8% 0px"`), fires once (`once: true`).
- **Left Column (Eyebrow + Thesis Note):** Fades and rises (`opacity: 0 -> 1`, `translateY(var(--adora-distance-reveal)) -> 0`, `680ms var(--adora-ease-out-expo)`).
- **Right Column (Editorial `h2` + 2-Column Supporting Copy):**
  - `h2` (`Không chỉ là nơi bạn đến. Là cách bạn cảm nhận.`) enters at `+80ms` stagger.
  - Top hairline divider (`border-t`) and two supporting paragraphs enter at `+160ms` stagger.

### C.4 Destination Editorial Feature (`DestinationStory` in `src/components/home/destination-story.tsx`)
- **Trigger:** `IntersectionObserver` (`threshold: 0.15`, `once: true`).
- **Portrait Image (`/images/home/dalat-pine-trail.webp`) & Coordinate Badge (`Cao nguyên Việt Nam · 11°56′N`):**
  - Image container fades in and settles scale (`opacity: 0 -> 1`, `scale(1.025) -> scale(1)`, `760ms var(--adora-ease-out-expo)`).
  - Floating coordinate badge enters at `+180ms` (`opacity: 0 -> 1`, `translateY(12px -> 0)`).
- **Editorial Story Column (`Đà Lạt`):** Enters at `+100ms` stagger (`opacity: 0 -> 1`, `translateY(var(--adora-distance-reveal)) -> 0`, `680ms`).

### C.5 Curated Experiences (`ExperienceStory` in `src/components/home/experience-story.tsx`)
- **Trigger:** `IntersectionObserver` (`threshold: 0.15`, `once: true`).
- **Left Narrative Column:** Eyebrow, `h2` (`Đi chậm để thấy nhiều hơn.`), and lead copy reveal together (`680ms`).
- **Numbered Experience List (`01`, `02`, `03`):** Each `<li>` row staggers in at `90ms` intervals (`+90ms`, `+180ms`, `+270ms`) with a `14px` vertical rise.
- **Right Photograph (`/images/home/highland-coffee-ritual.webp`):** Enters at `+120ms` with a `760ms` scale-and-fade settle.

### C.6 AI Planner Introduction (`AiPlannerSection` in `src/components/home/ai-planner-section.tsx`)
- **Trigger:** `IntersectionObserver` (`threshold: 0.18`, `once: true`).
- **Left Column (`Adora Intelligence`):** Reveals with `680ms var(--adora-ease-out-expo)`.
- **Right Preview Window (`Adora AI · Planning preview`):**
  - Outer frame fades and rises (`+100ms` delay, `680ms`).
  - Inside the preview frame, the sample user prompt bubble (`Tôi muốn ba ngày ở Đà Lạt…`) and sample ADORA response bubble (`Tôi sẽ giúp bạn định hình…`) stagger in sequentially (`+220ms` and `+340ms`, `420ms var(--adora-ease-out-quart)`) to visually foreshadow the interactive `/ai-planner` experience without implying live AI streaming.

### C.7 How ADORA Works (`HowItWorks` in `src/components/home/how-it-works.tsx`)
- **Trigger:** `IntersectionObserver` (`threshold: 0.18`, `once: true`).
- **Header Row:** Eyebrow, `h2`, and right-aligned lead copy reveal (`680ms`).
- **Three-Step Grid (`01`, `02`, `03`):** The three `<li key={step.number}>` columns stagger left-to-right on desktop (`0ms`, `90ms`, `180ms` delay; `680ms var(--adora-ease-out-expo)`).

### C.8 Closing Section & Footer (`SiteFooter` in `src/components/layout/site-footer.tsx`)
- **Closing Editorial CTA (`showCta = true`):** `Bắt đầu bằng một câu hỏi thật hay.` and the `Plan with Adora AI` link perform a final calm `680ms` reveal (`threshold: 0.2`, `once: true`).
- **Bottom Footer Bar (Wordmark, Navigation Links, Copyright):** Remains static (`opacity: 1`, no scroll animation) so utility navigation is never delayed at the bottom of a page.

---

## D. Discovery Page Interactions (`/destinations*`, `/experiences*`)

### D.1 Above-the-Fold Page Introductions (`PageIntro` in `src/components/ui/page-intro.tsx`)
- Used on `/destinations` and `/experiences`.
- Performs a single, immediate CSS load entrance (`480ms var(--adora-ease-out-expo)`, `translateY(12px -> 0)`) on the `h1` and aside description without waiting for `IntersectionObserver`.

### D.2 Destination Listing (`/destinations`)
- **Featured Đà Lạt Composition:** Because the featured image is `preload`-marked and partially visible above the fold on desktop (`1440×900`), the image renders at `opacity: 1` with a subtle `760ms` scale settle (`1.02 -> 1.0`), while the overlapping paper card (`lg:col-start-8`) slides up `16px` (`520ms var(--adora-ease-out-expo)`, `80ms` delay).
- **Destination Index Filter Transitions (`DestinationBrowser`):**
  - Filter chip toggles (`Tất cả vùng`, `Cao nguyên`, `Ven biển`, `Miền núi phía Bắc`, `Đã có nội dung`, `Sắp ra mắt`) transition background, border, and text color over `180ms var(--adora-ease-out-quart)`.
  - When `filter` state changes, the `<ol data-testid="destination-results">` container re-triggers a lightweight CSS keyframe (`@keyframes adora-filter-settle`: `opacity: 0.45 -> 1`, `translateY(6px -> 0)`, `220ms var(--adora-ease-out-quart)`) keyed by a deterministic filter signature (`${filter.region}-${filter.availability}-${filter.query ? "q" : "all"}` — note: text query changes only fade gently without re-bouncing on every keystroke).
  - Empty state (`[data-testid="destination-empty"]`) enters with a `220ms` fade + `6px` rise.

### D.3 Destination Detail (`/destinations/da-lat`)
- **Full-Bleed Hero:** Matches the homepage hero pattern: `<Image preload>` stays at `opacity: 1` with a `920ms` scale settle (`1.035 -> 1.0`), while breadcrumbs, eyebrow, `h1` (`Đà Lạt`), tagline, and `DemoBadge` stagger in over `0ms–180ms` (`680ms var(--adora-ease-out-expo)`).
- **Editorial Lead-In (`Giới thiệu`):** Single scroll reveal (`threshold: 0.15`, `once: true`, `680ms`).
- **Highlights Grid (`Điểm nhấn của Đà Lạt`):** 4 numbered items stagger in pairs (`0ms`, `80ms`, `160ms`, `240ms`).
- **Asymmetric Experience Gallery (`ExperienceGrid`):** Cards reveal row-by-row as they enter the viewport (`threshold: 0.12`, `once: true`), with at most a `90ms` stagger between the left and right card in each 12-column row.
- **3-Day Itinerary Preview & `PlannerCta`:** Reveal once per section (`680ms`) without per-line over-animation.

### D.4 Experience Listing (`/experiences`) & Detail (`/experiences/[slug]`)
- **Experience Cards (`ExperienceCard` in `src/components/discovery/experience-card.tsx`):**
  - Pointer hover (`@media (hover: hover) and (pointer: fine)`): Image scales `1.0 -> 1.025` over `1200ms var(--adora-ease-out-expo)`; the `ArrowUpRight` icon translates `2px` up-right (`-translate-y-0.5 translate-x-0.5`) over `260ms` and shifts color to `--adora-gold`.
- **Category Filter Switching (`ExperienceBrowser`):**
  - Clicking a category chip (`Tất cả (6)`, `Thiên nhiên (1)`, `Ẩm thực & cà phê (2)`, etc.) crossfades and settles the `<ul data-testid="experience-results">` grid over `240ms var(--adora-ease-out-quart)` (`opacity: 0.4 -> 1`, `translateY(8px -> 0)`).
- **Experience Detail (`/experiences/[slug]`):**
  - Header block (breadcrumbs, category eyebrow, `h1`, tagline) performs an immediate `480ms` load settle.
  - Wide `21:9` hero photograph (`preload`) settles scale `1.025 -> 1.0` over `820ms`.
  - Narrative body + `<aside aria-label="Thông tin gợi ý">` reveal cleanly; the 3 related experience cards at the bottom stagger in (`0ms`, `80ms`, `160ms`) on scroll.

---

## E. AI Planner Motion (`/ai-planner`)

`/ai-planner` (`PlannerWorkspace` in `src/components/planner/planner-workspace.tsx`) is an **Application UI** workspace. Motion here must be crisp (`180ms–260ms`), functional, and transparent about ADORA's scripted demo mode.

### E.1 Initial Welcome State & Suggested Prompts
- The welcome block (`Bạn muốn đi đâu tiếp theo?`), suggested prompt cards, and opening `ADORA Planner` message render immediately at `scrollTop = 0` without entrance delay so automated and human interactions are never blocked.
- Suggested prompt cards (`ul[aria-label="Gợi ý câu hỏi"] button`) provide tactile hover/focus feedback: border transitions from `--adora-hairline` to `--adora-ink`, background lifts from `bg-white/50` to `bg-white/85`, and the `Compass` icon rotates `12deg` over `220ms var(--adora-ease-out-quart)`.

### E.2 User Message & Scripted Response Entrance
- When the user clicks a suggested prompt or submits a message:
  1. **User Bubble (`article[aria-label="Bạn"]`):** Enters immediately (`@keyframes adora-message-in`: `opacity: 0 -> 1`, `translateY(8px -> 0)`, `200ms var(--adora-ease-out-quart)`).
  2. **Scripted Assistant Reply (`[data-testid="scripted-reply"]`) or System Notice (`[data-testid="unsupported-reply"]`):** Enters as a complete, cohesive card with an `80ms` delay (`opacity: 0 -> 1`, `translateY(10px -> 0)`, `260ms var(--adora-ease-out-quart)`).
  3. **No Fake AI Streaming:** There is no typing indicator, no artificial network delay, and no token-by-token text reveal.
  4. **Scroll Alignment:** Preserves the verified Web Design 0.3 post-review behavior: `log.scrollTop` aligns directly to `latestTurnRef.current` (`Math.max(0, targetTop)`), ensuring the user bubble and scripted response are immediately visible at the top of `role="log"`.

### E.3 Trip Preview Panel & Mobile Jumpbar Reveal
- **Desktop Sidebar (`[data-testid="trip-preview"]`, `xl:flex`):** When `activeScenarioId` transitions from `null` to a scenario (or switches between the 3-day and 2-day scenarios), the `[data-testid="trip-preview"]` container keyed by `preview.slug` performs a `260ms var(--adora-ease-out-quart)` crossfade + `8px` vertical settle (`@keyframes adora-panel-in`).
- **Mobile/Tablet Jumpbar (`[data-testid="mobile-planner-jumpbar"]`, `xl:hidden`):** Slides and fades into place below the header (`180ms var(--adora-ease-out-quart)`).
- **Mobile/Tablet Stacked Preview (`[data-testid="trip-preview-mobile"]`, `xl:hidden`):** Enters with the scripted turn (`120ms` delay, `260ms var(--adora-ease-out-quart)`). Clicking `Phản hồi kịch bản` or `Xem trước (3 ngày)` scrolls `role="log"` smoothly (`scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" })`).

### E.4 Conversation Reset (`Cuộc trò chuyện demo mới`)
- Clicking `Cuộc trò chuyện demo mới` clears `messages`, resets `activeScenarioId` to `null`, fades in the initial welcome block (`200ms var(--adora-ease-out-quart)`), restores `[data-testid="trip-preview-empty"]`, and returns keyboard focus to `#planner-prompt`.

---

## F. Trip Itinerary Motion (`/trips`, `/trips/[slug]`)

### F.1 My Trips Library (`/trips`)
- `TripCard` items (`src/components/trips/trip-card.tsx`) use restrained application card hover feedback (`border-color` transitions to `--adora-ink` over `200ms`, cover image scales `1.0 -> 1.02` over `800ms var(--adora-ease-out-expo)` on pointer devices).

### F.2 Day Tab Switching (`ItineraryExplorer` in `src/components/trips/itinerary-explorer.tsx`)
- **Tab Bar (`role="tablist"`):** Switching days via click or `ArrowLeft`/`ArrowRight`/`Home`/`End` keys transitions the active tab's Ink background and Paper text color over `180ms var(--adora-ease-out-quart)`. Keyboard focus (`tabRefs.current[nextIndex]?.focus()`) moves synchronously (`0ms` delay) so screen readers and keyboard users never lose focus.
- **Day Panel (`role="tabpanel"`, `[data-testid="day-panel"]`):** Keyed by `day.day`. When `activeDay` changes, the incoming panel (`h3` heading, summary, and timeline `<ol>`) performs a `240ms var(--adora-ease-out-quart)` entrance (`@keyframes adora-panel-in`: `opacity: 0 -> 1`, `translateY(8px -> 0)`).
- **Budget Summary Sidebar (`[data-testid="day-budget"]`):** Updates synchronously with the selected day so assistive technologies and automated assertions always read the exact integer VND figure immediately.

### F.3 Activity Accordion Disclosure (`button[aria-controls="activity-..."]`)
- Currently in Web Design 0.3, `{open ? <div id={...}>...</div> : null}` mounts and unmounts abruptly.
- **Web Design 0.4 Enhancement:** Wrap the collapsible region in a CSS Grid row-interpolation wrapper (`grid transition-[grid-template-rows,opacity] duration-[240ms] ease-[var(--adora-ease-out-quart)]`, toggling between `grid-rows-[1fr] opacity-100` when `open === true` and `grid-rows-[0fr] opacity-0` when `open === false`, with `inert={!open}` and `aria-hidden={!open}` on the inner `overflow-hidden` container).
- **Preserved Contract:** `aria-expanded` on the trigger `<button>` still updates synchronously on click (`"false"` -> `"true"`), and the `ChevronDown` icon rotates `0deg -> 180deg` over `240ms var(--adora-ease-out-quart)`.

---

## G. Responsive Motion Strategy (Desktop, Tablet & Mobile)

Motion is adapted across ADORA's six verified viewport widths (`360×800`, `390×844`, `768×1024`, `1024×900`, `1440×900`, `1920×1080`):

| Capability / Parameter | Desktop (`1024px – 1920px`) | Tablet (`768px – 1023px`) | Mobile (`360px – 767px`) |
| :--- | :--- | :--- | :--- |
| **Reveal Travel Distance** | `18px – 22px` | `14px – 18px` | `10px – 14px` |
| **Sibling Stagger Interval** | `60ms – 90ms` (multi-column) | `50ms – 70ms` (2-column) | `0ms – 40ms` (single-column stacked items reveal individually as scrolled, avoiding artificial wait) |
| **Image Hover Zoom (`.image-reveal:hover img`)** | Enabled (`scale(1.025)`, `1200ms`) | Enabled only when `(hover: hover) and (pointer: fine)` | **Disabled** on touch (`(hover: none)`) to prevent sticky hover states after tap |
| **Hero Scroll Indicator (`Cuộn để khám phá`)** | Visible (`lg:flex`) with `.hero-scroll-line` pulse | Hidden (`hidden lg:flex`) | Hidden (`hidden lg:flex`) |
| **AI Planner Preview Transition** | Right-hand `xl:flex` sidebar crossfade (`260ms`) | Stacked `xl:hidden` card reveal + jumpbar smooth scroll | Stacked `xl:hidden` card reveal + jumpbar smooth scroll |
| **Scroll Hijacking / Lenis / Fixed Pinning** | **Prohibited** | **Prohibited** | **Prohibited** |

---

## H. Motion Technology Assessment & Architectural Recommendation

### H.1 Current Dependency & Architecture Audit
Inspecting `apps/web/package.json` confirms that `apps/web` currently ships **zero animation libraries** (`next: 16.4.3`, `react: 19.3.0`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@tanstack/react-query`, `@tanstack/react-table`, `zod`). Furthermore, 5 of the 6 homepage sections and all page shells are **React Server Components (RSC)**.

### H.2 Comparison of Candidate Technologies

| Option | Bundle Cost (gzipped) | RSC Compatibility | Maintainability & Control | Assessment for ADORA Web Design 0.4 |
| :--- | :--- | :--- | :--- | :--- |
| **1. Native CSS Transitions & `@keyframes`** | `0 KB` JS | **100% Server Component compatible** | High; centralized in `globals.css` | **Selected (Core Layer).** Ideal for hero load stagger, button/link hover states, filter crossfades, chat bubble entrances, and accordion `grid-template-rows`. |
| **2. Lightweight `IntersectionObserver` Client Wrapper (`<Reveal>`) + CSS Data Attributes** | `< 0.8 KB` JS | **Preserves RSC children** (`<Reveal>{serverRenderedContent}</Reveal>`) | High; automatic `observer.disconnect()` on reveal or unmount | **Selected (Scroll-Reveal Layer).** Provides deterministic once-per-visit scroll entrances (`data-reveal="visible"`) without pulling third-party libraries or converting Server Components into Client Components. |
| **3. CSS Scroll-Driven Animations (`animation-timeline: view()`)** | `0 KB` JS | 100% RSC compatible | Medium; Safari / mobile WebKit parity and `once: true` latching remain inconsistent without JS | **Rejected as primary mechanism.** `animation-timeline: view()` replays in reverse when scrolling back up unless latched with JS; `IntersectionObserver` is cleaner for one-shot editorial reveals. |
| **4. Web Animations API (`element.animate()`)** | `0 KB` external | Requires Client Component refs | Medium; imperative JS duplicates CSS token definitions | **Optional fallback only; not needed** when CSS `@keyframes` and `[data-reveal]` classes handle all transforms declaratively. |
| **5. Motion for React (`motion` / `framer-motion`)** | `~18 KB – 34 KB` JS | Requires `"use client"` on every animated `motion.*` node | High DX, but forces hydration boundaries across editorial Server Components | **Rejected.** Violates `01_DESIGN_BLUEPRINT.md` Section 5 (*"Do not add GSAP, Lenis, Framer Motion or a canvas renderer simply to imitate the reference"*) and unnecessarily inflates client JS. |
| **6. GSAP + ScrollTrigger** | `~28 KB – 45 KB` JS | Imperative DOM mutation; conflicts with React 19 concurrent rendering if not carefully scoped | Overkill since scroll-jacking and pinned scrub timelines are prohibited | **Rejected.** Prohibited by the Design Blueprint and unnecessary for ADORA's editorial motion vocabulary. |

### H.3 Recommended Architecture (Zero New npm Dependencies)

Web Design 0.4 will be implemented using **100% native browser platform primitives** (zero changes to `apps/web/package.json` or `pnpm-lock.yaml`):

1. **CSS Token & Keyframe Layer (`apps/web/src/app/globals.css`):**
   - Defines all `--adora-duration-*`, `--adora-ease-*`, `--adora-distance-*`, and `--adora-scale-*` custom properties.
   - Defines declarative utility classes:
     - `.adora-load-enter` (with `--stagger-index` support) for above-the-fold hero/intro entrances.
     - `[data-reveal="pending"]` and `[data-reveal="visible"]` for below-the-fold scroll reveals.
     - `.adora-panel-swap` and `.adora-message-enter` for Application UI transitions in `/ai-planner` and `/trips/[slug]`.
     - `@media (hover: hover) and (pointer: fine)` guard around `.image-reveal:hover img`.
2. **Minimal Client Leaf Component (`apps/web/src/components/ui/reveal.tsx`, ~65 lines):**
   - Accepts `children: ReactNode`, `delayMs?: number`, `variant?: "section" | "card" | "image"`, and `className?: string`.
   - Renders `<div data-reveal={state} style={{ "--reveal-delay": `${delayMs}ms` }}>` around Server Component children so **Server Components remain Server Components**.
   - On mount (`useEffect`):
     - Checks `window.matchMedia("(prefers-reduced-motion: reduce)").matches`. If `true`, keeps `state = "visible"` immediately.
     - Checks `element.getBoundingClientRect().top <= window.innerHeight * 0.92`. If already in view on initial load (or when headless verification scripts jump down the page), marks `state = "visible"` immediately so above-the-fold or pre-scrolled elements are never hidden.
     - Otherwise sets `state = "pending"` and observes with a shared/lightweight `IntersectionObserver` (`threshold: 0.15`, `rootMargin: "0px 0px -6% 0px"`), transitioning to `state = "visible"` and calling `observer.disconnect()` on first intersection.

---

## I. Performance & Accessibility Budget

All targets below are **explicit engineering budgets to be verified during Web Design 0.4**, distinguished clearly from Web Design 0.3 baseline measurements:

| Metric / Criterion | Web Design 0.3 Verified Baseline | Web Design 0.4 Target Budget | Verification Method |
| :--- | :--- | :--- | :--- |
| **Cumulative Layout Shift (`CLS`)** | `0.00` (static layout) | `<= 0.02` (aim `0.00` on initial load and scroll) | `PerformanceObserver({ type: "layout-shift" })` in headless Chrome across all 8 routes |
| **Largest Contentful Paint (`LCP`)** | Preloaded WebP heroes (`115 KB – 380 KB`) | `<= 2.5s` simulated mobile; **zero opacity delay on `<Image preload>`** | Verify hero `<img>` computed `opacity === "1"` at `t = 0ms` |
| **Interaction to Next Paint (`INP` / UI Latency)** | Instant synchronous React state | `<= 100ms` local (`<= 200ms` budget) for filter chips, planner prompts, and itinerary tabs | Measure click-to-DOM-update latency in `verify_web_0_4.mjs` |
| **Horizontal Overflow** | `scrollWidth === innerWidth` (48/48 checks) | `scrollWidth === innerWidth` across all 48 route × viewport checks (`360px–1920px`) | Automated viewport matrix in headless Chrome |
| **Composited Properties Only** | `transform` on `.image-reveal img` | `100%` of scroll/load animations restricted to `opacity` and `transform` (plus `grid-template-rows` on accordions) | CSS audit & computed style inspection |
| **New Third-Party JS Added** | `0 KB` | `0 KB` (zero new npm packages; `pnpm-lock.yaml` unchanged) | `git diff pnpm-lock.yaml apps/web/package.json` |
| **`prefers-reduced-motion: reduce`** | `scrollBehavior: "auto"`, `transitionDuration: 1e-05s` | `animationDuration <= 0.01ms`, `transitionDuration <= 0.01ms`, `[data-reveal]` computed `opacity === "1"` and `transform === "none"` | Emulated media check in headless Chrome |
| **Keyboard Focus & ARIA Sync** | Verified skip link, mobile menu, and day tabs | `aria-expanded`, `aria-selected`, `aria-pressed`, and `.focus()` update **synchronously (`0ms` delay)** without waiting for CSS transitions | Automated keyboard Tab/Space/ArrowRight checks |

---

## J. Implementation Priority Matrix

| Priority | ID | Feature / Surface | Target Files | Rationale & Dependencies |
| :---: | :--- | :--- | :--- | :--- |
| **P0 — Essential** | `M-01` | Motion Token System, Keyframes, Touch Hover Guard & Reduced-Motion Safety Net | `apps/web/src/app/globals.css` | Foundation required by all Discovery and Application motion; zero risk to existing layout. |
| **P0 — Essential** | `M-02` | Progressive `<Reveal>` Client Leaf (`IntersectionObserver` + above-fold & reduced-motion bypass) | `apps/web/src/components/ui/reveal.tsx` | Enables Server Component scroll reveals without converting pages to `"use client"` or hiding content when JS/motion is disabled. |
| **P0 — Essential** | `M-03` | Homepage Hero Load Stagger & Chapter Scroll Choreography (`/`) | `src/components/home/{editorial-hero,brand-philosophy,destination-story,experience-story,ai-planner-section,how-it-works}.tsx`, `src/components/layout/site-footer.tsx` | Primary graduation-demo showcase; delivers the luxury editorial rhythm across all 7 homepage chapters. |
| **P0 — Essential** | `M-04` | AI Planner Turn Entrance, Trip Preview Crossfade & Smooth Jumpbar Scroll (`/ai-planner`) | `src/components/planner/planner-workspace.tsx` | Gives immediate, polished feedback when selecting a scripted scenario while preserving all Web Design 0.3 bounding-box guarantees. |
| **P1 — High Impact** | `M-05` | Discovery Pages Load & Scroll Choreography (`/destinations`, `/destinations/[slug]`, `/experiences`, `/experiences/[slug]`) | `src/components/ui/page-intro.tsx`, `src/app/destinations/**`, `src/app/experiences/**`, `src/components/discovery/{experience-grid,planner-cta}.tsx` | Connects the homepage editorial cadence across the full Discovery journey. |
| **P1 — High Impact** | `M-06` | Discovery Filter Settle Transitions (`DestinationBrowser`, `ExperienceBrowser`) | `src/components/discovery/{destination-browser,experience-browser}.tsx` | Smooths category/region/availability chip transitions (`220ms–240ms`) without delaying result count announcements. |
| **P1 — High Impact** | `M-07` | Trip Itinerary Day Panel Transition & Smooth Activity Accordion (`ItineraryExplorer`) | `src/components/trips/itinerary-explorer.tsx`, `src/app/trips/**` | Upgrades day tab switching and activity accordions from abrupt mounts to composed `240ms` transitions. |
| **P2 — Refinement** | `M-08` | Header Navigation Underline & Mobile Menu Disclosure Polish (`SiteHeader`) | `src/components/layout/site-header.tsx` | Adds left-to-right hairline hover underline on desktop links and smooth mobile drawer disclosure while preserving ARIA semantics. |

### Recommended Implementation Order
`M-01 (Tokens & CSS)` → `M-02 (<Reveal> boundary)` → `M-03 (Homepage)` → `M-05 & M-06 (Discovery routes & filters)` → `M-04 (AI Planner)` → `M-07 (Trip Itinerary)` → `M-08 (Header polish)` → `Automated 6-viewport & reduced-motion verification (scripts/verify_web_0_4.mjs)`.

---

## K. Acceptance Criteria

Web Design 0.4 implementation will be judged against seven testable acceptance gates:

1. **AC-01 — LCP & SSR Visibility Integrity:** On `/`, `/destinations/da-lat`, and `/experiences/[slug]`, the primary `<Image preload>` element has computed `opacity === "1"` immediately at initial navigation (`t = 0ms`). Below-the-fold `<Reveal>` sections render visible (`opacity === "1"`) after scrolling through the page and remain at `opacity === "1"` when scrolling back up (`once: true`).
2. **AC-02 — Six-Viewport Geometry & Zero Layout Shift:** Across all 8 routes (`/`, `/destinations`, `/destinations/da-lat`, `/experiences`, `/experiences/ca-phe-nho-giot-cao-nguyen`, `/ai-planner`, `/trips`, `/trips/da-lat-3-ngay`) at `360×800`, `390×844`, `768×1024`, `1024×900`, `1440×900`, and `1920×1080` (48 checks), `document.documentElement.scrollWidth === window.innerWidth` and cumulative layout shift during scroll is `<= 0.02`.
3. **AC-03 — Discovery Filter Responsiveness:** Clicking region/availability chips on `/destinations` and category chips on `/experiences` updates `data-testid="destination-count"` and `data-testid="experience-count"` synchronously while applying the `220ms–240ms` settle animation to the results container.
4. **AC-04 — AI Planner Bounding-Box & Non-Streaming Integrity:** On `/ai-planner` at `1440×900` and `390×844`, all Web Design 0.3 post-review geometry assertions remain `true` (`initialScrollTop === 0`, `initialBothSuggestionsFullyVisible === true`, `initialOpeningMessageFullyVisible === true`, `userBubbleVisibleInLog === true`, `scriptedReplyVisibleInLog === true`, `mobileJumpbarVisible === true`, `mobilePreviewVisibleInLog === true`), and zero simulated typewriter streaming or external AI requests occur.
5. **AC-05 — Itinerary Keyboard & Accordion Semantics:** On `/trips/da-lat-3-ngay`, clicking or arrow-keying between Day 1, Day 2, and Day 3 updates `aria-selected="true"` and `[data-testid="day-budget"]` immediately, and toggling an activity accordion updates `aria-expanded` synchronously while smoothly interpolating its disclosure container.
6. **AC-06 — Strict `prefers-reduced-motion: reduce` Compliance:** Under emulated `prefers-reduced-motion: reduce`, all animated elements report computed `animationDuration <= 0.01ms` and `transitionDuration <= 0.01ms`, all `[data-reveal]` containers report `opacity === "1"` and `transform === "none"` without requiring scroll intersection, and smooth scrolling is disabled (`scrollBehavior === "auto"`).
7. **AC-07 — Zero-Dependency & Offline Resilience:** `pnpm-lock.yaml` and `apps/web/package.json` dependencies remain untouched; `pnpm --filter @adora/web test`, `lint`, `typecheck`, `build`, and browser verification pass with FastAPI, PostgreSQL/NeonDB, Docker, and Redis offline.

---

## L. Complete Route-by-Route Motion Inventory Matrix

| ID | Route(s) | Component / Section | Proposed Effect | Trigger | Duration | Easing | Responsive Differences (`Desktop` vs `Mobile`) | Reduced-Motion Fallback | Implementation Technique | Priority | Test Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `INV-01` | All routes with `SiteHeader` | `SiteHeader` desktop nav links (`src/components/layout/site-header.tsx`) | Bottom hairline underline scales `scaleX(0) -> scaleX(1)` from left on hover/focus; active link keeps persistent gold underline | `:hover`, `:focus-visible` | `240ms` | `--adora-ease-out-expo` | Desktop (`lg:flex`) only; hidden on `< 1024px` | Instant color change; no scale animation | CSS `::after` pseudo-element in `globals.css` | **P2** | Computed `::after` transform scales on hover; `aria-current="page"` remains visible at all times |
| `INV-02` | All routes with `SiteHeader` | `SiteHeader` mobile disclosure `#mobile-navigation` | Smooth height + opacity disclosure when opening mobile menu | Click / `Space` on `button[aria-controls="mobile-navigation"]` | `220ms` | `--adora-ease-out-quart` | Mobile/Tablet (`< 1024px`) only | Instant show/hide (`0.01ms`) | CSS Grid `0fr -> 1fr` wrapper or `@keyframes` on open state; keeps `hidden` when closed | **P2** | `aria-expanded` toggles `"false" -> "true"` synchronously; all 5 links focusable when open |
| `INV-03` | `/` | `EditorialHero` background image (`src/components/home/editorial-hero.tsx`) | Subtle photographic scale settle `scale(1.035) -> scale(1.0)` while maintaining `opacity: 1` from `0ms` | Initial page load | `920ms` | `--adora-ease-out-expo` | Desktop `scale(1.035)`; Mobile `scale(1.02)` | Static `scale(1)` (`transform: none`) | CSS `@keyframes adora-image-settle` on `.hero-image-settle` | **P0** | Hero `<img>` computed `opacity === "1"` at `0ms`; zero LCP delay |
| `INV-04` | `/` | `EditorialHero` eyebrow, `h1`, lead copy, and CTA row | 4-step staggered vertical rise (`12px–20px -> 0`) and fade (`0 -> 1`) | Initial page load | `680ms` (`60ms` stagger: `0/60/120/180ms`) | `--adora-ease-out-expo` | Desktop `20px` rise / `60ms` stagger; Mobile `12px` rise / `40ms` stagger | Immediate `opacity: 1`, `transform: none` | CSS `@keyframes adora-load-rise` with `--stagger-index` | **P0** | Single `h1` visible and readable; final primary CTA contrast unchanged (`#171a19` on `#f3efe7`) |
| `INV-05` | `/` | `EditorialHero` scroll indicator (`Cuộn để khám phá`) | Vertical pulse along `1px` scroll line (`scaleY(0.35 -> 1 -> 0.35)`) | Continuous ambient loop | `2200ms` | `--adora-ease-in-out-sine` | Desktop (`lg:flex`) only; hidden on `< 1024px` | Static line (`animation-iteration-count: 1`, `0.01ms`) | Existing `.hero-scroll-line` in `globals.css` | **P0** | Already implemented; verified under reduced motion |
| `INV-06` | `/` | `BrandPhilosophy` (`#philosophy`) | Two-column editorial reveal: left thesis column (`0ms`), right `h2` (`+80ms`), bottom 2-column copy (`+160ms`) | `IntersectionObserver` (`threshold: 0.18`, `once: true`) | `680ms` | `--adora-ease-out-expo` | Desktop `22px` rise; Mobile `14px` rise with `50ms` stagger | Immediate `opacity: 1`, `transform: none` | `<Reveal>` wrapper around Server Component blocks | **P0** | Reveals once on scroll; remains `opacity: 1` when scrolling back up |
| `INV-07` | `/` | `DestinationStory` (`#destinations`) | Portrait photo scale-and-fade settle (`0ms`), coordinate badge rise (`+180ms`), story column reveal (`+100ms`) | `IntersectionObserver` (`threshold: 0.15`, `once: true`) | `680ms – 760ms` | `--adora-ease-out-expo` | Desktop `22px` rise; Mobile `14px` rise | Immediate `opacity: 1`, `transform: none` | `<Reveal variant="image">` and `<Reveal>` | **P0** | Compatible with `<Suspense>` Catalog boundary and offline fallback |
| `INV-08` | `/` | `ExperienceStory` (`#experiences`) | Narrative header reveal (`0ms`), numbered list rows `01–03` stagger (`+90/+180/+270ms`), coffee ritual photo settle (`+120ms`) | `IntersectionObserver` (`threshold: 0.15`, `once: true`) | `680ms` (`90ms` list stagger) | `--adora-ease-out-expo` | Desktop `90ms` stagger; Mobile `60ms` stagger | Immediate `opacity: 1`, `transform: none` | `<Reveal>` wrappers | **P0** | All 3 list items and disclaimer reach `opacity: 1` |
| `INV-09` | `/` | `AiPlannerSection` (`Adora Intelligence`) | Left copy reveal (`0ms`), right preview window rise (`+100ms`), sample user & assistant bubbles stagger (`+220ms`, `+340ms`) | `IntersectionObserver` (`threshold: 0.18`, `once: true`) | `680ms` (outer) / `420ms` (bubbles) | `--adora-ease-out-expo` / `--adora-ease-out-quart` | Same sequence; `14px` mobile travel vs `20px` desktop | Immediate `opacity: 1`, `transform: none` | `<Reveal>` wrappers | **P0** | Sample bubbles enter as whole cards; no fake typing indicator |
| `INV-10` | `/` | `HowItWorks` (`#how-it-works`) | Section header reveal (`0ms`); steps `01`, `02`, `03` stagger left-to-right (`0ms`, `90ms`, `180ms`) | `IntersectionObserver` (`threshold: 0.18`, `once: true`) | `680ms` | `--adora-ease-out-expo` | Desktop/Tablet (`md:grid-cols-3`) `90ms` stagger; Mobile stacked `50ms` stagger | Immediate `opacity: 1`, `transform: none` | `<Reveal>` on header and step `<li>` items | **P0** | All 3 steps align without horizontal overflow |
| `INV-11` | `/`, `/destinations` | `SiteFooter` closing CTA (`showCta = true`) | Closing heading (`Bắt đầu bằng một câu hỏi thật hay.`) and CTA link reveal once on scroll | `IntersectionObserver` (`threshold: 0.2`, `once: true`) | `680ms` | `--adora-ease-out-expo` | Desktop `20px` rise; Mobile `12px` rise | Immediate `opacity: 1`, `transform: none` | `<Reveal>` on closing CTA grid; bottom footer nav stays static | **P0** | Footer utility links remain immediately clickable without delay |
| `INV-12` | `/destinations`, `/experiences` | `PageIntro` (`src/components/ui/page-intro.tsx`) | Above-the-fold load entrance on eyebrow, `h1`, and aside description | Initial page load | `480ms` (`0ms` / `60ms` stagger) | `--adora-ease-out-expo` | Desktop `16px` rise; Mobile `10px` rise | Immediate `opacity: 1`, `transform: none` | CSS `.adora-load-enter` classes | **P1** | `h1Count === 1`; never flashes hidden after hydration |
| `INV-13` | `/destinations` | Featured Đà Lạt overlap composition (`src/app/destinations/page.tsx`) | Preloaded hero photo scale settle (`1.02 -> 1.0`, `760ms`) + overlapping paper card rise (`16px -> 0`, `520ms`, `+80ms` delay) | Initial page load / above-fold | `520ms – 760ms` | `--adora-ease-out-expo` | Desktop 12-column overlap (`lg:col-start-1` / `lg:col-start-8`); Mobile stacked | Immediate `opacity: 1`, `transform: none` | CSS `.hero-image-settle` and `.adora-load-enter` | **P1** | Preserves `lg:col-start-1 lg:row-start-1` grid placement |
| `INV-14` | `/destinations`, `/experiences` | `DestinationBrowser` & `ExperienceBrowser` filter changes | Results list (`[data-testid="destination-results"]`, `[data-testid="experience-results"]`) and empty states settle with `opacity: 0.45 -> 1`, `translateY(6px -> 0)` on chip change | Region, availability, or category chip click / filter reset | `220ms – 240ms` | `--adora-ease-out-quart` | Identical across desktop and mobile | Instant swap (`0.01ms`) | CSS `@keyframes adora-filter-settle` keyed by filter chip state | **P1** | Live count (`data-testid="*-count"`) and DOM items update synchronously for tests |
| `INV-15` | `/destinations/da-lat`, `/experiences`, `/experiences/[slug]` | `ExperienceCard` & `.image-reveal` hover (`src/components/discovery/experience-card.tsx`) | Photographic zoom `scale(1 -> 1.025)` + `ArrowUpRight` diagonal nudge (`-2px, +2px`) and gold accent shift | Pointer `:hover` (`@media (hover: hover) and (pointer: fine)`) | `1200ms` (image) / `260ms` (arrow) | `--adora-ease-out-expo` | Active on fine-pointer desktop; disabled on touch devices | Disabled (`0.01ms`, no scale) | CSS `.image-reveal:hover img` wrapped in `@media (hover: hover)` | **P1** | No sticky hover zoom on mobile touch emulation |
| `INV-16` | `/destinations/da-lat`, `/experiences/[slug]` | Detail page hero & below-fold chapters (Intro, Highlights, ExperienceGrid, Trip Preview, Related Cards, `PlannerCta`) | Preloaded hero photo scale settle (`820ms–920ms`); below-fold sections reveal once on scroll with `80ms` sibling stagger on highlights and related cards | Load (hero) + `IntersectionObserver` (below-fold, `once: true`) | `680ms` | `--adora-ease-out-expo` | Desktop `20px` rise / `80ms` stagger; Mobile `12px` rise / `40ms` stagger | Immediate `opacity: 1`, `transform: none` | CSS load classes + `<Reveal>` wrappers | **P1** | All images complete (`naturalWidth > 0`); zero horizontal overflow |
| `INV-17` | `/ai-planner` | `PlannerWorkspace` user message & scripted/unsupported reply (`src/components/planner/planner-workspace.tsx`) | User bubble enters (`200ms`, `8px` rise); assistant reply card enters (`260ms`, `10px` rise, `80ms` delay) as a single complete block | Clicking suggested prompt or submitting form | `200ms – 260ms` | `--adora-ease-out-quart` | Identical timing on desktop and mobile; `6px` mobile travel | Instant appearance (`0.01ms`) | CSS `@keyframes adora-message-enter` on message `<article>` | **P0** | Preserves `userBubbleVisibleInLog` and `scriptedReplyVisibleInLog` bounding-box checks |
| `INV-18` | `/ai-planner` | `PlannerWorkspace` Trip Preview (`[data-testid="trip-preview"]`, `[data-testid="trip-preview-mobile"]`) & mobile jumpbar | Desktop preview panel crossfades (`260ms`) when scenario activates/changes; mobile jumpbar (`180ms`) and mobile preview card (`260ms`) settle in; jumpbar buttons smooth-scroll `role="log"` | Scenario selection / jumpbar button click | `180ms – 260ms` | `--adora-ease-out-quart` | Desktop right-hand `xl:flex` panel; Mobile `< xl` jumpbar + stacked preview | Instant appearance; `scrollBehavior: "auto"` on jumpbar click | CSS `@keyframes adora-panel-in` keyed by `preview.slug` | **P0** | Preserves `mobileJumpbarVisible` and `mobilePreviewVisibleInLog` checks |
| `INV-19` | `/trips`, `/trips/[slug]` | `TripCard` hover & `ItineraryExplorer` day tab switching (`src/components/trips/itinerary-explorer.tsx`) | Tab selection transitions background (`180ms`); active `role="tabpanel"` (`[data-testid="day-panel"]`) keyed by `day.day` fades and rises `8px` (`240ms`) | Click or `ArrowLeft`/`ArrowRight`/`Home`/`End` on `role="tab"` | `180ms – 240ms` | `--adora-ease-out-quart` | Identical across desktop and mobile | Instant panel swap (`0.01ms`) | CSS `@keyframes adora-panel-in` on `key={day.day}` `tabpanel` | **P1** | `aria-selected`, keyboard focus, and `[data-testid="day-budget"]` update synchronously |
| `INV-20` | `/trips/[slug]` | `ItineraryExplorer` activity accordion disclosure (`#activity-...`) | Smooth height + opacity interpolation (`grid-template-rows: 0fr <-> 1fr`, `opacity: 0 <-> 1`) + `ChevronDown` `180deg` rotation | Click on `button[aria-controls="activity-..."]` | `240ms` | `--adora-ease-out-quart` | Identical across desktop and mobile | Instant expand/collapse (`0.01ms`) | CSS Grid `0fr`/`1fr` wrapper with `aria-hidden={!open}` and `inert={!open}` when collapsed | **P1** | `aria-expanded` toggles `"false" -> "true"` synchronously; collapsed links excluded from tab order |
