# ADORA Web Design 0.4 — Independent Motion Architecture Review

**Date:** 2026-11-07
**Reviewer:** Claude (Claude Code, Opus 5.5), independent from the Gemini planning agent
**Documents under review:** `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md` ("the spec"), `docs/reports/WEB_DESIGN_0_4_MOTION_PLANNING_REPORT.md` ("the planning report")
**Baseline:** `main` @ `c49595573f8b7214f414a589006b748d5d6babfb`
**Nature of this document:** Architecture review only. No application source, CSS, test, dependency, lockfile, or Git history was modified. No browser, build, or performance measurement was executed for this review.

**Evidence labels used throughout**

| Label | Meaning |
| :--- | :--- |
| **[OBSERVED]** | Read directly from repository source or files at the stated line numbers. |
| **[DOCUMENTED]** | Stated in the documentation bundled with the installed package version (`node_modules`), not inferred. |
| **[INFERRED]** | Reasoned from browser/React behaviour; plausible but **not executed**. Each one names how to verify it. |
| **[RECOMMENDATION]** | Reviewer's proposed change. |

---

## 1. Executive Verdict

The spec's creative direction is sound. Its core technical bet also holds: a zero-dependency stack (CSS tokens, CSS keyframes and transitions, one small `IntersectionObserver` client leaf, grid-row accordions) is **sufficient** for the motion in scope. None of the twenty inventory items needs GSAP or Motion for React, and the Blueprint's prohibition on them stands (`01_DESIGN_BLUEPRINT.md:138`).

The spec is **not implementation-ready as written**. In several places the source code or the installed framework contradicts its implementation details. The seven blocking findings are:

1. **The scroll-reveal contract can hide content that is on screen.** The `rect.top > innerHeight * 0.92` rule (spec `:36`, `:275`) hides elements that are partly visible in the bottom 8% of the viewport after hydration. Its `threshold: 0.12–0.2` triggers can also stop very tall elements from ever revealing.
2. **The `<Reveal>` design as described fails the project's lint gate.** It calls `setState("pending")` synchronously in `useEffect` (spec `:273–276`). The installed `eslint-plugin-react-hooks` v7 enables `set-state-in-effect` at **Error** in its recommended preset, and `eslint-config-next` spreads that preset in full. **[OBSERVED]**
3. **The spec ignores Next.js 16 `<Activity>` route preservation.** With `cacheComponents: true` (`apps/web/next.config.ts:5`), visited routes are hidden with `display: none` instead of unmounted, and effects re-run when a route is shown again **[DOCUMENTED]**. When an element leaves `display: none`, its CSS keyframe entrances restart. Going Back to `/ai-planner` would therefore replay every chat bubble's entrance at once **[INFERRED]**.
4. **AI Planner anchoring is vulnerable to the proposed transforms.** Planning report Risk 4 (`:131`) says scroll anchoring uses `offsetTop`. It does not: it uses `getBoundingClientRect()` (`planner-workspace.tsx:77–80`, `:89–91`), which includes CSS transforms. An `8–10px` entrance rise skews the anchor and can cause a post-animation scroll clamp.
5. **The accordion structure as specified will not fully collapse.** The existing region carries `border-t px-4 py-5` (`itinerary-explorer.tsx:121`). Under a `0fr` track, that padding and border stay visible as a strip of about 41px unless they move to an inner element.
6. **The performance baseline column is not measured data.** No Web Design 0.3 report measured LCP, CLS, or INP (`WEB_DESIGN_0_3_ESSENTIAL_PAGES_REPORT.md:275` records that Lighthouse was unavailable). The spec's "Verified Baseline" column (`:284–293`) and the "zero LCP penalty" claim (planning report `:113`) are hypotheses, not evidence.
7. **CSS cascade rules are missing**, and without them the effects will silently break existing behaviour:
   - Tailwind v4 emits the individual `translate`, `rotate`, and `scale` properties, not `transform`.
   - An `animation-fill-mode: both`/`forwards` image settle would permanently override `.image-reveal:hover img`.
   - Fading full-bleed coloured sections from `opacity: 0` would flash the paper background.

All of these can be fixed inside the chosen architecture. No rework of the approach is needed.

**Verdict: APPROVED WITH REQUIRED REVISIONS.** §12 separates blocking from optional revisions.

---

## 2. Verified Repository State

Verified with command-local `git -c safe.directory="F:/Coding/Adora System Mega Project/adora-system" …`. Global Git configuration was not altered.

| Item | Observed value |
| :--- | :--- |
| Branch | `main` |
| HEAD | `c49595573f8b7214f414a589006b748d5d6babfb` — matches the stated Phase 0.3 closure commit |
| Recent history | `c495955` feat(web) 0.3 → `fe94095` → `4fe1403` → `5d4f5a7` → `91bb11c` → `116a378` → `9840067` |
| Working tree before this review | Two untracked files only: `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md`, `docs/reports/WEB_DESIGN_0_4_MOTION_PLANNING_REPORT.md` (both preserved, unmodified) |
| Working tree after this review | The above plus this file: `docs/reports/WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md` |
| Commits created | None |

**Toolchain facts relevant to motion [OBSERVED]:**
- `next` 16.4.3 with `cacheComponents: true` and `partialPrefetching: true` (`apps/web/next.config.ts:5–6`).
- `react`/`react-dom` 19.3.0, and no animation library in `apps/web/package.json`.
- `eslint-config-next` spreads `eslint-plugin-react-hooks` (v7) `configs.recommended.rules`. That preset includes `set-state-in-effect` with severity Error.
- App Router Strict Mode is on by default **[DOCUMENTED]** (`next/dist/docs/.../reactStrictMode.md:8`).

---

## 3. Review Methodology

**Read in full:** `AGENTS.md`; the spec; the planning report; `apps/web/src/app/globals.css`; `planner-workspace.tsx`; `itinerary-explorer.tsx`; all six homepage section components; `site-header.tsx`; `site-footer.tsx`; `page-intro.tsx`; `destination-browser.tsx`; `experience-browser.tsx`; `experience-grid.tsx`; `experience-card.tsx`; `planner-cta.tsx`; `trip-card.tsx`; every route page under `apps/web/src/app/{,destinations,experiences,trips,ai-planner}`; `layout.tsx`; `providers.tsx`; `loading.tsx`; `next.config.ts`; `package.json`; `eslint.config.mjs`; `scripts/verify_web_0_3.mjs`; the relevant parts of `scripts/verify_homepage.mjs`.

**Read selectively:** Blueprint `01_DESIGN_BLUEPRINT.md` §5–7 and `02_DESIGN_TOKENS.json`; `WEB_DESIGN_0_3_FRONTEND_ARCHITECTURE.md`; `WEB_DESIGN_0_3_ESSENTIAL_PAGES_REPORT.md`; `WEB_DESIGN_0_3_TEST_MATRIX.md` (searched for motion, scroll, a11y, and performance content).

**Framework verification:** Activity, Strict Mode, and scroll behaviour were checked against the documentation bundled with the installed `next@16.4.3` (`node_modules/.pnpm/next@16.4.3…/node_modules/next/dist/docs/`), not against memory. ESLint rule severity was checked in the installed `eslint-plugin-react-hooks` source.

**Not executed:**
- No dev server, production build, headless browser run, Lighthouse run, or performance trace.
- Every runtime claim below is labelled [INFERRED] and paired with a verification step.
- No profiling dependency was installed.

---

## 4. Motion Architecture Assessment

### 4.1 Is the zero-dependency architecture sufficient?

**Yes.** The table maps each capability the approved choreography needs to a native mechanism.

| Required capability | Native mechanism | Gap? |
| :--- | :--- | :--- |
| Above-the-fold load entrance and stagger (hero, intros) | CSS `@keyframes` + `animation-delay` from a custom property | None |
| Once-per-visit scroll reveal | `IntersectionObserver` + CSS **transitions** on a data attribute | None |
| Entrance on state change (chat turn, day panel, filtered list) | CSS keyframes on newly inserted or keyed elements | None, apart from the Activity replay caveat (§4.4) |
| Accordion height (open and close) | `grid-template-rows: 0fr ↔ 1fr` | None (structural fix in §9.2) |
| True cross-fade between old and new content | Would need both trees mounted at once | **Not required.** A fade-in of the new content is enough. |
| FLIP list reordering or shared-element morphs | Would justify Motion/GSAP | **Not in scope.** Filters change membership, not order. |
| Springs, scroll-scrubbed timelines, pinning | — | Prohibited by spec `:239` and Blueprint `:135–136` |

