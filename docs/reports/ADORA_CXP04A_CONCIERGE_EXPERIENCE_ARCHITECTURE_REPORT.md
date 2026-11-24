# ADORA CXP-04A — Personal Journey Atelier: Conversational Experience Architecture & Interactive Visual Proof Report

- **Date:** 2026-11-24
- **Branch:** `feature/adora-cxp04-concierge-experience` (branched cleanly from approved `main` commit `a850bffe2aea54628cb56edbfd4b9fc3a623134f`)
- **Isolated Prototype Route:** `/creative-lab/concierge-experience`
- **Production Preservation:** Approved CXP-03D homepage (`/`), `/ai-planner`, and global UX-1 `ConciergeProvider` / `ConciergeDialog` remain untouched.

---

## 1. Executive Summary

ADORA CXP-04A establishes the next-generation conversational experience architecture and working interactive visual proof for ADORA's AI Travel Concierge: **The Personal Journey Atelier**.

Rather than presenting a generic support chatbot or a rigid multi-field intake form, the Atelier frames travel planning as a calm, private-designer session across five clear stages:
1. **State I — The Invitation** (editorial atmospheric threshold + one-click mood presets)
2. **State II — Guided Discovery** (adaptive contextual branching, optional/skippable steps, zero invasive demographic fields)
3. **State III — The Interpretation** (explicit provenance separation between **Đã xác nhận / Confirmed**, **Suy luận tạm / Inferred**, and **Còn mở / Missing**, with 1-click confirm and inline edit)
4. **State IV — The Journey Reveal** (day-by-day Đà Lạt editorial canvas + mathematically consistent VND Cost Transparency panel)
5. **State V — Collaborative Refinement** (instant deterministic refinement pills + honest handling of unsupported free-text requests)

All logic is implemented in a pure, framework-free TypeScript domain engine (`apps/web/src/lib/concierge-atelier/`) designed to plug directly into a future backend LLM / API orchestration layer without rewriting UI state.

---

## 2. Audit of Existing UX-1 Concierge & `/ai-planner`

### Inventory of Existing Assets
- `apps/web/src/lib/concierge/state.ts` — Pure reducer managing welcome, 6-step survey, review, and free-text notes; includes strict character bounds (1,000 chars) and verbatim note retention.
- `apps/web/src/components/concierge/concierge-dialog.tsx` & `concierge-survey.tsx` — Lazy-loaded modal dialog with focus management, scroll lock, and `verify_concierge.mjs` coverage across 6 viewports.
- `apps/web/src/app/ai-planner/page.tsx` — Static demo preview page referencing `@/lib/demo/planner-scenarios.ts` and `@/lib/demo/trips.ts`.
- `apps/web/src/lib/demo/trips.ts` — Verified Đà Lạt 2-day and 3-day trip fixtures (`TRIPS`), period labels (`PERIOD_LABELS`), and integer VND formatter (`formatVnd`).

### RETAIN / EVOLVE / REPLACE Decision Matrix

| Area | Decision | Rationale |
| :--- | :--- | :--- |
| Honest provenance & non-AI disclosure discipline | **RETAIN** | Never claims live AI, live pricing, or live booking; retains unsupported free text verbatim. |
| Verified Đà Lạt fixture data (`@/lib/demo/trips.ts`) & `formatVnd` | **RETAIN** | Single source of truth for demo destinations, activities, and integer VND formatting. |
| Pure reducer architecture & strict input validation | **RETAIN** | Predictable, testable, zero-side-effect state transitions with IME & length guards. |
| Linear 6-question survey inside a narrow modal (`concierge-survey.tsx`) | **EVOLVE** | Evolved into contextual branching (skipping redundant steps while surfacing transparent inferences) and a full editorial studio workspace. |
| Flat text-only review screen | **EVOLVE** | Evolved into State III Interpretation with explicit `confirmed` / `inferred` / `missing` provenance badges and 1-click confirm/edit. |
| Generic chat bubble + static scenario list (`/ai-planner`) | **REPLACE** (in future CXP-04B/C) | Replaced in the prototype by a living split-canvas Journey Atelier with visual day timelines, proportional VND cost bars, and instant collaborative refinement. |

---

## 3. Experience Direction Exploration & Selection

Two architectural directions were evaluated:
- **Direction A — Guided Editorial Modal:** Keeps the experience inside a refined full-height overlay drawer over the current page. Pros: lower navigation friction from `/`. Cons: cramped horizontal budget makes simultaneous conversation + live itinerary + cost transparency difficult on desktop and forces heavy scrolling.
- **Direction B — Immersive Journey Atelier (Selected):** Opens with an atmospheric obsidian Invitation threshold (continuing the CXP-03D visual world), then transitions into a balanced two-column split on desktop (`44%` warm alabaster `#faf8f3` conversational studio + `56%` deep pine/obsidian `#0f1512` living Journey Canvas) and a clean `Trò chuyện` / `Hành trình` tab switcher on mobile.

