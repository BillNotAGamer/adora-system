# ADORA Web Design 0.4 — Motion Specification v1.1 Final Architecture Approval

**Date:** 2026-11-07
**Reviewer:** Claude Code (Opus 5.5), independent Principal Frontend Architect and Technical Reviewer
**Subject:** `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md` (980 lines), with `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_REVISION_REPORT.md`
**Measured against:** `docs/reports/WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md` §12 (B-1 to B-9, O-1 to O-7) and the source at `c49595573f8b7214f414a589006b748d5d6babfb`
**Scope:** Documentation review only. No application code, CSS, tests, dependencies, or Git history were changed.

**Evidence labels**
- **[OBSERVED]**: read in the repository at the baseline commit.
- **[PROBED]**: executed in a scratch directory outside the repository. Only one probe was run: a TypeScript check (§5).
- **[INFERRED]**: derived from platform specifications or library semantics.
- **[UNVERIFIED]**: runtime behaviour that nobody has executed yet.

No browser was launched, nothing was measured, and lint, typecheck, test, and build were **not** run on the application. Every statement about runtime behaviour in this report is [INFERRED] or [UNVERIFIED] unless marked otherwise.

---

## 1. Executive Verdict

Spec v1.1 is a coherent, implementable contract. It addresses all nine blocking revisions from the previous review:
- The zero-state `<Reveal>` component and its fail-visible design.
- The cascade rules.
- Next.js Activity handling.
- The opacity-only planner entrances.
- The three-layer accordion.
- The honest performance baseline plan.
- The disclosure exemptions.
- The capped stagger.

The architecture is sound and needs no further revision cycle.

The review found **no blocking specification defects**. It did find a set of small, local defects and loose ends. They are recorded here as **binding errata** (E-1 to E-13, §11.2). Each one is fixed inside the package that touches the code, without a v1.2. The most important:

1. **E-1.** The `<Reveal>` reference code reads `entries[0]`, the *oldest* IntersectionObserver entry, and attaches its scroll guard only after deciding to mark the element pending. An entry that is already stale can then leave an on-screen element at `opacity: 0` until the next scroll. The fix is three lines.
2. **E-2.** v1.1 contains two stagger mechanisms (absolute `delayMs` and index × token). Its promise of "0ms stagger on mobile single-column" cannot be met with the `<Reveal>` API as written.
3. **E-5.** The "2-iteration" hero scroll-line bound ends on the `scaleY(0.35)` keyframe and then **snaps** to the full line. The fix is 1.5 iterations with no fill.
4. **E-7, E-8, E-11.** Three changes from the earlier per-item review (INV-07 image settle inside the frame, INV-10 static dividers, INV-15 keyboard parity) were either not carried over or cannot work as written. The INV-15 flaw originated in my own earlier review.

The two retained art-direction values are **accepted**:
- **INV-01:** 240ms underline.
- **INV-04:** four-step hero stagger.

The conditions for both are in §9.

**Package A may begin after the documentation checkpoint in §12.**

`APPROVED WITH MINOR NON-BLOCKING NOTES — PACKAGE A MAY PROCEED`

---

## 2. Verified Git State [OBSERVED]

Commands ran with command-local `git -c safe.directory=<repo>`. Global configuration was not touched.

| Item | Value |
| :--- | :--- |
| Branch | `main` |
| HEAD | `c49595573f8b7214f414a589006b748d5d6babfb` (`feat(web): implement adora discovery planner and trip experiences`), matching the expected baseline |
| Tracked changes | None |
| Untracked files before this review | 5 documents, all preserved and unmodified:<br>• `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md`<br>• `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md`<br>• `docs/reports/WEB_DESIGN_0_4_MOTION_PLANNING_REPORT.md`<br>• `docs/reports/WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md`<br>• `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_REVISION_REPORT.md` |
| Created by this review | This file only. The scratch TypeScript probe lives in the session scratchpad, outside the repository. |
| Commits | None |

---

## 3. B-1 to B-9 Resolution Matrix

Every status below comes from reading the spec text and comparing it with the source, not from the revision report's labels.

