# ADORA UX-1 — Global Travel Concierge Implementation

Date: 2026-11-22 (Asia/Bangkok). Scope: scripted frontend Concierge only; Product Phase 1B remains paused.

## Repository and documentation checkpoint

Started on `main` at `54cab5bc5d04af4ec790493d725baf4d140483b7`. Only the four reviewed UX-0 documents and protected archive were untracked. Reviewed those documents and selectively committed them, unchanged, as `14749b380172b417274c071358b988afb87592aa` (`docs(ux): approve adora experience evolution ux0 direction`). No archive, source or unrelated files entered that commit.

Origin remains `https://github.com/BillNotAGamer/adora-system.git`. No push, global Git configuration change, backend operation or database access was performed.

## Implementation inventory

All frontend paths below are relative to `apps/web/src/`.

| Files | Change |
| --- | --- |
| `lib/concierge/state.ts`, `state.test.ts` | Typed pure reducer; survey answers/stage/editing, stable transcript IDs, free-text notes, shared draft, scenario and preview panel; six focused unit tests |
| `components/concierge/concierge-provider.tsx` | One root-owned in-memory conversation, separate focus/scroll refs and modal/menu ownership; navigation cleanup; on-demand import with status/fallback link |
| `components/concierge/concierge-trigger.tsx` | Enhanced `/ai-planner` link, modifier/target/download/defaultPrevented guards; disables unnecessary route prefetch; normal activation opens shared experience |
| `components/concierge/concierge-floating-trigger.tsx` | Public-route eligibility; suppresses around visible inline CTAs/footer/hero CTA, focused inputs, viewport keyboard contraction, menu/modal and standalone route; observer cleanup and missing-IO fallback |
| `components/concierge/concierge-dialog.tsx` | Native modal, explicit keyboard boundary, focus/scroll ownership, survey/log/composer and existing sample trip imagery/timeline/budgets |
| `components/concierge/concierge-survey.tsx`, `concierge.css` | Progressive optional questions, multi-select moods, summary/edit, confirmation/reset, responsive ink/paper composition and scoped motion |
| `app/providers.tsx` | Actual stable provider boundary; adds Concierge inside existing QueryClient provider. UX-0's suggested `components/providers.tsx` path was corrected to this real location |
| `components/planner/planner-workspace.tsx` | Existing expanded presentation now reads/writes the same reducer; retains scenario/focus/log/motion structure; adds guided-discovery details and confirmed reset |
| `components/layout/site-header.tsx` | Desktop/mobile triggers preserve styling; shared mobile-menu eligibility; closes menu on activation |
| `components/home/{editorial-hero,ai-planner-section}.tsx`, `components/layout/site-footer.tsx`, `components/discovery/planner-cta.tsx`, `app/trips/{page,[slug]/page}.tsx` | Enhances inspected customer CTA links without changing cinematic markup/animation settings |
| `scripts/verify_concierge.mjs` | Six-width production CDP verifier, derived from existing browser conventions; new interaction/measurement assertions |
| Three existing browser verifiers | Preserve standalone coverage through explicit dialog expansion; reset tests explicitly confirm deletion. Other assertions retained |

The legacy `site-shell.tsx` link remains ordinary navigation. No blanket replacement of every `/ai-planner` occurrence was performed. Destination/experience pages use the shared discovery CTA. Footer navigation retains the same URL fallback while using the shared activation behavior.

## State and host lifecycle

Conversation state lives in a root `useReducer`, not a module singleton or browser storage. Closing/reopening and SPA navigation retain answers, transcript, draft and sample selection; reload/new tab resets them. DOM origin and transcript scroll position live in separate refs. The dialog is imported only on first activation and retained as a component reference for subsequent opens; its presentation unmounts on close without resetting the engine.

`/ai-planner` remains the expanded workspace with its previous route metadata/H1 and authored scenario presentation. On that route, Concierge activation focuses the existing composer rather than creating a modal. Activity-retained page DOM remains mounted so entrance latches survive Back restoration; inactive workspace markup has `aria-hidden`, and browser assertions scope to visible trees. The old independent message/draft/scenario state was removed, not duplicated.

Opening creates no history entry. Path changes, popstate, hash changes and actual link actions dismiss the modal; navigation is not monkeypatched. The explicit expansion action releases its lock and uses the ordinary Next link. Back performs navigation, not same-page modal dismissal.

## Accessibility and responsive behavior

