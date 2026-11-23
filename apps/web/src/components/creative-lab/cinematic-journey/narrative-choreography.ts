import { clamp, easeInOutCubic, easeOutCubic, rangeProgress, smoothstep } from "../typography-world/choreography.ts";

export type JourneyMovementId = "01" | "02" | "03" | "04" | "05" | "06";

export interface CinematicJourneyState {
  progress: number;
  movement: JourneyMovementId;
  movementCaption: string;

  // Act 0 (CXP-01S preserved): Identity -> Passage -> World -> Colonnade Pass -> Human Moment
  openingTextOpacity: number;
  openingTextOffsetY: number;
  openingFrameOpacity: number;
  scrollCueOpacity: number;
  openingInteractive: boolean;

  maskScale: number;
  maskShiftX: number;
  maskShiftY: number;
  secondaryLettersOpacity: number;
  portalCounterOpen: number;
  veilOpacity: number;

  worldScale: number;
  worldTranslateX: number;
  worldTranslateY: number;
  worldScrimOpacity: number;
  worldTextOpacity: number;
  worldTextOffsetY: number;

  colonnadeProgress: number;
  pillarWidthPct: number;
  pillarLeftPct: number;
  pillarScale: number;
  humanRevealLeftPct: number;

  humanScale: number;
  humanTranslateX: number;
  humanTranslateY: number;
  humanTextOpacity: number;
  humanTextOffsetY: number;

  // Act I (NEW): Human Moment -> Discovery (Camera Pullback from Café Terrace into Diurnal Atlas)
  /** 0 = full-bleed Human Moment; 1 = Human Moment reframed as left origin chapter of Discovery. */
  humanReframeProgress: number;
  /** CSS clip-path inset percentages for the continuous Human Moment pullback frame. */
  humanClipTopPct: number;
  humanClipRightPct: number;
  humanClipBottomPct: number;
  humanClipLeftPct: number;
  /** Overall opacity of the Human Moment plate as Discovery gives way to Your Journey. */
  humanLayerOpacity: number;

  /** Visibility of the obsidian-forest Discovery backdrop & Diurnal Horizon Ribbon [0, 1]. */
  discoveryOpacity: number;
  /** Horizontal ribbon translation in % (driven smoothly by vertical scroll across p = 0.54..0.72). */
  discoveryRibbonShiftPct: number;
  /** Whether Discovery links are interactive. */
  discoveryInteractive: boolean;

  // Act II (NEW): Discovery -> Your Journey (Widescreen Cinema-Shutter Horizon Convergence)
  /** 0 = closed horizontal shutter; 1 = full-bleed highland twilight horizon. */
  journeyShutterProgress: number;
  journeyTextOpacity: number;
  journeyTextOffsetY: number;
  journeyScale: number;
  journeyInteractive: boolean;

  // Act III (NEW): Your Journey -> AI Concierge (Intimate Obsidian-and-Gold Studio Finale)
  conciergeBackdropOpacity: number;
  conciergeOpacity: number;
  conciergeOffsetY: number;
  conciergeInteractive: boolean;
}

/**
 * Pure deterministic state engine for the complete 6-movement ADORA CXP-02 narrative:
 *   01 Identity (0.00..0.07)
 *   -> Passage through A (0.07..0.21)
 *   -> 02 World (0.21..0.30)
 *   -> 2.5D Stone Colonnade Pass (0.30..0.39)
 *   -> 03 Human Moment (0.39..0.48)
 *   -> 04 Human-to-Discovery Pullback & Diurnal Ribbon (0.48..0.72)
 *   -> 05 Discovery-to-Your-Journey Horizon Shutter (0.72..0.87)
 *   -> 06 Your-Journey-to-AI-Concierge Finale (0.87..1.00)
 */
