# ADORA Experience Evolution — UX-0 Creative Direction

Date: 2026-11-21. Status: **proposed for creative approval; no UI implemented**.
Audited baseline: `main` at `54cab5bc5d04af4ec790493d725baf4d140483b7`.

## Creative premise

**Mist → Paper → Journey.** A landscape becomes an editorial invitation; that invitation becomes a conversation about the visitor's own journey. Preserve ADORA's Luxury Editorial × Cinematic Travel × Intelligent Planning identity. Give the visitor one memorable spatial handoff and generous intervals of calm, rather than making every section compete for attention.

The two pillars are **a continuous editorial journey** and **a personal Travel Concierge**. The first invites observation; the second starts only through an intentional action. No automatic dialog opening, sound, scroll interception, mandatory animation, or fabricated AI capability.

## Findings grounded in the current implementation

| Evidence | What works | Opportunity |
| --- | --- | --- |
| `apps/web/src/app/page.tsx` | Clear seven-part composition, server-rendered editorial content, isolated Catalog Suspense boundary | Adjacent sections have no shared progress or visual ownership |
| `components/home/editorial-hero.tsx` | Highland photograph, asymmetric headline, legible overlay, clear CTA | The landscape ends abruptly at the paper philosophy section |
| `brand-philosophy.tsx`, `destination-story.tsx`, `experience-story.tsx` in the same directory | Serif hierarchy, forest-to-coffee photographic narrative, asymmetric desktop composition | Repeated independent reveals do not connect image framing or narrative markers |
| `ai-planner-section.tsx`, `how-it-works.tsx`, `components/layout/site-footer.tsx` | Dark planning interval, explanatory pause, strong final question | Preview and route CTA do not yet offer a shared global conversation |
| `components/layout/site-header.tsx` | Recognizable outlined Planner CTA and accessible mobile menu | CTA changes route; there is no global Concierge trigger/state |
| `components/planner/planner-workspace.tsx` | Honest scripted conversation, itinerary preview, local state and polite log | State belongs to a single workspace instance; no modal or global ownership |
| `components/ui/reveal.tsx`, `app/globals.css` | SSR-visible content; Activity cleanup; reduced motion, kill switch and print safeguards | Reveal is an entrance system, not a scroll-progress narrative system |

Paths in this table are relative to `apps/web/src/` unless prefixed otherwise. The current header is absolute over the hero or relative on solid pages, **not a sticky header**. Do not design against an imagined sticky implementation.

The offline browser audit at six widths found loaded images, one visible H1, no horizontal overflow and no captured runtime exceptions. Desktop and mobile full-page captures show strong individual scenes, with hard background cuts and no shared boundary motion. These observations are not a new performance benchmark or a complete accessibility certification. See the [audit report](../reports/ADORA_UX0_EXPERIENCE_AUDIT_REPORT.md).

## Elements to preserve

| Element | Current source value / convention | Constraint |
| --- | --- | --- |
| Display / body | Playfair Display / Be Vietnam Pro, Vietnamese subsets, `app/layout.tsx` | Keep font families and Vietnamese diacritics; no replacement type system |
| Palette | Ink `#171a19`; paper `#faf8f3`; ivory `#f3efe7`; gold `#b39a70`; sage `#586c65`; mist `#c8d7db` | Use existing palette for dialog and scenes; gold is an accent, not small low-contrast body copy |
| Supporting colors | Secondary text `#46524d`; hairline `#cec8bc` | Contrast-test actual combinations, especially disabled text and borders |
| Geometry | Container `85rem`; gutter `clamp(1.25rem,4vw,4.5rem)`; section spacing `clamp(7rem,10vw,10rem)` | Preserve spacious rhythm; mobile continuity must not add long pinned intervals |
| Editorial language | Oversized serif with italic emphasis, tracked eyebrows, thin rules, forest/coffee photography | No new stock-image library, neon chat styling or repetitive SaaS cards |
| Controls | Existing filled ivory hero CTA, outlined header CTA, underlined editorial links | Keep recognizable appearance while changing activation behavior deliberately |
| Motion | Durations 120/180/240/420/680/920ms; editorial ease `(.22,1,.36,1)` | Preserve existing finite hero settle/grain and Reveal lifecycle; no spring/bounce system |

Only proposed additions: local dialog layer ownership; 180/240ms dialog transitions using existing durations; a named `--arrival-progress` value scoped to the future prototype; a maximum decorative bleed of 120px. Do not add a global token framework.

## Chosen experience

### Homepage: one signature, quiet connective tissue

Keep the exact order: **Hero → Philosophy → Destination → Experience → AI introduction → How it works → Footer/closing invitation**. The user's conceptual scene labels are narrative roles, not permission to insert or reorder sections.

The signature is **Mist-to-Paper**, between Hero and Philosophy. A bounded continuation of the existing landscape sits behind an opaque paper edge. As the boundary crosses the viewport, paper takes ownership of the space and the existing eyebrow rule becomes the next scene's anchor. This is a shared visual handoff, not two fades. Text stays in normal reading flow. Small screens use the same aligned paper edge/rule without sticky image movement. The [storyboard](ADORA_HOMEPAGE_CINEMATIC_STORYBOARD_V1.md) defines precise progress, geometry, fallback and rejection conditions.