A specialised library is justified only for interruptible exit choreography, FLIP layout animation, or scrubbed timelines, and no inventory item needs any of them. The spec's figures of "~18–34 KB" (Motion) and "~28–45 KB" (GSAP) (`:256–257`) are unmeasured, but they do not affect the decision.

CSS scroll-driven animations (`animation-timeline: view()`) are correctly rejected as the primary mechanism (`:254`). They cannot latch a once-only reveal without JavaScript, and cross-browser support is incomplete. View Transitions are not in the spec and should stay out of 0.4.

### 4.2 Motion token system (spec §B)

The token structure is sound: semantic durations, two easing families, responsive distances, and a reduced-motion override. Required refinements:

| Issue | Evidence | Recommendation |
| :--- | :--- | :--- |
| Easing names are mathematically wrong | `cubic-bezier(0.22, 1, 0.36, 1)` (`:68`) is the standard *ease-out-quint* curve, not expo. | Name tokens by role (`--adora-ease-editorial`, `--adora-ease-ui`, `--adora-ease-ambient`) so later edits stay honest. **Optional.** |
| `--adora-ease-linear` adds nothing | `:71` | Remove it; write `linear`. **Optional.** |
| Focus rings must not animate | `--adora-duration-instant` lists "focus ring transitions" (`:56`) | Focus indicators must appear in the same frame (WCAG 2.4.7). Exclude `outline` from every transition list. **Blocking** (one line). |
| The stagger cap is prose only | `:85` | Enforce it in CSS: `transition-delay: min(calc(var(--reveal-step, 0) * var(--adora-stagger)), var(--adora-stagger-cap))`. Set the mobile stagger tokens to `0ms` where items stack. **Blocking** for INV-06…11 and INV-16. |
| Blueprint tokens are not reconciled | `02_DESIGN_TOKENS.json:33–40` proposes fast 180 / standard 320 / slow 600 and `cubic-bezier(.2,.7,.2,1)`. Blueprint §5 gives link transitions 160–220ms and image hover 280–400ms. | Record in the spec that 0.4 supersedes these *proposed* Blueprint values, and justify the 1200ms hover (already live since 0.2, `globals.css:166`). **Optional.** |
| Backward compatibility | `--adora-transition` is consumed at `globals.css:101–102`, `:123` | Keep it as an alias of the new tokens. |
| Print | Not covered | Add `@media print { [data-reveal] { opacity: 1 !important; transform: none !important } }`. **Blocking** (fail-visible). |

The reduced-motion strategy (`:87–93`) is correct in principle. The existing global `!important` rule (`globals.css:206–219`) already collapses all durations, and zeroing distances and scales makes any surviving animation motionless. §7.4 adds one refinement: put pending styles inside `@media (prefers-reduced-motion: no-preference)`.

### 4.3 CSS cascade rules the spec must add (blocking)

1. **Tailwind v4 uses individual transform properties.** `lg:translate-y-10` (`experience-story.tsx:47`), `rotate-180` (`itinerary-explorer.tsx:117`), and `group-hover:-translate-y-0.5` emit `translate`/`rotate`, not `transform` **[INFERRED from Tailwind v4 output; verify in built CSS]**. Motion CSS must animate only `transform` and `opacity`, never the `translate`/`rotate`/`scale` properties, so it composes with utilities instead of fighting them.
2. **No `forwards`/`both` fill on elements that have an interactive transform state.** `.image-reveal:hover img { transform: scale(1.025) }` (`globals.css:169–171`) loses to any animation that holds a final keyframe, because animations outrank normal declarations in the cascade. Image settles must use `animation-fill-mode: backwards`, or a transition from a pending state as in §7.4.
3. **The final state must be `transform: none`, not `translateY(0)`.** A residual transform creates a containing block for fixed descendants and a stacking context. That matters for the absolutely positioned coordinate badge (`destination-story.tsx:25`) and the sticky itinerary aside (`itinerary-explorer.tsx:143`).
4. **No permanent `will-change`.** About 20 reveal units per page, several holding large images, would pin GPU memory. Let the animation promote layers temporarily.
5. **Never fade a full-bleed coloured section.** Fading the ink sections (`ai-planner-section.tsx:6`, `planner-cta.tsx:12`) or the ivory bands from `opacity: 0` exposes the paper page background, a large light-to-dark flash. Reveal **inner content only** and keep the `<section>` background static.
6. **Reveals use transitions; keyframes are only for insertion-driven entrances.** A transition from `pending` to `revealed` does not replay when Activity un-hides a route. A keyframe does (§4.4).

### 4.4 Next.js 16 `<Activity>` route preservation (not addressed by the spec)

**[DOCUMENTED]** in `next/dist/docs/01-app/02-guides/preserving-ui-state.md:17–19` and `cacheComponents.md:47–54`:

- With `cacheComponents`, Next.js *"hides [pages] using React's `<Activity>` … (hidden with `display: none`)"* instead of unmounting them.
- It *"preserves up to 3 routes"*.
- *"When Activity hides content, React runs effect cleanup functions"* (`:476`).
- *"Effects run on every hide-to-visible transition"* (`:520`).

Consequences for 0.4:

| Area | Consequence | Required handling |
| :--- | :--- | :--- |
| `<Reveal>` | Observer is disconnected on hide; effect re-runs on show | The effect must be idempotent. Keep the revealed state in a ref and the DOM; never re-pend revealed content (§7.4). |
| Keyframe entrances (chat bubbles, day panel, hero, `PageIntro`) | A `display: none → block` change restarts CSS animations **[INFERRED; verify with Back navigation]** | **Planner: blocking.** Replaying every bubble on Back could read as regeneration. Mark each element entered on `animationend` and scope the animation to `:not([data-entered])`. Hero, `PageIntro`, and day panel: acceptable or same pattern; decide explicitly. |
| Planner scroll effect | `useEffect([messages])` (`planner-workspace.tsx:68–84`) re-runs on show and re-anchors the log | Pre-existing behaviour. Motion must not make it worse (§8). |
| Verification | Hidden routes stay in the DOM | Any 0.4 assertion taken after a client-side navigation must scope queries to visible content, for example `el.checkVisibility()`. |

---

## 5. Detailed Review of All 20 Inventory Entries

Spec rows `:333–352`. "Verification" lists the minimum evidence needed before an entry can be signed off.

### INV-01 — Desktop nav hairline underline · **APPROVE WITH CHANGES** · P2
- **Rationale:** A refined affordance, cheap in CSS, decorative only.
- **Changes:**
  - Use ~200ms; the spec's 240ms is outside the Blueprint's 160–220ms link range.
  - The active link today uses a real `border-b … pb-1` (`site-header.tsx:63`). Migrating it to `::after` must preserve its geometry (no 1px shift) and must not become the only indicator: `aria-current` already exists.
  - Show the underline on `:focus-visible` as well as `:hover`.
- **Risk:** A double underline on the active link if the border is not removed.
- **Dependency:** Package A tokens.
- **Verification:** Computed `::after` transform on hover and focus; screenshot of the active route on overlay and solid header tones.

### INV-02 — Mobile drawer disclosure · **DEFER** (approved technique if time allows: open-only fade) · P2
- **Rationale:** The proposed `grid-template-rows` + "keep `hidden` when closed" (`:104`, `:334`) contradicts itself:
  - `display: none → grid` cannot transition without `@starting-style`.
  - The nav's own `py-7` padding (`site-header.tsx:89`) would stay visible at `0fr`.
  - On solid-tone pages the height animation pushes page content every frame.
  - Both verification scripts read `display` after opening (`verify_homepage.mjs:186`, `verify_web_0_3.mjs:649`).
- **If implemented:** Keep the `hidden`/`grid` toggle exactly as it is. Add an open-only keyframe (`opacity 0→1`, `translateY(-4px)→none`, ~160ms). Close instantly.
- **Verification:** Existing A11Y-02 and homepage keyboard checks pass unchanged.

### INV-03 — Homepage hero image scale settle · **APPROVE WITH CHANGES** · P0
- **Rationale:** Opacity stays at 1, so the image remains a valid LCP candidate. A slow `1.035→1` settle gives the hero a cinematic quality.
- **Changes:**
  - CSS only, on the `<Image>` class (`editorial-hero.tsx:10–17`). The `<section>` already clips via `overflow-hidden` (`:9`).
  - `fill-mode: backwards`.
  - No client `onLoad` island just to sync the settle.
  - **Document that the settle is not synchronised with image arrival.** It starts when styles apply. On slow networks the image (112.7 KB WebP, observed) may arrive after 920ms, so users see a static image. That is acceptable, but the hero must look finished without it.
