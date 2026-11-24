import { clamp, smoothstep } from "../creative-lab/typography-world/choreography.ts";

export type EntrancePhase =
  | "pending"
  | "loading"
  | "complete-hold"
  | "dissolving-ui"
  | "transforming"
  | "complete"
  | "skipped";

export type EntrancePolicyMode = "cinematic" | "reduced" | "skip";

export type ReadinessStageId =
  | "hydration"
  | "fonts"
  | "heroMedia"
  | "geometry"
  | "stageReady";

export type ReadinessStageStatus = "pending" | "ready" | "degraded";

export type ReadinessStages = Record<ReadinessStageId, ReadinessStageStatus>;

export interface ReadinessSnapshot {
  stages: ReadinessStages;
  /** Honest readiness percentage [0, 100]. Never reaches 100 while any stage is pending. */
  percent: number;
  allReady: boolean;
  anyDegraded: boolean;
  settled: boolean;
  outcome: "pending" | "ready" | "degraded";
}

export interface EntrancePolicyContext {
  isProduction: boolean;
  pathname: string;
  hash: string;
  scrollY: number;
  navigationType: string;
  alreadyPlayed: boolean;
  reducedMotion: boolean;
  motionOffAttr: boolean;
}

export interface EntrancePolicyDecision {
  mode: EntrancePolicyMode;
  reason: string;
}

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface StartComposition {
  startScreenX: number;
  startScreenY: number;
  startScale: number;
  startWidthPx: number;
  startHeightPx: number;
  startBottomPx: number;
  hudTopPx: number;
}

export interface FirstLetterGeometry {
  viewportWidth: number;
  viewportHeight: number;
  isMobile: boolean;
  targetScreenRect: ScreenRect;
  targetBBoxCenterX: number;
  targetBBoxCenterY: number;
  startComposition: StartComposition;
  /** SVG user-space delta from resting hero A center to centered monumental A start center. */
  dxSvg: number;
  dySvg: number;
  startScale: number;
}

export interface FlightFrame {
  /** Normalized progress [0, 1]. */
  rawProgress: number;
  /** Sculpted luxury easing value [0, 1] — monotonic, zero bounce, zero overshoot. */
  eased: number;
  dxSvg: number;
  dySvg: number;
  scale: number;
  /** Deep obsidian shroud opacity inside the veil mask [0, 0.96]. */
  darknessOpacity: number;
  /** Staggered awakening opacities for desktop D, O, R, A [0, 1]. */
  secondaryOpacities: [number, number, number, number];
  /** Header, outer frame, opening subtitle, scroll cue, and bottom rail opacity [0, 1]. */
  chromeOpacity: number;
  /** Gentle upward editorial settle offset in pixels. */
  chromeOffsetY: number;
}

export const READINESS_WEIGHTS: Readonly<Record<ReadinessStageId, number>> = {
  hydration: 15,
  fonts: 25,
  heroMedia: 35,
  geometry: 15,
  stageReady: 10,
};

export const INITIAL_READINESS_STAGES: Readonly<ReadinessStages> = {
  hydration: "pending",
  fonts: "pending",
  heroMedia: "pending",
  geometry: "pending",
  stageReady: "pending",
};

/**
 * Evaluates honest readiness across observable entrance gates.
 * - Sums only verified `"ready"` stages.
 * - Caps below 100 whenever any stage is `"pending"` or `"degraded"`.
 * - Never pretends full success when a resource failed or timed out.
 */
export function computeWeightedReadiness(stages: ReadinessStages): ReadinessSnapshot {
  const keys: ReadinessStageId[] = ["hydration", "fonts", "heroMedia", "geometry", "stageReady"];
  let readySum = 0;
  let pendingCount = 0;
  let degradedCount = 0;

  for (const key of keys) {
    const status = stages[key];
    if (status === "ready") {
      readySum += READINESS_WEIGHTS[key];
    } else if (status === "degraded") {
      degradedCount += 1;
    } else {
      pendingCount += 1;
    }
  }

  const allReady = pendingCount === 0 && degradedCount === 0;
  const anyDegraded = degradedCount > 0;
  const settled = pendingCount === 0;

  // Never falsely report 100% unless every critical readiness stage succeeded.
  const percent = allReady ? 100 : Math.min(94, readySum);
  const outcome: ReadinessSnapshot["outcome"] = allReady
    ? "ready"
    : anyDegraded && settled
      ? "degraded"
      : "pending";

  return {
    stages: { ...stages },
    percent,
    allReady,
    anyDegraded,
    settled,
    outcome,
  };
}

