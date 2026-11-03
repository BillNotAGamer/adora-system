# ADORA — Website Design QA Acceptance Matrix v1.0

## Phase and Git guards

- [ ] Phase 1.2 closure status checked; commit SHA recorded; no unrelated working-tree changes overwritten.
- [ ] API port 8000 confirmed to run current 28-path code (or no API assumed); do not stop unrelated process.
- [ ] Only `apps/web` and directly necessary shared frontend documentation/config changed.
- [ ] `/ai-planner` remains static and explicitly a preview; no Gemini/chat backend introduced.
- [ ] `0001_adora` migration unchanged.

## Visual

- [ ] At 1440×900, distinct cinematic hero, readable large heading, one primary CTA, and tasteful navigation.
- [ ] At 390×844 and 360×800, no horizontal overflow or clipped Vietnamese diacritics.
- [ ] At 768, 1024 and 1920 widths, grid and section composition remain legible.
- [ ] Mobile and desktop crops correspond to actual approved asset license and focal points.
- [ ] Repeated visual sections do not devolve into generic dashboard cards.
- [ ] Color/typography/spacing correspond to v1.0 tokens or deviations are documented.

## Accessibility

- [ ] Keyboard-only navigation passes; focus outline visible.
- [ ] Menu button exposes `aria-expanded` and controls actual menu visibility.
- [ ] One semantic `h1`; sensible document landmarks and section headings.
- [ ] WCAG AA text contrast checked on image overlays and solid backgrounds.
- [ ] `prefers-reduced-motion` removes purely decorative motion.
- [ ] Images have meaningful alt or empty decorative alt.
- [ ] No essential text baked into bitmap or exposed only on hover.

## Product integrity

- [ ] No fake booking/availability or AI functionality.
- [ ] Demo records labeled; one real demo destination is not multiplied into fictional entries.
- [ ] If Catalog API is unavailable, homepage still builds and renders honest fallback.
- [ ] All active links resolve, scroll to anchors, or are visibly unavailable.
- [ ] No social proof without real authorization.
- [ ] No third-party Snami assets or code imported.

## Engineering

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build` pass.
- [ ] Backend `pytest`, schema audit, and CI baseline unaffected.
- [ ] `next/image` `sizes` and Next.js 16 `preload` usage reviewed for actual LCP candidate.
- [ ] Web API adapter uses correct current OpenAPI schema; no runtime key exposed.
- [ ] Screenshots and browser viewport metadata captured.
- [ ] Lighthouse and core web vital measurements documented when available; no invented scores.
- [ ] Review report lists tests, failures, remedies, residual issues.
