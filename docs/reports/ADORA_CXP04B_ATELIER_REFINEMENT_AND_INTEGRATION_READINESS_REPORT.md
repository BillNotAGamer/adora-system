# ADORA CXP-04B — Atelier Refinement & Production Integration Readiness Report

## A. Executive Verdict

**Verdict:** `ADORA CXP-04B — ATELIER REFINED / READY FOR OWNER ACCEPTANCE`

CXP-04B resolves the UX and state-engine defects identified during the owner's review of CXP-04A, strengthens behavioral correctness across conversation branching, mobile above-the-fold ergonomics, itinerary refinement semantics, and free-text honesty, and documents a non-activated production integration and rollback architecture for future owner-approved activation.

---

## B. Git State

- **Starting Branch:** `feature/adora-cxp04-concierge-experience`
- **Starting HEAD (CXP-04A Checkpoint SHA):** `966244d80e585067ce331b3d8bfb8746a33e52b7` (`feat(web): prototype adora personal journey atelier`)
- **Approved `main` & `origin/main` Baseline:** `a850bffe2aea54628cb56edbfd4b9fc3a623134f` (`docs(repo): record cxp-03d final main integration report`)
- **CXP-04B Checkpoint Commit:** Created locally on `feature/adora-cxp04-concierge-experience` (`feat(web): refine concierge atelier experience and integration readiness`) — full SHA recorded in the final handoff output after commit.
- **Protected Untracked Archive:** `docs/reports/assets/unrestricted-creative.zip` preserved untouched and excluded from staging.
- **Production Preservation:** Zero edits to `/` homepage, `/ai-planner`, `ConciergeProvider`, `ConciergeDialog`, or `main`.

---

## C. UX Defect Closure

1. **Redundant Companions Question After Romantic Preset (P0):**
   - **Root Cause:** In CXP-04A `engine.ts`, `atelierReducer`'s `start` action hardcoded `stepIndex: action.presetIntention ? 1 : 0`, bypassing the conditional skip logic that only ran inside `next_step`.
   - **Fix:** Replaced hardcoded step jumping with `isStepResolvedInForwardFlow()` and `findNextUnresolvedStepIndex()`, plus `getInferredCompanionFromIntention()` (which infers 2 guests for `romantic-escape` or 4 guests for `friends-explore`, but refuses to invent a count when both conflicting intentions are selected). Both `start` and `next_step`/`skip_step` now resolve the next meaningful unresolved step. Selecting `Lãng mạn hai người` advances directly to `03 · Miền đất` while transparently displaying `Hai người (2 khách) · ~ SUY LUẬN TẠM` in the Journey Canvas.
   - **Conflict & Edit Safety:** Editing `companions` explicitly clears any prior `groupFour` refinement and promotes the fact to `✓ Đã xác nhận`. Conflicting intentions (`romantic-escape` + `friends-explore`) leave `companions` `○ Còn mở` and ask explicitly. `reset` restores `initialAtelierState` cleanly.

2. **Mobile Invitation Above-the-Fold CTA Placement (P0):**
   - **Root Cause:** On mobile viewports (`360×640`, `390×844`), the three stacked pillar paragraphs and preset chips pushed the primary CTA button below the fold.
   - **Fix:** Rebalanced mobile Invitation hierarchy in `concierge-atelier-experience.tsx` and `concierge-atelier.css` (`@media (max-width: 639px)`): tightened card padding and headline scale, placed the primary CTA (`Bắt đầu phác thảo hành trình →`) directly beneath the concise lead sentence, compacted the pillar summary strip, and kept presets + disclosure visible. Verified `ctaVisibleAboveFold: true` across `360×640`, `360×800`, `390×844`, and `430×932`.

3. **Mobile Header Clutter (P1):**
   - **Root Cause:** The CXP-04A top bar exposed internal labels (`CXP-04A Preview`, `AI PLANNER (UX-1)`) that wrapped awkwardly on narrow screens.
   - **Fix:** Removed internal version/UX-1 labels from the customer-facing header, leaving `ADORA`, `Personal Journey Atelier` (desktop badge), `Bắt đầu lại` (when active), and `← Trang chủ`. Evaluated `/ai-planner` remains accessible via a subtle link in the State I disclosure note.

4. **Accessibility & Visual Media Polish:**
   - Added non-color text prefixes (`✓ Đã xác nhận`, `~ Suy luận tạm`, `○ Còn mở`) for provenance badges.
   - Upgraded prototype `<img>` elements to `next/image` (`<Image fill ... />`), eliminating all `@next/next/no-img-element` warnings in CXP-04 files.

