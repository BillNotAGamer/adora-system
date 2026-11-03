# ADORA — WEBSITE DESIGN BLUEPRINT v1.0

**Status:** APPROVED PROPOSAL FOR REVIEW / IMPLEMENTATION-READY SPECIFICATION (not yet implemented)
**Date:** 2026-11-04
**Product:** ADORA — AI-Powered Smart Travel Planning & Integrated Booking Platform
**Repository:** `F:\Coding\Adora System Mega Project\adora-system`
**Reference:** https://www.snamitravel.com/
**Target:** `apps/web` (Next.js 16 / React 19 / Tailwind CSS 4)
**Language:** Primary content `vi-VN`; architecture ready for future `en` localization
**Baseline:** Phase 1.2 Catalog / Partner / Geospatial; `/ai-planner` is a static UI preview.

> This specification is a design proposal, not confirmation that its target UI has been coded, tested or approved by the project owner. The reference website is a creative reference only; do not copy its logo, proprietary photos, copy, HTML, CSS, JS, interaction implementation or motion sequence.

## 1. Design thesis & differentiator

**Design thesis:** `Luxury Editorial × Cinematic Travel × Intelligent Planning`.

ADORA should feel like a curated travel journal at discovery time and like a dependable software product during planning and booking. Build an original Vietnam-centered identity. Do not build a Snami replica.

**Product promise, bounded by reality:** Let visitors explore travel locations and curated service offers, and learn about the upcoming AI planning workflow. The database-backed Catalog exists; Gemini itinerary generation, inventory reservation, booking, payment, voucher, and live conversation are not yet implemented.

### Reference source separation

**Observed from public Snami pages:** Full-screen travel-oriented visual hierarchy, large editorial copy, brand philosophy chapters, hotel/villa collections, experience collections, multi-day itinerary section, destinations, journal, and a large closing area. Its creator, Lime Creative, describes photography, a quiet palette, restrained motion and modular layouts. See `06_SOURCE_NOTES.md`.

**Independent ADORA design decisions:** Vietnam/Đà Lạt focus, AI-specific CTAs, colors, fonts, section arrangement, copywriting, data mapping, state labels, layout dimensions and motion thresholds below. These are not measured Snami design-token values.

## 2. Experience architecture

### Two distinct presentation modes

| Surface | Design character | Engineering posture |
|---|---|---|
| Discovery: `/`, destinations/experiences/stays when implemented | Large photography; editorial serif; generous negative space; modular storytelling | Server-first rendering; crawlable text and links; media optimization |
| Application: `/ai-planner`, later itinerary/checkout | High information density, minimal, predictable; readable sans-serif; controlled hierarchy | Preserve Phase 1.2 planner skeleton; do not invent AI behaviors |
| Admin / partner | Neutral operational UI | Out of scope for this design initiative |

### Sitemap, with availability truth

| Route | Status at Phase 1.2 | Design intent | Rule |
|---|---|---|---|
| `/` | Existing shell; redesign target | Marketing / discovery homepage | Implement in Web Design 0.2 |
| `/ai-planner` | EXISTING static preview | Application shell | Preserve unchanged except safe navigation/brand tokens; explicit preview label |
| `/destinations` | NOT CONFIRMED IMPLEMENTED | Destination discovery | Plan only; avoid broken links |
| `/destinations/[slug]` | NOT CONFIRMED IMPLEMENTED | Rich destination editorial page | Plan only |
| `/experiences` | NOT CONFIRMED IMPLEMENTED | Curated experiences listing | Plan only |
| `/stays` | NOT CONFIRMED IMPLEMENTED | Accommodation catalog | Plan only |
| `/about` | NOT CONFIRMED IMPLEMENTED | Brand narrative | Plan only |
| `/sign-in` | NOT CONFIRMED IMPLEMENTED | Identity entry | Do not assume web UI exists |
| `/admin` and partner areas | NOT ASSESSED | Operations | Not part of this visual redesign |

**Navigation rule:** A visible navigational control must go to a working route, to an in-page anchor, or clearly indicate `Sắp ra mắt`. Never create clickable controls that silently 404.

## 3. Homepage page model — section-by-section