| ID | Required by the previous review | Where v1.1 resolves it | Assessment | Status |
| :--- | :--- | :--- | :--- | :---: |
| **B-1** | `<Reveal>` per the earlier contract (§7.4):<br>• first-callback decision at the 100% fold<br>• `threshold: 0` + `rootMargin`<br>• transitions, not keyframes<br>• imperative attribute, no React state<br>• `as`/`className`<br>• watchdog, `:focus-within`, and print fallbacks<br>• idempotent under Activity and Strict Mode | A.3, C.2 (code at `:191–329`, CSS at `:331–370`), Package A | Every element is present. v1.1 also adds a guard that checks the element's position on scroll after it is marked pending. Two defects are in the reference code, not the contract:<br>• It reads `entries[0]`; the earlier contract specified the last entry.<br>• The guard is not checked when the element is first marked pending (E-1).<br>Separately, the stagger mechanism is internally inconsistent (E-2). | **RESOLVED** (E-1, E-2 binding) |
| **B-2** | Cascade rules:<br>• transform and opacity only<br>• never animate Tailwind v4 `translate`/`rotate`/`scale`<br>• `backwards` fill<br>• settle to `transform: none`<br>• no persistent `will-change`<br>• reveal inner content only on coloured bands | C.1, A.4.3 | Correct and explicit. One composition rule is missing: unlayered `[data-reveal]` rules override Tailwind utilities on the same element (E-3). Two factual slips do not affect the rule:<br>• HowItWorks has a paper background, not ivory (`how-it-works.tsx:21`).<br>• The footer is ivory, not ink (`site-footer.tsx:11`). | **RESOLVED** (E-3) |
| **B-3** | Activity:<br>• reveal idempotence<br>• `data-entered` marker on planner bubbles<br>• an **explicit decision** for hero, `PageIntro`, and day-panel replay<br>• visibility-scoped test queries | C.3 | The reveal, planner, day-panel, and `checkVisibility()` parts are done. Hero and `PageIntro` are left as "may optionally" (C.3.4), and INV-03 mixes a client latch with "CSS-only". That is not a decision. This report closes the gap with decision D-1 (E-6). | **PARTIALLY RESOLVED** → closed by E-6 (non-blocking) |
| **B-4** | Planner:<br>• opacity-only entrances inside the log<br>• 0 / +80ms timing<br>• no JavaScript sequencing<br>• jumpbar opacity-only<br>• reduced motion read at click time<br>• `getBoundingClientRect` explanation corrected<br>• §8.5 assertions in the gates | C.4, D.3, INV-17/18, Package D | All present and consistent with the code: anchoring effect `planner-workspace.tsx:68–84`; atomic insert `:109–115`. Implementation details remain (E-9). | **RESOLVED** (E-9) |
| **B-5** | Accordion:<br>• padding and border on the innermost layer<br>• `inert`, no `aria-hidden`<br>• stable `id`/`role` | C.5, INV-20 | Exact three-layer structure, matching the earlier §9.2 structure. `aria-controls` becomes valid in both states. | **RESOLVED** |
| **B-6** | Baseline column "to be measured"; "zero LCP penalty" restated as a target; the earlier §11.3 protocol; INP from trusted input | F.1, F.2, Package A.1 | Correct. No unmeasured value is presented as measured. Targets are separate from results. Gate refinements are in N-8. | **RESOLVED** (N-8) |
| **B-7** | Disclosures never delayed behind reveals; no pulsing "live" indicators; no typing or skeleton states | A.5 | The rule is correct and general. Three cited line ranges are wrong, including two in the disclosure list itself. Two disclosures are missing from the list: `planner-cta.tsx:26` and `experience-story.tsx:38–40`. The general rule still covers both. See the corrigenda in §11.4. | **RESOLVED** (corrigenda) |
| **B-8** | Per-item dispositions from the earlier §5, scoped to INV-02, 13, 14, 16, 19 | E, revision report §5 | All of the named scope is resolved. Three other §5 changes were not carried over or are unworkable:<br>• INV-07: scale the image, not the frame.<br>• INV-10: reveal inside ruled `li`s.<br>• INV-15: `group-focus-visible` cannot match.<br>These become E-7, E-8, and E-11. | **RESOLVED** (named scope; E-7/E-8/E-11) |
| **B-9** | No transitions on focus rings; stagger cap enforced with `min()` | B.1 note, B.3, C.2 CSS | Correct. The existing `.filter-chip` transition does not include outline (`globals.css:143–146`). | **RESOLVED** |

**Optional items O-1 to O-7:**
- **Adopted correctly:** O-1, O-2, O-4, O-6, O-7.
- **O-3 (scroll-line bound):** introduces a resting-state defect (E-5).
- **O-5 (focus fix):** needs a touch-device check (N-4).

---

## 4. Reveal Lifecycle Approval Assessment

### 4.1 The ten required checks

| # | Requirement | Finding | Verdict |
| :---: | :--- | :--- | :---: |
| 1 | Initial visibility preserved | Neither the server render nor the client render sets `data-reveal`. The attribute is only ever set imperatively, and React leaves attributes it does not own untouched. Without JavaScript, or before hydration, content stays at the base style (`opacity: 1`). [INFERRED] | ✓ |
| 2 | Content partly visible at the fold never hidden | On the first callback, `top < innerHeight` leads to `visible` without passing through `pending`. The defect at 92–100% of the viewport is gone. | ✓ |
| 3 | Pending content cannot stay invisible after entering the viewport | **Conditional.** See §4.2. Holds after E-1, with one residual (N-3). | ✓ with **E-1** |
| 4 | Pending content above the viewport after a fast scroll is revealed | Two paths reveal it:<br>• The top margin of `100000px` makes anything above the trigger line intersect.<br>• The guard's `rect.bottom <= 0` clause catches the rest.<br>[INFERRED] Must be verified in WebKit and Gecko. | ✓ |
| 5 | Observer callbacks do not conflict with the guard | `reveal()` is idempotent, and `else if (!revealedRef.current)` blocks re-pending. One gap: IntersectionObserver entries queued before `disconnect()` can still be delivered under the specification's queue model, which would re-attach listeners after cleanup. [INFERRED; Chromium behaviour unverified] Fixed by E-1's `disposed` flag. | ✓ with **E-1** |
| 6 | Observers, listeners, timers, and animation frames cleaned up | Cleanup clears the watchdog, the four listeners, the pending animation frame, and the observer. The only leak path is the one in row 5. | ✓ with **E-1** |
| 7 | Strict Mode does not leave duplicate subscriptions active | First effect, then synchronous cleanup, then second effect. The observer computes entries only at the next rendering update, so the first observer delivers nothing. [INFERRED] | ✓ |
| 8 | Activity hide/show restores subscriptions without hiding revealed content | On hide, cleanup runs. The refs and the `data-reveal` attribute persist. On show, the effect checks `revealedRef`/`visible` and returns early, or re-observes elements that are still pending. Transitions do not replay. | ✓ |
| 9 | Back/Forward and anchor navigation safe | The decision comes from the first callback, and restoring the scroll position triggers the observer or the guard. A route evicted from Activity (more than 3 kept) mounts fresh and replays its reveals. That is acceptable. `hashchange` does not fire for Next.js `pushState` navigation, but the scroll it causes does. | ✓ |
| 10 | Polymorphic wrappers keep HTML semantics and grid placement | `as="li"` is valid inside `ol`/`ul`, and `className` passes through. Four follow-ups:<br>• The tag set has no `span`, so the DestinationStory badge needs E-8.<br>• Ruled lists should keep dividers static (E-7).<br>• The wrapper must not carry motion utilities (E-3).<br>• The `@ts-expect-error` directive works but can be dropped (N-2, §5). | ✓ with E-3/E-7/E-8 |