- **Risks:** The full-viewport transform runs under a gradient and a `mix-blend-mode: soft-light` grain layer (`editorial-hero.tsx:18–19`), so frame stability on low-end GPUs is unknown. "Zero LCP penalty" is a hypothesis (§11).
- **Verification:** LCP element and time before/after under the §11 protocol; rAF frame sampling during the first second at 390×844 and 1440×900.

### INV-04 — Hero typography stagger · **APPROVE WITH CHANGES** · P0
- **Rationale:** This is the flagship moment. CSS keyframes work without JavaScript and without hydration, and with no animation the element's base style is visible, so the effect is fail-visible by construction.
- **Changes:**
  - At most 3 groups: eyebrow + `h1`, lead, CTA row.
  - The `h1` gets no delay, because text can become the LCP candidate if the image is slow.
  - Stagger via `--step × --adora-stagger-tight`, capped.
  - `fill-mode: backwards`.
  - `SiteHeader` (`:20`) and the scroll indicator stay static.
- **Risk:** The CTA must remain clickable during the animation; opacity does not block hit-testing, so it does.
- **Verification:** `h1Count === 1`; the hero CTA computed colours from `verify_homepage.mjs:253–257` are unchanged after the animation settles; LCP protocol.

### INV-05 — Hero scroll indicator loop · **APPROVE** (existing) · —
- No change is required for 0.4.
- **Optional, non-blocking:** The infinite `2.2s` loop (`globals.css:178–194`) is auto-starting motion longer than 5 seconds, which WCAG 2.2.2 (Level A) covers. Bounding it to 2 iterations (4.4s) removes the question entirely.

### INV-06 — `BrandPhilosophy` reveal · **APPROVE WITH CHANGES** · P0
- **Rationale:** This is the first chapter after the hero and the target of the `#philosophy` scroll link (`editorial-hero.tsx:47`), so it is a natural reveal.
- **Changes:**
  - Two reveal units: the left column, and the right column with an internal `h2` → copy step. Both children are plain `div`s (`brand-philosophy.tsx:5`, `:11`), so wrapping is layout-safe.
  - Use the §7.4 trigger: `threshold: 0` and a `rootMargin`, not `threshold: 0.18`.
- **Verification:** Reveals once; stays visible after scrolling back up; visible immediately under reduced motion and on the `#philosophy` anchor jump.

### INV-07 — `DestinationStory` image settle, badge, story column · **APPROVE WITH CHANGES** · P0
- **Changes:**
  - Scale the **image inside the frame**, not the `.image-reveal` frame (`destination-story.tsx:16`). Scaling the frame moves its clipped edges into the neighbouring column and toward the badge.
  - Use the pending-state transition (§7.4) so the existing `transition: transform 1.2s` performs the settle and hover still works afterwards.
  - The badge (`:25`, absolutely positioned, overlapping the next section) may rise 8–12px. It must end at `transform: none`.
- **Suspense:** The section renders twice: once as the PPR fallback, then as streamed content after the catalog fetch (timeout 1800ms, `lib/catalog.ts:16`; `app/page.tsx:45–47`). Both paths must use the same `<Reveal>` structure.
- **Verification:** Run with the API offline (the normal demo path) and online. Confirm no visible re-flash when the fallback is swapped while the section is on screen.

### INV-08 — `ExperienceStory` · **APPROVE WITH CHANGES** · P1
- **Changes:**
  - On mobile the visual order is reversed (`order-2 lg:order-1` at `:21`, `order-1 lg:order-2` at `:47`). Make each column its own reveal unit triggered by its own intersection, so no cross-column delays are needed on mobile.
  - The image column carries `lg:translate-y-10`. Put the reveal on a wrapper or child so it animates `transform` while the utility keeps `translate`.
  - The `01–03` list stagger is fine within the cap.
- **Verification:** All three list rows and the provenance disclaimer (`:38–40`) reach opacity 1; at `lg` the image offset is unchanged after settle (bounding-box comparison with the 0.3 screenshots).

### INV-09 — `AiPlannerSection` · **APPROVE WITH CHANGES** · P1
- **Changes:**
  - Avoid nested motion. If the preview frame (`:26`) rises, the bubbles (`:42–47`) fade without translation; otherwise their offsets compound.
  - The honesty line "Bản xem trước giao diện · chưa kết nối mô hình AI" (`:21–23`) belongs to the **first** reveal unit and is never delayed behind the bubbles.
  - The gold status dot (`:38`) **must not pulse**: a pulsing dot reads as a live connection.
  - Reveal inner content, never the ink `<section>` (§4.3 rule 5).
- **Verification:** No looping animation in the section after settle (`getAnimations()`); the disclosure has opacity 1 whenever any bubble does.

### INV-10 — `HowItWorks` steps · **APPROVE WITH CHANGES** · P1
- **Changes:**
  - The `<li>` elements carry the hairline dividers and use `md:first:`/`md:last:` selectors (`how-it-works.tsx:37`). Put the reveal **inside** each `<li>` so dividers stay still and `:first-child` still matches.
  - `ol > div` would also be invalid HTML.
  - Stagger at `md+` only; on mobile each item reveals on its own intersection.
- **Verification:** No horizontal overflow; dividers are static in a mid-reveal screenshot.

### INV-11 — Footer closing CTA · **APPROVE WITH CHANGES** · P1
- **Changes:**
  - One unit wrapping the closing CTA grid (`site-footer.tsx:14–25`), no stagger. The bottom utility bar stays static.
  - The CTA only renders where `showCta` is true, which is `/` and `/destinations` (observed). The spec's route list is correct.
- **Verification:** The footer link is clickable at once; the full-page capture is taken after animations settle (§11.3).

### INV-12 — `PageIntro` load entrance · **APPROVE WITH CHANGES** · P1
- **Rationale:** Gives the Discovery index pages a consistent opening beat.
- **Risk the spec misses:** At 360 and 390 widths, the featured image on `/destinations` starts near or below the fold. The `PageIntro` `h1` (`page-intro.tsx:18`) is therefore a likely **LCP candidate** **[INFERRED]**, yet the spec's LCP rule only protects images.
- **Changes:** No delay on the `h1`; ≤480ms; `fill-mode: backwards`.
- **Verification:** LCP element identity and time before/after at 390×844.

### INV-13 — `/destinations` featured composition · **APPROVE WITH CHANGES** (card rise removed) · P2
- **Changes:**
  - Keep only the image scale settle (scale only, backwards fill; `destinations/page.tsx:45–54`).
  - **Remove the overlapping paper-card rise.** Two competing motions in one composition weaken the overlap; on mobile the card is below the fold, so a load-time rise is never seen; and moving the overlap anchor (`lg:-ml-8 lg:mb-[-3rem]`, `:55`) risks unwanted interplay with the grid placement.
- **Verification:** `lg:col-start-*`/`row-start-1` placement is identical to the 0.3 screenshots.

### INV-14 — Filter result settle · **APPROVE WITH CHANGES** · P1
- **Changes:**
  - Key the result list by **chip state only** (region and availability, or category). **Do not include the text query in the key** (spec `:164`); typing must stay instant.
  - Opacity-only settle from 0.5 to 1 (~200ms). A 6px translate makes the hairline row borders (`destination-browser.tsx:98`) jitter for no storytelling gain.
  - Keep `data-testid` on the keyed element. The `role="status"` counts (`:91`, `experience-browser.tsx:71`) stay outside the keyed subtree.
  - The empty states (`:150`, `:79`) get the same fade.
- **Verification:** Count text is correct immediately after a trusted click with no delay; `document.activeElement` is still the chip; `window.scrollY` is unchanged.

### INV-15 — Card and image hover zoom with touch guard · **APPROVE WITH CHANGES** · P0 (the guard is a defect fix)
- **Rationale:** `.image-reveal:hover img` is currently unguarded (`globals.css:169–171`), so tapping on a touch device can latch the zoom. Wrapping it in `@media (hover: hover) and (pointer: fine)` is a correctness fix.
- **Changes:**
  - Give keyboard users the same decorative `ArrowUpRight` nudge via `group-focus-visible` (`experience-card.tsx:50–53`).
  - Record the 1200ms hover as a deliberate deviation from the Blueprint's 280–400ms.
