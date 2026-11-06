# ADORA — Motion Design Specification v1.1 (Web Design 0.4)

**Status:** RECONCILED IMPLEMENTATION-READY SPECIFICATION — READY FOR FOCUSED ARCHITECTURE APPROVAL (No Application Code Modified)
**Version:** `v1.1` (Reconciles `ADORA_MOTION_DESIGN_SPECIFICATION_V1.md` with `WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md`)
**Date:** 2026-11-07
**Phase:** Web Design 0.4 — Specification v1.1 Reconciliation
**Repository:** `F:\Coding\Adora System Mega Project\adora-system`
**Verified Baseline HEAD:** `c49595573f8b7214f414a589006b748d5d6babfb` (`feat(web): implement adora discovery planner and trip experiences`)
**Target Application:** `apps/web` (Next.js 16.4.3 App Router with `cacheComponents: true`, React 19.3.0, Tailwind CSS v4, TypeScript 5)
**Creative Direction:** *Luxury Editorial × Cinematic Travel × Intelligent Planning*
**Primary Creative Reference:** https://www.snamitravel.com/ *(atmospheric pacing and editorial restraint reference only; zero copied code, branding, assets, or proprietary timelines)*

> **Evidence Classification Key:**
> - **`[OBSERVED]`** — Directly verified in repository source files, configuration, or automated test scripts at `c49595573f8b7214f414a589006b748d5d6babfb`.
> - **`[DOCUMENTED]`** — Stated in repository governance (`AGENTS.md`), design blueprints (`docs/design/`), or prior phase reports (`docs/reports/`).
> - **`[INFERRED]`** — Derived from browser rendering pipelines, CSS specifications, React 19 / Next.js 16 runtime semantics, or Tailwind CSS v4 compilation rules.
> - **`[RECOMMENDATION]`** — Reconciled v1.1 engineering specification or target budget to be implemented and measured in Web Design 0.4.

---

## A. Motion Design Principles & Architectural Boundaries

ADORA's motion system serves the core product thesis: **a quiet, tactile travel journal during discovery, and a composed, responsive software instrument during planning**. Motion is never ornamental noise; every transition must earn its place by reinforcing five strict architectural responsibilities:

### A.1 Atmospheric Pacing Over Mechanical Choreography
Inspired by the unhurried editorial cadence of luxury print and slow highland travel in Đà Lạt, Discovery motion uses long, smooth deceleration curves (`cubic-bezier(0.22, 1, 0.36, 1)`) and restrained vertical travel distances (`10px–22px`). Elements settle into place like mist clearing over a ridgeline rather than snapping or bouncing. Spring physics, overshoot (`cubic-bezier` control points `> 1.0`), and playful elastic bounces are strictly prohibited across all ADORA surfaces `[DOCUMENTED]`.

### A.2 Two Distinct Motion Families: Discovery vs. Application
ADORA enforces a hard architectural boundary between its two experience families `[DOCUMENTED, RECOMMENDATION]`:

| Dimension | Discovery Experience (`/`, `/destinations*`, `/experiences*`) | Application Experience (`/ai-planner`, `/trips*`) |
| :--- | :--- | :--- |
| **Emotional Register** | Cinematic, contemplative, editorial, atmospheric | Purposeful, immediate, legible, trustworthy |
| **Typical Duration** | `420ms – 920ms` (with `1200ms` fine-pointer image hover zoom) | `160ms – 260ms` |
| **Spatial Travel** | `10px – 22px` vertical rise; `1.02–1.035 -> 1.0` image scale settle | `0px` inside scroll-anchored logs; `6px–8px` on external preview/day panels |
| **Scroll Reveals** | Selective once-per-visit chapter entrances via `<Reveal>` | **None** — workspace controls, tabs, trip cards, and logs are immediately present |
| **Primary Goal** | Guide the eye through narrative chapters and photography | Confirm user intent, maintain spatial orientation, preserve keyboard focus |

### A.3 Progressive Enhancement & Fail-Visible Content Contract (Reconciled `B-1`)
Because ADORA runs on Next.js 16 Server Components with `cacheComponents: true` (`apps/web/next.config.ts:5` `[OBSERVED]`), **no text or image may ever be rendered invisible (`opacity: 0`) in static SSR HTML** `[RECOMMENDATION]`.
- Server HTML and initial client hydration render **no `data-reveal` attribute** on `<Reveal>` elements; their default CSS state is `opacity: 1` and `transform: none`.
- An element is staged at `data-reveal="pending"` (`opacity: 0`) **only inside the first `IntersectionObserver` callback** when the browser confirms that:
  1. `@media (prefers-reduced-motion: no-preference)` is active,
  2. `html:not([data-motion="off"])` is active, and
  3. The element's top edge is strictly below the initial viewport fold (`!entry.isIntersecting && entry.boundingClientRect.top >= window.innerHeight`).
- Elements already visible or partially visible inside the initial viewport (`entry.boundingClientRect.top < window.innerHeight`), or located above the viewport when loading an anchor URL (such as `/#philosophy` or `/#how-it-works`), are marked `data-reveal="visible"` on the first observer callback without ever passing through `pending`.
- A multi-layer fail-visible contract (pre-callback watchdog timer + post-pending passive scroll/viewport check + `:focus-within` + `@media print` + `@media (prefers-reduced-motion: reduce)`) guarantees that no element can ever remain stuck at `opacity: 0` (detailed in Section H.3).

### A.4 Per-Section Motion Budget (Reconciled `O-4`)
To prevent visual repetition across ADORA's five Discovery routes and protect editorial restraint `[RECOMMENDATION]`:
1. **Maximum One Reveal Depth per Section:** A section may use **either** a single container-level `<Reveal>` **or** up to 3–4 child `<Reveal>` groups (`<= 4` delay steps), **never nested `<Reveal>` inside `<Reveal>`** (except where an inner element uses pure CSS delay inside a single observer trigger).
2. **Stagger Ceiling:** No sibling stagger sequence may exceed 4 delay steps or the `--adora-stagger-cap` (`270ms` desktop / `180ms` mobile).
3. **Full-Bleed Background Band Rule (`B-2`):** Full-bleed colored `<section>` elements (`bg-[var(--adora-ink)]`, `bg-[var(--adora-ivory)]`, `bg-[var(--adora-forest-dark)]`) must **never** fade opacity; only their inner content containers may use `<Reveal>`.

### A.5 Honest Product Semantics & Disclosure Exemption Rules (Reconciled `B-7`)
Per `AGENTS.md` and `WEB_DESIGN_0_3_FRONTEND_ARCHITECTURE.md` `[DOCUMENTED]`, motion must never misrepresent demo data or scripted responses as live backend or generative AI functionality `[RECOMMENDATION]`:
1. **No Fake AI Streaming:** `/ai-planner` responses enter as complete, atomic DOM nodes in a single React commit (`160ms–200ms` opacity fade). Character-by-character typewriter streaming, artificial `setTimeout` "thinking…" delays, `aria-busy` spinners, and skeleton shimmer blocks are strictly prohibited.
2. **No Pulsing "Live" Indicators:** Status badges (`DemoBadge`, `DemoLabel`, `Sắp ra mắt`, `Kịch bản mẫu`) must remain static (`opacity: 1`); pulsing status dots are prohibited.
3. **Mandatory Disclosure Exemption:** Honesty and demo-scope disclosures must **never** be given standalone reveal delays or fade in after the content they qualify. They must remain at `opacity: 1` whenever their parent block is visible:
   - Homepage `ExperienceStory` pricing disclaimer (`apps/web/src/components/home/experience-story.tsx:66–69` `[OBSERVED]`).
   - Homepage `AiPlannerSection` demo purpose notice (`apps/web/src/components/home/ai-planner-section.tsx:26–30` `[OBSERVED]`).
   - Experience detail pricing disclaimer on `/experiences/[slug]` (`apps/web/src/app/experiences/[slug]/page.tsx:167–170` `[OBSERVED]`).
   - All `DemoBadge` and `DemoLabel` components across `/destinations*`, `/experiences*`, `/ai-planner`, and `/trips*`.
   - `/ai-planner` header subtitle (`planner-workspace.tsx:239`), reply `DemoLabel` (`"Phản hồi dựng sẵn · không phải AI"`, `planner-workspace.tsx:375`), and composer disclaimer (`planner-workspace.tsx:466–468`) `[OBSERVED]`.

---

## B. Motion Token System (`apps/web/src/app/globals.css`)

Web Design 0.2 and 0.3 established `--adora-transition: 420ms cubic-bezier(0.22, 1, 0.36, 1)` in `apps/web/src/app/globals.css:20` `[OBSERVED]`. Web Design 0.4 expands `:root` with a semantic token scale while keeping `--adora-transition` backward-compatible `[RECOMMENDATION]`.

### B.1 Duration Tokens (Reconciled `B-9`)

| CSS Custom Property | Value | Approved Role & Rationale |
| :--- | :--- | :--- |
| `--adora-duration-instant` | `120ms` | Active button press feedback and filter chip border hover. **Note (`B-9`):** `:focus-visible` outlines are **excluded** and must appear in `0ms` so keyboard focus indicators are never delayed (WCAG 2.4.7 / 2.4.11). |
| `--adora-duration-fast` | `180ms` | Application UI control state changes: filter chip selection (`aria-pressed`), itinerary day tab highlight (`aria-selected`), card border hover, mobile planner jumpbar fade. |
| `--adora-duration-ui` | `240ms` | Application content transitions: AI Planner turn opacity fade (`160ms–200ms`), Trip Preview panel crossfade (`200ms`), filtered list crossfade (`220ms`), itinerary day panel fade (`220ms`), activity accordion disclosure (`240ms`). |
| `--adora-duration-editorial` | `420ms` | Editorial link gap/color transitions (aliased by `--adora-transition`), CTA fill transitions, `PageIntro` load entrance (`480ms`). |
| `--adora-duration-reveal` | `680ms` | Discovery chapter and card scroll-reveal entrances (`opacity` + `transform`). |
| `--adora-duration-cinematic` | `920ms` | Homepage and Destination Detail hero photograph scale settle (`820ms–920ms`). |
| `--adora-duration-image-hover` | `1200ms` | Slow, luxurious photographic scale on fine-pointer hover (`.image-reveal img`), preserving the existing `1200ms` transition in `globals.css:164` `[OBSERVED]`. |

### B.2 Purpose-Named Easing Tokens (Reconciled `O-1`)

Per review finding `O-1`, easing tokens are named by **architectural role** rather than mathematical polynomial degree (since `cubic-bezier(0.22, 1, 0.36, 1)` is a quintic deceleration curve rather than an exponential `2^(-10t)` curve), and the unused `--adora-ease-linear` token is removed `[RECOMMENDATION]`:

| CSS Custom Property | Value | Curve Profile & Usage |
| :--- | :--- | :--- |
| `--adora-ease-editorial` | `cubic-bezier(0.22, 1, 0.36, 1)` | **Primary ADORA signature curve** (`globals.css:20` `[OBSERVED]`). Confident departure with a long, calm editorial settle. Used for all Discovery entrances, image settles, `.image-reveal`, and `.editorial-link`. |
| `--adora-ease-ui` | `cubic-bezier(0.25, 1, 0.5, 1)` | Crisp, responsive deceleration for Application UI transitions (AI Planner message fades, Trip Preview updates, itinerary day panels, activity accordions, filter settles). |
| `--adora-ease-ambient` | `cubic-bezier(0.37, 0, 0.63, 1)` | Symmetrical sine curve used exclusively for the hero scroll-indicator pulse (`.hero-scroll-line`). |
| `--adora-transition` | `var(--adora-duration-editorial) var(--adora-ease-editorial)` | Preserved alias (`420ms cubic-bezier(0.22, 1, 0.36, 1)`) so all existing Web Design 0.2/0.3 selectors continue to work without modification `[OBSERVED]`. |

### B.3 Spatial Transform, Scale & Capped Stagger Tokens (Reconciled `B-9`)

| CSS Custom Property | Desktop / Tablet (`>= 768px`) | Mobile (`< 768px`) | Usage & Enforcement Rule |
| :--- | :--- | :--- | :--- |
| `--adora-distance-hero` | `20px` | `12px` | Vertical rise for hero typography on initial load |
| `--adora-distance-reveal` | `22px` | `14px` | Vertical rise for below-the-fold Discovery section blocks |
| `--adora-distance-card` | `16px` | `10px` | Vertical rise for staggered `HowItWorks` steps, highlights, and related cards |
| `--adora-distance-ui` | `6px` | `6px` | Subtle vertical rise for desktop Trip Preview (`[data-testid="trip-preview"]`) and itinerary day panel inner content (`[data-testid="day-panel"] > div`). **Never used inside `role="log"` (`B-4`).** |
| `--adora-scale-image-enter` | `1.035` | `1.02` | Initial scale for preloaded hero photography before settling to `1` (`transform: none`) |
| `--adora-scale-image-hover` | `1.025` | `1` *(touch guarded)* | Fine-pointer hover zoom inside `.image-reveal` (`globals.css:170` `[OBSERVED]`) |
| `--adora-stagger-tight` | `60ms` | `40ms` | Stagger step between hero child elements (`--stagger-index: 0..3`) |
| `--adora-stagger-editorial` | `90ms` | `0ms` *(stacked single-column)* / `50ms` *(compact lists)* | Stagger step between multi-column grid siblings (`--stagger-index: 0..3`) |
| `--adora-stagger-cap` | `270ms` | `180ms` | **Hard CSS ceiling (`B-9`):** Enforced via `min(calc(var(--stagger-index, 0) * var(--adora-stagger-step, 60ms)), var(--adora-stagger-cap))` so no element delay can ever exceed `270ms` (`180ms` on mobile). |