---

## D. Journey Refinement Integrity

- **Lower Estimated Budget (`lower-budget`):** Updates accommodation assumption (`Homestay/nhà gỗ yên tĩnh khu ven trung tâm`), transport (`Xe máy / đi bộ & taxi chặng ngắn`), food (`Quán địa phương, bánh căn & cà phê vườn`), and adjusts Day activity stops (`(phương án tiết kiệm)`) alongside recalculated VND line items (`15.620.000 ₫ → 9.910.000 ₫` for 4 guests / 3 days).
- **Slower Travel Pace (`slower-pace`):** Reduces per-day activity count and shifts time windows later (`08:00 – 10:30`, `15:30 – 18:00`).
- **Change Duration (`toggle-duration`):** Switches between 2-day and 3-day itineraries, updating day tabs (`2` vs `3`), room nights (`1` vs `2`), transport days, and VND totals (`9.910.000 ₫ → 6.070.000 ₫`).
- **Change Traveler Count (`group-four` / explicit edit):** Scales room count (`Math.ceil(travelerCount / 2)`) and applies shared group transport (`Taxi 7 chỗ chia sẻ nhóm`) rather than naive linear scaling.
- **Prioritize Coffee & Local Culture (`coffee-culture`):** Updates Day 2 morning (`Xưởng rang & cà phê thủ công buổi sớm`) and Day 3 evening (`Không gian gốm & trà thảo mộc cao nguyên`) across both 2-day and 3-day fixtures.
- **Revision Explanation Card (`[data-cxp04-revision-card]`):** Displays `title`, `whatChanged`, `whyChanged`, and `assumptionsChanged` on every refinement.
- **Cost Invariants:** `totalVnd === sum(items.amountVnd)` and `perPersonVnd === Math.round(totalVnd / travelerCount)` verified across all 48 combinations; always labeled `ƯỚC TÍNH MINH HOẠ — KHÔNG PHẢI BÁO GIÁ TRỰC TIẾP`.
- **Free-Text Honesty:** Guards against negation (`không`, `đừng`, `chẳng`, `khỏi`, `not`, `no`) and conflicting multi-intent phrases; unsupported prompts (e.g., `"Đặt vé máy bay đi Kyoto"`) are retained verbatim in `freeNotes` with `unsupported-notice` and zero itinerary/cost mutation.

---

## E. Production Integration Design (Not Activated in CXP-04B)

### Existing UX-1 Entry-Point Map
- **Global Provider:** `apps/web/src/components/concierge/concierge-provider.tsx` (`ConciergeProvider` in `providers.tsx`) manages `state`, `isOpen`, `menuOpen`, `cinematicMovement`, `origin` focus restoration, `popstate`/`hashchange`/link dismissal, and lazy-loads `ConciergeDialog`.
- **Entry Surfaces:**
  1. Site Header (`site-header.tsx`)
  2. Mobile Menu (`site-header.tsx`)
  3. Floating Trigger (`concierge-floating-trigger.tsx` — hidden in Movement 01, Movement 06, and Footer; visible in Movements 02–05)
  4. Movement 06 (`cinematic-journey-experience.tsx` + `concierge-trigger.tsx`)
  5. Dedicated route `/ai-planner` (`planner-workspace.tsx`)

### Proposed Integration Architecture (`integration-contract.ts`)
- **Typed Boundary:** Defined in prototype-local `apps/web/src/lib/concierge-atelier/integration-contract.ts` (`Ux1ToAtelierHandoff`, `AtelierWorkspaceController`).
- **Provider Ownership:** Keep `ConciergeProvider` as the single global owner of open/close state, `origin` focus restoration, and `cinematicMovement` visibility. Do not create a second global provider.
- **Dialog-to-Workspace Transition:** Rather than squeezing the 44/56 split Atelier into the narrow UX-1 modal, entry triggers can open a full-viewport accessible Atelier workspace layer (or transition to `/ai-planner` with `Ux1ToAtelierHandoff` preserving `returnPath` and `ux1DraftText`), restoring scroll and focus to `origin.current` on close/Escape/back-navigation.
- **Rollback Strategy:** A single provider-level mode switch (`mode: "ux1-dialog" | "atelier-workspace"`, defaulting to `"ux1-dialog"` until owner sign-off) allows instant rollback to UX-1 without touching entry triggers or routes.
- **Explicit Files CXP-04C Would Eventually Modify (After Owner Approval):**
  - `apps/web/src/components/concierge/concierge-provider.tsx`
  - `apps/web/src/app/ai-planner/page.tsx` / `planner-workspace.tsx`
  - New production wrapper under `apps/web/src/components/concierge/` mounting the Atelier workspace.