- **Verification:** Touch emulation (`hover: none`) shows no transform after tap; the existing reduced-motion check (`verify_web_0_3.mjs:658–668`) still reports a collapsed transition.

### INV-16 — Detail page hero and below-fold chapters · **APPROVE WITH CHANGES** (reduced scope) · P1
- **Changes:**
  - The destination detail hero (`destinations/[slug]/page.tsx:45–69`) follows INV-03/04.
  - The experience-detail 21:9 image (`experiences/[slug]/page.tsx:72–82`) is an `.image-reveal`, so it needs a backwards-fill settle or hover breaks.
  - Below the fold, reveal **headings, imagery, and list groups only**. **Do not reveal long-form narrative paragraphs or the `<aside aria-label="Thông tin gợi ý">`.** That aside contains the "Đặt chỗ · chưa khả dụng" disclosure (`:149–157`), and honesty content must never wait on a reveal.
  - Highlight `<li>`s carry dividers (`destinations/[slug]/page.tsx:106–115`); reveal inside them, as in INV-10.
  - `ExperienceGrid` is shared with the `/experiences` filter island. Add an opt-in `reveal` prop so per-card reveals do not stack on top of the INV-14 settle.
  - `PlannerCta` (`planner-cta.tsx:12`) reveals inner content only.
- **Verification:** All images complete (existing check); no disclosure element has opacity < 1 at any sampled time.

### INV-17 — Planner user bubble and scripted reply entrance · **APPROVE WITH CHANGES** · P0
- **Changes (detail in §8):**
  - **Opacity-only inside `role="log"`**: user bubble ~160ms; reply at +80ms, ~200ms. No translation.
  - CSS only: all messages are committed in one React update, as today (`planner-workspace.tsx:109–115`).
  - Use the `animationend` → `data-entered` marker so Activity re-show does not replay bubbles.
  - No typing indicator or artificial delay (`AGENTS.md`: "do not add … fake responses").
- **Verification:** All 0.3 bounding-box assertions, plus the new §8.5 assertions.

### INV-18 — Trip Preview, jumpbar, smooth jumpbar scroll · **APPROVE WITH CHANGES** · P0 (fades) / P1 (smooth scroll)
- **Changes:**
  - "Crossfade" keyed by `preview.slug` (`:202`) is really a fade-in of the new panel. Name it that; no dual-mount state machine.
  - The desktop aside (`:473–518`) is its own scroll container and is not anchored, so a 6px rise is acceptable there.
  - The mobile preview inside the log (`:407–437`) is opacity-only and **enters with the reply** (drop the separate 120ms delay).
  - The jumpbar (`:246–272`) is opacity-only, never height or slide. It is inserted above the log in the same commit and already shrinks the log; animating its size would move the log viewport during anchoring.
  - Smooth scroll on jumpbar clicks must read `matchMedia('(prefers-reduced-motion: reduce)')` **at click time**. An explicit `behavior: "smooth"` in `scrollTo()` overrides the CSS `scroll-behavior: auto` safety net.
- **Verification:** `mobileJumpbarVisible` and `mobilePreviewVisibleInLog`; after a "Xem trước" click, wait for `scrollend` (or poll until stable) before asserting; under reduced motion, assert immediately.

### INV-19 — `TripCard` hover and day tab panel · **APPROVE WITH CHANGES** (TripCard variant rejected) · P1
- **Changes:**
  - Tab colour transition already exists (`transition-colors`, `itinerary-explorer.tsx:77`); only tokenise it.
  - Key an **inner content wrapper** by `day.day` and keep the `role="tabpanel"` node stable (`:90`). Today it is not keyed. Activities are keyed by id (`:101`) and remount anyway.
  - Entrance ≤220ms, 6px rise, opacity from ~0.2 rather than 0, so holding an arrow key never blanks the panel.
  - **Reject** the TripCard-specific 1.02 / 800ms image variant (spec `:214`). Reuse the global guarded `.image-reveal`; the card already has `transition-colors` (`trip-card.tsx:15`).
- **Verification:** `aria-selected`, `day-budget` text, and `document.activeElement.id === "day-tab-3"` read **synchronously** after a trusted ArrowRight, with no delay.

### INV-20 — Activity accordion · **APPROVE WITH CHANGES** · P1
- **Changes (detail in §9.2):**
  - Three-layer structure, with padding and border on the innermost element.
  - `inert={!open}` on the clipping layer; `id` and `role="region"` stay on a stable element.
  - The content is always mounted.
  - The chevron already transitions (`transition-transform`, `:117`, which in Tailwind v4 covers `rotate`); only tokenise it.
- **Verification:** Collapsed height ≤1px after settle; collapsed links are absent from the Tab sequence; `aria-expanded` flips synchronously.

**Rejected sub-proposals (summary):**
- TripCard 1.02/800ms variant (INV-19).
- Grid-row technique for the mobile drawer (INV-02).
- Text query in the filter animation key (INV-14).
- Featured paper-card rise (INV-13).
- `Compass` 12° hover rotation (spec `:192`, not in the inventory): decorative only, and an unnecessary extra hover vocabulary inside the Application family.

---

## 6. React / Next.js Integration Risks

| # | Topic | Finding | Safeguard |
| :--- | :--- | :--- | :--- |
| 6.1 | Server Component children | **Safe.** A Client Component can receive Server Component output as `children`. `delayMs`/`step`/`className` are serialisable. Sections stay Server Components. | — |
| 6.2 | Extra wrapper DOM | `<Reveal>` renders a `<div>`, which breaks grid placement when wrapped children carry `col-span`/`order` (`experience-grid.tsx:18`, `experience-story.tsx:21,47`), `:first-child` selectors (`how-it-works.tsx:37`), and list semantics (`ol > div`). | Add `as` (`div` / `li` / `section` / `figure`) and `className` passthrough. Placement classes move onto the wrapper or the reveal sits inside the item. |
| 6.3 | Hydration | If React renders `data-reveal={state}` with an initial `"visible"` that later diverges, it competes with any imperative changes. | Render **no reveal-state attribute** on the server or during the first client render. Manage the attribute imperatively on the ref (§7.4). No mismatch is possible. |
| 6.4 | Lint gate | `set-state-in-effect` is an Error in the active preset **[OBSERVED]**. The spec's "On mount (`useEffect`) … sets `state = "pending"`" (`:273–276`) would fail `pnpm --filter @adora/web lint` and therefore AC-07. | Imperative attribute updates inside effect and observer callbacks; no React state in `<Reveal>`. |
| 6.5 | Strict Mode | Effects mount → clean up → mount in development **[DOCUMENTED]**. | The cleanup disconnects the observer; the decision is made in the asynchronous IO callback, so the double invoke never sees a half-applied state. |
| 6.6 | Unmount / route change / Activity | Cleanup runs on unmount and on Activity hide; the effect re-runs on show (§4.4). | Keep "revealed" in a `useRef` and in the DOM; the effect returns early if already revealed. Pending elements are re-observed. |
| 6.7 | Repeated navigation and history restoration | On Back/Forward the restored scroll position may be mid-page. | The initial decision uses the IO's first callback geometry, which runs after restoration, and only pends elements **wholly below** the viewport (§7.4). Content above or in view is never hidden. |
| 6.8 | Suspense fallback double render on `/` | `CatalogStories` streams in after ≤1800ms and replaces the fallback DOM (`app/page.tsx:45–47`). | Same `<Reveal>` structure in both. A replaced subtree starts unrevealed (visible) and decides again on its own. |
| 6.9 | Dynamic layout changes | Font swap (`display: swap`, `layout.tsx:11,17`), Suspense swap, and accordion growth move pending elements. | IO re-evaluates geometry every rendering update, so no extra handling is needed. Avoid mount-time `getBoundingClientRect()` (forced layout ×N); use `entry.boundingClientRect`. |
| 6.10 | Shared vs per-instance observer | The spec mentions a "shared" observer (`:276`) without a registry design. | Per-instance observers are simpler and adequate at ≤25 units per page. Introduce a shared registry only if profiling shows a cost. |
| 6.11 | Keyed remounts inside client islands | Keys on the filter list, the day panel content, and the desktop preview remount subtrees. | Focus never sits inside these subtrees at the moment of change (chips, tabs, and prompt buttons are outside). §9 has per-site analysis. |

---

## 7. Scroll Reveal Reliability

### 7.1 Assessment of the spec's five-step proposal (`:32–38`, `:273–276`)