### B.4 Design Blueprint Token Alignment & Supersession Record (Reconciled `O-2`)

`docs/design/ADORA_Website_Design_Blueprint_v1.0/01_DESIGN_BLUEPRINT.md` (§5.1) originally sketched four conceptual variables (`--ease-editorial: cubic-bezier(0.16, 1, 0.3, 1)`, `--ease-smooth: cubic-bezier(0.22, 1, 0.36, 1)`, `--duration-fast: 180ms`, `--duration-editorial: 700ms`, and a `700ms` card hover zoom) `[DOCUMENTED]`.
- During Web Design 0.2 and 0.3 (`apps/web/src/app/globals.css:20, 164` `[OBSERVED]`), the codebase standardized on `--adora-*` namespaced variables, adopted `cubic-bezier(0.22, 1, 0.36, 1)` as the primary editorial curve, and implemented `.image-reveal img` with a `1200ms` hover scale.
- **v1.1 Decision (`O-2`):** Specification v1.1 formally supersedes the un-namespaced Blueprint §5.1 draft names with the `--adora-*` token family in Sections B.1–B.3 and retains the `1200ms` `.image-reveal img` hover duration already verified in Web Design 0.2 and 0.3.

### B.5 Reduced-Motion, Print & Rehearsal Kill-Switch Rules (Reconciled `B-1`, `O-7`)

1. **`@media (prefers-reduced-motion: reduce)` and `html[data-motion="off"]` (`O-7`):**
   - Both selectors share a unified rule block in `globals.css`:
     - Duration tokens resolve to `0.01ms`; spatial distance tokens resolve to `0px`; scale tokens resolve to `1`.
     - Global safety net (`globals.css:206–219` `[OBSERVED]`) forces `animation-duration: 0.01ms !important`, `animation-iteration-count: 1 !important`, `transition-duration: 0.01ms !important`, and `scroll-behavior: auto !important`.
     - Explicit reveal override: `[data-reveal], [data-reveal="pending"], [data-reveal="visible"] { opacity: 1 !important; transform: none !important; transition: none !important; }`.
   - Adding `data-motion="off"` to `<html>` provides a zero-JS-overhead rehearsal and visual-diff switch (`O-7`).
2. **`@media print` (`B-1`):**
   - Forces `[data-reveal], [data-reveal="pending"] { opacity: 1 !important; transform: none !important; }` so printed pages or PDF exports never omit un-scrolled sections.

---

## C. Technical Design Contract (CSS Cascade, `<Reveal>`, `<Activity>`, Planner & Accordion)

### C.1 CSS Cascade & Tailwind CSS v4 Transform Composition Rules (Reconciled `B-2`)

1. **Animate Only `opacity` and `transform` (Plus Accordion `grid-template-rows`):**
   - Never animate `top`, `left`, `margin`, `padding`, `width`, `height`, or `font-size`.
   - **Never animate CSS individual transform properties (`translate`, `rotate`, `scale`)** in custom motion rules `[RECOMMENDATION]`.
   - **Why (`[OBSERVED, INFERRED]`):** Tailwind CSS v4 compiles utilities such as `lg:translate-y-10` (`experience-story.tsx:47`), `rotate-180` (`itinerary-explorer.tsx:117`), and `-translate-y-0.5 translate-x-0.5` (`experience-card.tsx:58`) to the CSS individual properties `translate`, `rotate`, and `scale`. Under the CSS Transforms Level 2 specification, individual transform properties (`translate`, `rotate`, `scale`) are applied **before** the `transform` property (`transform` composes after them). Even cleaner, `<Reveal>` wraps the inner elements of `ExperienceStory` rather than the `<div className="lg:col-span-5 lg:translate-y-10">` column wrapper itself, avoiding any dual-transform interaction on the same node.
2. **Never Use `animation-fill-mode: forwards` or `both` on Hoverable Images (`B-2`):**
   - In the CSS cascade, an active or forward-filled `@keyframes` animation overrides standard `:hover` declarations (`[INFERRED]`). If `.hero-image-settle` used `animation-fill-mode: forwards` on an `<img class="image-reveal">`, `.image-reveal:hover img { transform: scale(1.025) }` would permanently fail to fire.
   - **Rule:** All load-settle `@keyframes` (`.adora-image-settle`, `.adora-load-rise`, `.adora-filter-settle`, `.adora-panel-in`) must use `animation-fill-mode: backwards` (so the `0%` frame applies during `animation-delay`, and the element returns to `transform: none` in normal style rules once the animation completes).
3. **Final Settled State Must Be `transform: none` (`B-2`):**
   - Any non-`none` transform (`translateY(0px)`, `scale(1)`) creates a persistent stacking context and containing block for `position: fixed` descendants, which can alter z-index layering around `destination-story.tsx:25` (`-bottom-6`) or `itinerary-explorer.tsx:143` (`xl:sticky xl:top-28`) `[OBSERVED, INFERRED]`.
   - Therefore, `[data-reveal="visible"]` transitions to `opacity: 1; transform: none;`, and `@keyframes` omit `forwards` fill so settled elements compute `transform: none`.
4. **Prohibit Persistent `will-change` (`B-2`):**
   - Static CSS classes must never declare `will-change: transform, opacity`. Modern Chromium/WebKit promote active transform/opacity transitions and keyframes automatically and release GPU texture memory on completion.
5. **Touch Hover Guard (`INV-15`):**
   - In `apps/web/src/app/globals.css:169–171` `[OBSERVED]`, `.image-reveal:hover img` is currently unguarded and latches on mobile tap. Wrap `.image-reveal:hover img` inside `@media (hover: hover) and (pointer: fine)` and add keyboard `:focus-visible` parity on interactive card links.

### C.2 Fail-Visible `<Reveal>` Component Contract (Reconciled `B-1`)

`apps/web/src/components/ui/reveal.tsx` is a minimal `"use client"` leaf wrapper (`~85` lines) that wraps Server Component children without turning parent sections into Client Components `[RECOMMENDATION]`.

#### Component API
```tsx
export type RevealTag = "div" | "li" | "section" | "article" | "figure";
export type RevealVariant = "section" | "card" | "image";

export interface RevealProps {
  as?: RevealTag;
  variant?: RevealVariant;
  delayMs?: number;
  className?: string;
  children: React.ReactNode;
}
```

#### Behavioral & Failure-Mode Guarantees (`B-1` + Persistent-Pending Protection)
1. **No `useState` Inside `useEffect` (ESLint `react-hooks/set-state-in-effect` Safe):**
   - `eslint-config-next` 16.4.3 enables `eslint-plugin-react-hooks` v7 with `react-hooks/set-state-in-effect` at **error** severity `[OBSERVED]`.
   - `<Reveal>` uses **zero React state**. It holds `elRef = useRef<HTMLElement | null>(null)` and `revealedRef = useRef(false)` and mutates `el.dataset.reveal` imperatively.
2. **SSR & Hydration Output:**
   - Renders `<Tag ref={elRef} className={className} style={delayStyle}>{children}</Tag>` with **no `data-reveal` attribute**.
3. **First `IntersectionObserver` Callback Fold Decision (`100%` Viewport Boundary):**
   - Observer configuration: `{ threshold: 0, rootMargin: "100000px 0px -10% 0px" }`.
   - Why top `rootMargin: "100000px"`: Any element above the trigger line (including elements above the viewport when loading an anchor hash or jumping to the bottom of the page with `End`) immediately intersects (`entry.isIntersecting === true`).
   - On the **first callback**:
     - If `entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight`: the element is already in, partially in, or above the viewport. Immediately call `reveal()` (`revealedRef.current = true; el.dataset.reveal = "visible"; cleanup();`). It **never** enters `"pending"`.
     - Only if `!entry.isIntersecting && entry.boundingClientRect.top >= window.innerHeight` (wholly below the initial viewport fold): set `el.dataset.reveal = "pending"` and wait for intersection.
4. **Resolution of the Persistent Pending State Failure Mode (Mandatory Additional Review Item):**
   - **Analysis of Failure Mode:** If the pre-observation watchdog timer is cleared as soon as the first `IntersectionObserver` callback sets `el.dataset.reveal = "pending"`, an element that subsequently fails to receive a second `IntersectionObserver` callback (for example, due to browser observer throttling in background tabs, programmatic scroll jumps in headless automation, layout shifts above the element, or WebKit/Chromium intersection edge cases) would remain stuck at `data-reveal="pending"` (`opacity: 0`) indefinitely.
   - **Reconciled Multi-Layer Solution:**
     - **Layer 1 — Pre-Callback Watchdog (`1500ms`):** Guards against `IntersectionObserver` never firing its initial callback after mount.
     - **Layer 2 — Post-Pending Passive Viewport Listener Guard:** The moment an element sets `el.dataset.reveal = "pending"`, it attaches passive window listeners (`scroll`, `resize`, `hashchange`, and `visibilitychange`, throttled via a single `requestAnimationFrame` flag) that check:
       ```ts
       const rect = el.getBoundingClientRect();
       if (rect.top <= window.innerHeight * 0.92 || rect.bottom <= 0) {
         reveal();
       }
       ```
       Whenever `reveal()` runs (via `IntersectionObserver`, scroll/resize/visibility check, or unmount), all listeners and observers are immediately cleaned up. Thus, any scroll or layout change that brings a `pending` element into or past the viewport deterministically reveals it on the very next animation frame even if `IntersectionObserver` drops its second callback, without causing mid-idle pops while the user is stationary above the fold.
     - **Layer 3 — CSS `:focus-within`, `@media print`, and `@media (prefers-reduced-motion: reduce)` Guards:** Tabbing into a `pending` subtree, printing, or enabling reduced motion reveals the element in `0ms` via pure CSS.

#### Reference Implementation Blueprint (`apps/web/src/components/ui/reveal.tsx`)
```tsx
"use client";

import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

export type RevealTag = "div" | "li" | "section" | "article" | "figure";
export type RevealVariant = "section" | "card" | "image";

export interface RevealProps {
  as?: RevealTag;
  variant?: RevealVariant;
  delayMs?: number;
  className?: string;
  children: ReactNode;
}

export function Reveal({
  as: Tag = "div",
  variant = "section",
  delayMs = 0,
  className,
  children,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const revealedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (revealedRef.current || el.dataset.reveal === "visible") {
      revealedRef.current = true;
      el.dataset.reveal = "visible";
      return;
    }

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionOff = document.documentElement.dataset.motion === "off";

    if (reducedMotion || motionOff || typeof IntersectionObserver === "undefined") {
      revealedRef.current = true;
      el.dataset.reveal = "visible";
      return;
    }

    let io: IntersectionObserver | null = null;
    let rafId = 0;
    let listeningForScroll = false;

    const checkViewportPosition = () => {
      rafId = 0;
      if (revealedRef.current || !el.isConnected) return;
      if (document.visibilityState === "hidden") return;
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.92 || rect.bottom <= 0) {
        reveal();
      }
    };

    const onViewportEvent = () => {
      if (rafId !== 0 || revealedRef.current) return;
      rafId = window.requestAnimationFrame(checkViewportPosition);
    };

    const removePendingListeners = () => {
      if (!listeningForScroll) return;
      listeningForScroll = false;
      window.removeEventListener("scroll", onViewportEvent);
      window.removeEventListener("resize", onViewportEvent);
      window.removeEventListener("hashchange", onViewportEvent);
      document.removeEventListener("visibilitychange", onViewportEvent);
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const reveal = () => {
      revealedRef.current = true;
      el.dataset.reveal = "visible";
      clearTimeout(preCallbackWatchdog);
      removePendingListeners();
      io?.disconnect();
      io = null;
    };

    const attachPendingListeners = () => {
      if (listeningForScroll || revealedRef.current) return;
      listeningForScroll = true;
      window.addEventListener("scroll", onViewportEvent, { passive: true });
      window.addEventListener("resize", onViewportEvent, { passive: true });
      window.addEventListener("hashchange", onViewportEvent, { passive: true });
      document.addEventListener("visibilitychange", onViewportEvent);
    };

    const preCallbackWatchdog = window.setTimeout(reveal, 1500);

    io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        clearTimeout(preCallbackWatchdog);

        if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
          reveal();
        } else if (!revealedRef.current) {
          el.dataset.reveal = "pending";
          attachPendingListeners();
        }
      },
      { threshold: 0, rootMargin: "100000px 0px -10% 0px" },
    );

    io.observe(el);

    return () => {
      clearTimeout(preCallbackWatchdog);
      removePendingListeners();
      io?.disconnect();
    };
  }, []);

  const cappedDelay = Math.min(Math.max(0, delayMs), 270);
  const style =
    cappedDelay > 0
      ? ({ "--reveal-delay": `${cappedDelay}ms` } as CSSProperties)
      : undefined;

  return (
    // @ts-expect-error -- polymorphic intrinsic element ref sharing HTMLElement base
    <Tag ref={ref} data-reveal-variant={variant} className={className} style={style}>
      {children}
    </Tag>
  );
}
```

