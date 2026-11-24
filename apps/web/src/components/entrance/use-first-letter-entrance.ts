"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

import {
  computeFlightFrame,
  computeStartComposition,
  computeWeightedReadiness,
  decideEntrancePolicy,
  formatFirstATransform,
  INITIAL_READINESS_STAGES,
  type EntrancePhase,
  type EntrancePolicyMode,
  type FirstLetterGeometry,
  type ReadinessSnapshot,
  type ReadinessStageId,
  type ReadinessStages,
  type ReadinessStageStatus,
  type ScreenRect,
} from "./first-letter-choreography";

declare global {
  interface Window {
    __ADORA_CXP05_PLAYED__?: boolean;
    __ADORA_CXP05_OWNED__?: boolean;
    __ADORA_CXP05_TELEMETRY__?: FirstLetterTelemetry;
  }
}

export interface FirstLetterTelemetry {
  policyMode: EntrancePolicyMode;
  policyReason: string;
  phase: EntrancePhase;
  outcome: "pending" | "ready" | "degraded" | "skipped";
  startedAtMs: number;
  readyAtMs: number | null;
  completedAtMs: number | null;
  flightDurationMs: number;
  stages: ReadinessStages;
  stageTimestampsMs: Partial<Record<ReadinessStageId, number>>;
  startRect: ScreenRect | null;
  targetRect: ScreenRect | null;
  landingRect: ScreenRect | null;
  landingDeltaPx: { dx: number; dy: number; dw: number; dh: number } | null;
  startScale: number | null;
  midFlightSample: {
    u: number;
    dxSvg: number;
    dySvg: number;
    scale: number;
    darknessOpacity: number;
  } | null;
  viewport: { width: number; height: number; dpr: number; isMobile: boolean } | null;
  reducedMotion: boolean;
  motionOffAttr: boolean;
}

export interface UseFirstLetterEntranceArgs {
  isProduction: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
  veilSvgRef: RefObject<SVGSVGElement | null>;
  worldImgRef: RefObject<HTMLImageElement | null>;
  entranceFirstAGroupRef: RefObject<SVGGElement | null>;
  heroFirstAAnchorRef: RefObject<SVGTextElement | null>;
  entranceDarknessRef: RefObject<SVGRectElement | null>;
  secondaryDRef: RefObject<SVGTextElement | null>;
  secondaryORef: RefObject<SVGTextElement | null>;
  secondaryRRef: RefObject<SVGTextElement | null>;
  secondaryFinalARef: RefObject<SVGTextElement | null>;
}

export interface UseFirstLetterEntranceResult {
  entranceActive: boolean;
  isReducedMode: boolean;
  isMotionOff: boolean;
  phase: EntrancePhase;
  displayPercent: number;
  hudTopPx: number | null;
  statusMessage: string;
}

const COMPLETE_HOLD_MS = 220;
const DISSOLVE_UI_MS = 280;
const FLIGHT_DURATION_MS = 1160;
const FONT_TIMEOUT_MS = 2200;
const MEDIA_TIMEOUT_MS = 3800;
const GEOMETRY_TIMEOUT_MS = 1200;
const HARD_CEILING_MS = 4500;
const MAX_PROGRESS_SPEED_PER_SEC = 160;

function readNavigationType(): string {
  try {
    const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return entries?.[0]?.type || "navigate";
  } catch {
    return "navigate";
  }
}

