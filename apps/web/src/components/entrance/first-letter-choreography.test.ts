import assert from "node:assert/strict";
import test from "node:test";

import {
  computeFlightFrame,
  computeStartComposition,
  computeWeightedReadiness,
  decideEntrancePolicy,
  easeCinematicFlight,
  formatFirstATransform,
  INITIAL_READINESS_STAGES,
  READINESS_WEIGHTS,
} from "./first-letter-choreography.ts";

test("readiness weights sum to 100 and never falsely claim 100% while pending or degraded", () => {
  const totalWeight = Object.values(READINESS_WEIGHTS).reduce((acc, n) => acc + n, 0);
  assert.equal(totalWeight, 100);

  const initial = computeWeightedReadiness({ ...INITIAL_READINESS_STAGES });
  assert.equal(initial.percent, 0);
  assert.equal(initial.allReady, false);
  assert.equal(initial.outcome, "pending");

  // Pending heroMedia must hold below 100 even when all other stages are ready
  const waitingMedia = computeWeightedReadiness({
    hydration: "ready",
    fonts: "ready",
    heroMedia: "pending",
    geometry: "ready",
    stageReady: "ready",
  });
  assert.equal(waitingMedia.percent, 65);
  assert.equal(waitingMedia.allReady, false);
  assert.equal(waitingMedia.outcome, "pending");

  // Failed/degraded heroMedia settles as degraded, never ready / 100%
  const degradedMedia = computeWeightedReadiness({
    hydration: "ready",
    fonts: "ready",
    heroMedia: "degraded",
    geometry: "ready",
    stageReady: "ready",
  });
  assert.equal(degradedMedia.percent, 65);
  assert.equal(degradedMedia.allReady, false);
  assert.equal(degradedMedia.anyDegraded, true);
  assert.equal(degradedMedia.settled, true);
  assert.equal(degradedMedia.outcome, "degraded");

  // Only when all 5 stages are verified ready does readiness reach 100%
  const allReady = computeWeightedReadiness({
    hydration: "ready",
    fonts: "ready",
    heroMedia: "ready",
    geometry: "ready",
    stageReady: "ready",
  });
  assert.equal(allReady.percent, 100);
  assert.equal(allReady.allReady, true);
  assert.equal(allReady.outcome, "ready");
});

test("entrance navigation policy respects route, scroll restoration, history, and reduced motion", () => {
  const base = {
    isProduction: true,
    pathname: "/",
    hash: "",
    scrollY: 0,
    navigationType: "navigate",
    alreadyPlayed: false,
    reducedMotion: false,
    motionOffAttr: false,
  };

  assert.equal(decideEntrancePolicy(base).mode, "cinematic");
  assert.equal(decideEntrancePolicy({ ...base, reducedMotion: true }).mode, "reduced");
  assert.equal(decideEntrancePolicy({ ...base, motionOffAttr: true }).mode, "reduced");
  assert.equal(decideEntrancePolicy({ ...base, isProduction: false }).mode, "skip");
  assert.equal(decideEntrancePolicy({ ...base, pathname: "/ai-planner" }).mode, "skip");
  assert.equal(decideEntrancePolicy({ ...base, alreadyPlayed: true }).mode, "skip");
  assert.equal(decideEntrancePolicy({ ...base, navigationType: "back_forward" }).mode, "skip");
  assert.equal(decideEntrancePolicy({ ...base, hash: "#how-it-works" }).mode, "skip");
  assert.equal(decideEntrancePolicy({ ...base, scrollY: 4200 }).mode, "skip");
});

test("cinematic flight easing is strictly monotonic with zero overshoot or bounce", () => {
  assert.equal(easeCinematicFlight(0), 0);
  assert.equal(easeCinematicFlight(1), 1);

  let prev = 0;
  for (let i = 1; i <= 100; i += 1) {
    const val = easeCinematicFlight(i / 100);
    assert.ok(val >= prev, `Non-monotonic step at ${i}%: ${val} < ${prev}`);
    assert.ok(val >= 0 && val <= 1, `Overshoot detected at ${i}%: ${val}`);
    prev = val;
  }
});

test("flight choreography starts solitary at center and lands identically at hero resting state", () => {
  const desktopGeom = { dxSvg: 444, dySvg: -12, startScale: 1.46, isMobile: false };

  const start = computeFlightFrame(0, desktopGeom);
  assert.equal(start.dxSvg, 444);
  assert.equal(start.scale, 1.46);
  assert.deepEqual(start.secondaryOpacities, [0, 0, 0, 0]);
  assert.equal(start.chromeOpacity, 0);
  assert.ok(start.darknessOpacity > 0.9);

  const mid = computeFlightFrame(0.55, desktopGeom);
  assert.ok(mid.dxSvg > 0 && mid.dxSvg < 444);
  assert.ok(mid.scale > 1 && mid.scale < 1.46);
  // Staggered awakening: D leads O leads R leads A
  assert.ok(mid.secondaryOpacities[0] >= mid.secondaryOpacities[1]);
  assert.ok(mid.secondaryOpacities[1] >= mid.secondaryOpacities[2]);
  assert.ok(mid.secondaryOpacities[2] >= mid.secondaryOpacities[3]);

  const end = computeFlightFrame(1, desktopGeom);
  assert.equal(end.dxSvg, 0);
  assert.equal(end.dySvg, 0);
  assert.equal(end.scale, 1);
  assert.equal(end.darknessOpacity, 0);
  assert.deepEqual(end.secondaryOpacities, [1, 1, 1, 1]);
  assert.equal(end.chromeOpacity, 1);
  assert.equal(end.chromeOffsetY, 0);
  assert.equal(formatFirstATransform(356, 390, end.dxSvg, end.dySvg, end.scale), "");
});

test("responsive start composition fits cleanly without clipping across all 8 required viewports", () => {
  const matrix: Array<[number, number, boolean, number, number]> = [
    [360, 640, true, 184, 361],
    [360, 800, true, 230, 452],
    [390, 844, true, 242, 477],
    [430, 932, true, 267, 526],
    [768, 1024, false, 242, 476],
    [1024, 768, false, 182, 357],
    [1440, 900, false, 212, 419],
    [1920, 1080, false, 255, 502],
  ];

  for (const [vw, vh, isMobile, tw, th] of matrix) {
    const comp = computeStartComposition(vw, vh, { width: tw, height: th }, isMobile);
    assert.equal(comp.startScreenX, vw * 0.5);
    assert.ok(comp.startScale > 1.0, `Expected monumental scale > 1 at ${vw}x${vh}`);
    assert.ok(
      comp.startScreenY - comp.startHeightPx * 0.5 > 16,
      `Top clipping risk at ${vw}x${vh}`,
    );
    assert.ok(
      comp.hudTopPx < vh - 56,
      `Progress HUD too close to bottom edge at ${vw}x${vh}: hudTop=${comp.hudTopPx}, vh=${vh}`,
    );
    assert.ok(
      comp.hudTopPx > comp.startBottomPx + 14,
      `HUD overlaps letter feet at ${vw}x${vh}`,
    );
  }
});
