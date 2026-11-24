# ADORA — CXP-04F: Official Personal Journey Atelier Cutover & Legacy Decommission Report

**Verdict:** `ADORA CXP-04F — SOURCE CUTOVER COMPLETE / PUBLIC RELEASE VERIFICATION PENDING`

**Date:** 2026-11-24  
**Repository:** `f:\Coding\Adora System Mega Project\adora-system`  
**Branch State:** Local `main` (`origin/main` remains untouched; owner push pending)  

---

## 1. Git & Release Checkpoints

| Checkpoint | Branch | Full Commit SHA | Notes |
| --- | --- | --- | --- |
| Pre-cutover `main` / `origin/main` | `main` | `96396f8ccef619632e20fc9bac09a92cfa272002` | Starting baseline (post-CXP-04E Lite) |
| Feature cutover commit | `feature/adora-cxp04f-official-atelier-cutover` | `c0d30a62942ae24c485ba16c889a72bfa1fd6150` | Promoted Atelier, retired UX-1 & prototype routes |
| Non-FF merge commit | `main` | `ca38902de5b81a57710ba7a822e1011f5d46afe1` | `merge(web): make personal journey atelier official concierge` |

Protected archive `docs/reports/assets/unrestricted-creative.zip` remains untouched and untracked.

---

## 2. Architectural Promotion & Legacy Decommission Summary

### Promoted to Official Production Runtime
- `apps/web/src/components/concierge/concierge-atelier-experience.tsx` (promoted from `creative-lab/concierge-atelier`; removed `"lab"` variant and prototype badges)
- `apps/web/src/components/concierge/atelier-journey-canvas.tsx` (moved from `creative-lab/concierge-atelier`)
- `apps/web/src/components/concierge/concierge-atelier.css` (moved from `app/creative-lab/concierge-experience`)
- `apps/web/src/components/concierge/concierge-provider.tsx` (single unconditional `ConciergeProvider` running Personal Journey Atelier; removed `Ux1OnlyProvider`, `IS_ATELIER_MODE`, and UX-1 reducer)
- `apps/web/src/app/ai-planner/page.tsx` (renders `<AtelierRouteWorkspace />` directly with title `Personal Journey Atelier`)
- Copy updated from `"Plan with Adora AI"` to `"Travel Atelier"` in `site-header.tsx`, `site-footer.tsx`, `planner-cta.tsx`, `ai-planner-section.tsx`, and `editorial-hero.tsx`.

### Decommissioned Legacy Artifacts
- `apps/web/src/components/concierge/concierge-dialog.tsx`
- `apps/web/src/components/concierge/concierge-survey.tsx`
- `apps/web/src/components/planner/planner-workspace.tsx`
- `apps/web/src/lib/concierge/state.ts` & `state.test.ts` (behavioral invariants transferred to `apps/web/src/lib/concierge-atelier/engine.test.ts`)
- `apps/web/src/lib/concierge-atelier/mode.ts`, `mode.test.ts`, and `integration-contract.ts`
- `apps/web/src/app/creative-lab/concierge-experience/*` (route now returns HTTP `404`)
- `scripts/verify_concierge.mjs` & `scripts/verify_cxp04_atelier.mjs`

Repo-wide search across `apps/web/src` and `scripts/` confirmed **0 remaining references** to `Ux1OnlyProvider`, `ux1-dialog`, `NEXT_PUBLIC_ADORA_CONCIERGE_MODE`, `ConciergeDialog`, `ConciergeSurvey`, `PlannerWorkspace`, or `concierge-experience`.

---

## 3. Verification Results

### Static, Security & Build Gates (Pre-Merge & Post-Merge on `main`)
- `pnpm install --frozen-lockfile`: **PASS**
- `pnpm --filter @adora/web audit --prod`: **PASS** (`No known vulnerabilities found`)
- `pnpm --filter @adora/web test`: **PASS** (`50 pass, 0 fail` across `6 suites`, including transferred UX-1 behavioral contracts in `engine.test.ts`)
- `pnpm --filter @adora/web typecheck` (`tsc --noEmit`): **PASS** (`0 errors`)
- `pnpm --filter @adora/web lint` (`eslint .`): **PASS** (`0 errors`, 16 pre-existing `<img>` warnings in `creative-lab/`)
- `pnpm --filter @adora/web build`: **PASS** (22/22 routes built; `/creative-lab/concierge-experience` absent; `/ai-planner` static route intact)

### Live Production Browser Gates (`next start --port 3105`)
- **CXP-04F Atelier Integration Gate (`scripts/verify_cxp04c_integration.mjs`):** **PASS**
  - `/creative-lab/concierge-experience` HTTP status: `404`
  - Homepage triggers: `headerTriggerText: "Travel Atelier"`, `footerTriggerText: "AI Planner"`, `hasLegacyDialog: false`, `hasLegacyPrompt: false`
  - Console errors: `0`, Page errors: `0`, Failed requests: `0`
  - All 6 homepage Movements scroll preservation: `0px` delta
  - Browser history stress Scenarios A–E: **PASS** (`historyLenDelta: 0`, `maxDialogs: 1`, `residualLockFound: false`)
  - Responsive overflow checks across 8 viewports (`360x640` to `1920x1080`): **PASS** (`ok: true`)
  - Desktop (`1280x800`, 16.9s) and mobile (`390x844`, 11.8s) WebM recordings decoded cleanly (`decodeOk: true`)
  - Catalog smoke checks: `/destinations/da-lat` -> `200`, `/trips/da-lat-3-ngay` -> `200`
  - Evidence screenshots saved to `docs/reports/assets/cxp04f/` (13 PNGs)
- **Post-Merge Homepage Smoke (`scripts/verify_cxp03_homepage.mjs` on merged `main`):** **PASS**
  - `headerCount: 1`, `footerCount: 1`, `h1Count: 1`, `consoleErrors: []`, `pageErrors: []`, `failedRequests: []`
  - `conciergeModalCheck.isOpen: true`, `scrollPreserved: true`
  - `routeNavigation.aiPlanner.title`: `"Personal Journey Atelier · ADORA"`
  - Reduced motion, `data-motion="off"`, and no-JS fallback checks: **PASS**

---

## 4. Remaining Gap Before Public Release

Physical iOS Safari and Android Chrome device verification (real soft-keyboard viewport behavior and touch ergonomics on hardware) was not executed in this environment, so the status remains `SOURCE CUTOVER COMPLETE / PUBLIC RELEASE VERIFICATION PENDING` until physical-device smoke testing is completed.