/**
 * Determines whether the flagship entrance should run in full cinematic mode,
 * restrained reduced-motion mode, or skip immediately to preserve navigation/scroll context.
 */
export function decideEntrancePolicy(ctx: EntrancePolicyContext): EntrancePolicyDecision {
  if (!ctx.isProduction) {
    return { mode: "skip", reason: "non-production-mode" };
  }
  if (ctx.pathname !== "/") {
    return { mode: "skip", reason: "non-homepage-route" };
  }
  if (ctx.alreadyPlayed) {
    return { mode: "skip", reason: "already-played-in-session" };
  }
  if (ctx.navigationType === "back_forward") {
    return { mode: "skip", reason: "back-forward-navigation" };
  }
  if (ctx.hash && ctx.hash.length > 0) {
    return { mode: "skip", reason: "hash-deep-link" };
  }
  if (ctx.scrollY > 16) {
    return { mode: "skip", reason: "restored-scroll-position" };
  }
  if (ctx.reducedMotion || ctx.motionOffAttr) {
    return { mode: "reduced", reason: ctx.motionOffAttr ? "data-motion-off" : "prefers-reduced-motion" };
  }
  return { mode: "cinematic", reason: "fresh-homepage-entry" };
}

/**
 * Exact cubic-bezier evaluator for sculpted luxury motion (0.58, 0.0, 0.18, 1.0):
 * poised liftoff from stillness, silky glide across the highland valley,
 * and weightless architectural deceleration into the exact resting hero glyph.
 * Strictly monotonic on [0, 1] with zero overshoot and zero bounce.
 */
function sampleCubicBezier(t: number, p1: number, p2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}

