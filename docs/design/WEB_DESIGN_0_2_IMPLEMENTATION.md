# ADORA Web Design 0.2 — Implementation Notes

## Purpose

This document records the production translation of the approved **ADORA Website Design Blueprint v1.0** into the existing Next.js 16 application. The creative direction is **Luxury Editorial × Cinematic Travel × Intelligent Planning**.

The implementation is intentionally limited to the customer-facing homepage. It does not add booking, payment, inventory reservation, Gemini integration, or AI conversation behavior.

## Implemented homepage sequence

1. Cinematic, near-full-viewport hero with premium navigation and the primary `Plan with Adora AI` action.
2. Asymmetric brand-philosophy statement.
3. Single-destination editorial story, backed by the public Catalog API when available.
4. Curated experience story with an explicit non-commercial data disclaimer.
5. Dark AI-planning interlude linking to the existing static `/ai-planner` skeleton.
6. Three-step “Cách ADORA hoạt động” explanation.
7. Restrained closing call to action and semantic footer.

## Design tokens

The implementation uses the Blueprint values directly as CSS custom properties in `apps/web/src/app/globals.css`:

| Token | Value | Use |
|---|---:|---|
| Ink | `#171A19` | Primary text and dark AI section |
| Ivory | `#F3EFE7` | Warm editorial surfaces and light CTAs |
| Paper | `#FAF8F3` | Main page canvas |
| Gold | `#B39A70` | Restrained accent and step numerals |
| Sage | `#586C65` | Secondary editorial emphasis |
| Mist | `#C8D7DB` | Image loading background |
| Text secondary | `#46524D` | Long-form supporting copy |
| Hairline | `#CEC8BC` | Dividers and structural borders |

The content container is capped at `1360px`, gutters use `clamp(20px, 4vw, 72px)`, and section spacing follows the Blueprint’s desktop and mobile clamp values.

## Typography

- Display: **Playfair Display**, variable, loaded and self-hosted by `next/font`.
- Body/application: **Be Vietnam Pro**, weights 400–700, loaded and self-hosted by `next/font`.
- Both fonts load the `latin` and `vietnamese` subsets.
- The homepage uses one semantic `h1` and a sequential heading hierarchy.

## Component architecture

| Component | Responsibility | Rendering |
|---|---|---|
| `EditorialHero` | Hero image, brand proposition, primary actions | Server Component |
| `SiteHeader` | Desktop navigation and accessible mobile disclosure | Client Component |
| `BrandPhilosophy` | Editorial manifesto | Server Component |
| `DestinationStory` | Catalog-backed or fallback destination story | Server Component |
| `ExperienceStory` | Offer names or labeled editorial inspirations | Server Component |
| `AiPlannerSection` | Static AI capability introduction | Server Component |
| `HowItWorks` | Three-step process | Server Component |
| `SiteFooter` | Closing CTA and footer navigation | Server Component |

Only the mobile menu needs client-side state. There is no homepage client-side data fetching or global state.

## Catalog integration

`apps/web/src/lib/catalog.ts` imports types from `@adora/api-client`, whose schemas are generated from FastAPI OpenAPI. Destination and offer requests run concurrently and use:

- public `GET /api/v1/destinations` and `GET /api/v1/offers` endpoints;
- a 1.8-second timeout;
- five-minute Next.js revalidation;
- a `Suspense` boundary compatible with Cache Components and Partial Prerendering;
- an honest editorial fallback when either dependency is unavailable.

Fallback text is explicitly labeled `Gợi ý biên tập · API tạm ngoại tuyến`. No live price, availability, inventory, booking, or commercial claim is fabricated. Public offer names may be displayed, but are marked as potentially demo-backed and never presented as bookable inventory.

## Asset provenance and optimization

All three homepage photographs were generated specifically for ADORA with OpenAI’s built-in image generation tool on 2026-11-04. They do not use Snami Travel media, third-party stock, hotlinks, logos, or trademarked content.

Final project assets:

- `apps/web/public/images/home/adora-highlands-hero.webp` — 115,390 bytes
- `apps/web/public/images/home/dalat-pine-trail.webp` — 380,818 bytes
- `apps/web/public/images/home/highland-coffee-ritual.webp` — 204,706 bytes