#### Paired CSS Contract in `apps/web/src/app/globals.css`
```css
@media (prefers-reduced-motion: no-preference) {
  html:not([data-motion="off"]) [data-reveal="pending"] {
    opacity: 0;
    transform: translate3d(0, var(--adora-distance-reveal), 0);
  }

  html:not([data-motion="off"]) [data-reveal="pending"][data-reveal-variant="card"] {
    transform: translate3d(0, var(--adora-distance-card), 0);
  }

  html:not([data-motion="off"]) [data-reveal="pending"][data-reveal-variant="image"] {
    transform: scale(var(--adora-scale-image-enter));
  }

  html:not([data-motion="off"]) [data-reveal="visible"] {
    opacity: 1;
    transform: none;
    transition-property: opacity, transform;
    transition-duration: var(--adora-duration-reveal);
    transition-timing-function: var(--adora-ease-editorial);
    transition-delay: min(var(--reveal-delay, 0ms), var(--adora-stagger-cap));
  }

  html:not([data-motion="off"]) [data-reveal="pending"]:focus-within {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

@media print {
  [data-reveal],
  [data-reveal="pending"] {
    opacity: 1 !important;
    transform: none !important;
  }
}
```

### C.3 Next.js 16 `<Activity>` Route Preservation Safety (Reconciled `B-3`)

Because `apps/web/next.config.ts` sets `cacheComponents: true` `[OBSERVED]`, Next.js 16 wraps route segments in React's `<Activity>` boundary and preserves up to 3 visited routes in the DOM with `display: none` during client-side navigation `[INFERRED]`.
1. **Effect Cleanup & Re-Run on Back/Forward:** When a route is hidden by `<Activity>`, React runs `useEffect` cleanups; when the user navigates Back, React removes `display: none` and re-runs `useEffect` with all refs (`revealedRef.current`) and DOM attributes (`data-reveal="visible"`, `data-entered="true"`) preserved.
2. **`<Reveal>` Idempotence:** Because `<Reveal>` checks `if (revealedRef.current || el.dataset.reveal === "visible") return;` at the top of `useEffect` and uses CSS transitions (not `@keyframes`), returning to a previously scrolled page via Back/Forward keeps all revealed sections at `opacity: 1` with zero replay or re-pending.
3. **One-Shot Keyframe Latch (`data-entered="true"`) for `/ai-planner` Turns:** When `<Activity>` toggles a route from `display: none` to `display: block`, the browser restarts any active CSS `@keyframes` on descendants `[INFERRED]`. To prevent `/ai-planner` chat messages and preview cards from re-animating simultaneously when navigating `/ai-planner` → `/trips/da-lat-3-ngay` → browser `Back`:
   - Scope planner entrance selectors to `[data-planner-enter]:not([data-entered="true"])`.
   - On the animated element, attach `onAnimationEnd={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.entered = "true"; }}`.
4. **Policy for Hero (`INV-03`/`INV-04`), `PageIntro` (`INV-12`), and Day Panel (`INV-19`):**
   - Day panels (`INV-19`) only animate on user tab switches (`data-entered="true"` set on `onAnimationEnd` so Back navigation does not replay the active day panel).
   - Hero and `PageIntro` load keyframes may optionally use the same `onAnimationEnd` `data-entered="true"` latch so Back navigation feels instantaneous and settled.
5. **Visibility-Scoped Browser Test Queries:** Any verification script navigating client-side (via link click or `history.back()`) must filter DOM queries by `el.checkVisibility()` so hidden `<Activity>` subtrees from prior routes are never inspected.

### C.4 AI Planner Scroll & Bounding-Box Safety Contract (Reconciled `B-4`, `O-5`)

Inspection of `apps/web/src/components/planner/planner-workspace.tsx:66–89` `[OBSERVED]` confirms:
```ts
const targetTop =
  log.scrollTop +
  (turnRect.top - logRect.top) -
  scrollMarginTop;
log.scrollTop = Math.max(0, targetTop);
```
1. **Why `translateY` Inside `role="log"` Is Prohibited (`B-4`):**
   - `getBoundingClientRect().top` includes CSS transforms active at the moment `useEffect` runs (`t = 0ms`). Any `translateY(8px)` or `translateY(10px)` on the user bubble, scripted reply, or mobile preview skews `turnRect.top` by `8px–10px` and changes `log.scrollHeight` as the transform settles, risking scroll clamping or drift in `verify_web_0_3.mjs:438–556`.
   - **Rule:** Every entrance inside `role="log"` (`article[aria-label="Bạn"]`, `[data-testid="scripted-reply"]`, `[data-testid="unsupported-reply"]`, and `[data-testid="trip-preview-mobile"]`) MUST be **opacity-only (`opacity: 0 -> 1`, `transform: none`)**.
2. **Why Mobile Jumpbar Must Be Opacity-Only (`B-4`):**
   - `[data-testid="mobile-planner-jumpbar"]` is a flex sibling above `role="log"` (`planner-workspace.tsx:266`). Animating its height or vertical transform would resize `role="log"` after `log.scrollTop` is assigned in the same commit. It must use **opacity-only** (`160ms`).
3. **Desktop Sidebar Preview (`[data-testid="trip-preview"]`):**
   - Lives in the separate right-hand column (`xl:flex`) outside `role="log"`. It may safely combine `opacity: 0 -> 1` with a subtle `translate3d(0, 6px, 0) -> none` (`200ms var(--adora-ease-ui)`).
4. **Compressed Deterministic Turn Timing (`B-4`):**
   - User bubble: `0ms` delay, `160ms` duration (`opacity: 0 -> 1`).
   - Reply (`scripted-reply` or `unsupported-reply`), mobile preview (`trip-preview-mobile`), and desktop preview (`trip-preview`): `+80ms` delay, `200ms` duration (all settled at `280ms`).
   - All elements mount in a single synchronous React state update; sequencing is purely CSS `animation-delay` (`animation-fill-mode: backwards`).
5. **Jumpbar Smooth Scroll vs. Turn Anchoring (`B-4`):**
   - Automatic turn anchoring in `useEffect` remains **instant** (`log.scrollTop = Math.max(0, targetTop)`).
   - Manual clicks on the mobile jumpbar buttons (`Phản hồi kịch bản` / `Xem trước`) read `window.matchMedia("(prefers-reduced-motion: reduce)").matches` dynamically at click time (`behavior: reduced ? "auto" : "smooth"`).
6. **Welcome Suggestion Focus Remediation (`P-6` / `O-5`):**
   - When the user clicks a suggested prompt card in the welcome block (`planner-workspace.tsx:308`), the welcome block unmounts (`messages.length > 0`), which previously caused `document.activeElement` to fall back to `document.body` `[OBSERVED]`.
   - In Package D, clicking a welcome suggestion card will move focus to `inputRef.current?.focus({ preventScroll: true })` (`#planner-prompt`), matching the form submit and reset flows without disturbing `log.scrollTop`.

### C.5 Three-Layer Activity Accordion Structure (Reconciled `B-5`)

In `apps/web/src/components/trips/itinerary-explorer.tsx:120–136` `[OBSERVED]`, the activity detail region has `className="border-t border-[var(--adora-hairline)] px-4 py-5 sm:px-5"`. Placing `py-5` (`40px`) and `border-t` (`1px`) directly on the `overflow-hidden` grid child would leave a `41px` visible box when `grid-template-rows` is `0fr` `[INFERRED]`.

**Mandatory 3-Layer Accordion DOM Structure (`B-5`):**
```tsx
<div
  className={cn(
    "grid transition-[grid-template-rows,opacity] duration-[240ms] ease-[var(--adora-ease-ui)]",
    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
  )}
>
  <div
    id={`activity-${activity.id}`}
    role="region"
    aria-label={activity.title}
    inert={!open}
    className="min-h-0 overflow-hidden"
  >
    <div className="border-t border-[var(--adora-hairline)] px-4 py-5 sm:px-5">
      {/* Detail paragraph, locationNote, and optional experience Link */}
    </div>
  </div>
</div>
```
- **Single Accessibility Source of Truth:** Uses React 19 boolean `inert={!open}` on the region element (removing collapsed links from both keyboard tab order and the accessibility tree) and omits redundant `aria-hidden` `[RECOMMENDATION]`.
- **`aria-controls` Validity Improvement:** Because `id={`activity-${activity.id}`}` is always mounted in the DOM, the trigger button's `aria-controls` attribute (`itinerary-explorer.tsx:107`) is now valid in both expanded and collapsed states.
- **Collapsed Geometry:** When `open === false`, `getBoundingClientRect().height` of the outer grid wrapper is `0px` (`<= 1px` acceptance gate).

---

## D. Reconciled Route-by-Route Choreography

### D.1 Homepage Choreography (`/`)
All six homepage section components (`EditorialHero`, `BrandPhilosophy`, `DestinationStory`, `ExperienceStory`, `AiPlannerSection`, `HowItWorks`) are **React Server Components** (`[OBSERVED]`, correcting `O-6`).
1. **`SiteHeader` (`INV-01` P2, `INV-02` Deferred):**
   - Renders immediately at `opacity: 1` (`0ms` delay).
   - Desktop nav links (`lg:flex`) gain a `::after` hairline (`scaleX(0) -> scaleX(1)`, `transform-origin: left`, `240ms var(--adora-ease-editorial)`) on `:hover` and `:focus-visible`, with `scaleX(1)` persistent on `aria-current="page"`.
   - Mobile menu drawer (`#mobile-navigation`, `INV-02`) is **DEFERRED** so `verify_web_0_3.mjs:643` (`getComputedStyle(mobileMenu).display === "grid"`) remains 100% untouched.
2. **`EditorialHero` (`INV-03`, `INV-04`, `INV-05` — P0):**
   - Background `<Image preload>` stays at `opacity: 1` from `t = 0ms` and runs `.adora-image-settle` (`scale(var(--adora-scale-image-enter)) -> none`, `920ms var(--adora-ease-editorial)`, `animation-fill-mode: backwards`).
   - Eyebrow (`0ms`), `h1` (`60ms`), lead copy (`120ms`), and CTA row (`180ms`) run `.adora-load-rise` (`680ms var(--adora-ease-editorial)`, `animation-fill-mode: backwards`, `data-entered` latched on `onAnimationEnd`).
   - Scroll indicator line (`INV-05`) keeps `.hero-scroll-line` (`2.2s var(--adora-ease-ambient)`), bounded to `2` iterations (`4.4s <= 5s`, settling at `scaleY(1)`) in P2 (`O-3`).
3. **`BrandPhilosophy` (`INV-06` — P0, Package A Pilot):**
   - Left thesis column (`<Reveal delayMs={0}>`), right `h2` (`<Reveal delayMs={80}>`), and two-column supporting copy (`<Reveal delayMs={160}>`).
4. **`DestinationStory` (`INV-07` — P0):**
   - Wrapped inside the `<Suspense>` Catalog boundary in `src/components/home/destination-story.tsx` `[OBSERVED]`.
   - Left portrait image frame (`<Reveal variant="image" delayMs={0}>`) settles to `transform: none` so the `-bottom-6` coordinate badge (`<Reveal variant="card" delayMs={160}>`) has an unshifted containing block. Right editorial column uses `<Reveal delayMs={100}>`.
5. **`ExperienceStory` (`INV-08` — P1):**
   - Left narrative header (`<Reveal delayMs={0}>`).
   - Numbered `<ol>` items (`01`, `02`, `03`) use `<Reveal as="li" variant="card" delayMs={index * 90}>` (`0ms`, `90ms`, `180ms`).
   - Pricing disclaimer box (`experience-story.tsx:66–69`) is **exempt from standalone delay** (`B-7`).
   - Right image uses `<Reveal variant="image" delayMs={120}>` inside the existing `<div className="lg:col-span-5 lg:translate-y-10">` column so Tailwind's `lg:translate-y-10` (`translate` property) is never overwritten (`B-2`).
6. **`AiPlannerSection` (`INV-09` — P1):**
   - Full-bleed dark `<section className="bg-[var(--adora-ink)]">` remains at `opacity: 1` (`B-2`).
   - Left column (`<Reveal delayMs={0}>`) includes the demo notice (`ai-planner-section.tsx:26–30`) in the same container with zero separate delay (`B-7`).
   - Right preview frame (`<Reveal delayMs={100}>`) reveals as a single unit, while its two inner sample bubbles use pure CSS transition delays (`+120ms` and `+200ms` relative to parent reveal) rather than nested `<Reveal>` instances (`O-4`).