function sampleCubicBezierDerivative(t: number, p1: number, p2: number): number {
  const u = 1 - t;
  return 3 * u * u * p1 + 6 * u * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

export function easeCinematicFlight(rawT: number): number {
  const x = clamp(rawT, 0, 1);
  if (x === 0 || x === 1) return x;

  // Control points: P1=(0.58, 0.0), P2=(0.18, 1.0)
  const x1 = 0.58;
  const y1 = 0.0;
  const x2 = 0.18;
  const y2 = 1.0;

  let t = x;
  for (let i = 0; i < 6; i += 1) {
    const err = sampleCubicBezier(t, x1, x2) - x;
    if (Math.abs(err) < 1e-6) break;
    const deriv = sampleCubicBezierDerivative(t, x1, x2);
    if (Math.abs(deriv) < 1e-6) break;
    t = clamp(t - err / deriv, 0, 1);
  }
  return clamp(sampleCubicBezier(t, y1, y2), 0, 1);
}

/**
 * Computes responsive start composition for the centered monumental A
 * directly from live viewport dimensions and live measured target glyph height.
 * Guarantees generous negative space and zero clipping across 360x640 .. 1920x1080.
 */
export function computeStartComposition(
  viewportWidth: number,
  viewportHeight: number,
  targetRect: Pick<ScreenRect, "width" | "height">,
  isMobile: boolean,
): StartComposition {
  const safeTargetH = Math.max(40, targetRect.height);
  const safeTargetW = Math.max(36, targetRect.width);
  // Playfair Display SVG <text> bounding boxes include generous line-box ascent/descent padding;
  // optical uppercase cap-height of 'A' is ~54% of the DOM line-box height.
  const opticalCapHeight = safeTargetH * 0.54;

  const startScreenX = viewportWidth * 0.5;
  const startScreenY = isMobile
    ? viewportHeight < 700
      ? viewportHeight * 0.39
      : viewportHeight * 0.42
    : viewportHeight * 0.44;

  const desiredCapHeight = isMobile
    ? Math.min(viewportHeight * 0.36, viewportWidth * 0.72, 310)
    : Math.min(viewportHeight * 0.36, viewportWidth * 0.23, 336);

  const maxWidthScale = (viewportWidth * (isMobile ? 0.74 : 0.38)) / safeTargetW;
  const rawScale = Math.min(desiredCapHeight / opticalCapHeight, maxWidthScale);

  const startScale = isMobile
    ? clamp(rawScale, 1.12, 1.24)
    : clamp(rawScale, 1.32, 1.48);

  const startHeightPx = opticalCapHeight * startScale;
  const startWidthPx = safeTargetW * startScale;
  const startBottomPx = startScreenY + startHeightPx * 0.52;

  // Place progress HUD harmoniously below the actual serif feet of A, clamped safely inside viewport
  const idealGap = clamp(viewportHeight * 0.056, 34, 56);
  const maxHudTop = Math.max(startBottomPx + 24, viewportHeight - 108);
  const hudTopPx = Math.min(startBottomPx + idealGap, maxHudTop);

  return {
    startScreenX,
    startScreenY,
    startScale,
    startWidthPx,
    startHeightPx,
    startBottomPx,
    hudTopPx,
  };
}

/**
 * Pure deterministic choreographer for Scene IV -> V (The Transformation -> The World Revealed).
 * At u = 0: monumental A stands solitary at viewport center in deep obsidian space.
 * At u = 1: identity transform (0, 0, 1.0), darkness gone, full ADORA wordmark & chrome settled.
 */
export function computeFlightFrame(
  rawProgress: number,
  geom: Pick<FirstLetterGeometry, "dxSvg" | "dySvg" | "startScale" | "isMobile">,
): FlightFrame {
  const u = clamp(rawProgress, 0, 1);
  const eased = easeCinematicFlight(u);

  const dxSvg = geom.dxSvg * (1 - eased) || 0;
  const dySvg = geom.dySvg * (1 - eased) || 0;
  const scale = geom.startScale + (1 - geom.startScale) * eased;

  // Deep obsidian shroud opens into the atmospheric blurred highland veil across mid-to-late flight
  const darknessOpacity = 0.96 * (1 - smoothstep(u, 0.22, 0.86));

  // Restrained left-to-right awakening of D, O, R, A on desktop after A clears D's corridor
  const secondaryOpacities: [number, number, number, number] = geom.isMobile
    ? [0, 0, 0, 0]
    : [
        smoothstep(u, 0.48, 0.80),
        smoothstep(u, 0.54, 0.84),
        smoothstep(u, 0.60, 0.88),
        smoothstep(u, 0.66, 0.92),
      ];

  // Header, outer frame, subtitle, scroll cue, and bottom rail breathe in as A settles
  const chromeProgress = smoothstep(u, 0.62, 0.98);
  const chromeOpacity = chromeProgress;
  const chromeOffsetY = (1 - chromeProgress) * 10;

  return {
    rawProgress: u,
    eased,
    dxSvg,
    dySvg,
    scale,
    darknessOpacity,
    secondaryOpacities,
    chromeOpacity,
    chromeOffsetY,
  };
}

/**
 * Builds the exact SVG transform string rotating/scaling around the measured glyph optical center.
 * Returns empty string at landing so the hero glyph carries zero residual inline transform.
 */
export function formatFirstATransform(
  targetCx: number,
  targetCy: number,
  dxSvg: number,
  dySvg: number,
  scale: number,
): string {
  if (Math.abs(dxSvg) < 0.01 && Math.abs(dySvg) < 0.01 && Math.abs(scale - 1) < 0.0002) {
    return "";
  }
  const tx = (targetCx + dxSvg).toFixed(3);
  const ty = (targetCy + dySvg).toFixed(3);
  const sc = scale.toFixed(5);
  const negCx = (-targetCx).toFixed(3);
  const negCy = (-targetCy).toFixed(3);
  return `translate(${tx} ${ty}) scale(${sc}) translate(${negCx} ${negCy})`;
}