Following transitions carry one quiet motif: hairline, image frame or gold marker. Forest-wide imagery narrows to the coffee ritual; the framed ritual gives way to a framed conversation. The dark AI section is the deliberate dramatic interval. How it works and the footer return to calm paper and ivory. Do not apply a continuous camera effect to the whole page.

### Concierge: an invitation, not a support widget

Retain the header CTA's visual identity. Add a discreet, labelled floating Concierge trigger only on suitable public pages. Both open one root-owned conversation in a native modal dialog. The dialog feels like an editorial workspace: ink frame, paper conversation, restrained itinerary preview, no bouncing avatar or promotional notifications.

Keep `/ai-planner` as an expanded, accessible workspace sharing the same state engine. It is the stable deep link, modified-click destination and fallback when modal enhancement is unavailable. It does not auto-open a dialog. Modal and expanded route must never mount duplicate active chat logs. See the [Concierge specification](ADORA_AI_CONCIERGE_UX_SPEC_V1.md).

## Cross-experience contract

1. Homepage hero, header, AI introduction, final invitation and floating trigger use one Concierge action. Unmodified activation opens the dialog; an ordinary URL fallback remains `/ai-planner`.
2. Preserve in-tab answers and composer draft when closing or navigating. Reload clears them. No cookies, localStorage, backend session or persistent itinerary is introduced.
3. Opening an already open Concierge is idempotent. Closing restores the originating focus target if it remains visible and connected.
4. Opening the dialog freezes background scrolling; it does not reset the homepage's position or restart its entrance animations. Closing restores position and releases only locks owned by Concierge.
5. Hide the floating trigger while the dialog or mobile menu is open, on the standalone Planner route, around conflicting fixed controls/keyboard, and while a visible inline Concierge CTA already provides the same action.
6. Use a persistent short demo badge and a fuller initial disclosure: scripted examples, no live model, no saved itinerary, no verified price/availability. Result cards repeat the relevant estimate limitation without labelling every sentence.
7. No auto-open at scene boundaries. Scroll progress must never dispatch conversation actions.

## Creative benchmark — principles, not copied sequences

References were checked on 2026-11-21 using direct web text extraction, not an interactive external browser replay. No reference animation timing, exact scroll mechanics or performance was measured.

| Reference | Directly inspectable principle | ADORA adaptation / tradeoff |
| --- | --- | --- |
| [Snami Travel](https://www.snamitravel.com/) | Experiential brand framing precedes curated travel collections in the retrieved content | Preserve emotion → place → personal invitation; retain ADORA assets and composition. Its live animation sequence was not verified; do not imitate it |
| [Bruno Simon](https://bruno-simon.com/) | Creator's site explicitly presents a navigable 3D world, quality settings and alternative input controls | Learn consistent spatial identity and user control. ADORA uses a shared frame/rule rather than a 3D world; reject driving controls, WebGL payload and nonstandard navigation for a travel reading experience |
| [The Boat](https://www.sbs.com.au/theboat/) | Direct retrieval exposed only limited page text; the [Awwwards listing](https://www.awwwards.com/sites/the-boat) timed out | Candidate immersive-storytelling reference only. Interaction details remain unverified and are not the basis for the prescribed choreography; revisit with a real browser before citing its mechanics |

The awarded/experimental web is a quality benchmark, not a dependency requirement. These references do not establish redistribution rights to their imagery, audio, fonts or code; import none of them.

## Alternatives considered

| Alternative | Decision |
| --- | --- |
| Replace route with modal-only Planner | Reject: loses a useful deep link and accessible expanded presentation |
| Next parallel/intercepted route modal with URL history | Defer: adds navigation complexity without a requirement for shareable modal-open state |
| Native dialog + root reducer | Recommend: existing dependencies contain no dialog package; native primitive supports top-layer modal behavior; still requires target-browser/focus QA |
| GSAP/ScrollTrigger + smooth-scroll framework | Reject for first prototype: exceeds current need and increases lifecycle/performance surface |
| More Reveal instances across every section | Reject: does not solve continuous narrative linkage |
| Whole-page pinning or video hero | Reject: mobile/readability cost, new media burden, unrelated redesign |

## Approval decisions and implementation boundaries

Owner approval is requested for: the Mist → Paper → Journey concept; preserving section order; expanded-route plus global-dialog model; memory-only draft lifetime; no modal history entry; floating-trigger eligibility; two Đà Lạt sample limits; mobile static handoff; and the proposed performance budgets in the storyboard. These are recommendations, not claims of approval.

Implementation order after review: **UX-1 Concierge → UX-2A single handoff prototype → UX-2B quiet scene rollout → UX-3 integrated acceptance**. Each needs a separate reviewable checkpoint. UX-0 does not authorize starting any of them. Product Phase 1B remains paused; the future AI/persistence boundary remains a separate product decision.