7. **`HowItWorks` (`INV-10` — P1):**
   - Full-bleed `<section className="bg-[var(--adora-ivory)]">` remains at `opacity: 1` (`B-2`).
   - Header grid uses `<Reveal delayMs={0}>`.
   - The three `<ol>` step items use `<Reveal as="li" variant="card" delayMs={idx * 90}>` (`0ms`, `90ms`, `180ms` on `md+`; `0ms` on mobile single-column via CSS media query) so `:first-child` / `:last-child` padding selectors (`how-it-works.tsx:37`) continue to match `<li>` directly (`B-1`).
8. **`SiteFooter` Closing CTA (`INV-11` — P1):**
   - Full-bleed `<footer className="bg-[var(--adora-ink)]">` and bottom utility bar remain static at `opacity: 1`. Only the inner closing CTA grid (`showCta === true`) wraps in `<Reveal delayMs={0}>`.

### D.2 Discovery Pages (`/destinations*`, `/experiences*` — Package C)
1. **`PageIntro` (`INV-12` — P1):**
   - Above-the-fold load entrance (`480ms var(--adora-ease-editorial)`, `0ms` / `60ms` stagger, `animation-fill-mode: backwards`) on the header and aside copy.
2. **`/destinations` Featured Đà Lạt Composition (`INV-13` — P2, Scoped per `B-8`):**
   - Preloaded image runs `.adora-image-settle` (`scale(1.02) -> none`, `760ms`, `opacity: 1` from `0ms`).
   - **Rejected Sub-Proposal (`B-8`):** The overlapping paper card (`lg:col-start-8 lg:row-start-1`) stays **static** (`transform: none`) to avoid creating an animated stacking context over the grid overlap (`destinations/page.tsx:52–60` `[OBSERVED]`).
3. **Filter Settle in `DestinationBrowser` & `ExperienceBrowser` (`INV-14` — P1, Scoped per `B-8`):**
   - Filter chips transition colors over `180ms var(--adora-ease-ui)`.
   - Results list (`<ol data-testid="destination-results">` / `<ul data-testid="experience-results">`) is keyed by **chip selection only**:
     - `DestinationBrowser`: `const chipKey = `${filter.region}-${filter.availability}`;` (**Rejected Sub-Proposal `B-8`:** `filter.query` is excluded from `key` so typing in the search input never remounts nodes or triggers keyframe flashes on keystrokes).
     - `ExperienceBrowser`: `key={category}`.
   - Runs `@keyframes adora-filter-settle` (`opacity: 0.5 -> 1`, **opacity-only, zero `translateY`**, `220ms var(--adora-ease-ui)`, `animation-fill-mode: backwards`).
4. **Card Hover & Touch Guard (`INV-15` — P0 Guard in Package A, P1 Keyboard Parity in Package C):**
   - `.image-reveal:hover img` wrapped in `@media (hover: hover) and (pointer: fine)` (`scale(1.025)`, `1200ms var(--adora-ease-editorial)`).
   - `ExperienceCard` arrow nudge (`-translate-y-0.5 translate-x-0.5`) and `--adora-gold` accent mirror on `group-focus-visible:`.
5. **Detail Pages `/destinations/da-lat` & `/experiences/[slug]` (`INV-16` — P1, Scoped per `B-8`):**
   - Hero `<Image preload>` runs `.adora-image-settle` (`opacity: 1` from `0ms`); hero text runs `.adora-load-rise` (`0ms` delay on `h1` so LCP is never delayed if `h1` is the mobile LCP candidate).
   - `ExperienceGrid` (`src/components/discovery/experience-grid.tsx`) adds an opt-in `reveal?: boolean` prop (default `false`) so `/experiences` index is unaffected while `/destinations/da-lat` and `/experiences/[slug]` related cards can enable row-level `<Reveal>`.
   - On `/experiences/[slug]`, the pricing disclaimer (`page.tsx:167–170`) is inside the aside container with **zero separate delay** (`B-7`).
   - `PlannerCta` (`src/components/discovery/planner-cta.tsx`) reveals only its inner content container (`<Reveal>`), never the outer `bg-[var(--adora-forest-dark)]` `<section>` (`B-2`).

### D.3 Application Surfaces (`/ai-planner`, `/trips`, `/trips/[slug]` — Package D)
1. **`/ai-planner` Turn & Preview Choreography (`INV-17`, `INV-18` — P0/P1, Reconciled `B-4`, `B-8`, `O-5`):**
   - **Rejected Sub-Proposal (`B-8`):** The `12deg` `Compass` icon hover rotation on welcome suggestion cards is **rejected** as decorative noise; welcome cards use clean border/background transitions (`180ms var(--adora-ease-ui)`).
   - Welcome suggestion click moves focus to `#planner-prompt` (`P-6` / `O-5`).
   - User bubble (`article[aria-label="Bạn"]`): opacity-only `0 -> 1` (`160ms var(--adora-ease-ui)`, `0ms` delay, `data-entered` latch).
   - Reply (`scripted-reply` / `unsupported-reply`) & mobile preview (`trip-preview-mobile`): opacity-only `0 -> 1` (`200ms var(--adora-ease-ui)`, `+80ms` delay, `data-entered` latch).
   - Desktop preview (`trip-preview`, keyed by `preview.slug`): `opacity: 0 -> 1` + `translate3d(0, 6px, 0) -> none` (`200ms var(--adora-ease-ui)`, `+80ms` delay).
   - Mobile jumpbar (`mobile-planner-jumpbar`): opacity-only `0 -> 1` (`160ms var(--adora-ease-ui)`). Jumpbar button click reads reduced-motion media query dynamically at click time.
2. **`/trips` & `/trips/[slug]` Day Tabs & Accordion (`INV-19`, `INV-20` — P1, Reconciled `B-5`, `B-8`):**
   - **Rejected Sub-Proposal (`B-8`):** `TripCard` does **not** introduce a second `1.02 / 800ms` image hover variant; it reuses the standard `.image-reveal` hover contract (`1.025 / 1200ms`, touch-guarded) plus `180ms` border-color transition.
   - `ItineraryExplorer` day tab switching (`INV-19`): The outer `<div role="tabpanel" id={`day-panel-${day.day}`} data-testid="day-panel">` remains **stable and unkeyed** (`B-8`). An inner wrapper `<div key={day.day} className="adora-panel-in">` animates (`opacity: 0 -> 1`, `translate3d(0, 6px, 0) -> none`, `220ms var(--adora-ease-ui)`, `animation-fill-mode: backwards`, `data-entered` latch). `aria-selected`, keyboard focus, and `[data-testid="day-budget"]` update synchronously (`0ms`).
   - `ItineraryExplorer` activity accordion (`INV-20`): Uses the 3-layer CSS Grid `0fr <-> 1fr` + `opacity` wrapper (`240ms var(--adora-ease-ui)`) with `inert={!open}` specified in Section C.5 (`B-5`).

---

## E. Complete Reconciled 20-Item Motion Inventory (`INV-01` – `INV-20`)

Every inventory item below includes all 15 required architectural fields. Rejected sub-proposals from `B-8` are explicitly marked.

### `INV-01` — Desktop Header Navigation Hairline Underline
1. **ID:** `INV-01`
2. **Routes:** All routes rendering `SiteHeader` (`/`, `/destinations*`, `/experiences*`, `/ai-planner`, `/trips*`)
3. **Component & File Path:** `SiteHeader` (`apps/web/src/components/layout/site-header.tsx`) & `apps/web/src/app/globals.css`
4. **Review Disposition:** **APPROVE** (`B-8`)
5. **Final Approved Effect:** Desktop navigation links (`lg:flex`) reveal a `1px` bottom underline (`scaleX(0) -> scaleX(1)`, `transform-origin: left`) on `:hover` and `:focus-visible`. Active link (`aria-current="page"`) displays a persistent `--adora-gold` underline (`scaleX(1)`).
6. **Trigger:** Pointer `:hover` (`@media (hover: hover) and (pointer: fine)`) and keyboard `:focus-visible`
7. **Duration:** `240ms`
8. **Easing:** `var(--adora-ease-editorial)` (`cubic-bezier(0.22, 1, 0.36, 1)`)
9. **Transform / Opacity Rules:** `::after` pseudo-element animates `transform: scaleX(0)` to `transform: scaleX(1)` only; `:focus-visible` outline remains instant (`0ms`).
10. **Responsive Behavior:** Active on desktop (`>= 1024px`, `lg:flex`); hidden on `< 1024px`.
11. **Reduced-Motion Behavior:** `transition-duration: 0.01ms !important`; underline appears/disappears instantaneously.
12. **Next.js `<Activity>` / Hydration Notes:** Pure CSS pseudo-element; stateless across `<Activity>` route preservation.
13. **Implementation Technique:** CSS `.nav-link-editorial::after` rule in `globals.css`.
14. **Priority & Package:** **P2** — Optional Polish (Package F or post-Package C polish)
15. **Verification Criteria:** Active route has `aria-current="page"`; keyboard focus outline is instant; zero horizontal overflow.

### `INV-02` — Mobile Navigation Disclosure Drawer
1. **ID:** `INV-02`
2. **Routes:** All routes rendering `SiteHeader`
3. **Component & File Path:** `SiteHeader` (`apps/web/src/components/layout/site-header.tsx:96–131`)
4. **Review Disposition:** **DEFER** (`B-8`) — **Sub-Proposal Rejected:** Replacing `hidden` with an always-mounted CSS Grid `0fr -> 1fr` wrapper without unmounting is rejected for Web Design 0.4 because `scripts/verify_web_0_3.mjs:643` asserts `getComputedStyle(mobileMenu).display === "grid"` immediately on click and `mobile-navigation` has `py-4` padding that would require restructuring.
5. **Final Approved Effect:** Deferred in Web Design 0.4; retains existing synchronous `open ? "grid" : "hidden"` disclosure from Web Design 0.3.
6. **Trigger:** Click / `Space` / `Enter` on `button[aria-controls="mobile-navigation"]`
7. **Duration:** `0ms` (instant state toggle preserved)
8. **Easing:** N/A (deferred)
9. **Transform / Opacity Rules:** None (deferred)
10. **Responsive Behavior:** Mobile/Tablet (`< 1024px`)
11. **Reduced-Motion Behavior:** Instant show/hide
12. **Next.js `<Activity>` / Hydration Notes:** Existing pathname-change reset in `site-header.tsx` closes menu on navigation.
13. **Implementation Technique:** No change in Web Design 0.4.
14. **Priority & Package:** **Deferred**
15. **Verification Criteria:** `scripts/verify_web_0_3.mjs` mobile menu assertions (`aria-expanded`, `display === "grid"`, `Escape` close) pass unchanged.

### `INV-03` — Homepage Hero Background Photograph Scale Settle
1. **ID:** `INV-03`
2. **Routes:** `/`
3. **Component & File Path:** `EditorialHero` (`apps/web/src/components/home/editorial-hero.tsx:20–27`)
4. **Review Disposition:** **APPROVE** (`B-8`)
5. **Final Approved Effect:** Preloaded hero `<Image preload>` renders at `opacity: 1` from `t = 0ms` and settles scale from `var(--adora-scale-image-enter)` (`1.035` desktop / `1.02` mobile) to `transform: none`.
6. **Trigger:** Initial page load
7. **Duration:** `920ms` (`var(--adora-duration-cinematic)`)
8. **Easing:** `var(--adora-ease-editorial)`
9. **Transform / Opacity Rules:** Animates `transform` only (`scale(...) -> none`) with `animation-fill-mode: backwards`. **Never animates `opacity`** (`opacity === "1"` at `t = 0ms`).
10. **Responsive Behavior:** Desktop/Tablet `scale(1.035)`; Mobile (`< 768px`) `scale(1.02)`. If 4× CPU frame sampling on mobile exceeds budget, drop image scale on `< 768px` while keeping desktop.
11. **Reduced-Motion Behavior:** Static `transform: none`, `opacity: 1`.
12. **Next.js `<Activity>` / Hydration Notes:** Uses `onAnimationEnd` `data-entered="true"` attribute guard (or CSS-only load settle) so Back navigation does not cause a jarring jump.
13. **Implementation Technique:** CSS `@keyframes adora-image-settle` on `.adora-image-settle` in `globals.css`.
14. **Priority & Package:** **P0** — **Package B**
15. **Verification Criteria:** Hero `<img>` computed `opacity === "1"` at `t = 0ms`; LCP element identity on `/` unchanged vs. `c495955` baseline; settled `transform === "none"`.