### 4.2 Is the post-pending guard a bounded fail-visible guarantee?

**It is bounded by events, not by time.** Spec `:188` claims that "any scroll **or layout change**" reveals the element "deterministically". That overstates it. The guard listens only to `scroll`, `resize`, `hashchange`, and `visibilitychange`. A layout shift with no scroll event reaches the guard only through the observer.

**The real defect is E-1.** Under the IntersectionObserver specification, one callback can deliver several queued entries for the same target [INFERRED]. Consider an element that is observed below the fold while hydration keeps the main thread busy. If the user flick-scrolls before the first callback runs, the callback can receive `[stale: not intersecting, current: intersecting]`.

v1.1 then behaves like this:
1. It reads `entries[0]` and marks the element pending.
2. Only then does it attach the guard. Scroll events that already happened are lost.
3. The intersection state does not change again, so no further observer callback arrives.

The element stays at `opacity: 0` **inside the viewport** until the next scroll or resize. That breaks guarantee 3.

**Minimal correction (binding, Package A):**

```ts
let disposed = false;                                    // set in cleanup

io = new IntersectionObserver((entries) => {
  if (disposed || revealedRef.current) return;
  const entry = entries[entries.length - 1];            // newest state, not the oldest
  if (!entry) return;
  clearTimeout(preCallbackWatchdog);
  if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) { reveal(); return; }
  el.dataset.reveal = "pending";
  attachPendingListeners();
  onViewportEvent();                                    // re-check live geometry on the next frame
}, { threshold: 0, rootMargin: "100000px 0px -10% 0px" });

// checkViewportPosition: early-return when `disposed`
// cleanup: disposed = true; clearTimeout(...); removePendingListeners(); io?.disconnect();
```

**Guarantee after E-1.** A pending element at or above the reveal line becomes visible within one animation frame of whichever comes first:
- the pending decision itself,
- any observer notification, or
- any `scroll`, `resize`, `hashchange`, or `visibilitychange` event.

It becomes visible instantly under `:focus-within`, print, reduced motion, or `data-motion="off"`.

**Remaining residual:** the geometry moves the element into view with no scroll or resize event, **and** the observer also fails to notify. Both would have to fail at once. That is acceptable; N-3 offers optional hardening.

**N-1.** The guard line (`0.92 × innerHeight`) does not match the observer trigger line (`-10%`, i.e. 0.90). This is harmless: the guard simply fires slightly earlier while scrolling. Align both to 0.90 so the spec defines one trigger line.

---

## 5. Next.js Activity and React Compatibility

