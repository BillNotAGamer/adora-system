import assert from "node:assert/strict";
import test from "node:test";

import { resolveConciergeExperienceMode } from "./mode.ts";

test("CXP-04C rollback-safe mode defaults to ux1-dialog for missing, empty, or invalid values", () => {
  assert.equal(resolveConciergeExperienceMode(undefined), "ux1-dialog");
  assert.equal(resolveConciergeExperienceMode(null), "ux1-dialog");
  assert.equal(resolveConciergeExperienceMode(""), "ux1-dialog");
  assert.equal(resolveConciergeExperienceMode("   "), "ux1-dialog");
  assert.equal(resolveConciergeExperienceMode("atelier-mode"), "ux1-dialog");
  assert.equal(resolveConciergeExperienceMode("ATELIER"), "ux1-dialog");
  assert.equal(resolveConciergeExperienceMode("true"), "ux1-dialog");
  assert.equal(resolveConciergeExperienceMode("ux1"), "ux1-dialog");
});

test("CXP-04C activates atelier-workspace only on explicit 'atelier' value", () => {
  assert.equal(resolveConciergeExperienceMode("atelier"), "atelier-workspace");
  assert.equal(resolveConciergeExperienceMode(" atelier "), "atelier-workspace");
});
