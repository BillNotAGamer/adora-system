import assert from "node:assert/strict";
import test from "node:test";

import {
  ATELIER_QUESTIONS,
  atelierReducer,
  buildAtelierJourney,
  computeJourneyCost,
  deriveInterpretation,
  getTravelerCount,
  initialAtelierState,
} from "./engine.ts";

test("CXP-04B Scenario A: romantic-escape preset creates inferred 2-person count and skips redundant companions question", () => {
  const state = atelierReducer(initialAtelierState, {
    type: "start",
    presetIntention: "romantic-escape",
  });

  assert.equal(state.phase, "discovery");
  // Must skip step 1 (companions) and land directly on step 2 (destination)
  assert.equal(ATELIER_QUESTIONS[state.stepIndex]?.key, "destination");
  assert.equal(getTravelerCount(state), 2);

  const compFact = deriveInterpretation(state).find((f) => f.key === "companions");
  assert.equal(compFact?.provenance, "inferred");
  assert.match(compFact?.value ?? "", /Hai người/);
});

test("CXP-04B Scenario B: explicit traveler-count edit overrides inference and recalculates rooms & VND cost", () => {
  let state = atelierReducer(initialAtelierState, {
    type: "start",
    presetIntention: "romantic-escape",
  });
  state = atelierReducer(state, { type: "go_interpretation" });
  const twoPersonJourney = buildAtelierJourney(state);

  state = atelierReducer(state, { type: "edit_preference", key: "companions" });
  assert.equal(ATELIER_QUESTIONS[state.stepIndex]?.key, "companions");
  state = atelierReducer(state, { type: "select_choice", key: "companions", value: "small-group" });
  state = atelierReducer(state, { type: "next_step" });

  assert.equal(state.phase, "interpretation");
  assert.equal(getTravelerCount(state), 4);
  const compFact = deriveInterpretation(state).find((f) => f.key === "companions");
  assert.equal(compFact?.provenance, "confirmed");

  const fourPersonJourney = buildAtelierJourney(state);
  assert.ok(fourPersonJourney.cost.totalVnd > twoPersonJourney.cost.totalVnd);
  assert.match(fourPersonJourney.cost.items[0]?.label ?? "", /2 phòng/);
});

test("CXP-04B Scenario C & D: back-editing preserves unrelated answers and conflicting intentions keep companions missing", () => {
  let state = atelierReducer(initialAtelierState, { type: "start" });
  state = atelierReducer(state, { type: "select_choice", key: "intention", value: "romantic-escape" });
  state = atelierReducer(state, { type: "select_choice", key: "intention", value: "friends-explore" });
  state = atelierReducer(state, { type: "next_step" });

  // Conflicting intentions (romantic + friends) must NOT invent a companion count -> asks companions
  assert.equal(ATELIER_QUESTIONS[state.stepIndex]?.key, "companions");
  const compFact = deriveInterpretation(state).find((f) => f.key === "companions");
  assert.equal(compFact?.provenance, "missing");

  // Skip optional accessibility & answer duration, then edit intention without losing duration
  state = atelierReducer(state, { type: "select_choice", key: "duration", value: "2" });
  state = atelierReducer(state, { type: "go_interpretation" });
  state = atelierReducer(state, { type: "edit_preference", key: "intention" });
  state = atelierReducer(state, { type: "select_choice", key: "intention", value: "friends-explore" }); // toggle off
  state = atelierReducer(state, { type: "next_step" });
  assert.equal(state.phase, "interpretation");
  assert.equal(state.answers.duration, "2");
});

test("CXP-04B Scenario E & skipping: reset clears all state and skipping retains missing provenance", () => {
  let state = atelierReducer(initialAtelierState, {
    type: "start",
    presetIntention: "calm-nature",
  });
  state = atelierReducer(state, { type: "skip_step" }); // skip companions
  const skippedComp = deriveInterpretation(state).find((f) => f.key === "companions");
  assert.equal(skippedComp?.provenance, "missing");

  const reset = atelierReducer(state, { type: "reset" });
  assert.deepEqual(reset, initialAtelierState);
});

