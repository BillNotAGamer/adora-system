import assert from "node:assert/strict";
import test from "node:test";

import { computeTypographyWorldState } from "./choreography.ts";

test("Moment I opening state keeps world scrim off and colonnade pillar off-screen", () => {
  const desktop = computeTypographyWorldState(0, false);
  assert.equal(desktop.movement, "01");
  assert.equal(desktop.maskScale, 1);
  assert.equal(desktop.veilOpacity, 1);
  assert.equal(desktop.worldScrimOpacity, 0);
  assert.equal(desktop.secondaryLettersOpacity, 1);
  assert.equal(desktop.portalCounterOpen, 0);
  assert.equal(desktop.colonnadeProgress, 0);
  assert.equal(desktop.humanRevealLeftPct, 100);
  assert.equal(desktop.humanCtaInteractive, false);

  const mobile = computeTypographyWorldState(0, true);
  assert.equal(mobile.maskScale, 1);
  assert.equal(mobile.maskShiftX, 0);
  assert.equal(mobile.secondaryLettersOpacity, 0);
});

test("Moment II passage dissolves A counter cleanly before peak zoom and holds veil until aperture clears viewport", () => {
  const midPassage = computeTypographyWorldState(0.28, false);
  assert.ok(midPassage.maskScale > 3, `expected maskScale > 3 at p=0.28, got ${midPassage.maskScale}`);
  assert.equal(midPassage.portalCounterOpen, 1);
  assert.equal(midPassage.veilOpacity, 1, "veil must remain solid during portal zoom (no fade cheat)");
  assert.equal(midPassage.worldScrimOpacity, 0);

  const fullAperture = computeTypographyWorldState(0.42, false);
  assert.ok(fullAperture.maskScale > 20);
  assert.equal(fullAperture.veilOpacity, 1);

  const arrivedWorld = computeTypographyWorldState(0.5, false);
  assert.equal(arrivedWorld.movement, "02");
  assert.equal(arrivedWorld.veilOpacity, 0);
  assert.ok(arrivedWorld.worldTextOpacity > 0.7);
  assert.ok(arrivedWorld.worldScrimOpacity > 0.8);
});

test("Moment III to IV colonnade occlusion lock keeps human reveal seam strictly hidden behind opaque pillar", () => {
  for (const isMobile of [false, true]) {
    for (const p of [0.68, 0.72, 0.75, 0.79, 0.82]) {
      const s = computeTypographyWorldState(p, isMobile);
      const pillarRight = s.pillarLeftPct + s.pillarWidthPct;
      if (s.humanRevealLeftPct > 0 && s.humanRevealLeftPct < 100) {
        assert.ok(
          s.humanRevealLeftPct > s.pillarLeftPct + s.pillarWidthPct * 0.25 &&
            s.humanRevealLeftPct < pillarRight - s.pillarWidthPct * 0.25,
          `Seam at ${s.humanRevealLeftPct}% must stay strictly inside opaque pillar [${s.pillarLeftPct}%, ${pillarRight}%] at p=${p}`,
        );
      }
    }
  }

  const mid = computeTypographyWorldState(0.75, false);
  assert.ok(mid.worldTranslateX < -1.5, "far highland plane should pan left for 3-plane parallax");
  assert.ok(mid.humanTranslateX > 0.5, "mid human plane should glide smoothly into place");

  const end = computeTypographyWorldState(1, false);
  assert.equal(end.movement, "03");
  assert.equal(end.colonnadeProgress, 1);
  assert.equal(end.humanRevealLeftPct, 0);
  assert.ok(end.pillarLeftPct + end.pillarWidthPct < 0, "pillar must clear viewport left edge at end");
  assert.equal(end.humanTextOpacity, 1);
  assert.equal(end.humanCtaInteractive, true);
});

test("State mapping is strictly deterministic and reversible", () => {
  const checkpoints = [0, 0.12, 0.25, 0.45, 0.58, 0.75, 0.9, 1];
  const forward = checkpoints.map((p) => computeTypographyWorldState(p, false));
  const backward = [...checkpoints].reverse().map((p) => computeTypographyWorldState(p, false));
  assert.deepEqual(forward, backward.reverse());
});