**Why Direction B was selected:** It eliminates the "support chatbot" mental model, gives the itinerary and cost structure the visual authority of a private travel dossier, and lets travelers watch their choices immediately shape the journey without losing conversational context.

---

## 4. Five-State Conversational Experience Architecture

| State | Name | User Goal | Key UI & Interaction Mechanics |
| :--- | :--- | :--- | :--- |
| **State I** | **The Invitation** | Enter calmly with clear expectations | Full-bleed highland mist background, 3 design pillars, 4 one-click mood preset chips, primary ivory CTA, explicit prototype disclosure. |
| **State II** | **Guided Discovery** | Express trip intent effortlessly | Adaptive step cards (`intention`, `companions`, `destination`, `duration`, `budget`, optional `accessibility`). Selecting `Lãng mạn hai người` branches past `companions` while recording `Hai người (2 khách)` as **Suy luận tạm** for review. Every step supports `Bỏ qua` and `Xem tóm tắt ngay`. |
| **State III** | **The Interpretation** | Verify what ADORA understood | Structured Preference Dossier separating `ĐÃ XÁC NHẬN`, `SUY LUẬN TẠM`, and `CÒN MỞ`. Each inferred row offers 1-click `XÁC NHẬN` or `SỬA` (returns directly to that step and back to Interpretation on save). |
| **State IV** | **The Journey Reveal** | Explore the drafted Đà Lạt itinerary & cost | Day selector (`NGÀY 01..N`), editorial photography per day, time-windowed activity timeline, and the VND Cost Transparency panel. |
| **State V** | **Collaborative Refinement** | Co-edit pace, budget, duration, or group size | 5 instant refinement pills (`Làm nhịp đi chậm hơn`, `Giảm ngân sách ước tính`, `Đổi thời lượng (2 ↔ 3 ngày)`, `Ưu tiên cà phê & văn hoá`, `Chỉnh cho nhóm 4 người`) plus free-text composer with IME guard and honest unsupported-request retention. |

---

## 5. Privacy-by-Design & Ethical Discovery Rules

- **Zero invasive demographics:** No age, gender, marital status, or income fields are requested or stored.
- **Optional & skippable by default:** Every discovery step can be skipped; accessibility/pacing needs (`Lưu ý di chuyển`) are explicitly marked optional.
- **Ephemeral session state:** Prototype state lives strictly in React memory (`useReducer`) — no `localStorage`, no cookies, no backend persistence, no telemetry.
- **Transparent inference:** Whenever the system infers a preference (e.g., 2 guests from "Lãng mạn hai người"), it is visibly flagged as `SUY LUẬN TẠM` with its rationale and requires or allows explicit user confirmation or override.

---

## 6. Cost Transparency Architecture

Implemented in `computeJourneyCost()` (`apps/web/src/lib/concierge-atelier/engine.ts`):
- **Explicit Provenance Label:** Every render displays `ƯỚC TÍNH MINH HOẠ — KHÔNG PHẢI BÁO GIÁ TRỰC TIẾP`.
- **Mathematical Consistency Guarantee:**
  - Five explicit integer VND line items: `accommodation`, `transport`, `activities`, `food`, and `buffer (~8%)`.
  - Guaranteed invariant verified by unit tests: `totalVnd === sum(items.amountVnd)` and `perPersonVnd === Math.round(totalVnd / travelerCount)`.
- **Dynamic Recalculation:** Changing duration (`2 ↔ 3 ngày`), budget tier (`lean` / `balanced` / `curated`), pace (`slowerPace`), or group size (`1 / 2 / 3 / 4` guests) recalculates room count (`Math.ceil(travelerCount / 2)`), every line item, the proportional stacked bar, total VND, and per-person VND immediately.
- **Assumptions & Exclusions:** Displays itemized assumptions, an explicit uncertainty range (`±15–20%`), and 3 explicit exclusions (inter-provincial transport/flights, travel insurance & personal shopping, booking/holiday surcharges & live partner quotes).

---

## 7. Honest Free-Text & Unsupported Request Handling