| Concern | Finding | Verdict |
| :--- | :--- | :---: |
| `cacheComponents` / Activity (`next.config.ts:5`) | Reveal idempotence holds (§4.1 row 8). The `data-entered` latch covers planner turns and the day panel. Hero and `PageIntro` keyframes **replay** when a route is shown again (CSS Animations: leaving `display: none` restarts animations). Decision D-1 (E-6) accepts this. | ✓ (E-6) |
| React 19 Strict Mode | Safe (§4.1 row 7). Package A gate: no element stuck pending under `next dev`. | ✓ |
| `react-hooks/set-state-in-effect` (v7, error severity) | `<Reveal>` has no React state. E-10 adds a state flag, but sets it in an event handler, which the rule allows. That flag must be **state, not a ref read during render**, because the v7 `refs` rule rejects render-time ref reads. | ✓ |
| Client boundaries | `<Reveal>` is a small client leaf that receives Server Component children. All six homepage sections stay Server Components (O-6 confirmed). No client conversion is needed across the app. Hero and `PageIntro` stay CSS-only under D-1. | ✓ |
| Tailwind v4 transform composition | Custom rules animate only `transform`. Utilities use `translate`/`rotate`/`scale`. The two compose rather than overwrite. Reveals sit inside `lg:translate-y-10` (`experience-story.tsx:47`), not on it. The individual properties do not show up in `getComputedStyle(el).transform`, so the Package B "except" clause is harmless. | ✓ |
| Unlayered rules versus utilities | Tailwind v4 places utilities in `@layer utilities`, and `globals.css` rules are unlayered (`:131–219`) [OBSERVED]. Unlayered rules beat layered ones regardless of specificity, so `[data-reveal="visible"] { opacity; transform; transition-* }` silently overrides any `opacity-*`, `transition-*`, `duration-*`, or `delay-*` utility on the same element. No element planned for v1.1 carries one today [OBSERVED]. Make it a rule (E-3). | ✓ (E-3) |
| Animation fill modes | `backwards` everywhere, and the settled state is `transform: none`. Correct. The exception is O-3 (E-5). | ✓ (E-5) |
| Image hover compatibility | The touch guard wraps `.image-reveal:hover img` (`globals.css:169–171`). **Keep the `transition` on `.image-reveal img` (`:165–167`) outside the guard.** Otherwise touch devices lose the settle that E-3's image variant relies on. | ✓ (E-3) |
| Focus and screen readers | `:focus-within` reveals pending content. Focus rings are never transitioned. Content that is pending at opacity 0 stays in the accessibility tree, which is correct. `inert` handles collapsed accordions. No new live regions. | ✓ |
| Server children through client components | Supported by React Server Components. `ExperienceGrid` can import the client leaf and stays usable inside the `ExperienceBrowser` client island. | ✓ |
| Responsive layout | `as` and `className` keep grid placement. Mobile zero-stagger needs E-2. | ✓ (E-2) |
| Dependencies | None added. G0 enforces an empty diff on `package.json` and `pnpm-lock.yaml`. | ✓ |
| `// @ts-expect-error` on the polymorphic ref [PROBED] | Probe used the repo's TypeScript 5.9.3 and `@types/react` 19.3.0 against a scratch copy of the pattern:<br>• The directive suppresses an error, so typecheck passes.<br>• Without the directive, TS2322: `RefObject<HTMLElement \| null>` is not assignable to the intersected `div`/`li` ref types.<br>• A callback ref `(node: HTMLElement \| null) => { ref.current = node }` compiles cleanly with no suppression.<br>Prefer the callback ref (N-2). | ✓ (N-2) |

---

## 6. AI Planner Safety

| Requirement | Finding | Verdict |
| :--- | :--- | :---: |
| Entrances inside `role="log"` are opacity-only | C.4.1 and INV-17/18: the user bubble, both reply kinds, and the mobile preview use `transform: none`. | ✓ |
| `getBoundingClientRect()` anchoring stays accurate | The effect measures at commit time (`:77–80`), and opacity does not change geometry. The revision report's "100% identical (`\|Δ\| ≤ 1px`)" is a **target** that Package D assertion 2 must prove [UNVERIFIED]. | ✓ |
| Jumpbar insertion does not animate geometry | Opacity-only. The jumpbar mounts above the log in the same commit (`:246–272`), so the log shrinks before the effect measures. That is existing 0.3 behaviour and is unchanged. | ✓ |
| Activity Back does not replay entered messages | Latch keyed on `data-entered`, with a check that the event target is the element itself. Package D assertion 6 covers it. Extend the latch to the jumpbar and mobile preview (E-9). | ✓ (E-9) |
| Scripted replies are not presented as AI | The entrance is atomic and done in CSS only. The `DemoLabel` arrives with its card. No typing, `aria-busy`, or skeleton states. The 0.3 check for no external requests stays. | ✓ |
| Focus after a welcome suggestion | Moved to `#planner-prompt` with `preventScroll`. The ref is `textareaRef` (`:58`), not `inputRef`. Focusing the textarea inside a tap may open the on-screen keyboard over the new reply on phones [UNVERIFIED] (N-4). | ✓ (N-4) |
| Reduced motion | The global 0.01ms rule covers entrances. The jumpbar reads `matchMedia` at click time. The anchoring effect stays instant. | ✓ |
| 0.3 assertions remain authoritative | G0 runs `verify_web_0_3.mjs` and `verify_homepage.mjs` unchanged. Neither asserts opacity, `aria-current`, regions, or animations except the reduced-motion duration checks [OBSERVED: `verify_homepage.mjs:265–280`]. Both stay valid. | ✓ |

**Implementation details (E-9):**
- The `unsupported-reply` test ID sits on the inner `<p>` (`:350`), not the article (`:345`). Animate the **article** for both reply kinds so the "Thông báo hệ thống" label and its text enter together.
- The mobile preview `<section>` (`:408`) has no key. Key it by `preview.slug`, matching the desktop panel, so a second scenario enters consistently.

---

## 7. Accordion and Filter Safety