### `INV-04` — Homepage Hero Typography & CTA Staggered Entrance
1. **ID:** `INV-04`
2. **Routes:** `/`
3. **Component & File Path:** `EditorialHero` (`apps/web/src/components/home/editorial-hero.tsx:31–63`)
4. **Review Disposition:** **APPROVE** (`B-8`)
5. **Final Approved Effect:** Four-step load rise: (0) Eyebrow at `0ms`, (1) `h1` at `60ms` (`40ms` mobile), (2) Lead paragraph at `120ms` (`80ms` mobile), (3) CTA row at `180ms` (`120ms` mobile).
6. **Trigger:** Initial page load
7. **Duration:** `680ms` (`var(--adora-duration-reveal)`)
8. **Easing:** `var(--adora-ease-editorial)`
9. **Transform / Opacity Rules:** `opacity: 0 -> 1` and `transform: translate3d(0, var(--adora-distance-hero), 0) -> none` using `animation-fill-mode: backwards`. Delay computed via `min(calc(var(--stagger-index, 0) * var(--adora-stagger-tight)), var(--adora-stagger-cap))`.
10. **Responsive Behavior:** Desktop `20px` rise / `60ms` step; Mobile `12px` rise / `40ms` step.
11. **Reduced-Motion Behavior:** Immediate `opacity: 1`, `transform: none`.
12. **Next.js `<Activity>` / Hydration Notes:** SSR HTML renders visible by default under reduced motion; `animation-fill-mode: backwards` returns settled nodes to `transform: none`.
13. **Implementation Technique:** CSS `@keyframes adora-load-rise` with `--stagger-index: 0..3` in `globals.css`.
14. **Priority & Package:** **P0** — **Package B**
15. **Verification Criteria:** `h1` text and CTA button contrast (`#171a19` on `#f3efe7`) match `verify_homepage.mjs` after settle.

### `INV-05` — Homepage Hero Scroll Indicator Line
1. **ID:** `INV-05`
2. **Routes:** `/`
3. **Component & File Path:** `EditorialHero` (`apps/web/src/components/home/editorial-hero.tsx:66–71`) & `apps/web/src/app/globals.css:178–194`
4. **Review Disposition:** **APPROVE (Already Implemented + Optional `O-3` Bound)**
5. **Final Approved Effect:** Vertical pulse along `1px` scroll line (`scaleY(0.35 -> 1 -> 0.35)`). Per `O-3`, bound `animation-iteration-count` to `2` (`4.4s` total `<= 5.0s` WCAG 2.2.2 threshold) settling at `scaleY(1), opacity: 0.75`.
6. **Trigger:** Initial page load on `lg:flex`
7. **Duration:** `2200ms` per cycle × `2` iterations (`4400ms` total)
8. **Easing:** `var(--adora-ease-ambient)`
9. **Transform / Opacity Rules:** `transform: scaleY(...)` and `opacity` only.
10. **Responsive Behavior:** Desktop (`lg:flex`) only; hidden on `< 1024px`.
11. **Reduced-Motion Behavior:** `animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;`.
12. **Next.js `<Activity>` / Hydration Notes:** Pure CSS.
13. **Implementation Technique:** Existing `.hero-scroll-line` in `globals.css` updated to `2` iterations.
14. **Priority & Package:** **P0 (Existing)** / **P2 (`O-3` 2-iteration bound in Package B)**
15. **Verification Criteria:** `document.getAnimations()` shows zero infinite animations after `4.5s`.

### `INV-06` — `BrandPhilosophy` Two-Column Scroll Reveal (Package A Pilot)
1. **ID:** `INV-06`
2. **Routes:** `/` (`#philosophy`)
3. **Component & File Path:** `BrandPhilosophy` (`apps/web/src/components/home/brand-philosophy.tsx`)
4. **Review Disposition:** **APPROVE** (`B-8`)
5. **Final Approved Effect:** Left eyebrow/thesis column reveals at `0ms`; right `h2` reveals at `+80ms`; bottom 2-column copy reveals at `+160ms`.
6. **Trigger:** `<Reveal>` (`IntersectionObserver` `threshold: 0`, `rootMargin: "100000px 0px -10% 0px"`, once-per-visit)
7. **Duration:** `680ms` (`var(--adora-duration-reveal)`)
8. **Easing:** `var(--adora-ease-editorial)`
9. **Transform / Opacity Rules:** `opacity: 0 -> 1`, `transform: translate3d(0, var(--adora-distance-reveal), 0) -> none`.
10. **Responsive Behavior:** Desktop `22px` rise (`0/80/160ms`); Mobile `14px` rise.
11. **Reduced-Motion Behavior:** Never enters `pending`; immediate `opacity: 1`, `transform: none`.
12. **Next.js `<Activity>` / Hydration Notes:** `BrandPhilosophy` stays a Server Component; `<Reveal>` leaf preserves `revealedRef.current = true` across `<Activity>` hide/show and anchor jumps (`/#philosophy`).
13. **Implementation Technique:** `<Reveal>` leaf component wrapping the three inner blocks of `BrandPhilosophy`.
14. **Priority & Package:** **P0** — **Package A (Pilot Section)**
15. **Verification Criteria:** SSR HTML contains no `data-reveal="pending"`; navigating directly to `/#philosophy` renders `opacity === "1"` immediately; scrolling through `/` settles all three blocks to `opacity: 1, transform: none`.

### `INV-07` — `DestinationStory` Portrait Photo, Coordinate Badge & Story Reveal
1. **ID:** `INV-07`
2. **Routes:** `/` (`#destinations`)
3. **Component & File Path:** `DestinationStory` (`apps/web/src/components/home/destination-story.tsx`)
4. **Review Disposition:** **APPROVE** (`B-8`)
5. **Final Approved Effect:** Portrait image frame settles (`variant="image"`, `0ms`), floating coordinate badge rises (`variant="card"`, `+160ms`), and right story column reveals (`+100ms`).
6. **Trigger:** `<Reveal>` (`IntersectionObserver`, once-per-visit)
7. **Duration:** `680ms`
8. **Easing:** `var(--adora-ease-editorial)`
9. **Transform / Opacity Rules:** Settled state is `transform: none` so the `-bottom-6` coordinate badge (`destination-story.tsx:25`) has an unshifted positioning context (`B-2`).
10. **Responsive Behavior:** Desktop `22px` rise; Mobile `14px` rise.
11. **Reduced-Motion Behavior:** Immediate `opacity: 1`, `transform: none`.
12. **Next.js `<Activity>` / Hydration Notes:** Rendered inside `<Suspense fallback={<DestinationStoryFallback />}>` (`page.tsx:23`). When the async Server Component streams in (with API offline or online), `<Reveal>` mounts on the resolved tree and immediately reveals if already within the viewport.
13. **Implementation Technique:** `<Reveal>` wrappers inside `DestinationStoryContent`.
14. **Priority & Package:** **P0** — **Package B**
15. **Verification Criteria:** Works with FastAPI offline fallback; coordinate badge bounding box does not overflow or clip; settled `transform === "none"`.

### `INV-08` — `ExperienceStory` Narrative, Numbered List & Coffee Ritual Photo
1. **ID:** `INV-08`
2. **Routes:** `/` (`#experiences`)
3. **Component & File Path:** `ExperienceStory` (`apps/web/src/components/home/experience-story.tsx`)
4. **Review Disposition:** **APPROVE** (`B-8`, with `B-1`, `B-2`, `B-7` constraints)
5. **Final Approved Effect:** Left narrative header + pricing disclosure reveal at `0ms`; numbered `<ol>` items (`01`, `02`, `03`) reveal via `<Reveal as="li" variant="card">` (`0ms`, `90ms`, `180ms`); right image reveals inside the existing `lg:translate-y-10` column (`+120ms`).
6. **Trigger:** `<Reveal>` (`IntersectionObserver`, once-per-visit)
7. **Duration:** `680ms`
8. **Easing:** `var(--adora-ease-editorial)`
9. **Transform / Opacity Rules:** Right `<Reveal variant="image">` wraps the inner card inside `<div className="lg:col-span-5 lg:translate-y-10">` so Tailwind v4's `lg:translate-y-10` (`translate` property) is never touched (`B-2`). Pricing disclosure (`experience-story.tsx:66–69`) has zero standalone delay (`B-7`).
10. **Responsive Behavior:** Desktop `90ms` list stagger; Mobile (`< 768px`) `0ms` stagger via CSS override so stacked items do not wait unnecessarily.
11. **Reduced-Motion Behavior:** Immediate `opacity: 1`, `transform: none`.
12. **Next.js `<Activity>` / Hydration Notes:** `<Reveal as="li">` preserves valid `<ol> > <li>` HTML semantics (`B-1`).
13. **Implementation Technique:** `<Reveal>` and `<Reveal as="li" variant="card">`.
14. **Priority & Package:** **P1** — **Package B**
15. **Verification Criteria:** `<ol>` children are `<li>` elements; `lg:translate-y-10` desktop offset is preserved; pricing disclaimer is at `opacity: 1` whenever the header is visible.

### `INV-09` — `AiPlannerSection` Preview Window & Sample Bubbles
1. **ID:** `INV-09`
2. **Routes:** `/` (`Adora Intelligence`)
3. **Component & File Path:** `AiPlannerSection` (`apps/web/src/components/home/ai-planner-section.tsx`)
4. **Review Disposition:** **APPROVE** (`B-8`, with `B-2`, `B-7`, `O-4` constraints)
5. **Final Approved Effect:** Left editorial copy + demo purpose notice reveal together at `0ms`. Right preview window reveals at `+100ms`, with its two sample bubbles fading/rising at `+120ms` and `+200ms` via CSS children selectors tied to the parent `[data-reveal="visible"]` state.
6. **Trigger:** `<Reveal>` (`IntersectionObserver`, once-per-visit)
7. **Duration:** `680ms` (columns) / `420ms` (sample bubbles)
8. **Easing:** `var(--adora-ease-editorial)` (columns) / `var(--adora-ease-ui)` (sample bubbles)
9. **Transform / Opacity Rules:** Outer `<section className="bg-[var(--adora-ink)]">` stays at `opacity: 1` (`B-2`). Demo notice (`ai-planner-section.tsx:26–30`) is inside the left column `<Reveal delayMs={0}>` with zero extra delay (`B-7`). Maximum total delay is `100ms + 200ms = 300ms` (no nested `<Reveal>`, `O-4`).
10. **Responsive Behavior:** Desktop `22px` rise; Mobile `14px` rise.
11. **Reduced-Motion Behavior:** Immediate `opacity: 1`, `transform: none`.
12. **Next.js `<Activity>` / Hydration Notes:** Server Component preserved.
13. **Implementation Technique:** Two `<Reveal>` wrappers (left column and right preview card) + CSS descendant transition on `[data-sample-bubble]`.
14. **Priority & Package:** **P1** — **Package B**
15. **Verification Criteria:** Full-bleed `--adora-ink` section background never flashes `--adora-paper`; demo notice is visible at `opacity: 1` with left heading; zero typing indicators.

### `INV-10` — `HowItWorks` Three-Step Editorial Grid
1. **ID:** `INV-10`
2. **Routes:** `/` (`#how-it-works`)
3. **Component & File Path:** `HowItWorks` (`apps/web/src/components/home/how-it-works.tsx`)
4. **Review Disposition:** **APPROVE** (`B-8`, with `B-1`, `B-2` constraints)
5. **Final Approved Effect:** Header row reveals at `0ms`; the three step `<li key={step.number}>` items stagger left-to-right on desktop (`0ms`, `90ms`, `180ms`).
6. **Trigger:** `<Reveal>` (`IntersectionObserver`, once-per-visit)
7. **Duration:** `680ms`
8. **Easing:** `var(--adora-ease-editorial)`
9. **Transform / Opacity Rules:** Outer `<section className="bg-[var(--adora-ivory)]">` stays at `opacity: 1` (`B-2`). Uses `<Reveal as="li" variant="card" className="...">` on each step so `md:first:pl-0 md:last:pr-0` (`how-it-works.tsx:37`) continues to match the `<li>` elements directly (`B-1`).
10. **Responsive Behavior:** Desktop/Tablet (`md:grid-cols-3`) `0/90/180ms` stagger; Mobile single-column `0ms` delay.
11. **Reduced-Motion Behavior:** Immediate `opacity: 1`, `transform: none`.
12. **Next.js `<Activity>` / Hydration Notes:** Direct `/#how-it-works` anchor navigation reveals immediately via the `100000px` top `rootMargin`.
13. **Implementation Technique:** `<Reveal>` on header + `<Reveal as="li" variant="card">` on each step.
14. **Priority & Package:** **P1** — **Package B**
15. **Verification Criteria:** `md:first:pl-0` and `md:last:pr-0` computed paddings are unchanged from Web Design 0.3; all 3 steps settle to `opacity: 1`.