- **Vietnamese IME & Keyboard Safety:** Composer guards `e.nativeEvent.isComposing` (and `keyCode === 229`), supports `Shift+Enter` for newlines, and `Enter` to submit.
- **Deterministic Refinement Matching:** When in State IV/V, clear refinement phrases (e.g., `"chậm hơn"`, `"tiết kiệm"`, `"2 ngày"`, `"cà phê"`, `"4 người"`) trigger the matching deterministic refinement.
- **Honest Fallback:** Any out-of-scope free-text request (verified in browser with `"Đặt vé máy bay đi Kyoto"`) is preserved verbatim in `freeNotes` and the transcript, followed by an `unsupported-notice` response (`ADORA ATELIER · GIỚI HẠN BẢN MẪU`) explicitly explaining that the prototype uses scripted Đà Lạt fixtures without live AI or booking connectivity.

---

## 8. Future-AI-Ready Domain Contract

All data structures live in `apps/web/src/lib/concierge-atelier/types.ts` with clean boundaries for future FastAPI / LLM orchestration:
- `AtelierPhase`: `"invitation" | "discovery" | "interpretation" | "reveal" | "refinement"`
- `PreferenceFact`: `{ key, label, value, provenance: "confirmed" | "inferred" | "missing", rationale? }`
- `AtelierMessage`: `{ id, role, eyebrow, text, provenance: "scripted-atelier" | "user-input" | "unsupported-notice" }`
- `AtelierCostBreakdown`: `{ currency: "VND", provenance: "illustrative-estimate", travelerCount, items, totalVnd, perPersonVnd, uncertaintyRange, exclusions }`
- `AtelierJourney`: Complete typed view-model decoupled from React rendering so a future backend adapter can populate `AtelierJourney` and `PreferenceFact[]` while keeping the UI components unchanged.

---

## 9. Visual Language & Motion Continuity with CXP-03D

- **Palette:** Deep obsidian/pine (`#0d110f`, `#0f1512`) and warm alabaster paper (`#faf8f3`) accented with muted highland gold (`#c9a96e`) — directly inheriting ADORA's CXP-03D palette.
- **Typography:** High-contrast editorial serif (`Playfair Display` / `--font-display`) for headlines paired with clean sans (`--font-sans`) and uppercase tracked eyebrows (`0.14em–0.16em`).
- **Reduced Motion:** Full `@media (prefers-reduced-motion: reduce)` CSS support disables transitions/animations cleanly; verified in Playwright under `reducedMotion: "reduce"`.

---

## 10. Files Added & Updated

### New CXP-04A Prototype Files
- `apps/web/src/lib/concierge-atelier/types.ts` — Future-AI-ready domain types and provenance enums.
- `apps/web/src/lib/concierge-atelier/engine.ts` — Pure state reducer, contextual branching, interpretation derivation, VND cost engine, and journey builder.
- `apps/web/src/lib/concierge-atelier/engine.test.ts` — 4 unit tests verifying branching, mathematical cost invariants across all tiers/durations/group sizes, edit/refinement transitions, and honest unsupported free-text retention.
- `apps/web/src/app/creative-lab/concierge-experience/concierge-atelier.css` — Scoped `.cxp04-*` editorial styles, split layout, mobile tab switcher, and reduced-motion rules.
- `apps/web/src/components/creative-lab/concierge-atelier/atelier-journey-canvas.tsx` — Living Journey Canvas (Interpretation Dossier, Day Timeline, and Cost Transparency panel).
- `apps/web/src/components/creative-lab/concierge-atelier/concierge-atelier-experience.tsx` — Five-state interactive Atelier orchestrator and accessible composer.
- `apps/web/src/app/creative-lab/concierge-experience/page.tsx` — Isolated Next.js App Router entry point (`noindex, nofollow`).
- `scripts/verify_cxp04_atelier.mjs` — Automated Playwright verifier covering all 5 states, 6 viewports, reduced motion, IME/unsupported text, homepage/AI-planner regression, and VP9 WebM recording.

### Minor Maintenance Fix
- `scripts/verify_concierge.mjs` — Updated default fallback output directory to `join(tmpdir(), "adora-concierge-verify")` so it never writes relative sibling folders outside the workspace.

---

## 11. Verification Summary

### Static, Unit, and Build Checks (`apps/web`)
| Check | Command | Result |
| :--- | :--- | :--- |
| TypeScript (`noUncheckedIndexedAccess`) | `pnpm typecheck` | **PASS** (0 errors) |
| ESLint | `pnpm lint` | **PASS** (0 errors) |
| Unit Tests | `pnpm test` | **PASS** (**52/52 tests** across 6 suites, including all 4 new CXP-04A tests) |
| Production Build | `pnpm build` | **PASS** (Next.js 16.4.6 Turbopack; `/creative-lab/concierge-experience` statically prerendered) |