| Requirement | Finding | Verdict |
| :--- | :--- | :---: |
| The three-layer accordion fully collapses | Layer 1 is a `0fr` grid track. Layer 2 is `min-h-0 overflow-hidden`. Layer 3 carries `border-t px-4 py-5` (moved from `itinerary-explorer.tsx:121`). Collapsed height is 0 [INFERRED]; the gate is ≤ 1px. | ✓ |
| Padding and border inside the clipping layer | Yes. | ✓ |
| Collapsed content is inert | `inert={!open}` on layer 2 (boolean `inert` is supported in React 19). Collapsed links leave the Tab order and the accessibility tree. | ✓ |
| ARIA and focus | `aria-expanded` still flips in the click handler (`:108–110`). `aria-controls` now always resolves. Focus stays on the trigger. On a day change, the new day's first activity mounts already open (`selectDay`, `:27–28` [OBSERVED]), so nothing animates on mount. | ✓ |
| No data or behaviour change | Content is always mounted, so collapsed text now appears in `innerText` scans. None of the 0.3 forbidden phrases appear anywhere in `apps/web/src` [OBSERVED], so G0 is unaffected. | ✓ |
| Typing does not remount | The `/destinations` key is `${region}-${availability}`, which matches `DestinationFilter` (`destination-browser.tsx:28–32`). The `/experiences` key is `filter.category`. **Clarification (N-5):** typing that moves between empty and non-empty results swaps the list and the empty state structurally, and the newly mounted node will fade. That is acceptable. The "zero animation while typing" gate must use a query that keeps results non-empty. | ✓ (N-5) |
| Chip feedback and counts are synchronous | The `role="status"` counts sit outside the keyed subtree (`:91`, `experience-browser.tsx:71`). `aria-pressed` updates at once; only the colour fades. | ✓ |

**Pre-existing issue, not caused by motion (log only):** the "Xoá bộ lọc" button sits inside the empty state (`destination-browser.tsx:156`, `experience-browser.tsx:85`). It unmounts when clicked, so focus falls to `<body>`.

---

## 8. Accessibility and Performance Review

### Accessibility
The reduced-motion stance is right:
- Pending CSS is scoped to `no-preference`.
- The `!important` safety net covers everything else.
- `data-motion="off"` mirrors reduced motion.

The disclosure exemption (A.5.3) is the right general rule. Two refinements:
- **`PageIntro`:** the `DemoBadge` arrives through `aside`, inside the *delayed* right column (`page-intro.tsx:22–25`), not "with the title block" as INV-12 states (E-12).
- **INV-16:** "Lead narrative" must mean heading groups, never long-form body paragraphs (N-6).

The day-panel entrance should start at opacity ≥ 0.2 so that holding an arrow key never blanks the panel (N-7).

### Performance
Spec v1.1 meets every B-6 requirement:
- No unsupported measured claims.
- Baseline at the baseline commit, captured before code changes.
- Trusted CDP input for the INP proxy.
- Targets separate from observations.
- Collection methods defined for LCP, CLS, interaction latency, long tasks, frames, and script bytes.

**No baseline has been collected. None is invented here.**

Gaps, all non-blocking (N-8):
- The baseline collector is unnamed. It must be one script, committed in Package A and reused **unchanged** in Package E. Otherwise the comparison is not like for like.
- The JSON must record the Git SHA, a clean `apps/web` tree, the Chrome version, the machine, and the throttling profile.
- "Median across all 8 routes" must read **per-route medians**.
- The frame-stability row needs the earlier caveat: headless sampling is indicative and is not evidence of device performance.
- The Package E gate "all 48 checks CLS ≤ 0.02" should read "≤ 0.02, or ≤ baseline + 0.01 where the baseline already exceeds 0.02". Without that, a pre-existing shift would fail motion work.
- Device performance cannot be claimed from headless Chrome. The spec does not claim it, but should say so explicitly.

---

## 9. Inventory Consistency (including INV-01, INV-04, INV-05)

### INV-01: desktop underline, 240ms versus about 200ms (final decision: **accept 240ms**)

**Why 240ms is acceptable art direction:**
- 240ms equals `--adora-duration-ui`.
- It sits inside v1.1's 160–260ms range for application controls.
- The difference from 200ms is imperceptible on a hairline.

It is **not** an internal inconsistency in v1.1. It *is* an unrecorded deviation from Blueprint §5 (links 160–220ms, `01_DESIGN_BLUEPRINT.md:134` [OBSERVED]).

**Conditions, which apply only if INV-01 is implemented (E-13):**
- Record the deviation next to the 1200ms hover in spec §B.4.
- Remove the existing active style `border-b border-[var(--adora-gold)] pb-1` (`site-header.tsx:63`) when the `::after` line replaces it, without changing the link's box geometry. Otherwise the active link shows two underlines.

### INV-04: hero stagger, four steps versus at most three groups (final decision: **accept four steps**, 0/60/120/180ms desktop and 0/40/80/120ms mobile)

**Why four steps are acceptable:**
- They are within v1.1's own budget (≤ 4 steps, ≤ 270ms).
- They are within the Blueprint hero range (450–700ms).
- Settling takes 60ms longer than with three groups, which is a pure art-direction choice.

**The engineering concern from the earlier review (LCP) is handled by measurement, not by structure:**
- On `/`, the preloaded full-bleed image is far larger than the `h1`. Once painted, it is the final LCP candidate, so the 60ms `h1` delay should not move LCP [INFERRED].
- **Condition:** if the Package A baseline shows the `h1` as the LCP element on any viewport, drop the `h1` delay to 0 by merging the eyebrow and `h1` into step 0.
- Rescope the "`h1` never delayed" wording in INV-12/16 to "routes where the baseline shows the `h1` as the LCP element (or a plausible candidate)". This removes the apparent contradiction.

