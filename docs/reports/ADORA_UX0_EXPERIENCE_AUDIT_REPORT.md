# ADORA UX-0 — Experience Audit Report

Date: 2026-11-21 (Asia/Bangkok). Scope: source/browser audit and four design documents only.
Verdict: **creative direction ready for approval; UX-1/UX-2A not implemented**.

## Git and scope baseline

- Repository: `F:\Coding\Adora System Mega Project\adora-system`.
- Branch: `main`; initial and final HEAD: `54cab5bc5d04af4ec790493d725baf4d140483b7`.
- Origin: `https://github.com/BillNotAGamer/adora-system.git`; no remote mutation or push.
- Initial status: only `?? docs/reports/assets/web-design-0-4.zip`. No partial uncommitted Phase 1B source was found. Phase 1B remains paused.
- Protected ZIP SHA-256: `3D658B9DF1A2D4EE73EFD6EF868A8DA82807BCAB4994E4226E870EC7DAF1CF3D`; preserved, not staged.
- Root and `apps/web/AGENTS.md` were read. Existing architecture, security and motion constraints remain authoritative.

## Inspected implementation and authoritative evidence

| Area | Exact source / evidence | Finding |
| --- | --- | --- |
| Root ownership | `apps/web/src/app/layout.tsx`, `components/providers.tsx` | Vietnamese font subsets, skip link, React Query provider; no root conversation state |
| Navigation | `components/layout/site-header.tsx`, `site-footer.tsx`, `site-shell.tsx`; discovery/trip links | Desktop/mobile route links; header local menu state; no global modal, header not sticky |
| Homepage | `app/page.tsx`; all six files in `components/home/` plus footer | Hero, Philosophy, Destination, Experience, AI introduction, process, closing/footer in that order |
| Catalog boundary | `lib/catalog.ts`, homepage Suspense/connection boundary | Validated optional transport with coherent editorial units; offline mode remains honest |
| Planner | `app/ai-planner/page.tsx`, `components/planner/planner-workspace.tsx`, `lib/demo/{planner-scenarios,trips,types,text}.ts` | Exact-match deterministic scenarios, local transcript/draft, polite log, authored itinerary previews; no live model/persistence |
| Motion | `components/ui/reveal.tsx`, `app/globals.css`; motion attributes in hero/home/planner | Visible SSR baseline; per-instance setup and shared guards; finite entrance motion; no scene-progress orchestration |
| Verification | `scripts/verify_homepage.mjs`, `verify_web_0_3.mjs`, `verify_web_0_4.mjs`, `collect_web_motion_metrics.mjs` | Existing production browser contracts, Activity/motion/accessibility assertions and immutable metrics definitions |
| Design/hardening | `docs/reports/WEB_DESIGN_0_4_SPEC_V1_1_FINAL_APPROVAL.md`, `WEB_DESIGN_0_4_PACKAGE_E_FINAL_QA_REPORT.md`, `POST_0_4_H1_ACCESSIBILITY_HARDENING_REPORT.md`, H2/H3 reports and Package E comparison/verification JSON, A0 metrics | Preserve approved motion families and accessibility fixes. Historical evidence is not a new UX-0 performance result |

Component/lib/app paths without a prefix in the table are relative to `apps/web/src/`. `package.json` confirms Next 16.4.3, React/React DOM 19.3.0; current dependencies contain no dialog/GSAP library. Do not add one based only on the desired visual ambition.

H2 motion-runtime ablations were inconclusive, so there is no evidence-backed reason to refactor Reveal or remove hero settle/grain. H3 retained the original destination image: the evaluated candidate reduced the relevant response by only 1.69%, with reported median LCP changes of -24/-18ms. These are historical report findings, not repeated measurements. No image/motion modification was made for UX-0.

## Browser audit methodology and actual results

Production build command: `corepack pnpm@12.16.1 --filter @adora/web build`. First execution compiled/generated routes but exited 1 on a security-upgrade advisory. One unchanged retry exited 0 and generated 20 routes; the advisory was still printed. This task neither verified a specific CVE nor upgraded dependencies. Treat framework security triage as a separate maintenance decision before public deployment, not as a reason to alter UX-0 scope.