| Step | Verdict |
| :--- | :--- |
| 1. Visible by default in SSR | **Correct and essential.** No-JS and failed hydration stay readable. |
| 2. Identify below-fold content after hydration | **Defective boundary.** `rect.top > innerHeight × 0.92` puts elements whose top lies between 92% and 100% of the viewport, which are **visibly on screen**, into pending, so they vanish after hydration. With `rootMargin: -6%` they are also not "intersecting", so they stay hidden until scrolled. That is a flicker defect **[INFERRED; reproducible at any viewport where a section heading starts near the fold]**. |
| 3. Move eligible elements to pending | Acceptable only for elements entirely below the viewport. |
| 4. Reveal on IO | `threshold: 0.12–0.2` on wrappers fails for tall wrappers: a wrapper taller than `effectiveViewport / threshold` (≈5,000px at 0.15 on an 800px mobile viewport) can **never** reach the threshold. It also reveals later than intended for medium-tall wrappers. |
| 5. Disconnect after reveal | Correct. Use `unobserve`/`disconnect` and record the reveal in a ref. |

### 7.2 Failure-mode analysis

| Failure mode | Possible with the spec as written? | Mitigation (§7.4) |
| :--- | :--- | :--- |
| Flash of on-screen content | **Yes** (92–100% band) | Pend only if `boundingClientRect.top ≥ innerHeight` |
| Permanently invisible content | **Yes** for very tall wrappers; also if IO never calls back | `threshold: 0` + `rootMargin`; watchdog; `:focus-within`; print rule |
| Fast scroll / `End` key / anchor jump past a section | Element jumps from below to above without ever intersecting, so no callback fires and it stays pending until scrolled back | Top `rootMargin` extended far above the viewport (e.g. `100000px 0px -10% 0px`), so anything above the trigger line counts as intersecting and is revealed **[INFERRED; verify in Chromium, WebKit, Gecko]** |
| Browser Back restoration | Measuring at mount (`useEffect`) may run before restoration | Decide in the first IO callback, not at mount |
| Delayed IO callbacks (background tab, busy main thread) | Content stays visible until the first callback, so this is fail-visible already | Watchdog (1.5s) settles to visible if the first callback never arrives |
| Dynamic content updates | Handled by IO geometry | — |
| Hidden focusable content | **Yes.** Tabbing into a pending block focuses an `opacity: 0` link; the focus ring is invisible for at least one frame and faint for up to 680ms | `[data-reveal="pending"]:focus-within { opacity: 1; transform: none; transition: none }` |
| Full-page evidence screenshots | `captureBeyondViewport` does not scroll (`verify_web_0_3.mjs:124`), and captures taken soon after the scroll pass catch transitions mid-way | Capture after `Promise.all(document.getAnimations().map(a => a.finished))` and assert no `[data-reveal="pending"]` remains (§11.3) |
| Reduced-motion toggle at runtime | The spec's CSS `!important` override covers it | Additionally, place pending styles inside `@media (prefers-reduced-motion: no-preference)` |

### 7.3 Should content be hidden at all before the trigger?

**Yes, narrowly.** Hide only "chapter" headings, imagery, and list groups that are wholly below the viewport when the first IO callback runs, and only with every fail-visible net in §7.4. **Never** hide:
- disclosure and honesty content (`DemoBadge`, "chưa kết nối mô hình AI", "không phải báo giá", the `role="note"` blocks),
- long-form reading text,
- navigation,
- anything inside the Application family (`/ai-planner`, `/trips*`).

The spec already prohibits reveals in the Application family (`:29`).

### 7.4 Recommended `<Reveal>` contract (normative for the revised spec)

This is a contract, not an implementation:

```text
<Reveal as="div" className step={0}>{serverChildren}</Reveal>
Initial render (server and client):  <As ref className style="--reveal-step:{step}">children</As>   // no data-reveal attribute

effect (deps: []):
  if revealedRef.current → return                                  // Strict Mode re-run, Activity re-show
  if !('IntersectionObserver' in window) → return                  // fail-visible
  if matchMedia('(prefers-reduced-motion: reduce)').matches → return
  io = new IntersectionObserver(onEntries, { threshold: 0, rootMargin: '100000px 0px -10% 0px' })
  watchdog = setTimeout(settle, 1500)                               // first callback never arrived → fail-visible
  first = true
  onEntries(entries):
    clearTimeout(watchdog); e = last(entries)
    if first:
      first = false
      if e.isIntersecting || e.boundingClientRect.top < innerHeight → settle(); return   // in view or above: never hidden
      el.dataset.reveal = 'pending'; return                          // wholly below the fold
    if e.isIntersecting → el.dataset.reveal = 'revealed'; revealedRef.current = true; io.disconnect()
  io.observe(el)
  cleanup: clearTimeout(watchdog); io.disconnect()                  // a pending attribute survives Activity hide; re-observed on show
settle(): delete el.dataset.reveal; revealedRef.current = true; io.disconnect()
```

```text
CSS
@media (prefers-reduced-motion: no-preference) {
  [data-reveal="pending"]             { opacity: 0; transform: translate3d(0, var(--adora-distance-reveal), 0); }
  [data-reveal="pending"]:focus-within{ opacity: 1; transform: none; transition: none; }
  [data-reveal="revealed"]            { transition: opacity var(--adora-duration-reveal) var(--adora-ease-editorial) var(--reveal-delay),
                                                    transform var(--adora-duration-reveal) var(--adora-ease-editorial) var(--reveal-delay); }
}
--reveal-delay = min(calc(var(--reveal-step) * var(--adora-stagger)), var(--adora-stagger-cap))   // stagger tokens are 0ms on stacked mobile layouts
@media print { [data-reveal] { opacity: 1 !important; transform: none !important; } }
```

Properties of this contract:
- No React state, so it is lint-safe and hydration-safe.
- Transitions, not keyframes, so Activity re-show does not replay.
- The final state is the element's own style (`transform: none`).
- The image variant sets `transform: scale(...)` on the inner `img` only while the wrapper is pending, and lets the existing `img` transition perform the settle.

### 7.5 Fail-visible matrix

| Condition | Result |
| :--- | :--- |
| JavaScript disabled or hydration error | Visible (no attribute is ever set) |
| `IntersectionObserver` unavailable | Visible |
| Reduced motion at load | Visible (JavaScript never pends) |
| Reduced motion switched on at runtime | Visible (pending CSS is scoped to `no-preference`, plus the `!important` safety net) |
| Initial IO callback missing for >1.5s | Visible (watchdog) |
| Keyboard focus enters pending content | Visible instantly (`:focus-within`) |
| Printing | Visible |
| Activity hide → show, or Strict Mode double effect | Revealed content stays revealed; pending content is re-observed |

---

## 8. AI Planner Interaction Safety

### 8.1 Observed implementation facts

- Anchoring runs in `useEffect([messages])`. It computes `targetTop = log.scrollTop + (turnRect.top − logRect.top) − 12` from **`getBoundingClientRect()`** (`planner-workspace.tsx:68–84`). `scrollToElement` uses the same method (`:86–92`).
- `latestTurnRef` attaches to the user message of the latest turn (`:325`, `:330`).
- The user message and reply are added in **one** state update (`:109–115`), so they reach the DOM in the same commit.
- `role="log" aria-live="polite"` sits on the scroll container (`:274–280`).
- The jumpbar is conditionally inserted **above** the log (`:246–272`); the mobile preview is the last child **inside** the log (`:407–437`); the desktop preview is in a separate `overflow-y-auto` aside (`:473–518`).
- The welcome block, including its suggestion buttons, **unmounts** on the first submission (`:282–311`).

### 8.2 Risks introduced by the proposed motion