### INV-05: optional scroll-line bound (**defect, E-5**)

**The defect** [OBSERVED: `globals.css:178–194`, `editorial-hero.tsx:52`]:
- The keyframes run `0%/100% = scaleY(0.35), opacity 0.35` and `50% = scaleY(1), opacity 1`.
- The element's own style is the full line at opacity 1.
- With `animation-iteration-count: 2` and no fill, the animation ends on the faint 35% frame and then jumps to the full line at 4.4s.
- "Settling at `scaleY(1)`, opacity 0.75" does not follow from anything the spec specifies.
- Using `forwards` instead would keep a finished animation in effect, which breaks v1.1's own check that `document.getAnimations()` is empty after 4.5s.

**Correction:**
- Set `animation-iteration-count: 1.5`, no fill. The animation ends on the 50% keyframe, which equals the base style, so there is no snap. It lasts 3.3s, under the 5s limit, and leaves no relevant animation behind.
- Drop "opacity 0.75", or set it on *both* the base rule and the 50% keyframe.
- Reduced motion is unaffected. The global `iteration-count: 1 !important` and 0.01ms values resolve to the base style, which is the full line, exactly as in 0.3.
- `verify_homepage.mjs:278/368` still passes because the duration is forced to 0.01ms.

### Other inventory deltas (binding errata in §11.2)

| Item | Issue | Erratum |
| :--- | :--- | :---: |
| INV-07, image variant | v1.1 scales the **wrapper**, which is the `.image-reveal` frame itself. The earlier contract (§7.4) and INV-07 scale the **image inside** the mask, so the frame edges stay fixed and the existing 1.2s image transition performs the settle. | E-3 |
| INV-07, badge | The badge is an absolutely positioned `span` (`destination-story.tsx:25`), and the tag set has no `span`. A wrapping `div` that is being transformed becomes the badge's containing block during the reveal. | E-8 |
| INV-08/10/16, ruled lists | `as="li"` makes the hairline dividers (`border-b`, `md:border-r`, `how-it-works.tsx:37`; `experience-story.tsx:32`) rise 10–16px out of line with the static `ol` border during the reveal. | E-7 |
| INV-09, sample bubbles | Descendant bubbles hidden under a pending parent are **not** covered by the print and motion-off overrides, which target `[data-reveal]` only. Their +200ms delay also exceeds the 270ms cap (100 + 200). | E-8 |
| INV-12, `DemoBadge` | The badge is in the delayed column, not the title block. | E-12 |
| INV-15, keyboard parity | `group` sits on the non-focusable `<article>` (`experience-card.tsx:32`), so `group-focus-visible:` can never match. My earlier review proposed the same flawed technique; this corrects it. | E-11 |
| INV-19, day panel | The keyed inner wrapper mounts on first render, so the panel animates on **page load**. That contradicts "only animate on user tab switches". | E-10 |

The other items (INV-02, 03, 06, 11, 13, 14, 17, 18, 20) are consistent with the earlier dispositions. v1.1's labels say "APPROVE" where the earlier review said "APPROVE WITH CHANGES". This is cosmetic, because the changes are incorporated.

---

## 10. Implementation Package Readiness

| Package | Bounded scope | Explicit gates | Keeps previous tests | No database | Checkpoint rule | Independent of later packages |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **A** Baseline, tokens, `<Reveal>`, pilot, touch guard | ✓ | ✓ (sharpen per E-4) | ✓ G0 | ✓ API offline | ✓ (A0 split recommended, N-10) | ✓ once A's checks live in an A-owned script (E-4) |
| **B** Homepage | ✓ | ✓ (add API online/offline Suspense swap, N-8) | ✓ | ✓ | ✓ | ✓ |
| **D** Planner and trips | ✓ | ✓ (9 assertions × 2 viewports × motion/reduced) | ✓ | ✓ | ✓ | ✓ |
| **C** Discovery | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **E** QA, performance, report | ✓ | ✓ (relative CLS gate, N-8) | ✓ | ✓ | ✓ | n/a (last) |

**Why D comes before C:** D carries the most regression risk against the verified 0.3 planner and tab contracts and secures the demo-critical path first.

**Procedural notes (N-9):**
- G0 assumes a production build served at `127.0.0.1:3100` (`ADORA_WEB_URL`, `verify_web_0_3.mjs:7`).
- Chrome must be at `C:\Program Files\Google\Chrome\Application\chrome.exe` (`:6`).
- FastAPI is not needed; the catalog falls back after a 1800ms timeout.
- State this in G0 so each package's gate run can be reproduced.

**Can Package A begin immediately after the documentation checkpoint? Yes,** with the prerequisites in §12.

---

## 11. Remaining Issues

### 11.1 Blocking
**None.**

### 11.2 Binding errata (non-blocking: applied inside the named package; no v1.2 or re-review needed)

