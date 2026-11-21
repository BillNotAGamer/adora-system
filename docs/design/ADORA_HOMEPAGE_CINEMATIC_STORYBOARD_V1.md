# ADORA Homepage Cinematic Storyboard v1

Date: 2026-11-21. Status: **proposal for UX-2A/UX-2B approval, not implemented**.
Baseline: `54cab5bc5d04af4ec790493d725baf4d140483b7`.

## Existing scene inventory

Actual rendering order comes from `apps/web/src/app/page.tsx`. All home component paths below are under `apps/web/src/components/home/`; footer is under `components/layout/`. Approximate heights are measured in offline Chrome, not design targets: desktop 1440×900 / mobile 390×844, DPR1, fonts/images settled. Heights will vary with content/font/layout changes.

| Scene / exact file | Narrative / hierarchy | Image and background layers | Current motion and boundary | Height desktop / mobile |
| --- | --- | --- | --- | --- |
| Arrival — `editorial-hero.tsx` | Emotional arrival; eyebrow → single H1 → body → primary and discovery CTAs | Highland full-bleed image, gradient overlay, grain soft-light layer; absolute SiteHeader | Load-triggered 920ms image settle; 680ms text rise/staggers; finite scroll cue. Hard ink/image-to-paper cut; no scroll-linked handoff | 900 / 752px |
| Meaning — `brand-philosophy.tsx` | Explains deliberate travel; small left preface, large serif H2/right copy | Paper; sage emphasis; thin rule | Reveal 0/80/160ms offsets; independent below-fold observer entrances. Static paper→ivory cut | 721 / 735px |
| Place — `destination-story.tsx` | Gives atmosphere a name: Đà Lạt; eyebrow → name → italic tagline → narrative/link | Ivory; forest portrait, geographic badge overlapping frame | Image/text/badge Reveal delays 0/80/160ms. No shared image movement; static next paper boundary | 1101 / 1077px |
| Human scale — `experience-story.tsx` | Landscape becomes a coffee ritual; H2, three numbered inspiration rows and disclaimer | Paper; coffee photograph and caption, asymmetry on desktop | Independent Reveal children, row offsets in 90ms steps; desktop image is offset down, not scroll parallax. Hard cut to dark planning band | 1042 / 1101px |
| Personal invitation — `ai-planner-section.tsx` | Turns inspiration toward the visitor; large H2/CTA and sample conversation | Ink band, restrained gold radial field, framed static chat preview | Two Reveal groups 0/100ms; preview is not a live chat/composer. Dark band is not faded as a whole; hard return to paper | 922 / 1147px |
| Reassurance — `how-it-works.tsx` | Explains the process; H2 + support copy then three ruled steps | Paper; numbered gold markers, dividers | Intro Reveal, step offsets 90ms; rules remain readable/static. Quiet paper→ivory footer rule | 990 / 1342px |
| Closing — `../layout/site-footer.tsx` | One final question/CTA then navigation and project identity | Ivory; generous whitespace, dividing hairlines | Closing CTA Reveal; footer navigation remains static. End of document, no pinned outro | 527 / 658px |

At mobile widths, philosophy stacks, destination image precedes copy, experience image comes before its narrative, the AI preview falls below its invitation, and process steps become vertical. At 768px the still-stacked destination and experience are approximately 1530/1432px tall. Do not add scroll-duration padding to these already long scenes.

CatalogStories is a server Suspense boundary following `connection()` and runtime-validated Catalog fetching. It has coherent editorial fallback components of matching structure. No new motion controller may depend on a request succeeding or index hidden/pending duplicate DOM as real scenes. Target committed visible elements by refs/semantic scene IDs, not arbitrary `querySelectorAll` positions. Preserve stable dimensions through fallback replacement.

## Narrative direction and rhythm

**Mist → Paper → Journey** uses the existing order. Arrival and Meaning together form the initial immersion. Place and Human scale bring the camera conceptually closer. Personal invitation is the second dramatic interval; Reassurance and Closing are a calm landing. Philosophy remains second; it is not moved after Experiences to match conceptual labels.

