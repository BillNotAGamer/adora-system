export type MovementId = "01" | "02" | "03";

export interface TypographyWorldState {
  /** Normalized scroll progress clamped to [0, 1]. */
  progress: number;
  /** Active editorial movement label ("01" | "02" | "03"). */
  movement: MovementId;
  /** Bottom-left caption text key for the current movement. */
  movementCaption: string;

  /** Moment I (Identity) chrome & subtitle visibility [0, 1]. */
  openingTextOpacity: number;
  /** Slight upward drift in px for opening subtitle as user starts scrolling. */
  openingTextOffsetY: number;
  /** Outer architectural hairline frame opacity [0, 1]. */
  openingFrameOpacity: number;
  /** Subtle scroll cue opacity [0, 1]. */
  scrollCueOpacity: number;

  /**
   * Typography mask transform (desktop: ADORA -> focal A; mobile: monumental A).
   * Scale goes from 1.0 up to ~30.0 so the A portal sweeps completely past viewport corners.
   */
  maskScale: number;
  /** Horizontal shift in SVG viewBox units to center the focal A during Passage (desktop). */
  maskShiftX: number;
  /** Vertical shift in SVG viewBox units to align the focal A aperture during Passage. */
  maskShiftY: number;
  /** Opacity of D, O, R, final A inside the desktop mask [0, 1] as the first A becomes the sole doorway. */
  secondaryLettersOpacity: number;
  /**
   * Progress [0, 1] of dissolving the interior counter of the letter A
   * strictly within its outer glyph edges so A becomes a solid architectural doorway.
   */
  portalCounterOpen: number;
  /**
   * Overall opacity of the dark atmospheric veil [0, 1].
   * Stays at 1.0 throughout the entire zoom and only drops to 0 after the A aperture
   * has already expanded beyond all four viewport edges (zero crossfade cheat).
   */
  veilOpacity: number;

  /** Continuous highland-world camera scale (dolly-in across Moments I -> III, accelerating into the arch). */
  worldScale: number;
  /** Subtle vertical camera drift in percentage for highland-world. */
  worldTranslateY: number;
  /**
   * Scrim behind Moment III editorial copy [0, 1].
   * Remains 0 during Moment I/II so the first 'A' receives 100% un-dimmed sunlight.
   */
  worldScrimOpacity: number;

  /** Moment III (The World) editorial statement opacity [0, 1] and subtle Y drift in px. */
  worldTextOpacity: number;
  worldTextOffsetY: number;

  /**
   * Moment III -> IV architectural arch portal progress [0, 1].
   * 0 = closed, 1 = expanded past all four viewport corners.
   */
  archPortalProgress: number;
  /** Warm sunlit gold rim glow along the expanding arch edge [0, 1]. */
  archRimOpacity: number;

  /** Human-moment camera scale (settles gently from 1.12 -> 1.00 as visitor steps through the arch). */
  humanScale: number;

  /** Moment IV (The Human Moment) editorial statement & CTA opacity [0, 1] and Y drift in px. */
  humanTextOpacity: number;
  humanTextOffsetY: number;
  /** Whether Moment IV interactive CTA should accept pointer events. */
  humanCtaInteractive: boolean;
}

export function clamp(value: number, min = 0, max = 1): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function rangeProgress(value: number, start: number, end: number): number {
  if (end <= start) return value >= end ? 1 : 0;
  return clamp((value - start) / (end - start), 0, 1);
}