test("CXP-04B semantic refinements: budget, slower pace, duration, group size, and coffee culture update itinerary & assumptions", () => {
  let state = atelierReducer(initialAtelierState, {
    type: "start",
    presetIntention: "calm-nature",
  });
  state = atelierReducer(state, { type: "reveal_journey" });
  const baseline = buildAtelierJourney(state);

  // Lower budget updates accommodation assumption AND activity titles/summaries
  state = atelierReducer(state, { type: "apply_refinement", kind: "lower-budget" });
  const lean = buildAtelierJourney(state);
  assert.ok(lean.cost.totalVnd < baseline.cost.totalVnd);
  assert.notEqual(lean.accommodationAssumption, baseline.accommodationAssumption);
  assert.match(lean.days[0]?.activities[1]?.title ?? "", /tiết kiệm/);
  assert.ok(lean.lastRevision?.assumptionsChanged.length);

  // Slower pace reduces activity count & shifts time windows
  state = atelierReducer(state, { type: "apply_refinement", kind: "slower-pace" });
  const slower = buildAtelierJourney(state);
  assert.ok((slower.days[0]?.activities.length ?? 0) < (baseline.days[0]?.activities.length ?? 0));
  assert.notEqual(slower.days[0]?.activities[0]?.timeWindow, baseline.days[0]?.activities[0]?.timeWindow);

  // Duration toggle -> 2 days
  state = atelierReducer(state, { type: "apply_refinement", kind: "toggle-duration" });
  const twoDay = buildAtelierJourney(state);
  assert.equal(twoDay.durationDays, 2);
  assert.equal(twoDay.days.length, 2);

  // Coffee culture refinement swaps Day 2 morning experience
  state = atelierReducer(state, { type: "apply_refinement", kind: "coffee-culture" });
  const coffee = buildAtelierJourney(state);
  assert.match(coffee.days[1]?.activities[0]?.title ?? "", /cà phê thủ công/i);

  // Group 4 refinement updates occupancy & non-linear transport note
  state = atelierReducer(state, { type: "apply_refinement", kind: "group-four" });
  const groupFour = buildAtelierJourney(state);
  assert.equal(groupFour.cost.travelerCount, 4);
  assert.match(groupFour.cost.items[0]?.label ?? "", /2 phòng/);
});

test("CXP-04B free-text honesty: rejects negated, multi-intent, and out-of-scope prompts without mutating itinerary", () => {
  let state = atelierReducer(initialAtelierState, { type: "start" });
  state = atelierReducer(state, { type: "reveal_journey" });
  const beforeJourney = buildAtelierJourney(state);

  for (const prompt of [
    "Đặt vé máy bay đi Kyoto tuần sau",
    "Không muốn giảm ngân sách đâu",
    "Vừa làm chậm hơn vừa thêm nhóm 4 người và giảm ngân sách",
  ]) {
    const next = atelierReducer(state, { type: "submit_text", text: prompt });
    assert.equal(next.freeNotes.at(-1), prompt);
    assert.equal(next.messages.at(-1)?.provenance, "unsupported-notice");
    assert.deepEqual(buildAtelierJourney(next).cost, beforeJourney.cost);
  }
});

test("CXP-04B cost breakdown arithmetic invariants hold across all tiers, durations, and group sizes", () => {
  for (const days of [2, 3]) {
    for (const tier of ["lean", "balanced", "curated"] as const) {
      for (const travelers of [1, 2, 3, 4]) {
        for (const slower of [false, true]) {
          const cost = computeJourneyCost(days, tier, travelers, slower);
          const sum = cost.items.reduce((acc, item) => acc + item.amountVnd, 0);
          assert.equal(cost.totalVnd, sum, `Sum mismatch for ${days}d/${tier}/${travelers}p`);
          assert.equal(cost.perPersonVnd, Math.round(sum / travelers));
          assert.ok(cost.totalVnd > 0 && cost.perPersonVnd > 0);
          assert.equal(cost.provenance, "illustrative-estimate");
          assert.equal(cost.currency, "VND");
        }
      }
    }
  }
});

test("CXP-04F transferred UX-1 behavioral contracts: bounded multi-select, empty/overlong guard, and preserved answers", () => {
  let state = atelierReducer(initialAtelierState, { type: "start" });
  state = atelierReducer(state, { type: "select_choice", key: "intention", value: "calm-nature" });
  state = atelierReducer(state, { type: "select_choice", key: "intention", value: "coffee-culture" });
  // 3rd intention must be rejected and error surfaced without mutating selected choices
  state = atelierReducer(state, { type: "select_choice", key: "intention", value: "friends-explore" });
  assert.equal(state.answers.intention.length, 2);
  assert.ok(state.error.length > 0);

  // Empty & overlong (>1000 chars) free-text submissions must not append transcript
  const beforeLen = state.messages.length;
  state = atelierReducer(state, { type: "submit_text", text: "   " });
  assert.equal(state.messages.length, beforeLen);
  state = atelierReducer(state, { type: "submit_text", text: "a".repeat(1001) });
  assert.equal(state.messages.length, beforeLen);
  assert.ok(state.error.length > 0);
});
