# ADORA — WEB DESIGN 0.2: EDITORIAL HOMEPAGE IMPLEMENTATION

## Mission

You are a senior frontend engineer / creative technologist implementing the *approved proposal* `ADORA Website Design Blueprint v1.0` into the EXISTING Next.js application. This is an implementation task, not a plan-only task. Build a real, responsive homepage that retains existing functionality and clearly distinguishes current product capability from future features.

## Workspace and source-of-truth

Repository root: `F:\Coding\Adora System Mega Project\adora-system`

Blueprint package: the user will provide these files or place the extracted `ADORA_Website_Design_Blueprint_v1.0` folder in the parent workspace. Locate and read `01_DESIGN_BLUEPRINT.md`, `02_DESIGN_TOKENS.json`, `03_INFORMATION_ARCHITECTURE.md`, `04_QA_ACCEPTANCE_MATRIX.md`, and `06_SOURCE_NOTES.md` before changes. Inspect the actual `apps/web` tree, root `AGENTS.md`, and Phase 1.2 report. The standalone `07_HOMEPAGE_CONCEPT.html` is **composition guidance only**—not a request to paste its CSS or HTML directly into production, and not an exact visual pixel target.

Creative reference: https://www.snamitravel.com/ — learn general editorial travel design principles, not copy specific compositions, branding, proprietary media, scripts or content.

## Phase and Git gate

Before changing the homepage:

1. Confirm branch, HEAD, working-tree status and the status of the Phase 1.2 review/closure commit.
2. If Phase 1.2 changes are still uncommitted, **do not silently combine them into this design task**. Stop and report the closure prerequisite; do not create an unrequested commit or stage unrelated work.
3. Check whether port 8000 serves stale Phase 1.1 API (7 paths) instead of Phase 1.2 API (28 paths). Inspect before any process change; never terminate an unrelated process. If current API is unavailable, implement fail-safe frontend states rather than lying about data.
4. Keep `0001_adora` immutable; do not change SQLAlchemy, Alembic, FastAPI, Expo, authentication policy, or payment/booking modules.

## Design and product requirements

Implement homepage `/` with a coherent original Adora identity, using existing Tailwind CSS, React 19 and Next.js 16:

- Cinematic hero with clear Vietnamese `h1`: `Đi xa. Theo cách của riêng bạn.`
- Brand manifesto.
- Active destination editorial area; gracefully handles **one** Đà Lạt demo destination.
- Experiences editorial area from actual active service offers when available.
- Dark AI Planner teaser linking to the already existing `/ai-planner`, **explicitly labeled a preview**.
- `How Adora Works` section with future functionality clearly distinguished from currently implemented APIs.
- Spacious closing CTA/footer and responsive accessible navigation.

Implement the precise source-of-truth constraints in the blueprint and preserve the existing `/ai-planner` page as a static placeholder. All visible UI must be SSR-visible where possible. Prefer Server Components for marketing/data sections; use a small Client Component only for a working accessible mobile menu or equivalent necessary interaction.

Never:

- Claim Gemini, itinerary generation, chat streaming, inventory, booking, payment or vouchers work yet.
- Show fake destinations, fake testimonials, fake social proof, fabricated availability or fake price claims.
- Link to non-existent routes; use valid anchors, verified routes or clearly labeled `Sắp ra mắt` elements.
- Copy Snami assets, text or code.
- Add large animation frameworks, video-heavy hero assets or unnecessary client-side state.

## Design tokens and asset rules

Use the blueprint's original palette (ink/ivory/paper/sage/gold/mist), Playfair Display for display headings and Be Vietnam Pro for supporting text if Vietnamese subsets work. Check visual diacritics. Keep typography legible if fonts fail to load.

Use licensed/original Adora photography if actually available. Otherwise, use intentional artistic placeholders marked as such and document assets still required. Never hotlink an unlicensed competitor image or pretend an abstract stand-in is a real Vietnamese destination photo.

Use proper responsive images (`next/image` when appropriate), explicit `sizes`, performance-minded LCP treatment and low layout shift. Respect `prefers-reduced-motion`. Avoid scroll hijacking.

## Catalog integration

Current Phase 1.2 public APIs are reported as:

- `GET /api/v1/destinations`
- `GET /api/v1/places`
- `GET /api/v1/offers`

Verify the actual current OpenAPI shape and generated client before writing data adapters. Active records only. Render empty/unavailable states gracefully; do not require the locally running API to complete `next build`. Treat seed entries as demonstrative with a visible disclosure. Do not imply offers represent bookable inventory.

If safe server-side Catalog integration is blocked by the stale API/route mismatch, keep the homepage buildable and report the integration blocker rather than adding fictitious data.

## Architecture / quality requirements

- Reuse current site components and navigation when compatible; avoid duplicate wrappers.
- Maintain correct semantic landmarks and one `h1`.
- Keyboard-accessible navigation with visible focus, `aria-expanded` on interactive mobile menu.
- Check text contrast and meaningful image alt; hide decorative imagery from screen readers.
- Viewports: 360x800, 390x844, 768x1024, 1024x768, 1440x900, 1920x1080.
- Zero horizontal overflow, including mobile Vietnamese accents.
- Reduced-motion screenshots/behavior.
- No misleading broken CTA or fake chat submission.
- API contract still generated from backend; no duplicate types.

## Verification

Run the existing pnpm and repository quality scripts supported by the local environment, including:

- `corepack pnpm@12.16.1 lint`
- `corepack pnpm@12.16.1 typecheck`
- `corepack pnpm@12.16.1 build`
- `corepack pnpm@12.16.1 verify` if available and prerequisites are healthy

Validate homepage and `/ai-planner` via browser when possible, with desktop + mobile screenshots. Record exact viewport sizes and overflow status. Validate empty/one-record/API-unavailable states if Catalog data is connected. Do not claim native Expo tests when not executed. Do not run destructive Docker/database commands.

## Report

Create `docs/reports/WEB_DESIGN_0_2_HOME_IMPLEMENTATION.md` with:

1. Initial Git state and Phase 1.2 closure confirmation.
2. Implemented visual sections and reusable component choices.
3. Tokens and font loading strategy.
4. License/source manifest for every real photo/video used.
5. Catalog API integration / honest fallback decisions.
6. Router/CTA correctness and `/ai-planner` preservation.
7. Accessibility and reduced-motion results.
8. Desktop/mobile screenshots with exact dimensions and overflow checks.
9. Executed commands, exact outcomes and regression results.
10. Known limitations, asset gaps and suggested next step.

Leave all Web Design 0.2 changes reviewable and uncommitted unless explicitly authorized. Do not begin an AI integration, booking interface or admin redesign.

**Start only after the Phase 1.2 Git gate is satisfied.**