function measureLiveGeometry(
  svg: SVGSVGElement | null,
  anchor: SVGTextElement | null,
  isMobile: boolean,
): FirstLetterGeometry | null {
  if (!svg || !anchor) return null;
  const ctm = svg.getScreenCTM();
  if (!ctm || ctm.a <= 0 || ctm.d <= 0) return null;

  const domRect = anchor.getBoundingClientRect();
  if (domRect.width < 10 || domRect.height < 10) return null;

  let bbox: DOMRect;
  try {
    bbox = anchor.getBBox();
  } catch {
    return null;
  }
  if (bbox.width < 10 || bbox.height < 10) return null;

  const vw = document.documentElement.clientWidth || window.innerWidth || 1440;
  const vh = window.innerHeight || 900;

  const targetScreenRect: ScreenRect = {
    left: domRect.left,
    top: domRect.top,
    width: domRect.width,
    height: domRect.height,
    centerX: domRect.left + domRect.width * 0.5,
    centerY: domRect.top + domRect.height * 0.5,
  };

  const targetBBoxCenterX = bbox.x + bbox.width * 0.5;
  const targetBBoxCenterY = bbox.y + bbox.height * 0.5;
  const startComposition = computeStartComposition(vw, vh, targetScreenRect, isMobile);

  const inv = ctm.inverse();
  const startSvgX =
    inv.a * startComposition.startScreenX + inv.c * startComposition.startScreenY + inv.e;
  const startSvgY =
    inv.b * startComposition.startScreenX + inv.d * startComposition.startScreenY + inv.f;

  return {
    viewportWidth: vw,
    viewportHeight: vh,
    isMobile,
    targetScreenRect,
    targetBBoxCenterX,
    targetBBoxCenterY,
    startComposition,
    dxSvg: startSvgX - targetBBoxCenterX,
    dySvg: startSvgY - targetBBoxCenterY,
    startScale: startComposition.startScale,
  };
}