The native dialog has an accessible title, heading initial focus (no automatic soft keyboard), inert background, explicit Close and Escape cancellation. Tab/Shift+Tab are bounded to visible controls. Backdrop dismissal requires both pointer endpoints on the backdrop. Scroll locking restores the prior root overflow value and does not reset document scroll position. Focus returns to a connected visible origin, otherwise an available page/header focus target. No inert attribute is placed on a dialog ancestor.

Panel switching explicitly hands focus to the itinerary heading or conversation title. Explicit survey advancement/edit/review focuses its new heading; chips alone do not move focus. Questions do not have a second live region, avoiding competing focus/live announcements; the conversation remains the single polite log. Hidden-panel scroll events cannot overwrite the saved chat position. The expanded survey is capped at 45dvh so its composer stays accessible. Print hides the overlay and temporarily releases root overflow through a print-only rule. The header and floating trigger use one menu-open flag, preventing stale local menu state after Activity navigation. Removed-trigger fallback excludes hidden Activity trees and prefers a newly available floating entry.

Desktop uses a bounded 1200px 60/40 conversation/preview composition. Tablet uses one active conversation column and explicit itinerary access. Mobile uses `100dvh`, safe-area padding, a reachable close control and separate conversation/itinerary panels. Composer uses 16px text, multiline input, Enter send, Shift+Enter newline and an IME composition guard. Whitespace is ignored; the reducer rejects more than 2000 characters. No artificial typing/streaming/model-thinking state exists.

Dialog motion is a finite 240ms opacity/maximum 6px entrance; mobile is opacity-only. Reduced motion, motion-off and print are handled by scoped rules. No new animation loop runs when closed. Existing hero settle, grain, Reveal, trip interactions and historical motion settings were not changed.

Actual screen-reader use, iOS Safari/Android virtual keyboards and physical-device touch performance are **not verified**. Desktop mobile emulation is not evidence of an OS keyboard. Screenshots show the composer under emulated viewport constraints only.

## Guided demo and itinerary integrity

Questions cover mood (up to three choices), party, destination, duration, timing, budget, travel style and optional access needs. All allow skipping; users can review early, edit one answer and confirm a sample proposal. No gender, birth date or diagnosis is required. Summary labels distinguish preferences and uninterpreted notes.

Exact authored prompts map to the existing two-/three-day Đà Lạt scenarios. Unsupported text is retained as a note with a limitation, never represented as understood by an AI. Scenario selection is explicit after review. Refinement can switch supported samples or edit preferences; it does not invent a changed plan for an unsupported budget/destination/access requirement.

Preview uses the existing `TRIPS` photograph, day periods/activities, pace, notes and integer VND day budgets. Total is the sum of authored day budgets. Missing per-category prices, hotel/transport availability and live quotations are explicitly absent. Existing trip/destination URLs remain usable. Persistent demo disclosure distinguishes this from generated or saved itineraries.

## Verification ledger

Commands use Node 24.19.0, pnpm 12.16.1, Next 16.4.3 and installed Chrome 157.0.8103.79. FastAPI remained offline. Browser outputs use `ADORA_VERIFY_OUTPUT` under `F:\Coding\Adora System Mega Project\adora-ux1-scratch`; historical screenshots were not overwritten.

| Gate / command | Result |
| --- | --- |
| `corepack pnpm@12.16.1 --filter @adora/web test` | 40 tests passed, 0 failed (34 existing plus 6 reducer tests) |
| `corepack pnpm@12.16.1 --filter @adora/web lint` | Passed after correcting ref naming for React immutability lint |
| `corepack pnpm@12.16.1 --filter @adora/web typecheck` | Passed |
| `corepack pnpm@12.16.1 --filter @adora/web build` | Passed; 20 routes generated |
| `node scripts/verify_web_0_3.mjs` | Passed; native exit 0 on final build, all six viewports and existing discovery/Planner/trip checks |
| `node scripts/verify_homepage.mjs` | Passed; native exit 0 on final build, six widths and explicit Concierge expansion to preserved route |
| `node scripts/verify_web_0_4.mjs` | Passed; native exit 0 on completed production build; A/B/C/D/E and all four H1 profiles true |
| `node scripts/verify_concierge.mjs` | Passed; native exit 0, all six widths, including Forward, floating state, reverse Tab, inert background and IME/Enter checks |