| ID | Risk | Mechanism | Severity |
| :--- | :--- | :--- | :--- |
| P-1 | Anchor skew | The effect runs right after a discrete-event commit, while the user bubble's first keyframe (`translateY(8px)`) already applies. `getBoundingClientRect` includes it, so the log over-scrolls by about 8px and the bubble settles at ~4px from the top instead of 12px **[INFERRED]**. The planning report's mitigation (`:131`, "uses `offsetTop`") does not match the code. | Medium |
| P-2 | Post-animation scroll clamp | Transformed descendants extend the scrollable overflow. If the anchor target exceeds the normal maximum scroll (short content below the user bubble, common on desktop), `scrollTop` lands inside the temporary +10px overflow. When the reply's transform ends, the browser clamps it, producing a visible ~10px jump **[INFERRED]**. | Medium |
| P-3 | Replay on Back | Activity restores `/ai-planner` with its messages, and keyframe entrances restart on `display` restore (§4.4). The whole conversation re-animates, which can read as regeneration. | **High (honesty)** |
| P-4 | Jumpbar slide | Animating jumpbar height or translation changes the log's size or position during anchoring. | Medium |
| P-5 | Smooth scroll versus tests and reduced motion | `scrollTo({behavior: 'smooth'})` ignores the CSS safety net, and assertions that run right after a click would read intermediate positions. | Low–Medium |
| P-6 | Pre-existing focus loss | Clicking a welcome suggestion unmounts the focused button, so focus falls to `<body>` (`:296–309`) **[INFERRED from React semantics]**. Not caused by motion, but Package D touches this flow. | Medium (a11y) |
| P-7 | Screen readers | No impact if the DOM is inserted at once: live-region announcements follow DOM insertion, not opacity. **Any JavaScript-timed sequencing would delay announcements and imitate latency.** | Prohibit JS delays |

### 8.3 Required design

- Inside `role="log"`, use **opacity-only** entrances. This removes P-1 and P-2 without changing the anchoring code.
- If the team wants a rise, it must change measurement to a transform-independent method (an `offsetTop` chain relative to the log) **and** pass the §8.5 "scroll stability" assertion. Opacity-only is the simpler, safer default.
- `animationend` → `el.dataset.entered = ""` on the message `article`, with a target-equals-current-target guard; the CSS scopes the animation to `:not([data-entered])`. This addresses P-3.
- The jumpbar uses opacity only. The desktop preview may use a 6px rise.
- The jumpbar smooth scroll reads reduced motion at click time. The anchoring effect stays **instant** (never smooth).
- Package D should also fix P-6 by moving focus to `#planner-prompt`, or to the newly added user message with `tabIndex={-1}`, after a welcome-suggestion submit. Scope it as an explicit, separately named change.

### 8.4 Simultaneous or sequential?

**Sequential and compressed:**
- User bubble at 0ms.
- Reply, mobile preview, and desktop preview **together** at +80ms.
- Everything settled by ~280ms.

Reasoning:
- A short user-then-reply offset conveys turn order.
- Reply and preview arriving together shows they are one deterministic scripted result.
- A gap much above ~100ms between user bubble and reply begins to read as "thinking", which conflicts with spec principle A.5 (`:43–44`) and `AGENTS.md`.

All elements are committed in the same React update. The sequence is purely CSS `animation-delay`. The scripted-demo disclosures must be visible at opacity 1 throughout:
- header subtitle (`:239`),
- `DemoLabel` "Phản hồi dựng sẵn · không phải AI" (`:375`),
- the composer note (`:466–468`).

### 8.5 Regression assertions (add to the 0.4 verification; keep all 0.3 assertions)

1. All existing 0.3 planner assertions at 1440×900 and 390×844, unchanged (`verify_web_0_3.mjs:400–556`).
2. **Scroll stability:** record `log.scrollTop` immediately after the trusted click and again after `Promise.all(log.getAnimations({ subtree: true }).map(a => a.finished))`. Require |Δ| ≤ 1px.
3. **Anchor offset:** after settle, `userBubble.top − log.top` ∈ [8, 16]px (the code targets 12).
4. **Atomic, non-streaming insert:** the reply's `textContent` at +0ms equals its value at +600ms; the `DemoLabel` text is present at +0ms; no `aria-busy`, typing, or skeleton elements; zero external AI requests (existing check).
5. **Live-region integrity:** the count of `[aria-live]` elements is unchanged from 0.3.
6. **Back-navigation replay:** open the trip via the reply CTA, call `history.back()`, then assert that no `article` in the log has a running animation and that `scrollTop` is unchanged.
7. **Jumpbar:** after "Xem trước", the mobile preview top is within the log once scrolling stops; under emulated reduced motion it is there immediately.
8. **Reset:** `document.activeElement.id === "planner-prompt"` and `trip-preview-empty` is present (existing behaviour, `:120–127`).
9. Run 1–8 with motion enabled **and** with `prefers-reduced-motion: reduce` emulated **before** navigation.

---

## 9. Itinerary and Filter Transition Safety

### 9.1 Day tabs (`itinerary-explorer.tsx`)

- **ARIA sync [OBSERVED]:** `aria-selected`, `tabIndex`, and focus update synchronously in the same handler (`:23–30`, `:72–74`). Motion must not move any of this into `onAnimationEnd` or timers.
- **Remount:** key an inner wrapper, not the `tabpanel` (§5 INV-19). Focus is on the tab during switching, so no focus loss is possible. The `tabpanel` keeps `tabIndex={0}` (`:90`).
- **Budget:** `day-budget` lives in the aside (`:157`) outside the keyed subtree and updates in the same render.
- **Pre-existing, outside motion scope:** unselected tabs' `aria-controls` reference `day-panel-N` elements that are not rendered (`:73` vs `:90`). Low priority.

### 9.2 Accordion

**Required structure** (padding and border must sit on the innermost element, or they survive the `0fr` track):

```text
<div class="grid transition-[grid-template-rows,opacity] {open ? rows-[1fr] opacity-100 : rows-[0fr] opacity-0}">
  <div id="activity-…" role="region" aria-label="…" class="min-h-0 overflow-hidden" inert={!open}>
    <div class="border-t px-4 py-5 sm:px-5"> …detail, location note, experience link… </div>
  </div>
</div>
```

| Concern | Decision |
| :--- | :--- |
| Keyboard access when collapsed | `inert` removes the subtree from focus order **and** from the accessibility tree (React 19 supports boolean `inert`). `aria-hidden` is redundant and should be omitted to keep a single source of truth. |
| ARIA sync | `aria-expanded` flips in the click handler (`:108–110`), unchanged. |
| `aria-controls` validity | Improves: the referenced `id` now always exists (today it is missing while collapsed, `:120`). |
| Focus stability | Focus is on the trigger button when toggling, so it is unaffected. |
| Remounting | Content is always mounted, with no remount on toggle. On day change, the new day's first activity mounts already open at `1fr`, with no transition on mount. |
| Reduced motion | The global rule makes the change effectively instant. |
| Find-in-page | Collapsed text is not findable. Acceptable; `hidden="until-found"` would restore it but cannot animate. |
| Test impact | `innerText` scans now include collapsed text, which only adds coverage to the commercial-claims check. |

**Technique comparison:**

| Technique | Assessment |
| :--- | :--- |
| `grid-template-rows: 0fr ↔ 1fr` | **Preferred.** Cross-browser, no measurement, collapses to an exact 0. |
| `interpolate-size: allow-keywords` / `height: auto` | Chromium-only today; not acceptable as the sole mechanism. |
| `<details>` + `::details-content` | Would restructure the ARIA pattern; limited support. |
| WAAPI with a measured height | Needs JavaScript measurement and duplicates tokens. |
| `max-height` hack | Wrong easing and an arbitrary cap. |

The layout cost (reflow of the page below for 240ms) is user-initiated and small on this page.

### 9.3 Filters (`DestinationBrowser`, `ExperienceBrowser`)

| Concern | Finding for a key-driven remount of the result list |
| :--- | :--- |
| Focus loss | None. Chips and the search input are outside the keyed subtree (`destination-browser.tsx:43–87`, `experience-browser.tsx:33–67`). |
| Screen readers | None. The `role="status"` counts are outside the subtree (`:91`, `:71`); the list is not a live region. |
| Unnecessary remounting | Small: at most 6 items. `next/image` elements re-create from the memory cache. A one-frame decode gap is masked by the 0.5 opacity start **[INFERRED]**. |
| Scroll jumps | Not caused by motion. Height changes are inherent to filtering (pre-existing). |
| Flashing | Avoided by starting at 0.5 opacity, not 0. |
| Layout instability | Opacity-only means no extra layout. CLS excludes shifts within 500ms of input. |
| Typing | Excluding the query from the key keeps keystrokes instant, with no per-keystroke animation. |

**Simplest safe strategy:** `key={chipSignature}` on the existing list element plus one opacity keyframe. No animation state machine, and no WAAPI unless the team prefers zero remount.

---

## 10. Accessibility Findings

