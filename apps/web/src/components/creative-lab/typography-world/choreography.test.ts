import assert from "node:assert/strict";
import test from "node:test";

import { computeTypographyWorldState } from "./choreography.ts";

test("Moment I opening state keeps world scrim off so first A receives full sunlight", () => {
  const desktop = computeTypographyWorldState(0, false);
  assert.equal(desktop.movement, "01");
  assert.equal(desktop.maskScale, 1);
  assert.equal(desktop.veilOpacity, 1);
  assert.equal(desktop.worldScrimOpacity, 0);
  assert.equal(desktop.secondaryLettersOpacity, 1);
  assert.equal(desktop.portalCounterOpen, 0);
  assert.equal(desktop.archPortalProgress, 0);
  assert.equal(desktop.humanCtaInteractive, false);

  const mobile = computeTypographyWorldState(0, true);
  assert.equal(mobile.maskScale, 1);
  assert.equal(mobile.maskShiftX, 0);
  assert.equal(mobile.secondaryLettersOpacity, 0);
});

test("Moment II passage dissolves A counter cleanly before peak zoom and holds veil until aperture clears viewport", () => {
  const midPassage = computeTypographyWorldState(0.28, false);
  assert.ok(midPassage.maskScale > 3, `expected maskScale > 3 at p=0.28, got ${midPassage.maskScale}`);
  assert.equal(midPassage.portalCounterOpen, 1, "A counter should already be cleanly resolved before peak zoom");
  assert.equal(midPassage.veilOpacity, 1, "veil must remain solid during portal zoom (no fade cheat)");
  assert.equal(midPassage.worldScrimOpacity, 0);

  const fullAperture = computeTypographyWorldState(0.42, false);
  assert.ok(
    fullAperture.maskScale > 20,
    `expected maskScale > 20 before veil release, got ${fullAperture.maskScale}`,
  );
  assert.equal(fullAperture.veilOpacity, 1);

  const arrivedWorld = computeTypographyWorldState(0.5, false);
  assert.equal(arrivedWorld.movement, "02");
  assert.equal(arrivedWorld.veilOpacity, 0);
  assert.ok(arrivedWorld.worldTextOpacity > 0.7);
  assert.ok(arrivedWorld.worldScrimOpacity > 0.8);
});

test("Moment III to IV dollies toward the arch and opens the human moment cleanly", () => {
  const preArch = computeTypographyWorldState(0.58, false);
  const midArch = computeTypographyWorldState(0.74, false);
  assert.ok(midArch.worldScale > preArch.worldScale + 0.15, "world camera should push toward the arch");
  assert.ok(midArch.archPortalProgress > 0.3 && midArch.archPortalProgress < 0.7);
  assert.ok(midArch.archRimOpacity > 0.4);

  const end = computeTypographyWorldState(1, false);
  assert.equal(end.movement, "03");
  assert.equal(end.archPortalProgress, 1);
  assert.equal(end.humanTextOpacity, 1);
  assert.equal(end.humanCtaInteractive, true);
});

test("State mapping is strictly deterministic and reversible", () => {
  const checkpoints = [0, 0.12, 0.25, 0.45, 0.58, 0.74, 0.9, 1];
  const forward = checkpoints.map((p) => computeTypographyWorldState(p, false));
  const backward = [...checkpoints].reverse().map((p) => computeTypographyWorldState(p, false));
  assert.deepEqual(forward, backward.reverse());
});
