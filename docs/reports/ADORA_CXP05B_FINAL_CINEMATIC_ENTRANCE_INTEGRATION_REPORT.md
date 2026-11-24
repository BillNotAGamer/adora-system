# ADORA — CXP-05B LITE: FINAL CINEMATIC ENTRANCE INTEGRATION REPORT

**Verdict:** `ADORA CXP-05B — INTEGRATED INTO LOCAL MAIN / READY FOR OWNER PUSH`

**Date:** 2026-11-24  
**Workspace:** `F:\Coding\Adora System Mega Project\adora-system`

---

## 1. Git Baseline & Checkpoints

| Checkpoint | Full SHA | Notes |
| --- | --- | --- |
| Pre-merge local `main` | `f661f21cab1fc66b0a837693ab788400db072d59` | Post-CXP-04F baseline |
| Live `origin/main` (`ls-remote`) | `f661f21cab1fc66b0a837693ab788400db072d59` | Matched local `main` |
| CXP-05A implementation commit | `58bf4f10feb0512f147b1590985eb08a24e50f8c` | `feat(web): introduce cinematic first-letter entrance` |
| Final CXP-05A feature `HEAD` | `637ca1592f2cf8d1ccaf90aae9defd1cf769fae4` | Includes `ADORA_CXP05A_THE_FIRST_LETTER_CINEMATIC_ENTRANCE_REPORT.md` |
| Non-FF merge commit (`main`) | `559e97c90cf7e2c93e1d81dd354f18ee5032dde5` | `merge(web): integrate adora cinematic first-letter entrance` |
| Merge parents (`HEAD^1`, `HEAD^2`) | `f661f21cab1fc66b0a837693ab788400db072d59`, `637ca1592f2cf8d1ccaf90aae9defd1cf769fae4` | Clean two-parent `--no-ff` merge |

---

## 2. Feature-to-Main Diff & Merge Summary

- **Merge command:** `git switch main` then `git merge --no-ff --no-commit feature/adora-cxp05a-first-letter-entrance`
- **Conflict status:** **0 conflicts**; `git diff --cached --check` passed cleanly.
- **Changed files (26 total):**
  - Entrance modules (`apps/web/src/components/entrance/*`): `first-letter-choreography.ts`, `first-letter-choreography.test.ts`, `first-letter-boot-script.tsx`, `first-letter-entrance.css`, `first-letter-hud.tsx`, `use-first-letter-entrance.ts`.
  - Minimal app & Movement 01 integration: `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/components/creative-lab/cinematic-journey/cinematic-journey-experience.tsx`.
  - Verification & evidence: `scripts/verify_cxp05a_entrance.mjs`, `scripts/verify_cxp03_homepage.mjs`, `scripts/verify_cxp04c_integration.mjs`, `docs/reports/ADORA_CXP05A_THE_FIRST_LETTER_CINEMATIC_ENTRANCE_REPORT.md`, `docs/reports/assets/cxp05a/*`.
- No unauthorized changes to Atelier engine, Concierge provider, backend/API, database schemas, or other homepage Movements.

---

## 3. Post-Merge Verification Results (Executed on Merged `main`)

### Static, Security & Build Gates
- `pnpm install --frozen-lockfile`: **PASS**
- `pnpm --filter @adora/web test`: **PASS** (`55 pass, 0 fail` across `6` suites)
- `pnpm --filter @adora/web typecheck` (`tsc --noEmit`): **PASS** (`0 errors`)
- `pnpm --filter @adora/web lint` (`eslint .`): **PASS** (`0 errors`, 16 pre-existing `<img>` warnings in `creative-lab/`)
- `pnpm --filter @adora/web build`: **PASS** (`22/22` routes built cleanly)
- `pnpm --filter @adora/web audit --prod`: **PASS** (`No known vulnerabilities found`)

### Live Browser Gates (`next start --port 3105`)
- **CXP-05A First-Letter Entrance Gate (`scripts/verify_cxp05a_entrance.mjs`):** **PASS**
  - Fresh desktop (`1440×900`) and mobile (`390×844`) entry: `outcome: "ready"`, `landingDeltaPx: { dx: 0, dy: 0, dw: 0, dh: 0 }`, `firstATransformCleared: true`, `0` console/page/request errors.
  - All 8 responsive viewports (`360×640` through `1920×1080`): `overflowOk: true`, `outcome: "ready"`, `{ dx: 0, dy: 0, dw: 0, dh: 0 }`.
  - Edge checks: throttled hero image held at `55%` (`heroMediaStage: "pending"`) until decoded; forced image failure recovered as `outcome: "degraded"` with HUD removed & scroll restored; reload at Movement 04 (`scrollY: 5800`) skipped entrance; back/forward skipped replay; rapid mid-load navigation cleaned up `data-cxp05-entrance`, `inertCount: 0`, and `overflow`; `/ai-planner`, `/destinations/da-lat`, `/experiences/rung-thong-binh-minh`, `/trips/da-lat-3-ngay` isolated (`hasBootScript: false`, `hasHud: false`).
  - Reduced motion (`prefers-reduced-motion: reduce`): `policyMode: "reduced"`, `flightDurationMs: 0`, `hudRemoved: true`.
  - No-JS fallback: `hasEntranceAttr: false`, `openingPaintedHeight: 558`, `discoveryOpacity: "1"`, `hasHud: false`.
- **Cinematic Homepage Regression (`scripts/verify_cxp03_homepage.mjs`):** **PASS**
  - Movement 01 wordmark & 6-Movement structure preserved (`scrollRestoration` Movement `04`, floating CTA visibility desktop/mobile, reduced-motion, `data-motion="off"`, no-JS fallback, 0 console/page/request errors).
- **Official Atelier Regression (`scripts/verify_cxp04c_integration.mjs`):** **PASS**
  - Fresh homepage → First Letter → Movement 04 → Open Atelier → Close Atelier → Movement 04 (`scrollDeltaPx: 0` across all 6 Movements), history stress Scenarios A–E, `/creative-lab/concierge-experience` HTTP `404`, zero legacy UX-1 dialog/prompt.

### Performance & Asset Integrity Summary
- Existing hero plate `/images/cxp01/highland-world.jpg` (`2,192 KB`) was **not duplicated** (`highlandRequestCount: 1`).
- No third-party animation dependencies added (`+5 KB` JS, `+1 KB` CSS, `0 ms` long tasks, `cls: 0.0003` on post-entrance homepage run).
- Intentional creative tradeoff preserved: fresh `/` entry completes interactive reveal at `~2.30s` (`readyAtMs: 630.8ms`, `flightDurationMs: 1160ms`).

---

## 4. Final Git State & Release Safety Disclosures

- **Final local `main` HEAD:** Recorded after committing this report (reported in terminal handoff).
- **Protected archive:** `docs/reports/assets/unrestricted-creative.zip` remains untouched and untracked.
- **No push / no deploy:** Neither `git push` nor any deployment was executed.
- **CI / Deployment safety:** `.github/workflows/ci.yml` triggers CI checks (`javascript` and `api` jobs) on `push` and `pull_request`. No Vercel/Netlify/Railway deployment config exists in the repository, though external platform auto-deploy integrations on `main` cannot be verified locally.
- **Physical mobile hardware pending:** All browser verification ran in headless Chromium on Windows; physical iOS Safari and Android Chrome spot-checking remains pending prior to public release.

### Owner-Controlled GitHub Push Command
```powershell
git -C "F:\Coding\Adora System Mega Project\adora-system" push origin main
```