### `INV-11` — `SiteFooter` Closing Editorial CTA Reveal
1. **ID:** `INV-11`
2. **Routes:** `/`, `/destinations` (routes where `showCta` is true)
3. **Component & File Path:** `SiteFooter` (`apps/web/src/components/layout/site-footer.tsx:18–45`)
4. **Review Disposition:** **APPROVE** (`B-8`, with `B-2` constraint)
5. **Final Approved Effect:** Inner closing CTA container (`Bắt đầu bằng một câu hỏi thật hay.` + `Plan with Adora AI` button) reveals once on scroll; bottom footer utility bar remains static (`opacity: 1`).
6. **Trigger:** `<Reveal>` (`IntersectionObserver`, once-per-visit)
7. **Duration:** `680ms`
8. **Easing:** `var(--adora-ease-editorial)`
9. **Transform / Opacity Rules:** Outer `<footer className="bg-[var(--adora-ink)]">` never fades (`B-2`); only the inner closing CTA grid uses `<Reveal>`.
10. **Responsive Behavior:** Desktop `22px` rise; Mobile `14px` rise.
11. **Reduced-Motion Behavior:** Immediate `opacity: 1`, `transform: none`.
12. **Next.js `<Activity>` / Hydration Notes:** Server Component preserved.
13. **Implementation Technique:** `<Reveal>` wrapping the inner grid inside `{showCta ? ... : null}`.
14. **Priority & Package:** **P1** — **Package B**
15. **Verification Criteria:** Footer utility links (`Điểm đến`, `Trải nghiệm`, etc.) are always at `opacity: 1` even before scrolling.

### `INV-12` — `PageIntro` Above-the-Fold Load Entrance
1. **ID:** `INV-12`
2. **Routes:** `/destinations`, `/experiences`, `/trips`
3. **Component & File Path:** `PageIntro` (`apps/web/src/components/ui/page-intro.tsx`)
4. **Review Disposition:** **APPROVE** (`B-8`)
5. **Final Approved Effect:** Single immediate CSS load entrance: main title block (`eyebrow` + `h1` + `DemoBadge`) at `0ms` delay (`h1` never delayed to protect mobile LCP), and right aside description at `60ms` delay.
6. **Trigger:** Initial page load
7. **Duration:** `480ms`
8. **Easing:** `var(--adora-ease-editorial)`
9. **Transform / Opacity Rules:** `opacity: 0 -> 1`, `transform: translate3d(0, 12px, 0) -> none`, `animation-fill-mode: backwards`. `DemoBadge` enters at `0ms` with the title block (`B-7`).
10. **Responsive Behavior:** Desktop `12px` rise / `60ms` aside stagger; Mobile `8px` rise / `40ms` aside stagger.
11. **Reduced-Motion Behavior:** Immediate `opacity: 1`, `transform: none`.
12. **Next.js `<Activity>` / Hydration Notes:** Pure CSS load class `.adora-load-rise`; does not use `IntersectionObserver` so above-the-fold headers never flash after hydration.
13. **Implementation Technique:** CSS `.adora-load-rise` in `globals.css`.
14. **Priority & Package:** **P1** — **Package C**
15. **Verification Criteria:** `h1Count === 1` and `opacity === "1"` after load across `/destinations`, `/experiences`, and `/trips`.

### `INV-13` — `/destinations` Featured Đà Lạt Image Settle
1. **ID:** `INV-13`
2. **Routes:** `/destinations`
3. **Component & File Path:** `DestinationsPage` (`apps/web/src/app/destinations/page.tsx:35–107`)
4. **Review Disposition:** **APPROVE WITH CHANGES** (`B-8`) — **Sub-Proposal Rejected:** The `16px` vertical rise on the overlapping paper card (`lg:col-start-8 lg:row-start-1`) is **rejected** to avoid creating an animated stacking context over the 12-column CSS Grid overlap.
5. **Final Approved Effect:** Featured Đà Lạt `<Image preload>` (`lg:col-span-8 lg:col-start-1 lg:row-start-1`) performs a subtle scale settle (`scale(1.02) -> none`, `760ms`) while remaining at `opacity: 1` from `0ms`. Overlapping paper card (`lg:col-span-5 lg:col-start-8 lg:row-start-1 z-10`) remains static (`transform: none`).
6. **Trigger:** Initial page load
7. **Duration:** `760ms`
8. **Easing:** `var(--adora-ease-editorial)`
9. **Transform / Opacity Rules:** Image animates `transform: scale(1.02) -> none` with `animation-fill-mode: backwards` and `opacity: 1`. Paper card has no transform animation.
10. **Responsive Behavior:** Desktop 12-column overlap preserved; Mobile stacked layout preserved.
11. **Reduced-Motion Behavior:** Static `transform: none`.
12. **Next.js `<Activity>` / Hydration Notes:** Server Component preserved.
13. **Implementation Technique:** `.adora-image-settle` on the featured `<Image>`.
14. **Priority & Package:** **P2** — **Package C**
15. **Verification Criteria:** Featured image `opacity === "1"` at `0ms`; paper card z-index and grid overlap geometry match Web Design 0.3 at `1440×900` and `390×844`.

### `INV-14` — `DestinationBrowser` & `ExperienceBrowser` Filter Settle
1. **ID:** `INV-14`
2. **Routes:** `/destinations`, `/experiences`
3. **Component & File Path:** `DestinationBrowser` (`apps/web/src/components/discovery/destination-browser.tsx`) & `ExperienceBrowser` (`apps/web/src/components/discovery/experience-browser.tsx`)
4. **Review Disposition:** **APPROVE WITH CHANGES** (`B-8`) — **Sub-Proposals Rejected:** (1) `filter.query` is **excluded** from the React `key` so typing in the search box never triggers per-keystroke animations or remounts; (2) `translateY(6px–8px)` is **removed** so filter settles are **opacity-only** (`0.5 -> 1`).
5. **Final Approved Effect:** Clicking a region, availability, or category chip transitions chip colors (`180ms`) and triggers a soft opacity-only settle (`opacity: 0.5 -> 1`, `220ms`) on the results list (`[data-testid="destination-results"]`, `[data-testid="experience-results"]`) or empty state (`[data-testid="destination-empty"]`).
6. **Trigger:** Clicking a filter chip or reset button (`key={`${filter.region}-${filter.availability}`}` on `/destinations`; `key={category}` on `/experiences`)
7. **Duration:** `180ms` (chip button) / `220ms` (results list opacity settle)
8. **Easing:** `var(--adora-ease-ui)` (`cubic-bezier(0.25, 1, 0.5, 1)`)
9. **Transform / Opacity Rules:** **Opacity-only** (`opacity: 0.5 -> 1`, `transform: none`, `animation-fill-mode: backwards`). Starting at `0.5` prevents white-screen flash while masking any 1-frame cached image decode.
10. **Responsive Behavior:** Identical on desktop, tablet, and mobile.
11. **Reduced-Motion Behavior:** Instant swap (`0.01ms`).
12. **Next.js `<Activity>` / Hydration Notes:** Focus remains on the clicked chip button outside the keyed `<ol>`/`<ul>`; `role="status"` result counts (`destination-count`, `experience-count`) live outside the keyed list and update synchronously.
13. **Implementation Technique:** `key={chipKey}` on the results `<ol>`/`<ul>` + CSS `@keyframes adora-filter-settle` in `globals.css`.
14. **Priority & Package:** **P1** — **Package C**
15. **Verification Criteria:** `verify_web_0_3.mjs` filter count assertions pass synchronously; typing in `#destination-search` causes zero animation on `[data-testid="destination-results"]`; `window.scrollY` does not jump on chip click.

### `INV-15` — `.image-reveal` Touch Hover Guard & `ExperienceCard` Micro-Interaction
1. **ID:** `INV-15`
2. **Routes:** All routes using `.image-reveal` and `ExperienceCard` (`/`, `/destinations*`, `/experiences*`, `/trips`)
3. **Component & File Path:** `apps/web/src/app/globals.css:162–171` & `ExperienceCard` (`apps/web/src/components/discovery/experience-card.tsx:58`)
4. **Review Disposition:** **APPROVE** (`B-8`, P0 for touch guard, P1 for keyboard focus-visible parity)
5. **Final Approved Effect:** Photographic hover zoom (`scale(1 -> 1.025)`, `1200ms var(--adora-ease-editorial)`) is gated inside `@media (hover: hover) and (pointer: fine)` so touch devices never latch a sticky zoomed state on tap. `ExperienceCard` `ArrowUpRight` diagonal nudge (`-translate-y-0.5 translate-x-0.5`, `260ms`) and `--adora-gold` shift activate on both `:hover` and `:focus-visible`.
6. **Trigger:** Fine-pointer `:hover` and keyboard `:focus-visible`
7. **Duration:** `1200ms` (image zoom) / `260ms` (arrow icon nudge)
8. **Easing:** `var(--adora-ease-editorial)`
9. **Transform / Opacity Rules:** Image uses `transform: scale(...)`; arrow icon uses Tailwind `translate` utilities.
10. **Responsive Behavior:** Hover zoom active only on `(hover: hover) and (pointer: fine)`; disabled on `(hover: none)` mobile/tablet touch viewports.
11. **Reduced-Motion Behavior:** `transition-duration: 0.01ms !important`, no zoom.
12. **Next.js `<Activity>` / Hydration Notes:** Pure CSS.
13. **Implementation Technique:** Wrap `.image-reveal:hover img` in `@media (hover: hover) and (pointer: fine)` in `globals.css` (Package A); add `group-focus-visible:` classes in `experience-card.tsx` (Package C).
14. **Priority & Package:** **P0 (Touch Guard in Package A)** / **P1 (Keyboard Parity in Package C)**
15. **Verification Criteria:** Under mobile touch emulation (`390×844`), tapping an `.image-reveal` card leaves `getComputedStyle(img).transform === "none"`.

### `INV-16` — Destination & Experience Detail Page Reveals
1. **ID:** `INV-16`
2. **Routes:** `/destinations/da-lat`, `/experiences/[slug]`
3. **Component & File Path:** `apps/web/src/app/destinations/[slug]/page.tsx`, `apps/web/src/app/experiences/[slug]/page.tsx`, `ExperienceGrid` (`apps/web/src/components/discovery/experience-grid.tsx`), `PlannerCta` (`apps/web/src/components/discovery/planner-cta.tsx`)
4. **Review Disposition:** **APPROVE WITH CHANGES** (`B-8`, reduced scope to prevent over-animation `O-4` and protect disclosures `B-7`)
5. **Final Approved Effect:**
   - **Hero (`/destinations/da-lat` & `/experiences/[slug]`):** Preloaded `<Image preload>` runs `.adora-image-settle` (`opacity: 1` from `0ms`, `820ms–920ms`). Hero header block runs `.adora-load-rise` (`0ms` delay on `h1` and `DemoBadge`).
   - **Below-the-Fold Sections:** Lead narrative, highlights section (1 container `<Reveal>` or 4 `<Reveal as="li" variant="card">` items at `0/60/120/180ms`), `ExperienceGrid` (opt-in `reveal={true}` prop, revealing once per section/row), 3-day itinerary preview section, related experiences section, and `PlannerCta` inner content container reveal once on scroll.
   - **Pricing Disclosure Exemption (`B-7`):** On `/experiences/[slug]`, the pricing disclaimer box (`page.tsx:167–170`) is rendered inside the `<aside>` at `opacity: 1` with zero standalone reveal delay.
6. **Trigger:** Initial load (hero) + `<Reveal>` (`IntersectionObserver`, once-per-visit) for below-fold sections
7. **Duration:** `680ms` (`var(--adora-duration-reveal)`)
8. **Easing:** `var(--adora-ease-editorial)`
9. **Transform / Opacity Rules:** Hero `<img>` stays `opacity: 1`; `PlannerCta` outer `<section className="bg-[var(--adora-forest-dark)]">` stays `opacity: 1` (`B-2`), revealing only its inner grid.
10. **Responsive Behavior:** Desktop `22px` rise; Mobile `14px` rise (`0ms` sibling stagger when stacked in single column).
11. **Reduced-Motion Behavior:** Immediate `opacity: 1`, `transform: none`.
12. **Next.js `<Activity>` / Hydration Notes:** Server Components preserved; `ExperienceGrid` defaults to `reveal = false` so `/experiences` index is untouched.
13. **Implementation Technique:** `.adora-image-settle`, `.adora-load-rise`, and `<Reveal>` wrappers.
14. **Priority & Package:** **P1** — **Package C**
15. **Verification Criteria:** Hero `<img>` `opacity === "1"` at `t = 0ms`; pricing disclaimer on `/experiences/ca-phe-nho-giot-cao-nguyen` never has `opacity < 1` relative to its aside; all images complete (`naturalWidth > 0`).

### `INV-17` — AI Planner User Bubble & Scripted/Unsupported Reply Entrance
1. **ID:** `INV-17`
2. **Routes:** `/ai-planner`
3. **Component & File Path:** `PlannerWorkspace` (`apps/web/src/components/planner/planner-workspace.tsx`)
4. **Review Disposition:** **APPROVE WITH CHANGES** (`B-4`, `B-8`, `O-5`) — **Sub-Proposals Rejected:** (1) `translateY(8px–10px)` inside `role="log"` is **rejected** because `getBoundingClientRect()` scroll anchoring is sensitive to vertical transforms; (2) `12deg` `Compass` icon rotation on welcome suggestion cards is **rejected**.
5. **Final Approved Effect:**
   - Welcome block and opening `ADORA Planner` message render immediately at `scrollTop = 0` (`0ms` delay).
   - Clicking a welcome suggestion card moves keyboard focus to `#planner-prompt` (`P-6` / `O-5`).
   - Submitting a turn commits the user bubble and scripted/unsupported reply synchronously in a single React render:
     - User bubble (`article[aria-label="Bạn"]`): **opacity-only** (`0 -> 1`, `160ms var(--adora-ease-ui)`, `0ms` delay).
     - Reply (`[data-testid="scripted-reply"]` or `[data-testid="unsupported-reply"]`): **opacity-only** (`0 -> 1`, `200ms var(--adora-ease-ui)`, `+80ms` delay, `animation-fill-mode: backwards`).
   - On `onAnimationEnd`, each `<article>` sets `data-entered="true"` so `<Activity>` Back navigation never replays the animation (`B-3`).