The cinematic vocabulary has only three devices: **one shared image/paper handoff**, **aligned rules/frames**, and **small bounded depth changes on decorative layers**. No text tracking tied to every scroll pixel, spinning cards, repeated chapter pins or simulated smooth-scroll engine.

## Adjacent-scene handoff matrix

All progress specifications are proposed, reversible with reverse scrolling, and subordinate to normal document geometry. `V` is current viewport height; `b` is the outgoing scene's bottom relative to viewport top. Desktop trigger ranges are geometric, not fixed seconds. Mobile alternatives do not require a continuous animation driver.

| Pair | Outgoing → incoming / shared motif | Background and typography | Progress, geometry and exit | Mobile / reduced-motion / failure |
| --- | --- | --- | --- | --- |
| Hero → Philosophy **signature** | Highland image → opaque paper edge; existing eyebrow line anchors both | Preserve image/grain; paper takes over without fading the entire band; H1 and H2 remain in flow, no letter splitting | `p=clamp((0.35V-b)/(0.45V),0,1)`; paper-edge decorative travel max120px; image depth travel max24px. Starts b=.35V, ends b=-.10V; no extra scroll spacer; decorative sticky containment only inside this pair | <=767px static edge and aligned line; 768–1023px max64px edge travel, no image parallax. Reduced/off/print/unsupported: ordinary existing static boundary, all content visible |
| Philosophy → Destination | Philosophy rule → destination image frame and geographic badge | Paper→ivory remains an opaque tonal change; H2 rests, destination name enters normally | Quiet alignment, no pin. Optional rule scaleX .75→1 over b=.65V→.25V, transform-origin left; line decorative, never a focus affordance. Exit at final geometry | Same motif static on small screens; no alignment that reorders image/copy. Motion-disabled retains full line |
| Destination → Experience | Forest portrait frame → coffee frame; wide landscape becomes intimate ritual | Ivory→paper; sage italic emphasis carries vocabulary, no crossfade between two different photos | Existing frames remain distinct. Desktop coffee decorative wrapper may settle translateY(12px→0) as its top reaches .85V→.45V. No shared-element teleport or image swapping; no pin | Mobile photograph already leads: use matching border/caption rhythm, no depth transform. Static image when unsupported/off |
| Experience → AI introduction | Coffee caption/rule → frame around conversation; gold numbered accents → Concierge mark | Intentional paper→ink cut, not a whole-band opacity animation. Invitation H2 remains legible throughout | At incoming top=.85V→.35V, decorative chat-frame rule extends scaleX(.8→1). Existing text Reveal may run separately on another element; no simultaneous transforms on its target | Mobile static complete frame; no animated mask over text; dark cut retained under reduced/off |
| AI introduction → How it works | Conversation frame bottom rule → process top rule; possibility → explanation | Ink→paper deliberate visual reset; large titles do not chase each other | Calm boundary, no scroll-linked movement, no pin; current Reveal permitted. CTA interaction opens Concierge only by user action | Same reading order, no auto-open. If modal locks scroll, boundary progress stops naturally and resumes without replay |
| How it works → Footer | Third step's rule → closing invitation's top rule | Paper→ivory; reduce visual activity as the page ends | Static aligned rule, no pin/extra distance; optional existing CTA Reveal only. End condition: footer links reachable with keyboard/anchors immediately | All-static under off/reduced/print; floating trigger hides when closing CTA is visible |

These are deliberately unequal transitions. Only the first is the UX-2A prototype. Later optional rule/depth motion is subject to measured UX-2A results and owner review, not automatic authorization to animate all rows.

## UX-2A prototype: Mist-to-Paper

### Visual construction

Introduce a **server** `components/home/arrival-handoff.tsx` wrapper around the existing Hero and Philosophy only. Its future decorative image continuation must reuse the existing hero image element in a bounded backdrop arrangement; do not mount a second high-priority Image, fetch a new asset, or use the heavier destination image. Keep the hero's first-frame crop, dimensions, preload, typography, gradient, grain and settle behavior unchanged.