Supplemental six-width Concierge run with console/network monitoring and 15-second CDP command bounds also exited 0, with zero errors. The 390px next-dev run exited 0 after warming the route. An external native-method probe confirmed Strict Mode's actual first-open sequence: `showModal=2`, `close=1`, one open dialog with title focus; after Escape, `close=2`, zero dialogs, restored overflow and original-trigger focus. The development server's first start stopped on the existing framework advisory; an unchanged retry succeeded. No framework upgrade was made.

Early diagnostic runs are not counted as passes: first Concierge run exposed Tab escaping; first complete Web 0.4 run failed on missing-IO handling, a persistent window resize listener and Planner Activity latches. Those defects were corrected in Concierge/Planner code without changing Reveal or relaxing its lifecycle assertions. A subsequent diagnostic motion run was interrupted to rebuild after lazy-loading fixes; it is not reported as PASS.

An intermediate motion run passed A/B/C/E and H1 but D correctly rejected an additional question live region. The completed design uses explicit question-heading focus instead. The original exactly-one-live-region assertion is retained and strengthened with one-conversation-log and zero-question-live-region checks. No duplicate announcement exception was left in the final contract. A transient Chrome `ERR_NO_BUFFER_SPACE` font request also failed one diagnostic run; it was not suppressed or counted as a pass. Following the corrections, all browser gates were run sequentially against the completed build and exited 0, including the complete motion/H1 suite.

PowerShell redirected stderr progress messages produced misleading wrapper statuses in an early Web 0.3 run. Its complete JSON was checked against all four original failure predicates (all false). Final runs use explicit `exit $LASTEXITCODE` so native exit status is retained.

## Performance measurements and limits

The first on-demand implementation used a React lazy boundary and route prefetching. Six unthrottled emulated widths measured approximately 311–326ms from activation mark to the dialog's first animation frame, with 191260/196110 initial encoded JS bytes and 11143 additional bytes after open. Removing route prefetch and avoiding the suspense minimum reveal delay reduced the measured first-frame interval to **11.2–17.2ms** on the subsequent run.

Final measured initial encoded JS: **172754 bytes** at 360/390/768px; **177604 bytes** at 1024/1440/1920px. Additional encoded JS after first open: **29022 bytes**, including newly requested shared/framework code. The raw additional total is **28.34KiB**, above the proposed 25KiB lazy target if conservatively counting all requested code; no unverified framework subtraction is used to claim compliance. Final first-rAF intervals across the six widths were **17.3 / 10.8 / 11.4 / 18.4 / 16.2 / 15.5ms**, respectively.

An isolated pre-UX-1 control was built from `14749b3` using existing dependency junctions, with a scratch-only expanded Turbopack resolution root required for those junctions. pnpm initially rejected a symbolic task-state directory; direct Next execution resolved that. Google Fonts required network access; a one-time framework security advisory stopped a completed build, and an unchanged retry succeeded. No dependency upgrade was performed. The control produced **158775 encoded JS bytes** in a default browser viewport. Because its viewport/resolution-root conditions differ, the apparent delta is **exploratory, not a validated <=8KiB initial-budget result**. A strictly matched bundle budget comparison remains required.

A second control resolved that limitation: installed the unchanged frozen lockfile **offline**, reusing 843 packages with zero downloads, in a disposable worktree at the same commit. Built the existing API-client prerequisite and web with the original Next configuration. At matched 390×844 and 1440×900, DPR1, document-complete plus 700ms observation, the control transferred **186012 / 192268 bytes** of initial JS; final UX-1 transferred **172754 / 177604 bytes**. Deltas are **-13258 / -14664 bytes** (-12.95 / -14.32KiB), within the proposed <=8KiB additional-initial-JS budget. These totals include automatic route prefetch during the observation window; suppressing unnecessary Planner prefetch is an intentional delivery change, not removal of required UI. One sample per matched size; this is bundle-transfer accounting, not latency statistics. Both control servers and worktrees were removed after recording results. Windows ownership/long-path cleanup required elevated Node filesystem removal of the verified task-owned directory only.

Measurements are browser Resource Timing `encodedBodySize` totals for JS resources and explicit activation/first-rAF marks. They are **not trusted Event Timing interaction-to-next-paint, field INP, throttled mobile certification or repeated cold-run statistics**. Buffered LongTask entries are retained in raw JSON, including pre-open work; they are not silently converted to an open-only TBT value. No LCP improvement or new motion-performance guarantee is claimed.