| ID | Package | Issue | Required correction |
| :---: | :---: | :--- | :--- |
| **E-1** | A | `<Reveal>` callback reads the oldest entry; the guard attaches late; entries can arrive after cleanup (§4.2) | Read the last entry; call `onViewportEvent()` when marking pending; add a `disposed` flag set in cleanup and checked in the callback and the guard. |
| **E-2** | A | Two stagger mechanisms: `delayMs` (C.2) versus index × token (B.3, INV-04). "0ms on mobile single-column" (INV-08/10/16) cannot be built because an inline `--reveal-delay` beats stylesheet overrides. | `<Reveal delayMs>` stays the scroll-reveal mechanism, capped with CSS `min(var(--reveal-delay), var(--adora-stagger-cap))`. The index × token formula is used **only** for load keyframes (hero, `PageIntro`). Add a `stackOnMobile` prop that renders `data-reveal-stack`, plus a rule inside `@media (prefers-reduced-motion: no-preference) and (max-width: 47.999rem)`: `html:not([data-motion="off"]) [data-reveal="visible"][data-reveal-stack] { transition-delay: 0ms; }`. |
| **E-3** | A | Wrapper composition and image variant | (a) The `<Reveal>` element is a motion-only wrapper. Its `className` may carry layout, placement, border, and padding utilities, never `opacity-*`, `transition-*`, `duration-*`, `ease-*`, `delay-*`, or `transform` utilities. (b) Image variant: while pending, the wrapper uses opacity only and `[data-reveal="pending"][data-reveal-variant="image"] img { transform: scale(var(--adora-scale-image-enter)); }`. On `visible`, the existing `.image-reveal img` transition performs the settle and hover keeps working. (c) The touch guard wraps only the `:hover` rule; the `transition` declaration stays unguarded. |
| **E-4** | A | Gates lack a home and precision | (a) Create `scripts/verify_web_0_4.mjs` in **A** with A's checks, extend it in B, D, and C, and finalise it in E. Put the baseline collector in its own script that E reuses unchanged. (b) Assert on `#philosophy [data-reveal-variant]` elements, not on the section. (c) BrandPhilosophy has no focusable content [OBSERVED], so the `:focus-within` check must inject `tabindex="-1"` into the test DOM. (d) Add a jump test: `scrollTo(0, scrollHeight)`, wait 2 frames, and confirm no element marked pending intersects the viewport. |
| **E-5** | B | Scroll-line bound snaps (§9) | `animation-iteration-count: 1.5`, no fill, resting state equals the base style. |
| **E-6** | B/C | B-3 left undecided for hero and `PageIntro` | **Decision D-1:** hero and `PageIntro` load keyframes have **no latch**. Replay when Activity shows the route again is accepted, because they are page-entrance moments with no honesty implication, and they stay pure CSS in Server Components. Delete "may optionally" (C.3.4) and the client-latch wording in INV-03. |
| **E-7** | B/C | Dividers move on ruled lists | For `li`s that carry dividers (HowItWorks `:37`, ExperienceStory `:32`, destination highlights `destinations/[slug]/page.tsx:106–115`), place `<Reveal>` (a `div`) **inside** each `li`. Use `as="li"` only for unruled card grids (`ExperienceGrid`). Gate: dividers static in a mid-reveal frame. |
| **E-8** | B | Badge and bubble details | (a) The DestinationStory badge's `<Reveal>` carries the badge's absolute placement classes itself, so it is the positioned element. (b) The AiPlannerSection bubble descendant rules sit under `no-preference`, and every fail-visible override (print, `data-motion="off"`, reduced motion) also targets `[data-sample-bubble]`. The bubble delays are +80/+160ms (≤ cap). (c) The lead disclaimer (`experience-story.tsx:26–28`) stays in the header unit, and the provenance note (`:38–40`) stays outside any `<Reveal>`. |
| **E-9** | D | Planner details (§6) | Animate the `article` for both reply kinds; use `textareaRef`; apply the `data-entered` latch to the jumpbar and mobile preview too; key the mobile preview by `preview.slug`. |
| **E-10** | D | Day panel animates on page load | Render the entrance attribute only after a user switch: `const [hasSwitched, setHasSwitched] = useState(false)`, set in `selectDay`, which is an event handler and lint-safe. Do not use a ref read during render. |
| **E-11** | C | `group-focus-visible` cannot match (§9) | Move `group` from `<article>` to the `<Link>` (`experience-card.tsx:32–33`), or use `group-has-[:focus-visible]:` on the article. |
| **E-12** | C | `DemoBadge` in the delayed `PageIntro` column | A single 0ms entrance for both `PageIntro` columns, with no column stagger. Disclosure timing takes priority over a 60ms offset. |
| **E-13** | C/F (only if INV-01 is built) | Double active underline; Blueprint deviation unrecorded | Remove `border-b … pb-1` from the active link (`site-header.tsx:63`), keep the box geometry, and record 240ms in §B.4. |

### 11.3 Advisory notes