Started the existing Next production server on `127.0.0.1:3100`, FastAPI offline. Environment: Windows, Node 24.19.0, pnpm 12.16.1, installed Chrome 157.0.8103.79, viewport emulation at DPR1; no performance CPU/network throttling was applied. Used an external copy of `scripts/verify_homepage.mjs`, retaining its assertions and adding only six-width full-page capture plus visible direct-child section geometry. Original verifier and tracked evidence remained unchanged.

External scratch: `F:\Coding\Adora System Mega Project\adora-ux0-scratch-20261121`.

Reproduction after starting the production server, from the repository root:

```powershell
$env:ADORA_VERIFY_OUTPUT = 'F:\Coding\Adora System Mega Project\adora-ux0-scratch-20261121\captures'
node '..\adora-ux0-scratch-20261121\audit.mjs'
```

Scratch `audit.mjs` enables screenshots on all existing configured viewports and records `checkVisibility()`-filtered `main > section, main > footer` geometry. It uses the original font/image waits, stepped scrolling, navigation and accessibility checks. `audit.log` is the complete run log; `measurements.json` is extracted JSON. The script exited **0**. Captures and logs remain external, not portable repository evidence or committed assets.

| Viewport | Document width | Hero / full capture prefix | Visible section heights in actual order (px) | Runtime exceptions |
| --- | --- | --- | --- | --- |
| 360×800 | 360 | `360` | 752 / 735 / 1040 / 1106 / 1223 / 1370 / 658 | 0 |
| 390×844 | 390 | `mobile` | 752 / 735 / 1077 / 1101 / 1147 / 1342 / 658 | 0 |
| 768×1024 | 768 | `768` | 832 / 759 / 1530 / 1432 / 1099 / 979 / 650 | 0 |
| 1024×900 | 1024 | `1024` | 900 / 646 / 843 / 943 / 714 / 863 / 482 | 0 |
| 1440×900 | 1440 | `desktop` | 900 / 721 / 1101 / 1042 / 922 / 990 / 527 | 0 |
| 1920×1080 | 1920 | `1920` | 1080 / 825 / 1092 / 1227 / 1006 / 1063 / 550 | 0 |

Each prefix has `-hero.png` and `-full-page.png` under scratch `captures/`. `six-width-contact.png` arranges 360/390/768 above 1024/1440/1920. Desktop and mobile full-page images were visually inspected separately; the contact sheet was reviewed for all six compositions. Scroll traversal was automated in increments of approximately 0.8 viewport height (minimum 500px), with short dwell intervals; this is actual scroll execution, not a frame-by-frame video critique. No continuous video was recorded.

All six profiles: one visible H1/main, all three homepage images loaded, editorial offline fallback visible, no commercial claims detected, no horizontal overflow. Homepage, destinations and Planner status checks returned 200. Desktop navigation reached `/ai-planner` with one visible H1 and demo disclosure; mobile menu keyboard checks reached `/destinations` and closed the menu. This run does not separately prove mobile Planner navigation. At 390px the skip link/focus outline/mobile-menu checks and reduced-motion override passed. No new comprehensive screen-reader or manual touch-device test was executed.

## UX findings

### Continuity

The existing composition is visually credible: strong hero crop, carefully weighted serif typography, forest/coffee imagery, quiet rules and coherent ink/paper palette. The gap is between scenes: the hero ends at a sharp paper edge, the same Reveal language restarts independently, and the dark Planner band arrives as another autonomous section. There is no persistent narrative marker or shared progress owner. Mobile stacking amplifies the stop/start feeling; the 768px forest scene already spans about 1.5 viewport heights.

Do not interpret these findings as permission to shorten every section or animate every boundary. The recommended signature is the Hero→Philosophy Mist-to-Paper handoff, with quieter frame/rule continuity thereafter. Keep actual section order. The visible mobile AI radial field is an existing background treatment, not a new UX-0 defect fix.

### Concierge and accessibility

The current Planner has honest sample content and useful focus/IME/log conventions, but it is not globally accessible as a conversation state. There is no mounted global modal/portal primitive to reuse. A root reducer plus native dialog is the smallest proposed ownership change; the route remains an expanded fallback. A future dialog needs explicit tested focus return, inert background, scroll lock, native Back handling and mobile keyboard behavior. None of these future capabilities is represented as implemented or passed.