All below section IDs are project conventions, not Snami's element structure.

| Order / ID | Visual treatment | Content and data | Primary action | Status / fallback |
|---|---|---|---|---|
| 00 `site-header` | Transparent-on-hero; elegant wordmark; compact desktop links; mobile menu | ADORA, Explore, Điểm đến, Trải nghiệm, Adora AI | `Khám phá Adora AI` -> `/ai-planner` | Make preview state clear |
| 01 `hero` | 100svh art-directed image; bottom/left aligned title; subtle overlay | Original title `Đi xa. Theo cách của riêng bạn.` + concise supporting sentence | `Khám phá điểm đến` -> `#destinations` | Hero asset must be original or properly licensed; fallback solid dark background |
| 02 `manifesto` | Ivory ground, asymmetric copy/media blocks | Adora's explanation of tailored travel; avoid false operational promises | Jump to `#how-it-works` | Static approved copy |
| 03 `destinations` | Large editorial feature tile and smaller supporting tiles when data exists | `GET /api/v1/destinations` active only; start with one verified demo destination: Đà Lạt | Use valid link or informational card | Never fabricate unavailable additional destinations; 1 tile layout valid |
| 04 `experiences` | Opposing image/text rhythm; stack/crossfade permitted later | `GET /api/v1/offers` active offers, relevant types `experience`, `stay`, `transport` | In-page CTA only unless actual offer detail route exists | Demo-tag example records; no live prices/stock implied |
| 05 `ai-feature` | Deep ink / sage thematic interlude with expressive typography | Explain direction of ADORA AI, not working functionality | `/ai-planner` labelled `Xem bản xem trước AI Planner` | No input or actual AI conversation on homepage |
| 06 `how-it-works` | Three-step sequential graphic, not complicated wizard | `Khám phá` → `Thiết kế hành trình` → `Tùy chỉnh dịch vụ` | `Tìm hiểu trải nghiệm` -> `/ai-planner` preview | Mark not-yet-built steps as `Đang phát triển` |
| 07 `closing` | Big travel image/color field; statement; spacious footer | Brand signature, main section navigation, contact only if verified | Return to `#top` | No fake testimonials, counters, award logos or press mentions |

### 3.1 Hero specification

- Semantic `h1` with meaningful Vietnamese words accessible without images or motion.
- The first frame must work on both landscape and portrait crops; do not position essential text over an unverified busy background.
- Desktop: minimum viewport height `100svh`, compact nav overlay; title max ~12 characters per display line through manual `span` breaks only when they reflow safely.
- Mobile: vertically centered/bottom-balanced crop; reduce title to 48–68px fluid range; preserve contrast and safe-area insets.
- CTA is a true anchor to `#destinations`; secondary link to `/ai-planner` with preview label.
- No mandatory autoplay background video in initial implementation. If later used, offer poster fallback, muted autoplay only when permitted, reduced-motion static behavior, and compression controls.

### 3.2 Destination data truth

Phase 1.2 reported an idempotent Đà Lạt demo dataset with `1 destination, 4 nearby places, 3 active offers`. The homepage must not pretend that 4 destination cards exist. Render one full-width editorial feature when only one destination is available. If API is down, show an honest static brand narrative and avoid fabricated catalog claims. Mark any demo catalog records as illustrative.

### 3.3 Experience data truth

`service_offers` is catalog definition and price, not dated availability. Never display `Available now`, a live seat count, checkout CTA or claim verified pricing. If an offer is demo-seeded, show `Dữ liệu minh họa` or omit price until a reviewable disclosure decision is made.

### 3.4 AI state truth

Route `/ai-planner` remains a static shell. Use `Xem bản xem trước AI Planner` and optionally an inline `Tính năng đang được phát triển` note. Do not show generated conversation outcomes, fake messaging, simulated AI replies or imply Gemini is connected.

## 4. Design system v1.0

### Tokens

Source of truth is `02_DESIGN_TOKENS.json`. Proposed palette:

| Token | Value | Role |
|---|---|---|
| `ink` | `#171A19` | Editorial headings, deep surfaces |
| `ivory` | `#F3EFE7` | Warm foundation |
| `paper` | `#FAF8F3` | Form/reading surfaces |
| `gold` | `#B39A70` | Rare subtle embellishment; NOT default body text on light backgrounds |
| `sage` | `#586C65` | Calm accents / section backgrounds |
| `mist` | `#C8D7DB` | Muted secondary accents |
| `white` | `#FFFFFF` | Contrast and image overlays |

Typography: display serif **Playfair Display** (verify Vietnamese glyph rendering in deployed subset); sans-serif **Be Vietnam Pro**. Use hosted/local font loading through approved package integration (e.g. `next/font/google`) and standard fallbacks. Do not download or redistribute font files outside their license.

- Display scale: `clamp(3.1rem, 7.1vw, 8.5rem)`, `line-height: 0.95–1.05`, letter spacing: carefully tuned.
- Section title: `clamp(2.2rem, 4.7vw, 5.4rem)`.
- Body default: 16px with 1.6 line-height; editorial lead 18–22px.
- Micro labels: 11–13px, uppercase optional but never for long Vietnamese paragraphs.
- Layout max width: 1360px; content gutters `clamp(20px, 4vw, 72px)`.
- Grid: desktop 12 columns (conceptual), tablet 8, mobile 4; use CSS Grid/Flex without extra grid package.
- Section spacing: desktop 112–160px, tablet 80–112px, mobile 64–88px.
- Border radius: mostly 0–12px for editorial; avoid repeated rounded SaaS-card look.
- Decorative separators: fine 1px rules; minimal iconography.

### Visual rhythm / photo art direction

- Chapter-like alternation: ink hero → ivory manifesto → image-led destination → paper editorial experience → ink AI section → ivory instruction → photo/ink closing.
- Prefer original, permission-cleared Vietnam landscape and human-scale moments: Đà Lạt fog, pine, light, craft, architecture, cafés. Do not misrepresent a photo of another location as Đà Lạt.
- Hero ratio target: approximately 16:9 desktop and dedicated 4:5 or 3:4 mobile crop; destination covers 3:4 to 4:5; landscape editorial frames ~16:10.
- Image manifest must record source URL/file, license/permission, alt text, focal point, mobile crop, file owner.
- Design does not depend on a supplied proprietary Snami asset.

## 5. Motion & interaction contract

| Behavior | Initial recommendation | Reduced-motion behavior |
|---|---|---|
| Header on scroll | CSS background transition, 180–240ms | Immediate/no transition |
| Hero entry | Only small opacity/translate reveal, 450–700ms | All content visible immediately |
| Image reveal | Intersection-based or CSS only when beneficial; no dependency required | Static image |
| Hover images | scale `1 → 1.025`, 280–400ms | No scale |
| Links | Underline or subtle color transition, 160–220ms | Instant state |
| Parallax | **Deferred** (not needed for v1) | Disabled |
| Scroll hijacking / pinned timelines | **Prohibited initially** | Not used |

Use client components only for real interaction: menu expansion or optional enhancement. Content, headings, and SEO text remain server-rendered. Do not add GSAP, Lenis, Framer Motion or a canvas renderer simply to imitate the reference.

## 6. Responsive & accessibility criteria

- Test width `360`, `390`, `768`, `1024`, `1440` and large desktop up to `1920`.
- No horizontal overflow; text not clipped at 200% zoom.
- Mobile navigation keyboard accessible and operable by touch; visible focus styles.
- Color contrast: body text minimum 4.5:1, large text minimum 3:1 per WCAG AA; check with tooling against actual composited photo overlays.
- Motion must respect `prefers-reduced-motion`.
- All meaningful imagery has appropriate alt text; decorative imagery uses empty alt.
- At most one `h1`; proper landmark and heading hierarchy; no inaccessible buttons/links.
- Touch targets aim for at least 44×44px.
- Meaningful content not hidden in animation-only / hover-only states.
- Mobile menu / interactive disclosure must convey expanded state to assistive technology.

## 7. Performance and SEO budgets

**Targets** are acceptance budgets to measure, not current scores:

- On representative mobile field/simulated conditions: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms when measurable.
- Keep initial client JS limited, with Server Components for static/marketing/catalog reads.
- Use `next/image` with `sizes`, relevant remote allowlist, selective hero `preload` only when appropriate for Next.js 16, lazy-load below-fold imagery.
- Avoid blocking third-party font, video or animation payloads.
- Unique `<title>`, meta description, OG image only with licensed source, relevant canonical URL when deployed.
- Do not claim a CMS blog/Travel Journal exists unless route and content source are implemented.
- Measurable CI/evidence: Lighthouse run (where tooling available), output sizes, screenshot viewports, axe or accessibility checklist.

## 8. React / Next.js implementation rules

Proposed implementation boundaries after Phase 1.2 closure:

```text
apps/web/src/
  app/
    page.tsx                   # homepage Server Component
    ai-planner/page.tsx        # preserve existing static preview
    globals.css                # scoped design tokens & base styles
  components/
    site/                      # header, footer; avoid duplicate existing
    home/                      # hero, manifesto, destination, experience, AI-teaser, steps
  lib/
    catalog/                   # server-only public API adapter if integration chosen
```

- **Inspect actual source tree first**. Existing components may already provide layout/nav; extend rather than duplicate.
- Public Catalog endpoints: `GET /api/v1/destinations`, `GET /api/v1/places`, `GET /api/v1/offers`. Use existing OpenAPI-generated client where appropriate.
- API host may still run outdated Phase 1.1 code on `8000` until restarted. Verify actual `openapi.json` paths before trying live integration. Never terminate unrelated processes.
- Catalog fetch errors must not break the homepage or cause a release build to require a live local API; use graceful unavailable/empty editorial states without invented commercial content.
- Keep `NEXT_PUBLIC_*` values restricted to nonsecret public URLs; prefer server-only environment for server fetches.
- Separate server presentation from an optional minimal client navigation shell; do not convert the entire homepage to `use client`.
- Do not touch FastAPI, ORM, Alembic, Expo or the 24-table schema for a visual homepage change.

## 9. Deliverables of Web Design 0.2 (not yet executed)

1. Implemented homepage (`/`) following this design direction.
2. Responsive header/footer with working anchors and honest preview links.
3. Sections 01–07 following semantic markup and data truth rules.
4. Original/approved photography or intentionally labeled placeholders with asset-manifest note.
5. Web-only quality checks and unchanged monorepo regression gates.
6. Desktop and mobile screenshots, before/after review, accessibility and reduced-motion evidence.
7. Review report: `docs/reports/WEB_DESIGN_0_2_HOME_IMPLEMENTATION.md`.

## 10. Acceptance gates for the next implementation

| Gate | Criterion |
|---|---|
| DESIGN | Typography, palette, rhythm and page hierarchy accord with blueprint without copying Snami |
| CONTENT | No false claims about AI, booking, catalog prices, testimonials or destinations |
| ROUTES | `/` and `/ai-planner` continue to render; no misleading broken link |
| DATA | API unavailable/empty/1-item states are graceful and accurate |
| A11Y | Keyboard menu, contrasts, semantics, image alts, reduced motion |
| PERFORMANCE | No needless huge video/animation dependency; metrics measured/report limitations |
| RESPONSIVE | Screenshots at desktop 1440x900 and mobile 390x844, no horizontal overflow |
| REGRESSION | `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; backend/mobile gates unchanged |
| GIT | Phase 1.2 closure verified before homepage changes; no unreviewed destructive operation |

## 11. Non-goals / non-copying boundaries

- Not a pixel-perfect recreation of Snami or a code extraction job.
- Not a live AI chatbot implementation.
- Not a booking/checkout frontend.
- Not an admin redesign.
- Not an image or content scraping task.
- Not a new database migration or backend feature.
- Not a claim of visual parity with Snami without side-by-side browser inspection and original assets.

## 12. Review checkpoints

- **Design freeze:** approve core identity and homepage section list.
- **Implementation start:** after Phase 1.2 closure checkpoint, execute `05_CODEX_IMPLEMENTATION_PROMPT.md`.
- **QA freeze:** verify 390/1440 screenshots, motion opt-out, Catalog data integrity, no regressions.