The paper surface is opaque from its first pixel. Its leading edge and a fine sage rule cross the last atmosphere of the hero, then resolve into the philosophy preface alignment. Maximum 120px decorative bleed is confined to the boundary/blank top spacing and must not cover text or interactive controls. The hero backdrop may remain sticky only within the Hero+Philosophy wrapper; there is no pinned text chapter and no added viewport-height spacer. Its final state is fully covered by paper. At the start the original hero is unchanged; at the end the original philosophy composition is unchanged.

This construction is a hypothesis requiring a prototype: if the same image cannot remain a correct LCP/semantic element with its original initial crop, or if containment duplicates loading/introduces paint cost, reject that implementation. A static edge treatment is preferable to a clever but unstable mask. Do not quietly introduce a duplicate background URL as a workaround.

### Motion implementation choice

| Technique | Appropriate role | Decision |
| --- | --- | --- |
| Current CSS + Reveal | Discrete entrance/hover after a position threshold | Keep unchanged; these are time-triggered, not continuous scroll progress |
| Native CSS view/scroll timelines | Couple decorative transforms to actual boundary progress | First choice inside `@supports`; static styles outside the feature gate |
| IntersectionObserver | Enable coarse eligibility/offscreen suspension, not precise continuous progress | Reuse existing patterns cautiously; do not rewrite per-instance Reveal |
| One scoped rAF driver | Optional exact-progress fallback if approved browser targets require it | Defer until prototype proves a need; one passive scroll listener, one scheduled frame, batched reads/writes, no per-frame React state |
| GSAP/ScrollTrigger | Complex multi-scene orchestration | Not justified for one bounded handoff; add no dependency |