Retain H1's filter-reset focus fix, stable itinerary tabpanel association and decorative accessibility exclusions. Retain Activity cleanup, visible SSR content, reduced-motion/off/print behavior, finite animation and no hidden-content deadlocks. Existing Chrome tests do not certify VoiceOver, NVDA, mobile Safari or physical keyboard/IME behavior across devices.

### Performance risks

Package E documented existing mobile TBT/bundle deltas and destination LCP around three seconds; do not overwrite that history with a blanket performance PASS. Shared decorative layers can add repaint/compositing pressure even when animated with transforms. Duplicate hero image discovery, new sticky containing blocks, modal hydration on every page and simultaneous active chat hosts are specific risks. H2 did not isolate observer causation. No UX-0 LCP/TBT/LongTask benchmark was run, and no Lighthouse score is asserted.

## Research limitations

Direct pages inspected: [Snami Travel](https://www.snamitravel.com/) and [Bruno Simon](https://bruno-simon.com/). These support content/spatial principles described in the creative direction, not claims of observed scroll timings. [The Boat](https://www.sbs.com.au/theboat/) exposed insufficient interactive content through extraction, and its Awwwards page timed out. No third-party image, source code or exact animation sequence was imported. Reference replay remains a creative-review opportunity rather than an invented observation.

Native modal and scroll-timeline recommendations are grounded in [MDN dialog documentation](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal), [WAI modal guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and [MDN scroll-driven animation documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations). Individual browser behavior and performance still require prototype testing.

## Recommended sequence and approval decisions

1. **UX-1:** approve shared dialog/expanded route, memory-only lifetime, no modal history entry, floating eligibility and truthful two-sample flow; implement/test only after approval.
2. **UX-2A:** approve and prototype one Hero→Philosophy transition. Feature-detected CSS first; no Reveal refactor or dependency by default. Matched production measurements determine go/no-go.
3. **UX-2B:** extend only approved quiet motifs across existing scenes after the prototype succeeds. Preserve Catalog Suspense and mobile reading order.
4. **UX-3:** integrated visual, accessibility, Activity, real-device and performance QA. Update intended trigger behavior in tests while retaining fallback-route and safety invariants.

Owner decisions: concept and choreography; standalone-route behavior; supported browser/device matrix; in-memory draft/reset policy; optional question/privacy wording; floating exclusions; script sample limits; proposed bundle/LCP/TBT thresholds. No backend or persistent data decision is required to approve the UX prototype.

## Deliverables and final repository scope

Created only:

- `docs/design/ADORA_EXPERIENCE_EVOLUTION_UX0_CREATIVE_DIRECTION.md`
- `docs/design/ADORA_AI_CONCIERGE_UX_SPEC_V1.md`
- `docs/design/ADORA_HOMEPAGE_CINEMATIC_STORYBOARD_V1.md`
- `docs/reports/ADORA_UX0_EXPERIENCE_AUDIT_REPORT.md`

Verified final `git status --short -uall`:

```text
?? docs/design/ADORA_AI_CONCIERGE_UX_SPEC_V1.md
?? docs/design/ADORA_EXPERIENCE_EVOLUTION_UX0_CREATIVE_DIRECTION.md
?? docs/design/ADORA_HOMEPAGE_CINEMATIC_STORYBOARD_V1.md
?? docs/reports/ADORA_UX0_EXPERIENCE_AUDIT_REPORT.md
?? docs/reports/assets/web-design-0-4.zip
```

No production source, API/client, CSS, dependency, migration, historical report, collector or historical screenshot changes. No staging, commit or push. Build output is ignored; audit evidence stays in external scratch. Final checks confirmed unchanged HEAD and ZIP checksum, no tracked diff, no whitespace errors from `git diff --check`, and only the main worktree. Because the four documents are untracked, they were also checked directly: no trailing whitespace and balanced code fences in all four. The audit-owned production server was stopped; a bounded connection check returned `ECONNREFUSED` on port 3100. This checkpoint specifies future work; it does not implement the new UX or resume Phase 1B.