### Browser Verification (`scripts/verify_cxp04_atelier.mjs` on `http://127.0.0.1:3104`)
- **Console Errors:** `0`
- **Page Errors:** `0`
- **Failed Network Requests:** `0`
- **Contextual Branching & Provenance:** Confirmed preset `"Lãng mạn hai người"` transitions to `discovery` with visible `SUY LUẬN TẠM` badge (`hasInferredBadge: true`).
- **Dynamic Cost Recalculation:** Verified live recalculation from `5.130.000 ₫` → `3.270.000 ₫` on `"Giảm ngân sách ước tính"`.
- **IME & Honest Unsupported Text:** Verified `compositionstart` + `Enter` does not prematurely submit (`imeGuarded: true`), and submitting `"Đặt vé máy bay đi Kyoto"` appends the honest `unsupported-notice` (`appendedUnsupported: true`).
- **Horizontal Overflow Audit (6 Viewports):**
  - `1920×1080`: `1905 ≤ 1920` (**PASS**)
  - `1440×900`: `1425 ≤ 1440` (**PASS**)
  - `1024×768`: `1009 ≤ 1024` (**PASS**)
  - `768×1024`: `753 ≤ 768` (**PASS**)
  - `390×844`: `390 ≤ 390` (**PASS**)
  - `360×800`: `360 ≤ 360` (**PASS**)
- **Reduced Motion (`prefers-reduced-motion: reduce`):** Rendered cleanly with visible cost transparency (`matches: true`, `hasCost: true`).
- **Production Route Regression Check:**
  - `/` rendered `"Đi xa hơn. Hiểu sâu hơn."` (`h1Count: 1`).
  - `/ai-planner` rendered `"AI Planner (demo) · ADORA"` (`h1Count: 1`).
- **UX-1 Concierge Regression (`scripts/verify_concierge.mjs`):** **PASS** across all 6 viewports (`360`, `390`, `768`, `1024`, `1440`, `1920`), `0` errors.

---

## 12. Visual Evidence & Recording

### Committed Screenshots (`docs/reports/assets/cxp04/`)
1. `docs/reports/assets/cxp04/01_desktop_invitation.png` — State I: The Invitation (1440×900)
2. `docs/reports/assets/cxp04/02_desktop_discovery.png` — State II: Guided Discovery + Live Inferred Provenance (1440×900)
3. `docs/reports/assets/cxp04/03_desktop_interpretation.png` — State III: The Interpretation Checkpoint (1440×900)
4. `docs/reports/assets/cxp04/04_desktop_journey_reveal.png` — State IV: The Journey Reveal (1440×900)
5. `docs/reports/assets/cxp04/05_desktop_refinement.png` — State V: Collaborative Refinement, Cost Transparency & Honest Free-Text Notice (1440×900)
6. `docs/reports/assets/cxp04/06_mobile_invitation.png` — Mobile State I Invitation (390×844)
7. `docs/reports/assets/cxp04/07_mobile_conversation.png` — Mobile State II Conversation Tab (390×844)
8. `docs/reports/assets/cxp04/08_mobile_itinerary.png` — Mobile State IV Journey Canvas Tab (390×844)
9. `docs/reports/assets/cxp04/09_reduced_motion.png` — Reduced-Motion State IV Verification (1440×900)

### External Scratch Video Recording (Kept Outside Git)
- **Path:** `C:\Users\Admin\.gemini\antigravity\brain\bac67ed9-1138-4132-ab5b-4e2ba46c5af4\scratch\cxp04_verify\cxp04_atelier_demo.webm`
- **Details:** 64 captured frames encoded to VP9 WebM (`886,514 bytes`) walking smoothly through States I → V.

---

## 13. Known Prototype Limitations & Proposed CXP-04B Scope

### Known CXP-04A Limitations (By Design)
- Scripted Đà Lạt fixtures only (2-day and 3-day itineraries); no live LLM calls, no live pricing/availability, and no database persistence.
- Three existing `@next/next/no-img-element` lint warnings in prototype image tags match the pattern used in `cinematic-journey/` and can be upgraded to `next/image` during production integration.

### Recommended CXP-04B Next Steps (Pending Owner Approval)
1. **Production Entry Integration:** Connect the floating CXP-03D Concierge trigger (Movements 02–05) and `/ai-planner` route to the Personal Journey Atelier after owner sign-off.
2. **FastAPI Orchestration Contract:** Stand up a typed backend endpoint (`POST /api/v1/concierge/draft`) behind feature flags that hydrates `PreferenceFact[]` and `AtelierJourney` from real catalog destinations/offers while preserving the exact VND cost transparency and provenance UI.
3. **Accessibility & Keyboard Polish:** Add arrow-key navigation across day tabs and optional `next/image` optimization for production bundle budgets.