6. **Trigger:** Clicking a suggested prompt card or submitting the composer form
7. **Duration:** `160ms` (user bubble) / `200ms` at `+80ms` delay (reply; settled by `280ms`)
8. **Easing:** `var(--adora-ease-ui)`
9. **Transform / Opacity Rules:** **Strict opacity-only (`transform: none`)** inside `role="log"`. All honesty labels (`DemoLabel` `"Phản hồi dựng sẵn · không phải AI"`) enter atomically with their parent reply card with zero separate delay (`B-7`).
10. **Responsive Behavior:** Identical timing and opacity-only contract across desktop (`1440×900`) and mobile (`390×844`).
11. **Reduced-Motion Behavior:** `animation-duration: 0.01ms !important` (instant `opacity: 1` at `t = 0ms`).
12. **Next.js `<Activity>` / Hydration Notes:** `[data-planner-enter]:not([data-entered="true"])` + `onAnimationEnd` guard prevents replay when navigating `/ai-planner` → `/trips/[slug]` → `Back`.
13. **Implementation Technique:** CSS `@keyframes adora-planner-fade` in `globals.css` + `data-planner-enter` / `onAnimationEnd` on turn articles in `planner-workspace.tsx`.
14. **Priority & Package:** **P0** — **Package D**
15. **Verification Criteria:** All Section 8.5 assertions pass: `|scrollTop(t=0) - scrollTop(settled)| <= 1px`, `userBubble.top - log.top` in `[8, 16]px`, `reply.textContent` identical at `t=0ms` and `t=600ms`, `document.activeElement.id === "planner-prompt"` after welcome-card submit, and zero running animations after `history.back()`.

### `INV-18` — AI Planner Trip Preview Panel, Mobile Preview & Jumpbar
1. **ID:** `INV-18`
2. **Routes:** `/ai-planner`
3. **Component & File Path:** `PlannerWorkspace` (`apps/web/src/components/planner/planner-workspace.tsx:266–287, 417–441, 474–565`)
4. **Review Disposition:** **APPROVE WITH CHANGES** (`B-4`, `B-8`)
5. **Final Approved Effect:**
   - **Desktop Sidebar Preview (`[data-testid="trip-preview"]`, `xl:flex`):** Keyed by `preview.slug`; enters at `+80ms` delay over `200ms var(--adora-ease-ui)` (`opacity: 0 -> 1` + `translate3d(0, 6px, 0) -> none`, `animation-fill-mode: backwards`, `data-entered` latch).
   - **Mobile Stacked Preview (`[data-testid="trip-preview-mobile"]`, `xl:hidden`, inside `role="log"`):** Enters **together with the reply at `+80ms` delay** (`200ms var(--adora-ease-ui)`, **opacity-only `0 -> 1`, zero `transform`**).
   - **Mobile Jumpbar (`[data-testid="mobile-planner-jumpbar"]`, `xl:hidden`):** Enters with **opacity-only** (`0 -> 1`, `160ms var(--adora-ease-ui)`, zero height/vertical transform so `role="log"` height is invariant at `t = 0ms`).
   - **Jumpbar Button Click (`Phản hồi kịch bản` / `Xem trước`):** Reads `window.matchMedia("(prefers-reduced-motion: reduce)").matches` at click time and scrolls `role="log"` with `behavior: matches ? "auto" : "smooth"`.
6. **Trigger:** Scenario activation/switch (`activeScenarioId`) and jumpbar button clicks
7. **Duration:** `160ms` (jumpbar) / `200ms` at `+80ms` delay (desktop & mobile previews)
8. **Easing:** `var(--adora-ease-ui)`
9. **Transform / Opacity Rules:** Mobile jumpbar and mobile preview inside `role="log"` use **opacity-only (`transform: none`)**; desktop sidebar preview outside `role="log"` uses `opacity` + `6px` vertical settle.
10. **Responsive Behavior:** Desktop (`>= 1280px`) animates right sidebar; Mobile/Tablet (`< 1280px`) fades jumpbar + inline preview and supports smooth jumpbar scrolling.
11. **Reduced-Motion Behavior:** Instant fade (`0.01ms`); jumpbar scroll uses `behavior: "auto"`.
12. **Next.js `<Activity>` / Hydration Notes:** Uses `data-entered="true"` on `onAnimationEnd` so Back navigation from `/trips/[slug]` does not replay the preview entrance.
13. **Implementation Technique:** CSS `@keyframes adora-planner-fade` (mobile preview & jumpbar) and `@keyframes adora-panel-in` (desktop sidebar preview) + dynamic `matchMedia` check in `scrollToTarget`.
14. **Priority & Package:** **P0 (Fades)** / **P1 (Smooth Jumpbar Scroll)** — **Package D**
15. **Verification Criteria:** `mobileJumpbarVisible === true` and `mobilePreviewVisibleInLog === true` in `verify_web_0_3.mjs`; clicking `Xem trước` places mobile preview within `role="log"` (immediately under reduced motion, smoothly under normal motion).

### `INV-19` — `TripCard` Hover & `ItineraryExplorer` Day Panel Transition
1. **ID:** `INV-19`
2. **Routes:** `/trips`, `/trips/[slug]`
3. **Component & File Path:** `TripCard` (`apps/web/src/components/trips/trip-card.tsx`) & `ItineraryExplorer` (`apps/web/src/components/trips/itinerary-explorer.tsx:60–96`)
4. **Review Disposition:** **APPROVE WITH CHANGES** (`B-8`, §9.1) — **Sub-Proposals Rejected:** (1) `TripCard` does **not** add a separate `1.02 / 800ms` hover scale variant (reuses `.image-reveal` `1.025 / 1200ms`); (2) `key={day.day}` is placed on an **inner wrapper `<div>` inside `role="tabpanel"`**, keeping the outer `<div role="tabpanel" id={`day-panel-${day.day}`} data-testid="day-panel">` node stable and unkeyed.
5. **Final Approved Effect:**
   - `TripCard`: Border color transitions over `180ms var(--adora-ease-ui)` and image uses standard touch-guarded `.image-reveal`.
   - `ItineraryExplorer`: Clicking or arrow-keying a day tab transitions tab colors (`180ms var(--adora-ease-ui)`) while the inner wrapper `<div key={day.day} data-panel-enter>` inside `[data-testid="day-panel"]` runs a `220ms var(--adora-ease-ui)` entrance (`opacity: 0 -> 1`, `translate3d(0, 6px, 0) -> none`, `animation-fill-mode: backwards`, `data-entered` latch).
6. **Trigger:** Pointer hover on `TripCard`; click or `ArrowLeft`/`ArrowRight`/`Home`/`End` on `role="tab"`
7. **Duration:** `180ms` (tab & card border) / `220ms` (day panel inner wrapper)
8. **Easing:** `var(--adora-ease-ui)`
9. **Transform / Opacity Rules:** Outer `role="tabpanel"` has `transform: none`; inner keyed wrapper settles to `transform: none` via `animation-fill-mode: backwards`.
10. **Responsive Behavior:** Identical across desktop, tablet, and mobile.
11. **Reduced-Motion Behavior:** Instant panel swap (`0.01ms`).
12. **Next.js `<Activity>` / Hydration Notes:** `onAnimationEnd` sets `data-entered="true"` on the inner wrapper so `<Activity>` Back navigation never replays the active day panel entrance.
13. **Implementation Technique:** Keyed inner `<div>` inside `role="tabpanel"` + `@keyframes adora-panel-in` in `globals.css`.
14. **Priority & Package:** **P1** — **Package D**
15. **Verification Criteria:** `aria-selected`, keyboard focus on `role="tab"`, and `[data-testid="day-budget"]` update synchronously (`0ms` delay); `[data-testid="day-panel"]` DOM node reference remains stable across tab switches.

### `INV-20` — `ItineraryExplorer` Activity Accordion Disclosure
1. **ID:** `INV-20`
2. **Routes:** `/trips/[slug]`
3. **Component & File Path:** `ItineraryExplorer` (`apps/web/src/components/trips/itinerary-explorer.tsx:98–140`)
4. **Review Disposition:** **APPROVE WITH REQUIRED 3-LAYER STRUCTURE** (`B-5`, `B-8`)
5. **Final Approved Effect:** Toggling an activity disclosure button interpolates the 3-layer CSS Grid wrapper between `grid-rows-[0fr] opacity-0` (collapsed, `0px` height) and `grid-rows-[1fr] opacity-100` (expanded) over `240ms var(--adora-ease-ui)`, while rotating the `ChevronDown` icon `180deg`.
6. **Trigger:** Click / `Space` / `Enter` on `button[aria-controls="activity-..."]`
7. **Duration:** `240ms` (`var(--adora-duration-ui)`)
8. **Easing:** `var(--adora-ease-ui)`
9. **Transform / Opacity Rules:** Outer wrapper transitions `grid-template-rows` and `opacity`; middle `<div id={`activity-${activity.id}`} role="region" aria-label={activity.title} inert={!open} className="min-h-0 overflow-hidden">` clips to `0px`; inner `<div className="border-t border-[var(--adora-hairline)] px-4 py-5 sm:px-5">` holds padding and border (`B-5`). `ChevronDown` keeps Tailwind `rotate-180` (`rotate` property) with `duration-[240ms] ease-[var(--adora-ease-ui)]`.
10. **Responsive Behavior:** Identical across desktop, tablet, and mobile.
11. **Reduced-Motion Behavior:** Instant expand/collapse (`0.01ms`).
12. **Next.js `<Activity>` / Hydration Notes:** Always mounted in the active day panel; when switching days, the newly mounted day's first activity starts with `open === true` (`grid-rows-[1fr] opacity-100`), so no mount transition fires.
13. **Implementation Technique:** 3-layer CSS Grid `0fr <-> 1fr` disclosure with React 19 boolean `inert={!open}` (no redundant `aria-hidden`).
14. **Priority & Package:** **P1** — **Package D**
15. **Verification Criteria:** `aria-expanded` flips synchronously on click; collapsed outer wrapper `getBoundingClientRect().height <= 1`; collapsed `inert` region links cannot receive keyboard Tab focus; `aria-controls` target ID always exists in the DOM.

---

## F. Performance & Measurement Strategy (Reconciled `B-6`)

### F.1 Distinction Between Unmeasured Baseline Claims and Engineering Targets
In v1.0, Section I listed "Web Design 0.3 Verified Baseline" values for `CLS`, `LCP`, and `INP` that had not yet been instrumented in `verify_web_0_3.mjs` `[OBSERVED]`. Specification v1.1 corrects this (`B-6`):
1. **No Unmeasured Baseline Claims:** Baseline performance metrics at `c49595573f8b7214f414a589006b748d5d6babfb` are currently **unmeasured** (`[OBSERVED]`) and **must be collected first in Package A before any Web Design 0.4 source edits**.
2. **Hero LCP Hypothesis vs. Target:** Transform-only hero image settle (`opacity: 1` at `t = 0ms`) is designed to avoid paint delay, but because full-viewport GPU layer promotion under the `mix-blend-mode` grain overlay and mobile `h1` text entrances could influence LCP or frame pacing `[INFERRED]`, "zero LCP penalty" is stated as a **design target to be verified against the Package A baseline**, not a pre-assumed fact.

### F.2 Standardized CDP Measurement Protocol (No New Dependencies)
All performance evidence in Package A (baseline at `c495955`) and Package E (post-implementation verification) will be collected using the existing headless Chrome CDP architecture (`scripts/verify_web_0_3.mjs` pattern) against a production build (`pnpm --filter @adora/web build` + `next start`) with FastAPI offline `[RECOMMENDATION]`:
- **Viewports & Throttling:**
  - **Throttled Mobile (`390×844`, `mobile: true`, DPR `2`):** `Network.emulateNetworkConditions` (`150ms` RTT, `1.6 Mbps` download, `750 Kbps` upload) + `Emulation.setCPUThrottlingRate({ rate: 4 })`.
  - **Unthrottled Desktop (`1440×900`, `mobile: false`, DPR `1`).**
- **Sampling Discipline:** `5` cold runs per route (`Network.setCacheDisabled({ cacheDisabled: true })`), reporting the **median** across all 8 routes (`/`, `/destinations`, `/destinations/da-lat`, `/experiences`, `/experiences/ca-phe-nho-giot-cao-nguyen`, `/ai-planner`, `/trips`, `/trips/da-lat-3-ngay`).