The safe optimizations evaluated here are prefetch suppression and direct on-demand module loading. Remaining initial/lazy budget work needs source-map/chunk attribution and matched profiling; removing lifecycle/accessibility safeguards to meet a byte target is not acceptable.

The deferred payload contains the conversation renderer, shared survey, authored trip fixtures and image client code. Disabling route prefetch intentionally moves previously prefetched code into the first-open measurement window; it does not eliminate that code. No source-map-level subtraction of shared framework bytes was performed. The conservative lazy target remains an explicit limitation, not a performance PASS. Future integrated QA should collect trusted Event Timing under an agreed throttling profile and review real-device opening behavior.

## Evidence and remaining limitations

External scratch preserves complete logs, six-width welcome/preview/itinerary screenshots and `results.json`. Compact committed-scope evidence is under `docs/reports/assets/ux-1/`: `desktop-welcome.png`, `desktop-preview.png`, `mobile-welcome.png`, `mobile-preview.png`, `mobile-itinerary.png`, `verification-results.json`, `performance.json` and `regression-summary.json`. Desktop welcome/preview and mobile welcome/itinerary were visually inspected; the desktop composition is opaque/readable after entrance settles. The desktop preview capture scrolls to the actual authored conversation beside the itinerary. Mobile preview captures show a focused composer without a real OS keyboard. No continuous interaction video was recorded.

The framework emitted an existing security-upgrade advisory during the isolated control build. This task did not independently identify a CVE or authorize an upgrade. Dependency security maintenance is a separate prerequisite to production publication; it is not represented as a new UX vulnerability fix.

Development also reported the existing smooth-scroll metadata notice (`data-scroll-behavior`); homepage motion/global layout were deliberately preserved. The executed navigation and scroll-lock assertions passed. This notice is recorded rather than silently changing the approved motion baseline.

No real AI, browser persistence, auth UI, backend calls, database/migration changes, API-client contract changes, new library, image replacement or UX-2A transition was introduced.

## Local review and evidence commands

```powershell
corepack pnpm@12.16.1 --filter @adora/web build
corepack pnpm@12.16.1 --filter @adora/web start --hostname 127.0.0.1 --port 3100
# In a second terminal; all browser evidence goes outside tracked historical folders:
$env:ADORA_VERIFY_OUTPUT = 'F:\Coding\Adora System Mega Project\adora-ux1-scratch\review'
node scripts/verify_concierge.mjs
```

Final complete logs are `final-unit.log`, `final-concierge.log`, `final-web03.log`, `final-homepage.log` and `final-web04.log` in the external scratch directory. Earlier exploratory runs remain available and are not substituted for these final results. No hosted CI, physical-device or manual screen-reader pass is claimed. The separately verified API-client build used `corepack pnpm@12.16.1 --filter @adora/api-client build`; its generated output is ignored and source contracts are unchanged.

Supplemental logs are `final-concierge-console.log`, `strict-concierge.log`, `strict-effects.json` and `desktop-conversation.log`. The last desktop capture rerun exited 0. No unrequested source/configuration changes were generated by the development server.

## Git closure and readiness

The UX-1 checkpoint subject is `feat(ux): introduce global adora travel concierge demo`; the full commit SHA is returned in the completion handoff (the report is itself part of that commit). Only the inspected frontend integration/components, reducer tests, browser scripts, this report and compact UX-1 evidence belong to the checkpoint. `git diff --cached --check` and staged-content inspection are required before committing; no amend or push is authorized.

Selective staging inventory: 30 paths. Staged JSON parsed successfully; the scoped credential-pattern/path inspection found no prohibited paths or credential patterns. Staged whitespace validation exited 0. The protected ZIP was excluded.

All task-created control worktrees have been removed and both production/development audit servers stopped. Port 8000 was checked and returned `ECONNREFUSED`; no API/database service was started. The protected archive retains SHA-256 `3D658B9DF1A2D4EE73EFD6EF868A8DA82807BCAB4994E4226E870EC7DAF1CF3D` and remains untracked. The intended post-checkpoint status, verified in the handoff, is:

```text
?? docs/reports/assets/web-design-0-4.zip
```

Functional production gates are green. UX-2A remains unimplemented and requires its own checkpoint. Before wider rollout, review the conservative 28.34KiB lazy-transfer finding and perform physical-device, manual screen-reader and trusted throttled interaction measurements. No full-stack or production security certification is implied.