| Area | Finding | Requirement |
| :--- | :--- | :--- |
| `prefers-reduced-motion` | The existing global rule is robust (`globals.css:206–219`); the spec keeps it. | Keep it. Scope reveal pending styles to `no-preference` (§7.4). JavaScript reads the media query at use time (smooth scroll), never cached at mount. |
| Runtime preference change | The CSS override handles it; `verify_web_0_3.mjs:655–668` already emulates the change after load. | Add `[data-reveal]` computed `opacity === "1"` to that check. |
| Keyboard focus | Focus indicators must not animate (§4.2). Tab into pending content is covered by `:focus-within` (§7.4). | Blocking. |
| Screen-reader announcements | Opacity does not affect the accessibility tree. Delays implemented with timers would. | Insert DOM atomically; no JavaScript delays; no new live regions. |
| Hidden content | `inert` for collapsed accordions. Pending reveal content stays in the accessibility tree, which is correct because it is real content, only visually deferred. | — |
| Visibility transitions | No `visibility: hidden` or `display: none` reveal states: either would remove content from the accessibility tree and from find-in-page. | Opacity and transform only. |
| Hover-only behaviour | The image zoom and arrow nudge carry no meaning. | Guard for touch; mirror the decorative nudge on `:focus-visible`. |
| Touch | `.image-reveal:hover` currently latches on tap (`globals.css:169`). | Guard (INV-15, P0). |
| Auto-playing motion | The hero scroll line loops indefinitely. | Optional 2-iteration bound (INV-05). |
| Honesty content | Disclosures must never be delayed or hidden behind a reveal. | Blocking (§7.3, INV-09, INV-16, §8.4). |
| Pre-existing | Planner focus loss on suggestion click (§8.2 P-6); `aria-label` on a non-interactive `span` (`ai-planner-section.tsx:38`) is ignored by assistive technology; `aria-controls` points at unrendered tab panels (§9.1). | Track separately; fix P-6 inside Package D. |

**Disable or simplify under reduced motion:**
- All entrance translations and scales go to 0 / 1.
- All durations go to ~0, which already covers hero, reveals, chat entrances, panels, accordion, filters, and hover zoom.
- Smooth jumpbar scroll becomes `auto`.
- The scroll-indicator loop stops at a static frame.

Meaning is preserved because no state is conveyed by motion alone.

---

## 11. Performance and Measurement Strategy

### 11.1 Review of the spec's claims

| Claim | Status | Correction |
| :--- | :--- | :--- |
| "Zero LCP penalty" for transform-only hero settles (planning report `:113`) | **Unverified hypothesis.** Transform does not delay paint, but the animated layer, the text entrance (which may become LCP if the image is late), and blend-mode compositing all need measurement. | State it as a target and measure LCP element identity and time. |
| Section I "Web Design 0.3 Verified Baseline" (`:284–293`) | **Not measured.** No 0.3 artefact contains LCP, CLS, or INP values. | Collect a real baseline at `c495955` before any motion code (Package A). |
| "`<Reveal>` < 0.8 KB" (`:253`) | Plausible, unmeasured. | Measure transferred script bytes per route. |
| INP measured as "click-to-DOM-update latency" (`:288`) | **Invalid method.** The existing scripts use `element.click()` (e.g. `verify_web_0_3.mjs:339`), which produces untrusted events, and Event Timing only reports trusted input. | Use CDP `Input.dispatchMouseEvent` / `dispatchKeyEvent` plus `PerformanceObserver({type: 'event', durationThreshold: 16})`. |
| Hero image "verify computed opacity === 1 at t=0" (AC-01) | Necessary but not sufficient evidence for LCP. | Keep it as a guard and add the LCP protocol. |

### 11.2 Cost analysis by technique [INFERRED; to be confirmed by measurement]

| Technique | Main-thread | Paint / composite | Notes |
| :--- | :--- | :--- | :--- |
| Opacity/transform keyframes and transitions | ~0 after start | Compositor; temporary layers | Full-viewport hero layer ≈ viewport × DPR² × 4 bytes. |
| Hero settle under the blend-mode grain | ~0 | Per-frame blend over a full-screen layer | Riskiest compositing case; sample frames at 4× CPU. |
| IO reveals (≤25 per page) | Negligible callbacks | Same as above | No forced layout when using `entry.boundingClientRect`. |
| Grid-row accordion | Layout per frame for 240ms | Repaint below | User-initiated; CLS-excluded. |
| Keyed filter remount | React reconcile of ≤6 items; image decode | Repaint list | Trivial. |
| `will-change` (if misused) | — | Permanent layers, GPU memory | Prohibit. |

### 11.3 Measurable targets and evidence protocol (no new dependencies; CDP via the existing script pattern)

**Environment:**
- Production build (`next build` + `next start`), API offline (the demo condition), headless Chrome via CDP as in the existing scripts.
- Mobile 390×844 (`mobile: true`) and desktop 1440×900.
- "Throttled" means `Network.emulateNetworkConditions` (≈150ms RTT, ≈1.6 Mbps down) and `Emulation.setCPUThrottlingRate(4)`.
- 5 cold runs per route with cache disabled; report medians.
- Routes: all eight routes of the 0.3 matrix.

| Metric | Design target (not a result) | Collection method |
| :--- | :--- | :--- |
| LCP | ≤ 2.5s throttled mobile median; Δ vs 0.3 baseline ≤ +100ms; **LCP element identity unchanged** | `PerformanceObserver({type: 'largest-contentful-paint', buffered: true})`: record `startTime`, element tag/class/`src`, `size` |
| CLS | ≤ 0.02 per route (load + scripted scroll with waits ≥ animation length); Δ vs baseline ≤ +0.01 | `layout-shift` entries with `!hadRecentInput` |
| INP (lab proxy) | ≤ 200ms max interaction duration at 4× CPU; aim ≤ 100ms unthrottled | Trusted CDP input on chips, prompts, tabs, accordion; `event` entries |
| Long tasks | No new task > 50ms attributable to motion code; total long-task time Δ ≈ 0 | `longtask` and `long-animation-frame` observers |
| Frame stability | During each animation window: p95 frame interval ≤ 20ms unthrottled; zero frames > 50ms during reveals | In-page `requestAnimationFrame` delta sampler (indicative only; headless GPU ≠ devices) |
| JS impact | ≤ +2 KB compressed per route; `git diff apps/web/package.json pnpm-lock.yaml` empty | Sum `encodedDataLength` of script responses (CDP `Network.loadingFinished`) before/after |
| Animation hygiene | After settle, no running animations other than the scroll indicator; no element with computed `will-change` other than `auto` | `document.getAnimations()`, computed-style scan |
| Evidence screenshots | Never captured mid-animation | Scroll pass → `await Promise.all(document.getAnimations().map(a => a.finished))` → assert no `[data-reveal="pending"]` → capture. Also capture a reduced-motion set for deterministic comparison. |

The 0.4 report must keep **design targets** and **measured results** in separate columns, and say "not measured" where tooling was not run.

---

## 12. Recommended Revisions to the Specification

**Blocking (must be in spec v1.1 before implementation):**

| ID | Revision | Spec location |
| :--- | :--- | :--- |
| B-1 | Replace the `<Reveal>` behaviour with the §7.4 contract: first-IO-callback decision at the 100% fold, `threshold: 0` + `rootMargin`, transitions not keyframes, imperative attribute (no React state; lint-safe), `as`/`className`, watchdog, `:focus-within`, print rule, Activity/Strict Mode idempotence. | A.3 `:32–38`, H.3 `:270–276` |
| B-2 | Add the §4.3 cascade rules: transform/opacity only; never animate Tailwind v4 `translate`/`rotate`/`scale`; `backwards` fill on hoverable images; final `transform: none`; no persistent `will-change`; inner-content reveals only for coloured sections. | New subsection under §B or §H |
| B-3 | Add an Activity section (§4.4): reveal idempotence, `data-entered` marker for planner bubbles, an explicit decision for hero, `PageIntro`, and day-panel replay, and visibility-scoped test queries. | New subsection |
| B-4 | AI Planner: opacity-only entrances inside the log; the timing in §8.4; no JavaScript sequencing; jumpbar opacity-only; reduced motion read at click time; correct the planning report's `offsetTop` statement (`:131`); add the §8.5 assertions to AC-04. | E.2–E.3 `:194–204`, AC-04 `:322` |
| B-5 | Accordion structure from §9.2 (padding on the innermost element, `inert`, no `aria-hidden`, stable `id`/`role`). | F.3 `:221–224`, INV-20 |
| B-6 | Replace the "Verified Baseline" column with a "Baseline (to be measured at `c495955`)" column; restate "zero LCP penalty" as a target; adopt the §11.3 protocol, including trusted-input INP. | I `:280–293`, AC-01 |
| B-7 | Honesty constraints: disclosure content is exempt from reveals and delays; no pulsing "live" indicators; no typing or skeleton states. | New rule in §A.5 |
| B-8 | Inventory dispositions from §5 (scoped changes to INV-02, 13, 14, 16, 19). | §L |
| B-9 | Remove focus-ring transitions from `--adora-duration-instant`; enforce the stagger cap with `min()`. | B.1 `:56`, B.3 `:85` |