export function computeCinematicJourneyState(
  rawProgress: number,
  isMobile: boolean,
): CinematicJourneyState {
  const p = clamp(rawProgress, 0, 1);

  let movement: JourneyMovementId = "01";
  let movementCaption = "01  /  IDENTITY — TYPOGRAPHY BECOMES LANDSCAPE";
  if (p >= 0.88) {
    movement = "06";
    movementCaption = "06  /  AI CONCIERGE — BEGIN YOUR PERSONAL JOURNEY";
  } else if (p >= 0.73) {
    movement = "05";
    movementCaption = "05  /  YOUR JOURNEY — FROM INSPIRATION TO INTENTION";
  } else if (p >= 0.5) {
    movement = "04";
    movementCaption = "04  /  DISCOVERY — BEYOND ONE QUIET MORNING";
  } else if (p >= 0.37) {
    movement = "03";
    movementCaption = "03  /  THE HUMAN MOMENT — THE ART OF GOING SLOW";
  } else if (p >= 0.19) {
    movement = "02";
    movementCaption = "02  /  THE WORLD — ENTERING THE HIGHLANDS";
  }

  // --- ACT 0: Preserved CXP-01S opening mapped cleanly onto p in [0.00, 0.48] ---
  const openingFade = smoothstep(p, 0.01, 0.065);
  const openingTextOpacity = 1 - openingFade;
  const openingTextOffsetY = openingFade * -24;
  const openingFrameOpacity = 1 - smoothstep(p, 0.02, 0.08);
  const scrollCueOpacity = 1 - smoothstep(p, 0.0, 0.045);
  const openingInteractive = openingTextOpacity > 0.5;

  const introScaleT = smoothstep(p, 0.0, 0.075);
  const passageT = rangeProgress(p, 0.07, 0.215);
  const passageEased = easeInOutCubic(passageT);

  const baseScale = 1 + introScaleT * 0.16;
  const maxPortalScale = isMobile ? 24 : 30;
  const maskScale = baseScale * Math.pow(maxPortalScale / baseScale, passageEased);

  const centerGlideT = smoothstep(p, 0.05, 0.125);
  const maskShiftX = isMobile ? 0 : centerGlideT * 444;
  const maskShiftY = isMobile ? centerGlideT * 28 : centerGlideT * 46;

  const secondaryLettersOpacity = isMobile ? 0 : 1 - smoothstep(p, 0.055, 0.105);
  const portalCounterOpen = smoothstep(p, 0.07, 0.12);
  const veilOpacity = 1 - smoothstep(p, 0.2, 0.22);

  // Far highland plane (dolly + lateral orbit during colonnade pass)
  const orbitT = easeInOutCubic(rangeProgress(p, 0.29, 0.41));
  const worldScale = 1.0 + Math.min(p, 0.42) * 0.28 + orbitT * 0.2;
  const worldTranslateX = -orbitT * (isMobile ? 5.5 : 7.0);
  const worldTranslateY = -Math.min(p, 0.42) * 3.0;

  const worldScrimIn = smoothstep(p, 0.205, 0.245);
  const worldScrimOut = smoothstep(p, 0.295, 0.335);
  const worldScrimOpacity = clamp(worldScrimIn * (1 - worldScrimOut), 0, 1);

  const worldTextIn = smoothstep(p, 0.215, 0.25);
  const worldTextOut = smoothstep(p, 0.29, 0.33);
  const worldTextOpacity = clamp(worldTextIn * (1 - worldTextOut), 0, 1);
  const worldTextOffsetY = (1 - worldTextIn) * 20 - worldTextOut * 22;

  // 2.5D Stone Colonnade Occlusion Pass (p = 0.30..0.41)
  const colonnadeRaw = rangeProgress(p, 0.3, 0.41);
  const colonnadeProgress = easeInOutCubic(colonnadeRaw);
  const pillarWidthPct = isMobile ? 48 : 34;
  const startLeftPct = 102;
  const endLeftPct = -pillarWidthPct - 4;
  const pillarLeftPct = startLeftPct + (endLeftPct - startLeftPct) * colonnadeProgress;
  const pillarScale = 1 + Math.sin(colonnadeProgress * Math.PI) * 0.08;
  const pillarCenterPct = pillarLeftPct + pillarWidthPct * 0.5;
  const humanRevealLeftPct = clamp(pillarCenterPct, 0, 100);

  // Mid-plane Human Moment settles cleanly, then pulls back into Discovery
  const humanSettleT = easeOutCubic(rangeProgress(p, 0.31, 0.45));
  const humanTextIn = smoothstep(p, 0.39, 0.435);
  const humanTextOut = smoothstep(p, 0.47, 0.515);
  const humanTextOpacity = clamp(humanTextIn * (1 - humanTextOut), 0, 1);
  const humanTextOffsetY = (1 - humanTextIn) * 22 - humanTextOut * 26;

  // --- ACT I (NEW): Human Moment -> Discovery (p = 0.48..0.73) ---
  // The full-bleed café terrace physically reframes into the left origin anchor plate
  // while smoothly panning the subject (woman with steaming cup) into the docked frame.
  // CXP-03A polish: keep the woman's face & cup squarely centered inside the desktop 30% origin plate
  // without altering the verified mobile framing.
  const humanReframeProgress = easeInOutCubic(rangeProgress(p, 0.485, 0.565));
  const humanScale = 1.09 - humanSettleT * 0.09 + humanReframeProgress * (isMobile ? 0.08 : 0.04);
  const colonnadeSlideX = (1 - humanSettleT) * (isMobile ? 4.5 : 5.5);
  const reframePanX = isMobile ? 0 : -56 * humanReframeProgress;
  const humanTranslateX = colonnadeSlideX + reframePanX;
  const humanTranslateY = isMobile ? -25 * humanReframeProgress : -1 * humanReframeProgress;

  // Target reframed box for Human Moment as origin chapter "01 · Sáng sớm"
  const targetTop = isMobile ? 12 : 16;
  const targetRight = isMobile ? 6 : 66.5;
  const targetBottom = isMobile ? 62 : 14;
  const targetLeft = isMobile ? 6 : 3.5;

  // Before colonnade finishes, left clip is controlled by humanRevealLeftPct;
  // after p >= 0.485, it smoothly transitions into the reframed origin plate.
  const humanClipTopPct = targetTop * humanReframeProgress;
  const humanClipRightPct = targetRight * humanReframeProgress;
  const humanClipBottomPct = targetBottom * humanReframeProgress;
  const humanClipLeftPct =
    p < 0.46
      ? humanRevealLeftPct
      : targetLeft * humanReframeProgress;

  // Fade out the reframed Human Moment plate cleanly as Your Journey shutter closes over Discovery
  const discoveryExit = smoothstep(p, 0.7, 0.765);
  const humanLayerOpacity = 1 - discoveryExit;

  const discoveryIn = smoothstep(p, 0.51, 0.575);
  const discoveryOpacity = clamp(discoveryIn * (1 - discoveryExit), 0, 1);
  const ribbonRaw = rangeProgress(p, 0.56, 0.715);
  const discoveryRibbonShiftPct = easeInOutCubic(ribbonRaw) * (isMobile ? 74 : 52);
  const discoveryInteractive = discoveryOpacity > 0.65;

  // --- ACT II (NEW): Discovery -> Your Journey (p = 0.715..0.885) ---
  // Widescreen horizontal cinema shutter expands from center horizon into twilight highlands
  // CXP-03A polish: slightly gentler shutter & typography handoff for clearer readability.
  const journeyShutterRaw = rangeProgress(p, 0.715, 0.81);
  const journeyShutterProgress = easeInOutCubic(journeyShutterRaw);
  const journeyIn = smoothstep(p, 0.76, 0.818);
  const journeyOut = smoothstep(p, 0.87, 0.912);
  const journeyTextOpacity = clamp(journeyIn * (1 - journeyOut), 0, 1);
  const journeyTextOffsetY = (1 - journeyIn) * 24 - journeyOut * 24;
  const journeyScale = 1.12 - easeOutCubic(rangeProgress(p, 0.715, 0.92)) * 0.12;
  const journeyInteractive = journeyTextOpacity > 0.65;

  // --- ACT III (NEW): Your Journey -> AI Concierge Finale (p = 0.88..1.00) ---
  const conciergeBackdropOpacity = smoothstep(p, 0.875, 0.94);
  const conciergeOpacity = smoothstep(p, 0.9, 0.955);
  const conciergeOffsetY = (1 - conciergeOpacity) * 24;
  const conciergeInteractive = conciergeOpacity > 0.65;

  return {
    progress: p,
    movement,
    movementCaption,
    openingTextOpacity,
    openingTextOffsetY,
    openingFrameOpacity,
    scrollCueOpacity,
    openingInteractive,
    maskScale,
    maskShiftX,
    maskShiftY,
    secondaryLettersOpacity,
    portalCounterOpen,
    veilOpacity,
    worldScale,
    worldTranslateX,
    worldTranslateY,
    worldScrimOpacity,
    worldTextOpacity,
    worldTextOffsetY,
    colonnadeProgress,
    pillarWidthPct,
    pillarLeftPct,
    pillarScale,
    humanRevealLeftPct,
    humanScale,
    humanTranslateX,
    humanTranslateY,
    humanTextOpacity,
    humanTextOffsetY,
    humanReframeProgress,
    humanClipTopPct,
    humanClipRightPct,
    humanClipBottomPct,
    humanClipLeftPct,
    humanLayerOpacity,
    discoveryOpacity,
    discoveryRibbonShiftPct,
    discoveryInteractive,
    journeyShutterProgress,
    journeyTextOpacity,
    journeyTextOffsetY,
    journeyScale,
    journeyInteractive,
    conciergeBackdropOpacity,
    conciergeOpacity,
    conciergeOffsetY,
    conciergeInteractive,
  };
}