[MDN's scroll-driven animation guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations) distinguishes scroll timelines from time-based animation. Check individual property support in the agreed browser matrix; do not assume universal support from the existence of `@supports`. Unsupported browsers receive a complete static layout, not a mandatory JS polyfill.

The parent currently uses `overflow-x-clip`. Verify future sticky containment against actual ancestor overflow/containing blocks; do not remove overflow protection globally to make the prototype work. Use a dedicated decorative wrapper and transform/opacity only where practical. Large clip-path/mask/filter or background-color interpolation must be profiled, not presumed compositor-only. No animated blur. No persistent `will-change` on all scene images.

### Lifecycle and access invariants

- SSR and no-JS: visible headings, links, images and normal reading order. Progress defaults to a safe static composition; animation cannot be the only way to uncover text.
- On `prefers-reduced-motion`, `html[data-motion="off"]`, print, unsupported timelines or initialization failure, bypass decorative travel/sticky behavior and use normal document flow. Switching motion off midway resolves immediately to the safe static state.
- Do not use the same transform target for Reveal and scene progress. New decorative elements have `aria-hidden=true`, pointer-events none and no focusable descendants. Keep semantic images' meaningful alt text.
- Midpage reload and Back/Forward derive the right appearance from current geometry; no opening replay or forced scroll reset. An optional driver must reconnect idempotently after Activity effect cleanup; it must not assume mount means initial arrival.
- Anchors and keyboard focus keep native scroll behavior. No snap points, wheel/touch cancellation or scroll locking from the narrative. Modal owns the only new scroll lock, suspending optional progress work while open.
- Preview at six widths with real Vietnamese text. Mobile does not inherit desktop sticky distances or full-width landscape flattening. Print outputs a readable static page with decorative overlays omitted.

### Prototype acceptance and proposed budgets

Capture current baseline and prototype in isolated builds with identical Chrome, network, CPU and image-cache policy. Use five cold samples per target route/profile with balanced A/B ordering and an unaffected route control. Record raw LCP identity/timing, CLS, TBT, LongTasks, JS bytes, frame timing and runtime errors using the unchanged collector definitions; selection wrappers may live in scratch. Historical A0 is context, not a substitute for a current matched control.

Proposed ship budgets, requiring approval: **CLS=0; no changed hero LCP identity; <=50ms median mobile LCP regression; <=25ms median TBT regression; <=2KiB added compressed initial JS; no additional hero image transfer**. These are engineering decision thresholds, not statistical significance claims or achieved measurements. If noise prevents a reliable comparison, repeat relevant blocks or retain the static fallback. Inspect physical mobile smoothness; headless frame timing does not certify GPU behavior.

Visual acceptance: one image-to-paper ownership transfer is clearly perceptible during ordinary forward/reverse scrolling; no seams, flashes or text occlusion; initial hero and final philosophy match approved compositions; only the boundary moves. Fast scroll, Home/End, anchor jump and midpage reload must never leave content hidden. No new layout height, clipped focus ring or image quality/crop regression.

## Roadmap and Git checkpoint boundaries

The following inventories are proposed future work, not files created in UX-0. All source paths are under `apps/web/src/` unless explicitly prefixed.

| Checkpoint | Files / data contracts | Prerequisites and tests | Risks / Definition of Done / Git boundary |
| --- | --- | --- | --- |
| **UX-1 Concierge** | New `components/concierge/{concierge-provider,concierge-dialog,concierge-trigger,concierge-floating-trigger,concierge-conversation,concierge-itinerary-preview}.tsx`; `lib/concierge/{state.ts,state.test.ts,demo.ts}`. Modify Providers, PlannerWorkspace, Planner route and verified entry links; scoped dialog styles only | Approve route/history/draft/demo decisions in Concierge spec. Pure reducer tests + `scripts/verify_concierge.mjs`; six widths, keyboard, real-device keyboard, reduced/off, Activity. Proposed initial/lazy JS budgets 8/25KiB | Focus/scroll lock, duplicate hosts, demo dishonesty are release blockers. Done when two sample conversations work globally with preserved draft and accessible fallback. Separate implementation/evidence commit after review; no motion rollout bundled |
| **UX-2A one transition** | New `components/home/arrival-handoff.tsx`; optional `arrival-progress.tsx` only if feature-detected CSS cannot meet agreed targets; small scoped styles in globals; minimal composition change in `app/page.tsx`; `scripts/verify_home_narrative.mjs` | Approve signature geometry/budgets/browser matrix; current matched control, no backend. Test reverse/fast scroll, jumps, reload, Back/Forward, print, off/reduced and six widths; measure limits above | LCP/image duplication, sticky overflow, repaint cost. Done only with reviewed moving capture and raw paired metrics; no Reveal refactor. Single-prototype checkpoint with explicit go/no-go before UX-2B |
| **UX-2B narrative rollout** | Modify existing home section decorative wrappers/rules only, footer CTA connection; extend same narrative verifier; no seven-section replacement or universal client wrapper | Approved UX-2A architecture and result; retain Suspense fallback geometry. Full-page/continuous scroll review desktop/mobile, all old regressions plus Concierge together | Repetitive effects and mobile fatigue. Done when matrix handoffs read coherently and quiet intervals remain. One reviewable rollout checkpoint; performance remeasure affected routes |
| **UX-3 integrated acceptance** | New QA report/evidence; verifier additions and minimal confirmed defect fixes, no new architecture | UX-1/2A/2B accepted. Production build, unit/lint/typecheck, API-client check if imports change, three existing browser suites + new suites, physical mobile/screen reader review | Modal/narrative lock conflict, Activity restoration, off toggling. Done when integrated contracts pass with actual evidence and unresolved limitations explicit. Final acceptance checkpoint, no backend or product Phase 1B work |

Existing assertions that require clicking a CTA to navigate must be deliberately versioned to check modal opening plus preserved URL fallback. Do not simply delete their route tests: standalone `/ai-planner` must still render. Preserve H1 filter-reset focus, stable tabpanel associations, skip link, finite motion, SSR visibility, no persistent will-change, keyboard access, hidden-Activity exclusion and demo labels. Keep the historical metrics collector/baseline immutable.

## Decisions and stop conditions

Approve the concept, mobile static alternative, browser support matrix and budgets before UX-2A. If native CSS is insufficient, review a single scoped driver proposal before adding it. GSAP is not preapproved. Stop if a proposed effect requires removing fail-visible safeguards, changing hero assets/settings, locking narrative scrolling or hiding meaningful content. H2 did not establish motion component causation; H3 preserved the original destination image. Neither is permission to refactor observers or re-encode assets during this initiative.