**Optional (recommended, non-blocking):**

| ID | Revision |
| :--- | :--- |
| O-1 | Rename easing tokens by role (the "expo" curve is quint); drop `--adora-ease-linear`. |
| O-2 | Record the supersession of the Blueprint's proposed motion tokens and the 1200ms hover deviation. |
| O-3 | Bound the hero scroll-line loop to ≤ 5s (WCAG 2.2.2). |
| O-4 | Set a motion budget per page (e.g. ≤ 1 reveal unit per section, ≤ 1 stagger group per section) to prevent repetition across five Discovery routes. |
| O-5 | Fix the pre-existing planner focus loss (P-6) inside Package D; log the tab `aria-controls` and the span `aria-label` items for a later a11y pass. |
| O-6 | Correct the factual slip at H.1 `:246` ("5 of the 6 homepage sections"): **all six** section components are Server Components [OBSERVED]. |
| O-7 | Consider a development-only motion kill switch for demo rehearsals (e.g. an `html` data attribute), in addition to reduced-motion emulation. |

---

## 13. Approved Implementation Priorities

| Priority | Scope |
| :--- | :--- |
| **P0** | Motion tokens and cascade rules; `<Reveal>` per §7.4; touch hover guard (INV-15); homepage hero image settle and typography (INV-03, INV-04); `BrandPhilosophy` and `DestinationStory` reveals (INV-06, INV-07); planner entrances and preview/jumpbar fades with Activity-safe markers (INV-17, INV-18 fades). |
| **P1** | `ExperienceStory`, `AiPlannerSection`, `HowItWorks`, footer CTA (INV-08–11); `PageIntro` (INV-12); filter settle (INV-14); detail-page reveals, reduced scope (INV-16); jumpbar smooth scroll (INV-18); day panel (INV-19); accordion (INV-20). |
| **P2** | Nav underline (INV-01); `/destinations` featured image settle (INV-13). |
| **Deferred** | Mobile drawer animation (INV-02). |
| **Unchanged** | Hero scroll indicator (INV-05); optional WCAG bound. |

Compared with the spec, the homepage chapters below `DestinationStory` move from P0 to P1, so the demo-critical path (hero, first two chapters, planner) can ship and be verified first.

---

## 14. Proposed Implementation Packages and Acceptance Gates

**Recommended execution order: A → B → D → C → E.** Package D carries the highest regression risk on verified 0.3 behaviour, so it should land before the larger and more repetitive Discovery package. If time runs short, the demo-critical flows are then already protected.

Every package must pass these **gates G0**:
- `pnpm --filter @adora/web lint`, `typecheck`, `test`, and `build`, each exit 0;
- `scripts/verify_web_0_3.mjs` and `scripts/verify_homepage.mjs` exit 0 **without assertion changes**;
- `git diff apps/web/package.json pnpm-lock.yaml` is empty.

Each package is a **separate Git checkpoint**. Before Package A, commit the spec v1.1, the planning report, and this review as one documentation checkpoint.

| Package | Scope | Package-specific acceptance gates |
| :--- | :--- | :--- |
| **A — Foundation and baseline** | Collect the §11.3 baseline at `c495955` first. Then: tokens, cascade rules, reduced-motion and print rules, touch hover guard, `<Reveal>` per §7.4, and one pilot usage (`BrandPhilosophy`) so the primitive is browser-exercised. | Baseline JSON committed as evidence. `<Reveal>` checks: no `[data-reveal]` in SSR HTML (curl the route); pilot section visible with JavaScript disabled; visible under reduced motion before and after load; visible on `#philosophy` anchor load; tall-element and `:focus-within` checks; `next dev` Strict Mode shows no stuck pending state. |
| **B — Homepage cinematic** | INV-03/04/06/07 (P0), then INV-08–11 (P1). | LCP element identity unchanged at 390 and 1440; CLS ≤ 0.02; all sections opacity 1 after the scroll pass; the Suspense fallback→stream swap shows no re-flash (API offline and online); disclosure lines never below opacity 1; frame sampling recorded for the hero. |
| **D — Application interactions** | INV-17/18, P-6 focus fix, INV-19/20. | All §8.5 assertions at 390×844 and 1440×900 with motion on and reduced. Back-navigation replay check. Tabs: synchronous `aria-selected`, budget, and focus. Accordion: collapsed height ≤ 1px; collapsed links not tabbable; `aria-expanded` synchronous. |
| **C — Discovery experience** | INV-12, 13, 14, 15 (keyboard parity), 16. | Filter counts correct immediately after trusted clicks; chip keeps focus; `scrollY` unchanged; no per-keystroke animation; detail-page disclosures exempt from reveal; `ExperienceGrid` reveal is opt-in only. |
| **E — Browser QA and performance** | New `scripts/verify_web_0_4.mjs` (same CDP pattern, no dependencies): 8 routes × 6 viewports geometry, §11.3 metrics, settled screenshots plus a reduced-motion set, and the 0.4 report. | Targets met or deviations explained; a measured-versus-target table; no claim without a measurement; the existing scripts remain green. |
| *(F — optional polish)* | INV-01, INV-02 (if un-deferred), O-3. | G0 plus the existing mobile-menu `display: grid` assertion unchanged. |

---

## 15. Open Risks

| Risk | Likelihood | Impact | Owner action |
| :--- | :---: | :---: | :--- |
| Hero compositing (scaled full-viewport image under a blend-mode grain) drops frames on low-end mobile GPUs; headless sampling cannot prove otherwise | Medium | Medium | Measure; if p95 frames exceed target, drop the image settle on `< md` and keep the text entrance. |
| The large-top-`rootMargin` technique behaves differently in a non-Chromium engine | Low | Medium | Verify in Safari/WebKit and Firefox manually; the watchdog and the "above the fold is never hidden" rule bound the failure to "no animation". |
| Activity replay of keyframe entrances on hero, `PageIntro`, or day panel is judged distracting | Medium | Low | Apply the `data-entered` pattern beyond the planner if review finds it necessary. |
| Text becomes LCP on mobile index pages, and entrance animations shift LCP | Medium | Medium | No delay on `h1`s; baseline comparison in Package A/B gates. |
| Evidence screenshots catch mid-transition frames, creating false regressions | High without mitigation | Low | Settled-capture protocol (§11.3). |
| Scope creep across five Discovery routes makes the site feel repetitive | Medium | Medium (art direction) | Motion budget (O-4); Package C is lowest priority. |
| Verification after client-side navigation queries Activity-hidden DOM | Medium | Low | Visibility-scoped queries in new scripts. `verify_homepage.mjs:287–296` already navigates client-side, so treat its `h1Text` result with this caveat. |
| Pre-existing a11y items (P-6 focus loss, tab `aria-controls`, span `aria-label`) | Present | Medium (P-6) / Low | P-6 in Package D; others logged. |
| All performance figures in the spec and planning report remain unmeasured until Package A runs | Certain | Medium | Gate B–E on the measured baseline. |

---

## 16. Final Readiness Assessment

**What is ready:**
- The creative direction: Discovery versus Application families, restrained travel, no scroll hijacking, no fake streaming.
- The dependency decision (no animation libraries).
- The reduced-motion stance.
- The general shape of the token system.
- The choice of CSS grid-row interpolation for the accordion.

**What is not ready:** the scroll-reveal mechanism, the Activity/lint/Strict Mode realities of the installed Next.js 16.4.3 and React 19.3.0 toolchain, planner anchoring under transforms, the accordion DOM structure, and the unmeasured performance baseline. These are the nine blocking revisions **B-1 … B-9** (§12). All are specification-level corrections within the approved architecture. Once they are folded into a spec v1.1 and the Package A baseline is captured, implementation can proceed in the order A → B → D → C → E, with a separate Git checkpoint for each package. Optional revisions **O-1 … O-7** improve maintainability and polish but do not gate implementation.

No implementation was started during this review.

`APPROVED WITH REQUIRED REVISIONS`