The generated PNG originals were converted with the repository’s installed Sharp package to quality-82 WebP. The original PNG outputs remain recoverable in Codex’s generated-image store. `next/image` provides responsive sizing; the hero is preloaded and below-fold imagery remains lazy.

These assets are project-generated, pre-production creative material. A final legal/brand review is recommended before a public commercial launch; no claim of exclusive copyright registration is made.

### Final image prompt set

#### Hero highlands

> Use case: photorealistic-natural. Asset type: ADORA premium travel homepage hero background. Cinematic Vietnamese highland landscape inspired by Đà Lạt at first light, layered pine forest ridgelines emerging through soft mist, a quiet winding road barely visible in the valley. Highly realistic editorial travel photography with natural filmic texture. Ultra-wide landscape with darker negative space for white editorial copy and a crop safe for desktop and mobile. Restrained ink green, sage, mist blue-gray and ivory. No people, vehicles, buildings, text, logo, watermark, trademark, fantasy mountains, copied composition, or oversaturated grading.

#### Destination portrait

> Use case: photorealistic-natural. Asset type: ADORA featured-destination editorial portrait. A quiet Đà Lạt-inspired pine forest path descending toward a misty mountain lake in early morning. Realistic premium travel editorial photography, vertical portrait composition, tactile pine bark and wet earth, safe for 4:5 and 3:4 crops. No people, signs, buildings, text, logo, watermark, trademark, fantasy lighting, alpine snow, or European cabins.

#### Coffee ritual

> Use case: photorealistic-natural. Asset type: ADORA curated-travel-experience photograph. An intimate Vietnamese highland coffee ritual on a quiet wooden terrace at dawn, natural adult hands pouring slow-drip coffee beside handmade ceramic, with pine forest and mist softly out of focus. Horizontal editorial composition, candid realism, warm clay and ink-green palette. No faces, text, logo, watermark, packaging, trademark, copied brand photography, bright signage, or excessive props.

## Responsive behavior

- Verified widths: 360, 390, 768, 1024, 1440, and 1920 pixels.
- Hero typography uses fluid `clamp()` sizing and controlled line lengths.
- The desktop navigation becomes a 44px mobile disclosure button.
- Editorial grids reflow into intentional mobile sequences rather than scaled desktop columns.
- Image crops use separate mobile/desktop object positioning where needed.
- Automated geometry checks confirmed `scrollWidth === innerWidth` at all target widths.

## Motion strategy

- CSS-only image scale on hover.
- A restrained scroll indicator animation.
- Short color/gap transitions for editorial links.
- No scroll hijacking, parallax runtime, or animation dependency.
- `prefers-reduced-motion: reduce` disables animation, smooth scrolling, and transitions.

## Accessibility and SEO

- Semantic `main`, `header`, `nav`, `section`, `article`-equivalent content groupings, and `footer` landmarks.
- One H1; meaningful heading order and link labels.
- Descriptive Vietnamese alternative text on all photography.
- Visible gold focus indicator and minimum 44px primary mobile targets.
- Mobile menu exposes `aria-expanded`, `aria-controls`, and state-specific labels.
- Final primary CTA computes to ink `rgb(23, 26, 25)` on ivory `rgb(243, 239, 231)`.
- Static Next.js metadata includes a Vietnamese title, description, Open Graph copy, locale, and indexing policy without inventing a deployed URL.

## Blueprint deviations

1. Concept screenshot imagery was not copied. Original ADORA-specific assets replace all placeholders.
2. Only one destination is shown, matching the honest demo-data constraint instead of fabricating a destination carousel.
3. Live Catalog content is streamed behind a complete editorial fallback because the local API was unavailable during the final visual run.
4. Motion remains CSS-only; heavier parallax/reveal systems were deferred for performance and reduced-motion safety.
5. No unavailable header links (account, search, booking) were added.

## Deferred improvements

- Re-run Catalog-backed visual verification when PostgreSQL/Redis and the current FastAPI process are available.
- Perform a Lighthouse audit when the CLI or browser integration is available.
- Add production-approved image art direction if a final licensed photography library replaces the generated pre-production assets.
- Extend route-level navigation only when corresponding customer routes are implemented.
