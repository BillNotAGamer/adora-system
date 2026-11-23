import assert from "node:assert/strict";
import test from "node:test";

import {
  atelierReducer,
  buildAtelierJourney,
  computeJourneyCost,
  deriveInterpretation,
  initialAtelierState,
} from "./engine.ts";

test("CXP-04A contextual branching skips companions for romantic-escape and marks it inferred, not confirmed", () => {
  let state = atelierReducer(initialAtelierState, { type: "start" });
  state = atelierReducer(state, {
    type: "select_choice",
    key: "intention",
    value: "romantic-escape",
  });
  state = atelierReducer(state, { type: "next_step" });

  // Branches directly to destination (step 2), leaving companions inferred rather than silently confirmed
  assert.equal(state.stepIndex, 2);

  const facts = deriveInterpretation(state);
  const compFact = facts.find((f) => f.key === "companions");
  assert.ok(compFact);
  assert.equal(compFact.provenance, "inferred");
  assert.match(compFact.value ?? "", /Hai người/);

  // Explicit user confirmation promotes inference to confirmed
  state = atelierReducer(state, { type: "confirm_inference", key: "companions" });
  const confirmedComp = deriveInterpretation(state).find((f) => f.key === "companions");
  assert.equal(confirmedComp?.provenance, "confirmed");
});

test("CXP-04A cost breakdown is mathematically consistent across all tiers, durations, and group sizes", () => {
  for (const days of [2, 3]) {
    for (const tier of ["lean", "balanced", "curated"] as const) {
      for (const travelers of [1, 2, 3, 4]) {
        for (const slower of [false, true]) {
          const cost = computeJourneyCost(days, tier, travelers, slower);
          const sum = cost.items.reduce((acc, item) => acc + item.amountVnd, 0);
          assert.equal(cost.totalVnd, sum, `Sum mismatch for ${days}d/${tier}/${travelers}p`);
          assert.equal(cost.perPersonVnd, Math.round(sum / travelers));
          assert.equal(cost.provenance, "illustrative-estimate");
          assert.equal(cost.currency, "VND");
          assert.ok(cost.exclusions.length >= 2);
        }
      }
    }
  }
});

test("CXP-04A answer editing returns cleanly to interpretation and refinements mutate journey deterministically", () => {
  let state = atelierReducer(initialAtelierState, {
    type: "start",
    presetIntention: "calm-nature",
  });
  state = atelierReducer(state, { type: "go_interpretation" });
  assert.equal(state.phase, "interpretation");

  // Edit duration -> 2 days -> next_step returns straight to interpretation
  state = atelierReducer(state, { type: "edit_preference", key: "duration" });
  assert.equal(state.phase, "discovery");
  state = atelierReducer(state, { type: "select_choice", key: "duration", value: "2" });
  state = atelierReducer(state, { type: "next_step" });
  assert.equal(state.phase, "interpretation");
  assert.equal(state.answers.duration, "2");

  // Reveal journey
  state = atelierReducer(state, { type: "reveal_journey" });
  assert.equal(state.phase, "reveal");
  const initialJourney = buildAtelierJourney(state);
  assert.equal(initialJourney.durationDays, 2);

  // Refine: lower budget & toggle duration -> 3 days
  state = atelierReducer(state, { type: "apply_refinement", kind: "lower-budget" });
  const lean2Day = buildAtelierJourney(state);
  assert.ok(lean2Day.cost.totalVnd < initialJourney.cost.totalVnd);

  state = atelierReducer(state, { type: "apply_refinement", kind: "toggle-duration" });
  const lean3Day = buildAtelierJourney(state);
  assert.equal(lean3Day.durationDays, 3);
  assert.equal(lean3Day.days.length, 3);
});

test("CXP-04A retains unsupported free-text requests honestly without claiming AI fulfillment", () => {
  let state = atelierReducer(initialAtelierState, { type: "start" });
  state = atelierReducer(state, { type: "reveal_journey" });
  const beforeCount = state.messages.length;
  state = atelierReducer(state, {
    type: "submit_text",
    text: "Đặt vé máy bay đi Kyoto tuần sau",
  });
  assert.equal(state.messages.length, beforeCount + 2);
  assert.equal(state.freeNotes.at(-1), "Đặt vé máy bay đi Kyoto tuần sau");
  assert.equal(state.messages.at(-1)?.provenance, "unsupported-notice");
});