export function useFirstLetterEntrance({
  isProduction,
  isMobile,
  reducedMotion,
  veilSvgRef,
  worldImgRef,
  entranceFirstAGroupRef,
  heroFirstAAnchorRef,
  entranceDarknessRef,
  secondaryDRef,
  secondaryORef,
  secondaryRRef,
  secondaryFinalARef,
}: UseFirstLetterEntranceArgs): UseFirstLetterEntranceResult {
  const [phase, setPhase] = useState<EntrancePhase>(() => (isProduction ? "pending" : "skipped"));
  const [policyMode, setPolicyMode] = useState<EntrancePolicyMode>("skip");
  const [displayPercent, setDisplayPercent] = useState<number>(0);
  const [hudTopPx, setHudTopPx] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isMotionOff, setIsMotionOff] = useState<boolean>(false);

  const isMobileRef = useRef(isMobile);
  const reducedMotionRef = useRef(reducedMotion);
  useIsomorphicLayoutEffect(() => {
    isMobileRef.current = isMobile;
    reducedMotionRef.current = reducedMotion;
  }, [isMobile, reducedMotion]);

  const geometryRef = useRef<FirstLetterGeometry | null>(null);
  const activeModeRef = useRef<EntrancePolicyMode>("skip");
  const phaseRef = useRef<EntrancePhase>("pending");

  // Helper to apply a FlightFrame directly to the SVG & chrome custom properties (60fps, zero React re-renders)
  const applyFlightFrameDom = (
    geom: FirstLetterGeometry,
    rawProgress: number,
  ) => {
    const frame = computeFlightFrame(rawProgress, geom);
    const transform = formatFirstATransform(
      geom.targetBBoxCenterX,
      geom.targetBBoxCenterY,
      frame.dxSvg,
      frame.dySvg,
      frame.scale,
    );

    if (entranceFirstAGroupRef.current) {
      if (transform) {
        entranceFirstAGroupRef.current.setAttribute("transform", transform);
      } else {
        entranceFirstAGroupRef.current.removeAttribute("transform");
      }
    }

    if (entranceDarknessRef.current) {
      entranceDarknessRef.current.setAttribute("fill-opacity", frame.darknessOpacity.toFixed(4));
    }

    const secRefs = [secondaryDRef, secondaryORef, secondaryRRef, secondaryFinalARef];
    for (let i = 0; i < secRefs.length; i += 1) {
      const el = secRefs[i]?.current;
      if (!el) continue;
      if (rawProgress >= 1) {
        el.removeAttribute("fill-opacity");
      } else {
        const op = frame.secondaryOpacities[i] ?? 1;
        el.setAttribute("fill-opacity", op.toFixed(4));
      }
    }

    const root = document.documentElement;
    if (rawProgress >= 1) {
      root.style.removeProperty("--cxp05-chrome-opacity");
      root.style.removeProperty("--cxp05-chrome-offset");
    } else {
      root.style.setProperty("--cxp05-chrome-opacity", frame.chromeOpacity.toFixed(4));
      root.style.setProperty("--cxp05-chrome-offset", `${frame.chromeOffsetY.toFixed(2)}px`);
    }

    return frame;
  };

  const resetSvgOverrides = () => {
    entranceFirstAGroupRef.current?.removeAttribute("transform");
    entranceDarknessRef.current?.setAttribute("fill-opacity", "0");
    secondaryDRef.current?.removeAttribute("fill-opacity");
    secondaryORef.current?.removeAttribute("fill-opacity");
    secondaryRRef.current?.removeAttribute("fill-opacity");
    secondaryFinalARef.current?.removeAttribute("fill-opacity");
    document.documentElement.style.removeProperty("--cxp05-chrome-opacity");
    document.documentElement.style.removeProperty("--cxp05-chrome-offset");
  };

  // Re-measure & re-anchor immediately whenever responsive breakpoint switches while loading
  useIsomorphicLayoutEffect(() => {
    if (!isProduction) return;
    if (activeModeRef.current !== "cinematic") return;
    if (
      phaseRef.current !== "loading" &&
      phaseRef.current !== "complete-hold" &&
      phaseRef.current !== "dissolving-ui"
    ) {
      return;
    }
    const geom = measureLiveGeometry(veilSvgRef.current, heroFirstAAnchorRef.current, isMobile);
    if (geom) {
      geometryRef.current = geom;
      applyFlightFrameDom(geom, 0);
      window.requestAnimationFrame(() => {
        setHudTopPx(geom.startComposition.hudTopPx);
      });
    }
  }, [isMobile, isProduction]);

  useEffect(() => {
    if (!isProduction) {
      phaseRef.current = "skipped";
      return;
    }

    let disposed = false;
    let rafId = 0;
    const timeouts: number[] = [];
    const registerTimeout = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        if (!disposed) fn();
      }, ms);
      timeouts.push(id);
      return id;
    };

    const root = document.documentElement;
    window.__ADORA_CXP05_OWNED__ = true;

    const motionOffAttr = root.getAttribute("data-motion") === "off";
    const reduceMedia = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effectiveReduced = reducedMotionRef.current || reduceMedia || motionOffAttr;
    const syncState = (fn: () => void) => {
      queueMicrotask(() => {
        if (!disposed) fn();
      });
    };
    syncState(() => setIsMotionOff(motionOffAttr));

    const decision = decideEntrancePolicy({
      isProduction,
      pathname: window.location.pathname,
      hash: window.location.hash,
      scrollY: window.scrollY || window.pageYOffset || 0,
      navigationType: readNavigationType(),
      alreadyPlayed: Boolean(window.__ADORA_CXP05_PLAYED__),
      reducedMotion: effectiveReduced,
      motionOffAttr,
    });

    const telemetry: FirstLetterTelemetry = {
      policyMode: decision.mode,
      policyReason: decision.reason,
      phase: decision.mode === "skip" ? "skipped" : "loading",
      outcome: decision.mode === "skip" ? "skipped" : "pending",
      startedAtMs: performance.now(),
      readyAtMs: null,
      completedAtMs: null,
      flightDurationMs: decision.mode === "cinematic" ? FLIGHT_DURATION_MS : 0,
      stages: { ...INITIAL_READINESS_STAGES },
      stageTimestampsMs: {},
      startRect: null,
      targetRect: null,
      landingRect: null,
      landingDeltaPx: null,
      startScale: null,
      midFlightSample: null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
        isMobile: window.matchMedia("(max-width: 767px)").matches,
      },
      reducedMotion: effectiveReduced,
      motionOffAttr,
    };
    window.__ADORA_CXP05_TELEMETRY__ = telemetry;

    if (decision.mode === "skip") {
      activeModeRef.current = "skip";
      phaseRef.current = "skipped";
      window.__ADORA_CXP05_PLAYED__ = true;
      syncState(() => {
        setPolicyMode("skip");
        setPhase("skipped");
      });
      resetSvgOverrides();
      delete root.dataset.cxp05Entrance;
      return () => {
        disposed = true;
      };
    }

    // Save prior overflow & padding styles; compensate scrollbar gutter so landing has 0.00px horizontal shift
    const prevHtmlOverflow = root.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
    let scrollLocked = true;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const releaseScrollLock = () => {
      if (!scrollLocked) return;
      scrollLocked = false;
      root.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.paddingRight = prevBodyPaddingRight;
    };

    const blockWheelOrTouch = (e: Event) => {
      if (scrollLocked) e.preventDefault();
    };
    const blockScrollKeys = (e: KeyboardEvent) => {
      if (!scrollLocked) return;
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "PageDown" ||
        e.key === "PageUp" ||
        e.key === " " ||
        e.key === "Home" ||
        e.key === "End"
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", blockWheelOrTouch, { passive: false });
    window.addEventListener("touchmove", blockWheelOrTouch, { passive: false });
    window.addEventListener("keydown", blockScrollKeys);

    activeModeRef.current = decision.mode;
    phaseRef.current = "loading";
    syncState(() => {
      setPolicyMode(decision.mode);
      setPhase("loading");
      setStatusMessage("Preparing ADORA");
    });

    let stages: ReadinessStages = { ...INITIAL_READINESS_STAGES };
    let snapshot: ReadinessSnapshot = computeWeightedReadiness(stages);
    let completionStarted = false;
    let finished = false;

    const finishEntrance = (outcome: "ready" | "degraded", reasonOverride?: string) => {
      if (finished || disposed) return;
      finished = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      resetSvgOverrides();
      releaseScrollLock();

      const landingDomRect = heroFirstAAnchorRef.current?.getBoundingClientRect();
      if (landingDomRect && landingDomRect.width > 0) {
        telemetry.landingRect = {
          left: Number(landingDomRect.left.toFixed(2)),
          top: Number(landingDomRect.top.toFixed(2)),
          width: Number(landingDomRect.width.toFixed(2)),
          height: Number(landingDomRect.height.toFixed(2)),
          centerX: Number((landingDomRect.left + landingDomRect.width * 0.5).toFixed(2)),
          centerY: Number((landingDomRect.top + landingDomRect.height * 0.5).toFixed(2)),
        };
        if (telemetry.targetRect) {
          telemetry.landingDeltaPx = {
            dx: Number((telemetry.landingRect.centerX - telemetry.targetRect.centerX).toFixed(2)),
            dy: Number((telemetry.landingRect.centerY - telemetry.targetRect.centerY).toFixed(2)),
            dw: Number((telemetry.landingRect.width - telemetry.targetRect.width).toFixed(2)),
            dh: Number((telemetry.landingRect.height - telemetry.targetRect.height).toFixed(2)),
          };
        }
      }

      telemetry.phase = "complete";
      telemetry.outcome = outcome;
      telemetry.completedAtMs = Number((performance.now() - telemetry.startedAtMs).toFixed(1));
      if (reasonOverride) telemetry.policyReason = reasonOverride;

      window.__ADORA_CXP05_PLAYED__ = true;
      root.dataset.cxp05Entrance = "complete";
      phaseRef.current = "complete";
      setPhase("complete");
      setStatusMessage("ADORA is ready");

      // Clear polite status text after screen reader has received it
      registerTimeout(() => {
        setStatusMessage("");
      }, 1200);
    };

    const updateStage = (id: ReadinessStageId, status: ReadinessStageStatus) => {
      if (disposed || finished) return;
      if (stages[id] !== "pending") return;
      stages = { ...stages, [id]: status };
      snapshot = computeWeightedReadiness(stages);
      telemetry.stages = { ...stages };
      telemetry.stageTimestampsMs[id] = Number((performance.now() - telemetry.startedAtMs).toFixed(1));

      if (
        stages.hydration !== "pending" &&
        stages.fonts !== "pending" &&
        stages.heroMedia !== "pending" &&
        stages.geometry !== "pending" &&
        stages.stageReady === "pending"
      ) {
        // Stage 5: wait one rAF so Movement 01 frame is painted & warm
        window.requestAnimationFrame(() => {
          if (disposed || finished) return;
          const anyPriorDegraded =
            stages.fonts === "degraded" ||
            stages.heroMedia === "degraded" ||
            stages.geometry === "degraded";
          updateStage("stageReady", anyPriorDegraded ? "degraded" : "ready");
        });
      }
    };

    // --- Gate 1: Hydration ---
    updateStage("hydration", "ready");

    // --- Gate 2: Fonts (Playfair Display) ---
    const fontFallbackTimer = registerTimeout(() => {
      updateStage("fonts", "degraded");
    }, FONT_TIMEOUT_MS);

    if (typeof document.fonts !== "undefined" && document.fonts?.ready) {
      Promise.race([
        Promise.all([
          document.fonts.ready,
          document.fonts.load('500 32px "Playfair Display"').catch(() => []),
        ]),
        new Promise<void>((resolve) => window.setTimeout(resolve, FONT_TIMEOUT_MS - 100)),
      ])
        .then(() => {
          window.clearTimeout(fontFallbackTimer);
          updateStage("fonts", "ready");
        })
        .catch(() => {
          window.clearTimeout(fontFallbackTimer);
          updateStage("fonts", "degraded");
        });
    } else {
      window.clearTimeout(fontFallbackTimer);
      updateStage("fonts", "ready");
    }

    // --- Gate 3: Critical Hero Media (reuses the live Movement 01 <img>, zero extra request) ---
    const mediaFallbackTimer = registerTimeout(() => {
      updateStage("heroMedia", "degraded");
    }, MEDIA_TIMEOUT_MS);

    const checkHeroImage = () => {
      const img = worldImgRef.current;
      if (!img) {
        // In reduced-motion mode, query the reduced identity stage image
        const reducedImg = document.querySelector<HTMLImageElement>(
          ".cxp01-reduced-identity-stage img.cxp01-plate-image",
        );
        if (!reducedImg) {
          window.clearTimeout(mediaFallbackTimer);
          updateStage("heroMedia", "ready");
          return;
        }
        bindImage(reducedImg);
        return;
      }
      bindImage(img);
    };

    let boundImg: HTMLImageElement | null = null;
    const onImgLoad = () => {
      if (!boundImg) return;
      const finalizeReady = () => {
        window.clearTimeout(mediaFallbackTimer);
        updateStage("heroMedia", boundImg && boundImg.naturalWidth > 0 ? "ready" : "degraded");
      };
      if (typeof boundImg.decode === "function") {
        boundImg.decode().then(finalizeReady, finalizeReady);
      } else {
        finalizeReady();
      }
    };
    const onImgError = () => {
      window.clearTimeout(mediaFallbackTimer);
      updateStage("heroMedia", "degraded");
    };

    const bindImage = (img: HTMLImageElement) => {
      boundImg = img;
      if (img.complete) {
        if (img.naturalWidth > 0) {
          onImgLoad();
        } else {
          onImgError();
        }
        return;
      }
      img.addEventListener("load", onImgLoad, { once: true });
      img.addEventListener("error", onImgError, { once: true });
    };

    checkHeroImage();

    // --- Gate 4: Live SVG & Hero A Geometry ---
    if (decision.mode === "reduced") {
      root.dataset.cxp05Entrance = "reduced";
      updateStage("geometry", "ready");
    } else {
      const geomDeadline = performance.now() + GEOMETRY_TIMEOUT_MS;
      const pollGeometry = () => {
        if (disposed || finished) return;
        const liveMobile = window.matchMedia("(max-width: 767px)").matches;
        // Wait until React's isMobile state matches the live media query so the SVG viewBox is exact!
        if (liveMobile === isMobileRef.current) {
          const geom = measureLiveGeometry(
            veilSvgRef.current,
            heroFirstAAnchorRef.current,
            liveMobile,
          );
          if (geom) {
            geometryRef.current = geom;
            setHudTopPx(geom.startComposition.hudTopPx);
            applyFlightFrameDom(geom, 0);
            root.dataset.cxp05Entrance = "active";

            telemetry.startScale = Number(geom.startScale.toFixed(4));
            telemetry.targetRect = {
              left: Number(geom.targetScreenRect.left.toFixed(2)),
              top: Number(geom.targetScreenRect.top.toFixed(2)),
              width: Number(geom.targetScreenRect.width.toFixed(2)),
              height: Number(geom.targetScreenRect.height.toFixed(2)),
              centerX: Number(geom.targetScreenRect.centerX.toFixed(2)),
              centerY: Number(geom.targetScreenRect.centerY.toFixed(2)),
            };
            telemetry.startRect = {
              left: Number(
                (geom.startComposition.startScreenX - geom.startComposition.startWidthPx * 0.5).toFixed(2),
              ),
              top: Number(
                (geom.startComposition.startScreenY - geom.startComposition.startHeightPx * 0.5).toFixed(2),
              ),
              width: Number(geom.startComposition.startWidthPx.toFixed(2)),
              height: Number(geom.startComposition.startHeightPx.toFixed(2)),
              centerX: Number(geom.startComposition.startScreenX.toFixed(2)),
              centerY: Number(geom.startComposition.startScreenY.toFixed(2)),
            };
            telemetry.viewport = {
              width: geom.viewportWidth,
              height: geom.viewportHeight,
              dpr: window.devicePixelRatio || 1,
              isMobile: geom.isMobile,
            };

            updateStage("geometry", "ready");
            return;
          }
        }
        if (performance.now() >= geomDeadline) {
          updateStage("geometry", "degraded");
          return;
        }
        window.requestAnimationFrame(pollGeometry);
      };
      window.requestAnimationFrame(pollGeometry);
    }

    // --- Live Resize Retargeting ---
    const onResize = () => {
      if (disposed || finished || decision.mode !== "cinematic") return;
      const liveMobile = window.matchMedia("(max-width: 767px)").matches;
      const geom = measureLiveGeometry(veilSvgRef.current, heroFirstAAnchorRef.current, liveMobile);
      if (geom) {
        geometryRef.current = geom;
        setHudTopPx(geom.startComposition.hudTopPx);
        if (phaseRef.current !== "transforming") {
          applyFlightFrameDom(geom, 0);
        }
      }
    };
    window.addEventListener("resize", onResize, { passive: true });

    // --- bfcache Restore Guard ---
    const onPageShow = (evt: PageTransitionEvent) => {
      if (evt.persisted && !finished) {
        finishEntrance("ready", "bfcache-restored");
      }
    };
    window.addEventListener("pageshow", onPageShow);

    // --- Hard Fail-Open Safety Ceiling ---
    registerTimeout(() => {
      if (!finished && !completionStarted) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[ADORA CXP-05A] Entrance reached fail-open ceiling; revealing homepage.");
        }
        finishEntrance("degraded", "hard-timeout-fail-open");
      }
    }, HARD_CEILING_MS);

    // --- Main Progress & Transition Loop ---
    let visualPercent = 0;
    let lastTs = performance.now();

    const beginTransition = (outcome: "ready" | "degraded") => {
      if (completionStarted || finished || disposed) return;
      completionStarted = true;
      telemetry.readyAtMs = Number((performance.now() - telemetry.startedAtMs).toFixed(1));

      // Reduced-motion OR degraded fallback: calm, non-spatial crossfade without claiming full success
      if (decision.mode === "reduced" || outcome === "degraded" || !geometryRef.current) {
        if (outcome === "degraded" && process.env.NODE_ENV === "development") {
          console.warn("[ADORA CXP-05A] Critical entrance gate degraded; failing open.", stages);
        }
        phaseRef.current = "dissolving-ui";
        telemetry.phase = "dissolving-ui";
        setPhase("dissolving-ui");
        const exitMs = motionOffAttr ? 0 : 240;
        registerTimeout(() => {
          finishEntrance(outcome);
        }, exitMs);
        return;
      }

      // Scene III — Completion Acknowledgment at 100%
      phaseRef.current = "complete-hold";
      telemetry.phase = "complete-hold";
      setPhase("complete-hold");

      registerTimeout(() => {
        // Scene III-b — Dissolve Progress Interface
        phaseRef.current = "dissolving-ui";
        telemetry.phase = "dissolving-ui";
        setPhase("dissolving-ui");

        registerTimeout(() => {
          // Re-measure right before liftoff in case fonts/layout shifted slightly
          const liveMobile = window.matchMedia("(max-width: 767px)").matches;
          const freshGeom = measureLiveGeometry(
            veilSvgRef.current,
            heroFirstAAnchorRef.current,
            liveMobile,
          );
          if (freshGeom) {
            geometryRef.current = freshGeom;
            telemetry.targetRect = {
              left: Number(freshGeom.targetScreenRect.left.toFixed(2)),
              top: Number(freshGeom.targetScreenRect.top.toFixed(2)),
              width: Number(freshGeom.targetScreenRect.width.toFixed(2)),
              height: Number(freshGeom.targetScreenRect.height.toFixed(2)),
              centerX: Number(freshGeom.targetScreenRect.centerX.toFixed(2)),
              centerY: Number(freshGeom.targetScreenRect.centerY.toFixed(2)),
            };
          }

          // Scene IV — Signature A-to-ADORA Transformation
          phaseRef.current = "transforming";
          telemetry.phase = "transforming";
          setPhase("transforming");

          const flightStart = performance.now();
          let capturedMidSample = false;

          const tickFlight = (now: number) => {
            if (disposed || finished) return;
            // If reduced-motion was enabled mid-flight, finish cleanly immediately
            if (
              reducedMotionRef.current ||
              document.documentElement.getAttribute("data-motion") === "off"
            ) {
              finishEntrance("ready", "reduced-motion-mid-flight");
              return;
            }

            const geom = geometryRef.current;
            if (!geom) {
              finishEntrance("degraded", "missing-geometry-mid-flight");
              return;
            }

            const rawU = Math.min(1, (now - flightStart) / FLIGHT_DURATION_MS);
            const frame = applyFlightFrameDom(geom, rawU);

            if (!capturedMidSample && rawU >= 0.48) {
              capturedMidSample = true;
              telemetry.midFlightSample = {
                u: Number(rawU.toFixed(3)),
                dxSvg: Number(frame.dxSvg.toFixed(2)),
                dySvg: Number(frame.dySvg.toFixed(2)),
                scale: Number(frame.scale.toFixed(4)),
                darknessOpacity: Number(frame.darknessOpacity.toFixed(3)),
              };
            }

            if (rawU >= 1) {
              finishEntrance("ready");
              return;
            }
            rafId = window.requestAnimationFrame(tickFlight);
          };

          rafId = window.requestAnimationFrame(tickFlight);
        }, DISSOLVE_UI_MS);
      }, COMPLETE_HOLD_MS);
    };

    const tickProgress = (now: number) => {
      if (disposed || finished || completionStarted) return;
      const dtSec = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      const target = snapshot.percent;
      if (visualPercent < target) {
        const delta = target - visualPercent;
        const step = Math.min(delta, MAX_PROGRESS_SPEED_PER_SEC * dtSec);
        visualPercent = Math.min(target, visualPercent + step);
        setDisplayPercent(visualPercent);
      }

      if (snapshot.outcome === "degraded") {
        beginTransition("degraded");
        return;
      }

      if (snapshot.allReady && visualPercent >= 99.6) {
        visualPercent = 100;
        setDisplayPercent(100);
        beginTransition("ready");
        return;
      }

      rafId = window.requestAnimationFrame(tickProgress);
    };

    rafId = window.requestAnimationFrame(tickProgress);

    return () => {
      disposed = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      for (const id of timeouts) window.clearTimeout(id);
      if (boundImg) {
        boundImg.removeEventListener("load", onImgLoad);
        boundImg.removeEventListener("error", onImgError);
      }
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("wheel", blockWheelOrTouch);
      window.removeEventListener("touchmove", blockWheelOrTouch);
      window.removeEventListener("keydown", blockScrollKeys);
      releaseScrollLock();
      resetSvgOverrides();
      // If unmounted prematurely (e.g. route change mid-load), ensure html guard is removed cleanly
      if (!finished && root.dataset.cxp05Entrance !== "complete") {
        delete root.dataset.cxp05Entrance;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProduction]);

  const entranceActive =
    isProduction &&
    policyMode !== "skip" &&
    phase !== "complete" &&
    phase !== "skipped";

  return {
    entranceActive,
    isReducedMode: policyMode === "reduced",
    isMotionOff,
    phase,
    displayPercent,
    hudTopPx,
    statusMessage,
  };
}