---

## F. Test Results

| Check | Command / Script | Result |
| :--- | :--- | :--- |
| TypeScript (`noUncheckedIndexedAccess`) | `pnpm typecheck` | **PASS** (0 errors) |
| ESLint | `pnpm lint` | **PASS** (0 errors, 0 warnings in CXP-04 files) |
| Unit Tests (`node --test`) | `pnpm test` | **PASS** (**55/55 tests** across **6 suites** — including 7 CXP-04B tests in `engine.test.ts`) |
| Production Build | `pnpm build` | **PASS** (Next.js 16.4.6 Turbopack; 23 routes built) |
| Atelier Browser Verifier | `scripts/verify_cxp04_atelier.mjs` | **PASS** (0 console/page/network errors; 8/8 viewports zero overflow; 4/4 mobile above-the-fold CTA visible; romantic preset skipped companions -> `destination`; cost `15.620.000 ₫ → 9.910.000 ₫ → 6.070.000 ₫`; IME + unsupported honest; reduced motion verified; accessibility checks passed) |
| UX-1 Concierge Regression | `scripts/verify_concierge.mjs` | **PASS** across all 6 viewports (`360`, `390`, `768`, `1024`, `1440`, `1920`), 0 errors |
| CXP-03D Homepage Regression | `scripts/verify_cxp03_homepage.mjs` | **PASS** (CXP-03D runway, photographic wordmark, no obsolete hero CTA, floating Concierge Movement 01–06 visibility, 0 errors) |

---

## G. Visual Evidence

### Committed Screenshots (`docs/reports/assets/cxp04/`)
1. `01_desktop_invitation.png` — Desktop State I Invitation
2. `02_desktop_discovery.png` — Desktop State II after `Lãng mạn hai người` (skips companions -> lands on `03 · Miền đất` with `~ SUY LUẬN TẠM`)
3. `03_desktop_interpretation.png` — Desktop State III Interpretation (inferred 2 guests)
4. `04_desktop_interpretation_updated.png` — Desktop State III after editing companions to 4 guests (`✓ ĐÃ XÁC NHẬN`)
5. `05_desktop_journey_reveal.png` — Desktop State IV Journey Reveal
6. `06_desktop_budget_refinement.png` — Desktop State V Budget Refinement + Revision Explanation Card
7. `07_desktop_duration_refinement.png` — Desktop State V Duration Refinement (2 days)
8. `08_mobile_invitation_360x640.png` — Mobile Invitation above-the-fold (`360×640`)
9. `09_mobile_invitation_390x844.png` — Mobile Invitation above-the-fold (`390×844`)
10. `10_mobile_conversation.png` — Mobile Conversation Tab (`390×844`)
11. `11_mobile_itinerary.png` — Mobile Journey Canvas Tab (`390×844`)
12. `12_reduced_motion.png` — Reduced-motion State IV/V verification
13. `13_homepage_regression.png` — Approved CXP-03D `/` Homepage Regression

### External Scratch Screen Recordings (Kept Outside Git)
- **Desktop Walkthrough:** `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp04b_verify\cxp04_atelier_demo.webm` (54 frames, `639,815 bytes`)
- **Mobile Walkthrough:** `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp04b_verify\cxp04_atelier_mobile_demo.webm` (16 frames, `161,012 bytes`)

---

## H. Remaining Issues

- **Critical Blockers:** None.
- **High-Priority UX Issues:** None.
- **Non-Blocking Visual Polish:** Arrow-key navigation between day tabs (`Ngày 01..N`) can be added during CXP-04C production integration.
- **Deliberate Prototype Limitations:** Scripted Đà Lạt fixtures only; no live LLM calls, no live pricing/availability, no database persistence, and no production UX-1 activation.

---

## I. Next Owner Decision

After reviewing the updated screenshots and WebM recordings, the owner may authorize **CXP-04C (Production Integration)** to wire `ConciergeProvider` and `/ai-planner` to the Personal Journey Atelier behind a rollback-safe mode switch while preserving CXP-03D homepage invariants.