export function smoothstep(value: number, start: number, end: number): number {
  const t = rangeProgress(value, start, end);
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

/**
 * Pure deterministic mapping from normalized scroll progress [0, 1]
 * to every visual parameter of the Typography-to-World cinematic sequence.
 * Fully reversible for forward, backward, fast scroll, and reload restoration.
 */
export function computeTypographyWorldState(
  rawProgress: number,
  isMobile: boolean,
): TypographyWorldState {
  const p = clamp(rawProgress, 0, 1);

  // Movement indicator & bottom editorial caption
  let movement: MovementId = "01";
  let movementCaption = "THE FIRST INVITATION  /  TYPOGRAPHY BECOMES LANDSCAPE";
  if (p >= 0.78) {
    movement = "03";
    movementCaption = "THE ARRIVAL  /  THE LANDSCAPE BECOMES A HUMAN MOMENT";
  } else if (p >= 0.38) {
    movement = "02";
    movementCaption = "THE OPENING  /  TYPOGRAPHY EXPANDS INTO A REAL PLACE";
  }

  // Moment I — Opening subtitle, hairline frame, scroll cue
  const openingFade = smoothstep(p, 0.02, 0.13);
  const openingTextOpacity = 1 - openingFade;
  const openingTextOffsetY = openingFade * -24;
  const openingFrameOpacity = 1 - smoothstep(p, 0.04, 0.16);
  const scrollCueOpacity = 1 - smoothstep(p, 0.0, 0.08);

  // Moment II — The Passage through the monumental letter A
  const introScaleT = smoothstep(p, 0.0, 0.15);
  const passageT = rangeProgress(p, 0.14, 0.45);
  const passageEased = easeInOutCubic(passageT);

  // Exponential scale so zoom velocity feels perceptually uniform (constant apparent speed)
  const baseScale = 1 + introScaleT * 0.16;
  const maxPortalScale = isMobile ? 24 : 30;
  const maskScale = baseScale * Math.pow(maxPortalScale / baseScale, passageEased);

  // On desktop, smoothly glide the focal first 'A' (centered around x=356 in 1600x900)
  // toward the viewport center (x=800) so the visitor passes dead-center through the A.
  const centerGlideT = smoothstep(p, 0.1, 0.25);
  const maskShiftX = isMobile ? 0 : centerGlideT * 444;
  const maskShiftY = isMobile ? centerGlideT * 28 : centerGlideT * 46;

  // Secondary letters (D, O, R, final A) recede cleanly before the A takes over the viewport
  const secondaryLettersOpacity = isMobile ? 0 : 1 - smoothstep(p, 0.11, 0.21);

  // Dissolve the interior counter strictly inside the A before peak zoom so no inner polygon edge overhangs
  const portalCounterOpen = smoothstep(p, 0.14, 0.24);

  // Keep veil solid (1.0) while the A aperture expands; only release veil once the aperture
  // has already grown far past all four viewport edges (p >= 0.42).
  const veilOpacity = 1 - smoothstep(p, 0.42, 0.46);

  // Continuous highland-world camera push across Moments I -> III,
  // accelerating forward toward the stone arch as Moment III -> IV opens.
  const archApproachT = easeInOutCubic(rangeProgress(p, 0.6, 0.85));
  const worldScale = 1.0 + p * 0.14 + archApproachT * 0.46;
  const worldTranslateY = -p * 1.8;

  // Moment III scrim only fades in for Moment III copy; stays 0 in Moment I/II
  const worldScrimIn = smoothstep(p, 0.43, 0.51);
  const worldScrimOut = smoothstep(p, 0.65, 0.74);
  const worldScrimOpacity = clamp(worldScrimIn * (1 - worldScrimOut), 0, 1);

  // Moment III — The World editorial statement
  const worldTextIn = smoothstep(p, 0.45, 0.52);
  const worldTextOut = smoothstep(p, 0.64, 0.72);
  const worldTextOpacity = clamp(worldTextIn * (1 - worldTextOut), 0, 1);
  const worldTextOffsetY = (1 - worldTextIn) * 20 - worldTextOut * 22;

  // Moment III -> IV — Expanding architectural arch portal
  const archRaw = rangeProgress(p, 0.63, 0.85);
  const archPortalProgress = easeInOutCubic(archRaw);
  const archRimOpacity =
    archRaw <= 0 || archRaw >= 1
      ? 0
      : Math.sin(archRaw * Math.PI) * 0.85;

  // Human-moment camera settles smoothly as we step through the arch onto the terrace
  const humanSettleT = easeOutCubic(rangeProgress(p, 0.64, 0.96));
  const humanScale = 1.12 - humanSettleT * 0.12;

  // Moment IV — The Human Moment editorial display & CTA
  const humanTextIn = smoothstep(p, 0.82, 0.91);
  const humanTextOpacity = humanTextIn;
  const humanTextOffsetY = (1 - humanTextIn) * 24;
  const humanCtaInteractive = humanTextOpacity > 0.65;

  return {
    progress: p,
    movement,
    movementCaption,
    openingTextOpacity,
    openingTextOffsetY,
    openingFrameOpacity,
    scrollCueOpacity,
    maskScale,
    maskShiftX,
    maskShiftY,
    secondaryLettersOpacity,
    portalCounterOpen,
    veilOpacity,
    worldScale,
    worldTranslateY,
    worldScrimOpacity,
    worldTextOpacity,
    worldTextOffsetY,
    archPortalProgress,
    archRimOpacity,
    humanScale,
    humanTextOpacity,
    humanTextOffsetY,
    humanCtaInteractive,
  };
}