| ID | Note |
| :---: | :--- |
| N-1 | Align the guard line to the observer trigger line (0.90 × `innerHeight`). |
| N-2 | Replace `@ts-expect-error` with a callback ref (probe result in §5). |
| N-3 | Optional hardening for the §4.2 residual: while an element is pending, a shared `ResizeObserver` on `document.body` triggers `onViewportEvent()` when content height changes. |
| N-4 | P-6 on touch devices: focusing the textarea inside a tap may raise the on-screen keyboard over the new reply. Package D must check on a real phone. If it does, focus the new user turn (`tabIndex={-1}`, `preventScroll`) for touch activation and keep `#planner-prompt` for keyboard and fine-pointer activation. |
| N-5 | Filter gate precision (§7). Apply the settle to `experience-empty` too. Log the existing reset-button focus loss. |
| N-6 | INV-16: reveal heading groups, imagery, and list groups only; never long-form body paragraphs or the detail `<aside>` (earlier review §7.3). |
| N-7 | INV-19: day-panel entrance starts at opacity ≥ 0.2, not 0. |
| N-8 | Measurement:<br>• one collector script, reused unchanged<br>• environment recorded in the JSON<br>• per-route medians<br>• headless caveat on frame sampling<br>• relative CLS gate in E<br>• Package B gate run with the API both offline and online (Suspense fallback→stream swap, `app/page.tsx:45–47`) |
| N-9 | G0 procedure: production server at `:3100`, the fixed Chrome path, API offline. |
| N-10 | Package A in two commits: **A0** adds the collector and `docs/reports/baseline_0_3_metrics.json` with no change under `apps/web`; **A** adds the foundation. This proves the baseline came first. |
| N-11 | Wording to treat as targets, not facts, in the next spec edit:<br>• A.3 "guarantees … can ever"<br>• C.2 `:188` "layout change … deterministically"<br>• revision report §8 "100% identical"<br>• revision report §12 "Open questions: None"<br>Also: the reference to "Section H.3" points at a section v1.1 does not have. |
| N-12 | INV-03: state that the settle is not synchronised with image arrival (it starts when styles apply). A late image appears static, which is acceptable. |

### 11.4 Corrigenda (line references in v1.1 / revision report versus the source at the baseline commit) [OBSERVED]

| v1.1 cites | Actual |
| :--- | :--- |
| `globals.css:20` (`--adora-transition`) | `:16` |
| `globals.css:164` (1200ms hover) | `:165–167`; hover rule `:169–171` |
| `experience-story.tsx:66–69` (pricing disclaimer) | The file has 65 lines. Lead disclaimer `:26–28`; provenance note `:38–40` |
| `ai-planner-section.tsx:26–30` (demo notice) | Notice `:21–23`; `:26–30` is the preview frame. The `:38` dot label reads "Bản xem trước sẵn sàng", not "Decorative status dot". |
| `experiences/[slug]/page.tsx:167–170` (pricing disclaimer) | `role="note"` "Đặt chỗ · chưa khả dụng" at `:149–157`, inside the `<aside>` |
| — (missing from the A.5 list) | `planner-cta.tsx:26` "Kịch bản dựng sẵn · chưa kết nối mô hình AI" |
| `planner-workspace.tsx:66–89` / `:266` / `:308`; `inputRef` | Anchoring effect `:68–84`; jumpbar `:246–272`; suggestions `:296–309`; mobile preview `:408–436`; desktop aside `:473+`; `textareaRef` (`:58`), `#planner-prompt` (`:447–449`) |
| `editorial-hero.tsx:20–27` (image) / `:66–71` (scroll line) | Image `:10–17`; scroll indicator `:46–55` (line element `:52`) |
| `site-header.tsx:96–131` (mobile nav) | `:86–` (`#mobile-navigation`) |
| `site-footer.tsx` background ink; HowItWorks background ivory | Footer ivory (`:11`); HowItWorks paper (`:21`). The rule against fading these bands is unaffected. |

---

## 12. Final Authorization Recommendation

**Authoritative contract for Web Design 0.4:**
- `ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md` together with **this report**.
- Where they conflict, this report's errata (§11.2), decision D-1 (E-6), the INV-01/INV-04 decisions (§9), and the corrigenda (§11.4) take precedence.
- Spec v1.0 and the planning report are historical records.

**Documentation checkpoint (before Package A).** One commit containing exactly these six files and nothing else:
1. `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1.md`
2. `docs/design/ADORA_MOTION_DESIGN_SPECIFICATION_V1_1.md`
3. `docs/reports/WEB_DESIGN_0_4_MOTION_PLANNING_REPORT.md`
4. `docs/reports/WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md`
5. `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_REVISION_REPORT.md`
6. `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_FINAL_APPROVAL.md`

Suggested message: `docs(web): approve Web Design 0.4 motion specification v1.1`. Verify with `git show --stat HEAD`: six added files, no other paths. Application code at that commit is byte-identical to `c495955`, so a baseline captured there is a valid 0.3 baseline. Record both SHAs.

**Package A prerequisites:**
1. The documentation checkpoint is committed and the working tree is clean.
2. The environment is ready:
   - Chrome at the scripted path.
   - `pnpm --filter @adora/web build` and `next start` on `127.0.0.1:3100`.
   - FastAPI **offline** (the demo condition). No database is needed.
3. Both existing verify scripts pass on the unmodified checkpoint. This confirms G0 starts green.
4. **A0 runs first:**
   - Write the collector script (N-8) and capture `docs/reports/baseline_0_3_metrics.json` under the F.2 protocol.
   - Record the SHA, the clean-tree flag, the Chrome version, the machine, and the throttling profile.
   - Commit before any `apps/web` edit (N-10).
5. Then build A.2–A.4 with errata **E-1 to E-4** applied, and pass G0 plus the sharpened Package A gates.

Package A was not started during this review.

`APPROVED WITH MINOR NON-BLOCKING NOTES — PACKAGE A MAY PROCEED`