| Metric | Web Design 0.3 Baseline (`c495955`) | Web Design 0.4 Engineering Target (`[RECOMMENDATION]`) | Collection Method (CDP + Web APIs) |
| :--- | :--- | :--- | :--- |
| **Largest Contentful Paint (`LCP`)** | *To be measured in Package A (`docs/reports/baseline_0_3_metrics.json`)* | Throttled mobile median `<= 2500ms`; delta vs. `0.3` baseline `<= +100ms`; **LCP element identity (`tagName`, `src`/text) unchanged**; hero `<img>` `opacity === "1"` at `t = 0ms` | `PerformanceObserver({ type: "largest-contentful-paint", buffered: true })` recording `startTime`, `size`, and element descriptor |
| **Cumulative Layout Shift (`CLS`)** | *To be measured in Package A* | `<= 0.02` per route across initial load + full-page scroll pass (with waits `>= 800ms` per scroll step); delta vs. baseline `<= +0.01` | `PerformanceObserver({ type: "layout-shift", buffered: true })` summing entries where `!entry.hadRecentInput` |
| **Interaction to Next Paint (`INP` Lab Proxy)** | *To be measured in Package A* | `<= 200ms` max interaction duration at `4×` CPU (`<= 100ms` unthrottled) across filter chips, planner prompt click, day tab switch, and accordion toggle | **Trusted CDP Input (`B-6`):** `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent` (never untrusted `el.click()`) + `PerformanceObserver({ type: "event", durationThreshold: 16, buffered: true })` |
| **Main-Thread Long Tasks** | *To be measured in Package A* | Zero new long tasks `> 50ms` attributable to motion code; total blocking time delta `<= +25ms` | `PerformanceObserver({ type: "longtask", buffered: true })` |
| **Animation Frame Stability** | N/A | Unthrottled `p95` frame delta `<= 20ms` during hero settle and reveals; zero frames `> 50ms` | In-page `requestAnimationFrame` timestamp delta sampler during animation windows |
| **Client JS Bundle Delta** | *To be measured in Package A* | `<= +2.0 KB` compressed script transfer per route; `git diff apps/web/package.json pnpm-lock.yaml` empty (`0` bytes) | Sum of `Network.loadingFinished` `encodedDataLength` for `ResourceType === "Script"` |
| **Post-Settle Animation & Layer Hygiene** | *To be measured in Package A* | After scroll pass + `4.5s`, `document.getAnimations()` is `0`; zero elements have computed `will-change !== "auto"` | `document.getAnimations()` + full-DOM computed style scan |
| **Settled Evidence Screenshots** | 16 static screenshots in Web Design 0.3 | Capture **only after** scroll pass → `await Promise.all(document.getAnimations().map(a => a.finished))` → assert `querySelectorAll('[data-reveal="pending"]').length === 0`; plus a reduced-motion comparison set | Deterministic post-settle capture in `scripts/verify_web_0_4.mjs` |

---

## G. Reconciled 5-Package Implementation Plan & Execution Order

Per Section 14 of `WEB_DESIGN_0_4_CLAUDE_ARCHITECTURE_REVIEW.md`, the implementation order is revised to **`Package A → Package B → Package D → Package C → Package E`** `[RECOMMENDATION]`.
- **Why Package D Precedes Package C:** Package D (`/ai-planner` and `/trips/[slug]`) carries the highest regression sensitivity against verified Web Design 0.3 scroll-anchoring and keyboard ARIA contracts and represents ADORA's core interactive demo flow. Completing and verifying Package D immediately after the Homepage (Package B) ensures the critical graduation-demo path (`/` → `/ai-planner` → `/trips/da-lat-3-ngay`) is locked in before applying repetitive Discovery reveals across `/destinations*` and `/experiences*` (Package C).

### Global Gate `G0` (Mandatory After Every Package)
Every package (`A`, `B`, `D`, `C`, `E`) must pass all five `G0` checks before creating its Git checkpoint:
1. `pnpm --filter @adora/web lint` (`exit 0` — including `react-hooks/set-state-in-effect`).
2. `pnpm --filter @adora/web typecheck` (`exit 0`).
3. `pnpm --filter @adora/web test` (`exit 0`).
4. `pnpm --filter @adora/web build` (`exit 0`).
5. `node scripts/verify_web_0_3.mjs` and `node scripts/verify_homepage.mjs` pass (`exit 0`) **without weakening or modifying any existing Web Design 0.2/0.3 assertions**, and `git diff apps/web/package.json pnpm-lock.yaml` is empty.

---

### Package A — Foundation, Baseline Capture, Tokens, `<Reveal>` & Pilot (`BrandPhilosophy`)
- **Step A.1 (Pre-Code Baseline at `c495955`):** Before editing any file in `apps/web`, run the Section F.2 baseline collector against `c49595573f8b7214f414a589006b748d5d6babfb` and record the baseline metrics (`LCP`, `CLS`, trusted-input `INP`, `longtask`, script bytes per route) in `docs/reports/baseline_0_3_metrics.json`.
- **Step A.2 (`apps/web/src/app/globals.css`):** Add the reconciled Section B tokens (`--adora-duration-*`, `--adora-ease-editorial`, `--adora-ease-ui`, `--adora-ease-ambient`, `--adora-distance-*`, `--adora-scale-*`, `--adora-stagger-*`, `--adora-stagger-cap`), the `@media (prefers-reduced-motion: no-preference)` `[data-reveal]` transition rules, `:focus-within` and `@media print` fail-visible rules, `html[data-motion="off"]` kill switch, and `@media (hover: hover) and (pointer: fine)` touch hover guard (`INV-15` P0).
- **Step A.3 (`apps/web/src/components/ui/reveal.tsx`):** Implement the lint-safe, zero-`useState`, polymorphic `<Reveal>` client leaf with the first-IO-callback `100%` fold check, `1500ms` pre-callback watchdog, and post-pending passive scroll/resize/visibility listener fallback.
- **Step A.4 (Pilot Integration — `INV-06`):** Wrap the three content blocks of `apps/web/src/components/home/brand-philosophy.tsx` in `<Reveal>`.
- **Package A Specific Acceptance Gates:**
  - `docs/reports/baseline_0_3_metrics.json` captured and committed.
  - Raw SSR HTML (`fetch("http://127.0.0.1:3100/")`) contains zero `data-reveal="pending"` attributes.
  - With JavaScript disabled (`Emulation.setScriptExecutionDisabled(true)`), `#philosophy` has `opacity === "1"`.
  - Under emulated `prefers-reduced-motion: reduce` (both pre-navigation and toggled at runtime) and under `document.documentElement.dataset.motion = "off"`, `#philosophy` has `opacity === "1"` and `transform === "none"`.
  - Direct navigation to `http://127.0.0.1:3100/#philosophy` reveals `#philosophy` immediately without flashing to `opacity: 0`.
  - Tabbing into a `data-reveal="pending"` element immediately resolves its computed `opacity` to `"1"` (`:focus-within`).
  - `next dev` (React 19 Strict Mode double-effect invocation) leaves zero elements stuck in `data-reveal="pending"` after scrolling.

---

### Package B — Homepage Cinematic & Editorial Choreography (`/`)
- **Scope:** Implement `INV-03` (Hero image settle), `INV-04` (Hero typography/CTA rise), `INV-05` (`O-3` 2-iteration scroll line bound), `INV-07` (`DestinationStory` reveal inside `<Suspense>`), `INV-08` (`ExperienceStory` with `<Reveal as="li">` and `lg:translate-y-10` preservation), `INV-09` (`AiPlannerSection` with disclosure exemption), `INV-10` (`HowItWorks` with `<Reveal as="li">`), and `INV-11` (`SiteFooter` inner CTA reveal).
- **Package B Specific Acceptance Gates:**
  - Global Gate `G0` passes.
  - Hero `<Image preload>` computed `opacity === "1"` at `t = 0ms`; LCP element identity on `/` at `390×844` and `1440×900` is unchanged vs. Package A baseline; `CLS <= 0.02`.
  - After a full-page scroll pass and animation settle, every homepage section and card has `opacity === "1"` and `transform === "none"` (except `ExperienceStory` right column which retains its Tailwind `translate` offset).
  - Full-bleed dark/ivory sections (`AiPlannerSection`, `HowItWorks`, `SiteFooter`) never fade their `<section>`/`<footer>` background.
  - Pricing disclaimer in `ExperienceStory` and demo notice in `AiPlannerSection` remain at `opacity === "1"` whenever their section header is visible.

---

### Package D — Application Interactions (`/ai-planner`, `/trips`, `/trips/[slug]`)
- **Scope:** Implement `INV-17` (opacity-only user bubble & reply entrance with `data-entered` Activity latch), `INV-18` (desktop preview settle, opacity-only mobile preview & jumpbar, dynamic reduced-motion smooth scroll), `P-6` / `O-5` welcome suggestion focus fix (`#planner-prompt`), `INV-19` (`TripCard` border transition & `ItineraryExplorer` inner-wrapper day panel entrance), and `INV-20` (3-layer CSS Grid `0fr <-> 1fr` activity accordion with `inert={!open}`).
- **Package D Specific Acceptance Gates:**
  - Global Gate `G0` passes.
  - All 9 Section 8.5 `/ai-planner` regression assertions pass at `1440×900` and `390×844` under both normal and reduced motion:
    1. All Web Design 0.3 planner geometry checks pass unchanged.
    2. Scroll stability: `|log.scrollTop(t=0) - log.scrollTop(settled)| <= 1px`.
    3. Anchor offset: settled `userBubble.top - log.top` is within `[8, 16]px`.
    4. Atomic non-streaming insert: reply `textContent` at `t=0ms` equals `t=600ms`; `DemoLabel` present at `t=0ms`; zero `aria-busy` or external AI calls.
    5. Live-region count `[aria-live]` unchanged from Web Design 0.3.
    6. `<Activity>` Back-navigation replay check: click `/trips/da-lat-3-ngay` CTA → `history.back()` → zero running animations in `role="log"` and `scrollTop` unchanged.
    7. Mobile jumpbar `Xem trước` scrolls mobile preview into `role="log"` (instantly under reduced motion).
    8. Conversation reset restores `trip-preview-empty` and focuses `#planner-prompt`.
    9. Welcome suggestion card click leaves `document.activeElement.id === "planner-prompt"` (`P-6` fix).
  - `/trips/da-lat-3-ngay` assertions:
    - Clicking or arrow-keying Day 1 / Day 2 / Day 3 updates `aria-selected="true"`, focus, and `[data-testid="day-budget"]` synchronously (`0ms`), while `[data-testid="day-panel"]` element identity remains stable.
    - Activity accordion: `aria-expanded` toggles synchronously; collapsed outer grid height `<= 1px`; collapsed links inside `inert` region are not keyboard-tabbable.

---

### Package C — Discovery Experience (`/destinations*`, `/experiences*`)
- **Scope:** Implement `INV-12` (`PageIntro` load entrance), `INV-13` (`/destinations` featured image settle with static paper card), `INV-14` (`DestinationBrowser` & `ExperienceBrowser` chip-keyed `0.5 -> 1` opacity settle excluding search query), `INV-15` (`ExperienceCard` keyboard `:focus-visible` parity), and `INV-16` (detail page hero settles and scoped `<Reveal>` chapters with opt-in `ExperienceGrid reveal={true}` and pricing disclosure exemption). Optionally include `INV-01` (`SiteHeader` desktop underline) here if time permits.
- **Package C Specific Acceptance Gates:**
  - Global Gate `G0` passes.
  - Clicking filter chips on `/destinations` and `/experiences` updates `destination-count` and `experience-count` synchronously, keeps focus on the clicked chip, and preserves `window.scrollY`.
  - Typing into `#destination-search` triggers zero animation on `[data-testid="destination-results"]`.
  - On `/destinations/da-lat` and `/experiences/ca-phe-nho-giot-cao-nguyen`, hero `<Image preload>` has `opacity === "1"` at `t = 0ms`, and the pricing disclosure on `/experiences/[slug]` has zero standalone reveal delay.

---

### Package E — Comprehensive Browser QA, Performance Comparison & Closure Report
- **Scope:** Author `scripts/verify_web_0_4.mjs` (zero new dependencies, CDP headless Chrome) executing the 48-check 8-route × 6-viewport geometry matrix, all Package A/B/D/C functional and `<Activity>` assertions, the Section F.2 performance measurement comparison against `docs/reports/baseline_0_3_metrics.json`, settled + reduced-motion screenshot sets, and author `docs/reports/WEB_DESIGN_0_4_MOTION_IMPLEMENTATION_REPORT.md`.
- **Package E Specific Acceptance Gates:**
  - Global Gate `G0` + `node scripts/verify_web_0_4.mjs` pass (`exit 0`).
  - All 48 route × viewport checks report `scrollWidth === innerWidth` and `CLS <= 0.02`.
  - Final report presents **Design Targets** and **Measured Results (vs. `c495955` Baseline)** in separate columns with zero unmeasured claims.
