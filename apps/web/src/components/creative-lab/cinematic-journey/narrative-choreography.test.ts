import assert from "node:assert/strict";
import test from "node:test";

import { computeCinematicJourneyState } from "./narrative-choreography.ts";

test("CXP-02 preserves CXP-01S opening mask and colonnade occlusion-lock invariants", () => {
  const start = computeCinematicJourneyState(0, false);
  assert.equal(start.movement, "01");
  assert.equal(start.maskScale, 1);
  assert.equal(start.veilOpacity, 1);
  assert.equal(start.worldScrimOpacity, 0);
  assert.equal(start.humanClipLeftPct, 100);

  // Mid-passage A aperture holds veil solid until aperture clears viewport
  const midA = computeCinematicJourneyState(0.14, false);
  assert.ok(midA.maskScale > 3);
  assert.equal(midA.portalCounterOpen, 1);
  assert.equal(midA.veilOpacity, 1);

  // Colonnade occlusion lock across desktop & mobile
  for (const isMobile of [false, true]) {
    for (const p of [0.33, 0.355, 0.38]) {
      const s = computeCinematicJourneyState(p, isMobile);
      const pillarRight = s.pillarLeftPct + s.pillarWidthPct;
      if (s.humanRevealLeftPct > 0 && s.humanRevealLeftPct < 100) {
        assert.ok(
          s.humanRevealLeftPct > s.pillarLeftPct + s.pillarWidthPct * 0.25 &&
            s.humanRevealLeftPct < pillarRight - s.pillarWidthPct * 0.25,
          `Seam at ${s.humanRevealLeftPct}% must stay strictly inside opaque pillar at p=${p}`,
        );
      }
    }
  }
});

test("Act I (Human Moment -> Discovery) reframes Human Moment continuously without cut", () => {
  const humanPeak = computeCinematicJourneyState(0.45, false);
  assert.equal(humanPeak.movement, "03");
  assert.equal(humanPeak.humanReframeProgress, 0);
  assert.equal(humanPeak.humanClipTopPct, 0);
  assert.equal(humanPeak.humanClipRightPct, 0);
  assert.equal(humanPeak.discoveryOpacity, 0);

  const discoveryMid = computeCinematicJourneyState(0.62, false);
  assert.equal(discoveryMid.movement, "04");
  assert.equal(discoveryMid.humanReframeProgress, 1);
  assert.ok(discoveryMid.humanClipRightPct > 60, "Human Moment should dock into left origin chapter on desktop");
  assert.equal(discoveryMid.humanLayerOpacity, 1);
  assert.equal(discoveryMid.discoveryInteractive, true);
  assert.ok(discoveryMid.discoveryRibbonShiftPct > 5);
});

test("Act II (Your Journey) and Act III (AI Concierge) progress cleanly with exclusive interactivity", () => {
  const journey = computeCinematicJourneyState(0.83, false);
  assert.equal(journey.movement, "05");
  assert.equal(journey.journeyShutterProgress, 1);
  assert.equal(journey.journeyInteractive, true);
  assert.equal(journey.discoveryInteractive, false);
  assert.equal(journey.conciergeInteractive, false);

  const finale = computeCinematicJourneyState(0.98, false);
  assert.equal(finale.movement, "06");
  assert.equal(finale.conciergeInteractive, true);
  assert.equal(finale.journeyInteractive, false);
  assert.equal(finale.conciergeOpacity, 1);
});

test("Full 6-movement narrative state is strictly deterministic and reversible", () => {
  const pts = [0, 0.08, 0.16, 0.26, 0.35, 0.45, 0.55, 0.66, 0.78, 0.85, 0.94, 1];
  const fwd = pts.map((p) => computeCinematicJourneyState(p, false));
  const rev = [...pts].reverse().map((p) => computeCinematicJourneyState(p, false));
  assert.deepEqual(fwd, rev.reverse());
});
