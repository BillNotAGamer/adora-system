"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import "@/app/creative-lab/typography-world/typography-world.css";
import "@/app/creative-lab/cinematic-journey/cinematic-journey.css";
import { ConciergeTrigger } from "@/components/concierge/concierge-trigger";
import {
  DiscoveryRibbon,
  ReducedMotionDiscoverySection,
} from "@/components/creative-lab/cinematic-journey/discovery-ribbon";
import {
  JourneyConciergeActs,
  ReducedMotionJourneyAndConcierge,
} from "@/components/creative-lab/cinematic-journey/journey-concierge-acts";
import {
  computeCinematicJourneyState,
  type JourneyMovementId,
} from "@/components/creative-lab/cinematic-journey/narrative-choreography";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import type { HomepageCatalog } from "@/lib/catalog";

const HIGHLAND_PLATE = "/images/cxp01/highland-world.jpg";
const HUMAN_PLATE = "/images/cxp01/human-moment.jpg";
const PILLAR_OCCLUDER = "/images/cxp01/stone-pillar-occluder.png";

const DESKTOP_A_X = 356;
const DESKTOP_A_Y = 416;
const MOBILE_A_X = 450;
const MOBILE_A_Y = 740;

const NO_JS_FALLBACK_CSS = `
.cxp03-production .cxp02-runway { height: auto !important; }
.cxp03-production .cxp02-stage { position: relative !important; height: auto !important; overflow: visible !important; }
.cxp03-production .cxp01-world-layer,
.cxp03-production .cxp01-human-portal-layer,
.cxp03-production .cxp02-journey-backdrop,
.cxp03-production .cxp01-veil-layer,
.cxp03-production .cxp01-pillar-occluder,
.cxp03-production .cxp01-outer-frame,
.cxp03-production .cxp01-scroll-cue,
.cxp03-production .cxp01-chrome-footer { display: none !important; }
.cxp03-production .cxp01-opening-overlay,
.cxp03-production .cxp01-world-overlay,
.cxp03-production .cxp01-human-overlay,
.cxp03-production .cxp02-discovery-layer,
.cxp03-production .cxp02-journey-overlay,
.cxp03-production .cxp02-concierge-overlay {
  position: relative !important;
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
  transform: none !important;
  min-height: 62svh;
  border-bottom: 1px solid rgba(244, 239, 230, 0.14);
}
.cxp03-production .cxp01-opening-overlay {
  padding-top: 7.5rem !important;
  background: linear-gradient(180deg, rgba(11, 14, 12, 0.72) 0%, rgba(11, 14, 12, 0.88) 100%), url('/images/cxp01/highland-world.jpg') center/cover no-repeat;
}
.cxp03-production .cxp02-discovery-grid { grid-template-columns: 1fr !important; }
.cxp03-production .cxp02-ribbon-track { flex-wrap: wrap !important; transform: none !important; }
`;

interface CinematicJourneyExperienceProps {
  mode?: "lab" | "production";
  catalogSource?: HomepageCatalog["source"];
  catalogDisclosure?: ReactNode;
}

export function CinematicJourneyExperience({
  mode = "lab",
  catalogSource = "fallback",
  catalogDisclosure,
}: Readonly<CinematicJourneyExperienceProps> = {}) {
  const isProduction = mode === "production";
  const runwayRef = useRef<HTMLDivElement | null>(null);
  const worldLayerRef = useRef<HTMLDivElement | null>(null);
  const worldScrimRef = useRef<HTMLDivElement | null>(null);
  const veilLayerRef = useRef<HTMLDivElement | null>(null);
  const maskGroupRef = useRef<SVGGElement | null>(null);
  const secondaryLettersRef = useRef<SVGGElement | null>(null);
  const portalCounterRef = useRef<SVGPolygonElement | null>(null);
  const outerFrameRef = useRef<HTMLDivElement | null>(null);
  const openingOverlayRef = useRef<HTMLDivElement | null>(null);
  const scrollCueRef = useRef<HTMLDivElement | null>(null);
  const worldOverlayRef = useRef<HTMLDivElement | null>(null);
  const humanPortalRef = useRef<HTMLDivElement | null>(null);
  const humanPlateWrapRef = useRef<HTMLDivElement | null>(null);
  const pillarOccluderRef = useRef<HTMLDivElement | null>(null);
  const humanOverlayRef = useRef<HTMLDivElement | null>(null);

  // New CXP-02 act refs
  const discoveryBackdropRef = useRef<HTMLDivElement | null>(null);
  const discoveryLayerRef = useRef<HTMLElement | null>(null);
  const ribbonTrackRef = useRef<HTMLDivElement | null>(null);
  const journeyBackdropRef = useRef<HTMLDivElement | null>(null);
  const journeyPlateWrapRef = useRef<HTMLDivElement | null>(null);
  const journeyOverlayRef = useRef<HTMLElement | null>(null);
  const conciergeBackdropRef = useRef<HTMLDivElement | null>(null);
  const conciergeOverlayRef = useRef<HTMLElement | null>(null);
  const progressFillRef = useRef<HTMLSpanElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [movement, setMovement] = useState<JourneyMovementId>("01");
  const [movementCaption, setMovementCaption] = useState(
    "01  /  IDENTITY — TYPOGRAPHY BECOMES LANDSCAPE",
  );
  const [openingInteractive, setOpeningInteractive] = useState(true);
  const [discoveryInteractive, setDiscoveryInteractive] = useState(false);
  const [journeyInteractive, setJourneyInteractive] = useState(false);
  const [conciergeInteractive, setConciergeInteractive] = useState(false);

  const lastMovementRef = useRef<JourneyMovementId>("01");
  const lastFlagsRef = useRef({
    opening: true,
    discovery: false,
    journey: false,
    concierge: false,
  });

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncQueries = () => {
      const motionOffAttr = document.documentElement.getAttribute("data-motion") === "off";
      setIsMobile(mobileQuery.matches);
      setReducedMotion(motionQuery.matches || motionOffAttr);
    };

    syncQueries();
    mobileQuery.addEventListener("change", syncQueries);
    motionQuery.addEventListener("change", syncQueries);

    const attrObserver = new MutationObserver(syncQueries);
    attrObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-motion"],
    });

    return () => {
      mobileQuery.removeEventListener("change", syncQueries);
      motionQuery.removeEventListener("change", syncQueries);
      attrObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    let rafId = 0;

    const applyFrame = () => {
      rafId = 0;
      const runway = runwayRef.current;
      if (!runway) return;

      const rect = runway.getBoundingClientRect();
      const scrollable = Math.max(1, runway.offsetHeight - window.innerHeight);
      const rawProgress = Math.min(1, Math.max(0, -rect.top / scrollable));
      const state = computeCinematicJourneyState(rawProgress, isMobile);

      // Discrete React state updates only on boundary crossings
      if (state.movement !== lastMovementRef.current) {
        lastMovementRef.current = state.movement;
        setMovement(state.movement);
        setMovementCaption(state.movementCaption);
      }
      if (state.openingInteractive !== lastFlagsRef.current.opening) {
        lastFlagsRef.current.opening = state.openingInteractive;
        setOpeningInteractive(state.openingInteractive);
      }
      if (state.discoveryInteractive !== lastFlagsRef.current.discovery) {
        lastFlagsRef.current.discovery = state.discoveryInteractive;
        setDiscoveryInteractive(state.discoveryInteractive);
      }
      if (state.journeyInteractive !== lastFlagsRef.current.journey) {
        lastFlagsRef.current.journey = state.journeyInteractive;
        setJourneyInteractive(state.journeyInteractive);
      }
      if (state.conciergeInteractive !== lastFlagsRef.current.concierge) {
        lastFlagsRef.current.concierge = state.conciergeInteractive;
        setConciergeInteractive(state.conciergeInteractive);
      }

      // Act 0 — Preserved CXP-01S World, Veil, Colonnade Pass, Human Moment
      if (worldLayerRef.current) {
        worldLayerRef.current.style.transform = `translate3d(${state.worldTranslateX.toFixed(3)}%, ${state.worldTranslateY.toFixed(3)}%, 0) scale(${state.worldScale.toFixed(4)})`;
      }
      if (worldScrimRef.current) {
        worldScrimRef.current.style.opacity = state.worldScrimOpacity.toFixed(4);
      }

      if (veilLayerRef.current) {
        veilLayerRef.current.style.opacity = state.veilOpacity.toFixed(4);
        veilLayerRef.current.style.visibility = state.veilOpacity <= 0.001 ? "hidden" : "visible";
      }

      if (maskGroupRef.current) {
        const ax = isMobile ? MOBILE_A_X : DESKTOP_A_X;
        const ay = isMobile ? MOBILE_A_Y : DESKTOP_A_Y;
        const tx = ax + state.maskShiftX;
        const ty = ay + state.maskShiftY;
        maskGroupRef.current.setAttribute(
          "transform",
          `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${state.maskScale.toFixed(4)}) translate(${(-ax).toFixed(2)} ${(-ay).toFixed(2)})`,
        );
      }

      if (secondaryLettersRef.current) {
        secondaryLettersRef.current.setAttribute(
          "fill-opacity",
          state.secondaryLettersOpacity.toFixed(4),
        );
      }

      if (portalCounterRef.current) {
        const open = state.portalCounterOpen;
        const ax = isMobile ? MOBILE_A_X : DESKTOP_A_X;
        const ay = isMobile ? MOBILE_A_Y : DESKTOP_A_Y;
        const sx = 0.15 + open * 0.85;
        const sy = 0.15 + open * 0.85;
        portalCounterRef.current.setAttribute(
          "transform",
          `translate(${ax} ${ay}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-ax} ${-ay})`,
        );
        portalCounterRef.current.setAttribute("fill-opacity", open.toFixed(4));
      }

      if (outerFrameRef.current) {
        outerFrameRef.current.style.opacity = state.openingFrameOpacity.toFixed(4);
      }
      if (openingOverlayRef.current) {
        openingOverlayRef.current.style.opacity = state.openingTextOpacity.toFixed(4);
        openingOverlayRef.current.style.visibility =
          state.openingTextOpacity <= 0.001 ? "hidden" : "visible";
        openingOverlayRef.current.style.transform = `translate3d(0, ${state.openingTextOffsetY.toFixed(2)}px, 0)`;
      }
      if (scrollCueRef.current) {
        scrollCueRef.current.style.opacity = state.scrollCueOpacity.toFixed(4);
      }
      if (worldOverlayRef.current) {
        worldOverlayRef.current.style.opacity = state.worldTextOpacity.toFixed(4);
        worldOverlayRef.current.style.transform = `translate3d(0, ${state.worldTextOffsetY.toFixed(2)}px, 0)`;
      }

      // Colonnade Occluder
      if (pillarOccluderRef.current) {
        const active = state.colonnadeProgress > 0.001 && state.colonnadeProgress < 0.999;
        pillarOccluderRef.current.style.visibility = active ? "visible" : "hidden";
        pillarOccluderRef.current.style.width = `${state.pillarWidthPct}%`;
        pillarOccluderRef.current.style.transform = `translate3d(${state.pillarLeftPct.toFixed(3)}vw, 0, 0) scale(${state.pillarScale.toFixed(4)})`;
      }

      // Human Moment plate — continuous from colonnade reveal -> full-bleed -> reframed origin chapter of Discovery
      if (humanPortalRef.current) {
        const hiddenByColonnade = state.progress < 0.46 && state.humanClipLeftPct >= 99.9;
        const hiddenAfterDiscovery = state.humanLayerOpacity <= 0.001;
        if (hiddenByColonnade || hiddenAfterDiscovery) {
          humanPortalRef.current.style.visibility = "hidden";
        } else {
          humanPortalRef.current.style.visibility = "visible";
          humanPortalRef.current.style.opacity = state.humanLayerOpacity.toFixed(4);
          humanPortalRef.current.style.clipPath = `inset(${state.humanClipTopPct.toFixed(3)}% ${state.humanClipRightPct.toFixed(3)}% ${state.humanClipBottomPct.toFixed(3)}% ${state.humanClipLeftPct.toFixed(3)}%)`;
        }
      }

      if (humanPlateWrapRef.current) {
        humanPlateWrapRef.current.style.transform = `translate3d(${state.humanTranslateX.toFixed(3)}%, ${state.humanTranslateY.toFixed(3)}%, 0) scale(${state.humanScale.toFixed(4)})`;
      }

      if (humanOverlayRef.current) {
        humanOverlayRef.current.style.opacity = state.humanTextOpacity.toFixed(4);
        humanOverlayRef.current.style.transform = `translate3d(0, ${state.humanTextOffsetY.toFixed(2)}px, 0)`;
      }

      // Act I — Discovery Backdrop & Horizontal Diurnal Ribbon
      if (discoveryBackdropRef.current) {
        discoveryBackdropRef.current.style.opacity = state.humanReframeProgress.toFixed(4);
        discoveryBackdropRef.current.style.visibility =
          state.humanReframeProgress <= 0.001 || state.journeyShutterProgress >= 0.999
            ? "hidden"
            : "visible";
      }
      if (discoveryLayerRef.current) {
        discoveryLayerRef.current.style.opacity = state.discoveryOpacity.toFixed(4);
        discoveryLayerRef.current.style.visibility =
          state.discoveryOpacity <= 0.001 ? "hidden" : "visible";
        discoveryLayerRef.current.style.pointerEvents = state.discoveryInteractive ? "auto" : "none";
      }
      if (ribbonTrackRef.current) {
        ribbonTrackRef.current.style.transform = `translate3d(-${state.discoveryRibbonShiftPct.toFixed(3)}%, 0, 0)`;
      }

      // Act II — Your Journey Widescreen Horizontal Cinema Shutter
      if (journeyBackdropRef.current) {
        const s = state.journeyShutterProgress;
        if (s <= 0.001) {
          journeyBackdropRef.current.style.visibility = "hidden";
          journeyBackdropRef.current.style.clipPath = "inset(50% 0% 50% 0%)";
        } else {
          journeyBackdropRef.current.style.visibility = "visible";
          const vInset = (50 * (1 - s)).toFixed(3);
          journeyBackdropRef.current.style.clipPath =
            s >= 0.999 ? "inset(0% 0% 0% 0%)" : `inset(${vInset}% 0% ${vInset}% 0%)`;
        }
      }
      if (journeyPlateWrapRef.current) {
        journeyPlateWrapRef.current.style.transform = `scale(${state.journeyScale.toFixed(4)})`;
      }
      if (journeyOverlayRef.current) {
        journeyOverlayRef.current.style.opacity = state.journeyTextOpacity.toFixed(4);
        journeyOverlayRef.current.style.transform = `translate3d(0, ${state.journeyTextOffsetY.toFixed(2)}px, 0)`;
        journeyOverlayRef.current.style.visibility =
          state.journeyTextOpacity <= 0.001 ? "hidden" : "visible";
        journeyOverlayRef.current.style.pointerEvents = state.journeyInteractive ? "auto" : "none";
      }

      // Act III — AI Concierge Finale
      if (conciergeBackdropRef.current) {
        conciergeBackdropRef.current.style.opacity = state.conciergeBackdropOpacity.toFixed(4);
        conciergeBackdropRef.current.style.visibility =
          state.conciergeBackdropOpacity <= 0.001 ? "hidden" : "visible";
      }
      if (conciergeOverlayRef.current) {
        conciergeOverlayRef.current.style.opacity = state.conciergeOpacity.toFixed(4);
        conciergeOverlayRef.current.style.transform = `translate3d(0, ${state.conciergeOffsetY.toFixed(2)}px, 0)`;
        conciergeOverlayRef.current.style.visibility =
          state.conciergeOpacity <= 0.001 ? "hidden" : "visible";
        conciergeOverlayRef.current.style.pointerEvents = state.conciergeInteractive ? "auto" : "none";
      }

      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${Math.max(0.04, state.progress).toFixed(4)})`;
      }
    };

    const scheduleFrame = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(applyFrame);
      }
    };

    applyFrame();
    window.addEventListener("scroll", scheduleFrame, { passive: true });
    window.addEventListener("resize", scheduleFrame, { passive: true });
    window.addEventListener("pageshow", scheduleFrame);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleFrame);
      window.removeEventListener("resize", scheduleFrame);
      window.removeEventListener("pageshow", scheduleFrame);
    };
  }, [isMobile, reducedMotion]);

  if (reducedMotion) {
    return (
      <main
        id="main-content"
        className={`cxp01-reduced-root${isProduction ? " cxp03-reduced-production" : ""}`}
        data-cxp02-mode="reduced-motion"
      >
        {isProduction ? (
          <SiteHeader tone="cinematic" />
        ) : (
          <header className="cxp01-reduced-header">
            <Link href="/" className="cxp01-brand-link">
              <span className="cxp01-brand-wordmark">ADORA</span>
              <span className="cxp01-brand-tagline">AN INVITATION TO FEEL</span>
            </Link>
            <Link href="/ai-planner" className="cxp01-skip-link">
              AI Planner
            </Link>
          </header>
        )}

        <section className="cxp01-reduced-identity-stage" aria-label="Movement 01 — Identity">
          <div className="cxp01-reduced-bg">
            <img
              src={HIGHLAND_PLATE}
              alt="Cảnh quan cao nguyên sương sớm nhìn qua chữ ADORA"
              className="cxp01-plate-image"
            />
          </div>
          <div className="cxp01-veil-layer" aria-hidden="true">
            <svg
              className="cxp01-veil-svg"
              viewBox={isMobile ? "0 0 900 1600" : "0 0 1600 900"}
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <filter id="cxp02-reduced-blur">
                  <feGaussianBlur stdDeviation="28" />
                </filter>
                <mask
                  id="cxp02-reduced-mask"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width={isMobile ? 900 : 1600}
                  height={isMobile ? 1600 : 900}
                >
                  <rect
                    x="0"
                    y="0"
                    width={isMobile ? 900 : 1600}
                    height={isMobile ? 1600 : 900}
                    fill="white"
                  />
                  {isMobile ? (
                    <text
                      x={MOBILE_A_X}
                      y={MOBILE_A_Y + 215}
                      textAnchor="middle"
                      fill="black"
                      fontFamily="var(--font-display), Georgia, serif"
                      fontSize="680"
                      fontWeight="500"
                    >
                      A
                    </text>
                  ) : (
                    <text
                      x="800"
                      y="500"
                      textAnchor="middle"
                      fill="black"
                      fontFamily="var(--font-display), Georgia, serif"
                      fontSize="315"
                      fontWeight="500"
                      letterSpacing="26"
                    >
                      ADORA
                    </text>
                  )}
                </mask>
              </defs>
              <g mask="url(#cxp02-reduced-mask)">
                <image
                  href={HIGHLAND_PLATE}
                  x="-60"
                  y="-60"
                  width={isMobile ? 1020 : 1720}
                  height={isMobile ? 1720 : 1020}
                  preserveAspectRatio="xMidYMid slice"
                  filter="url(#cxp02-reduced-blur)"
                  opacity="0.34"
                />
                <rect
                  x="0"
                  y="0"
                  width={isMobile ? 900 : 1600}
                  height={isMobile ? 1600 : 900}
                  fill="#0c100d"
                  fillOpacity="0.82"
                />
              </g>
            </svg>
          </div>
          <div className="cxp01-reduced-caption">
            <h1 className="sr-only">
              {isProduction
                ? "ADORA — Đi xa hơn. Hiểu sâu hơn."
                : "ADORA — Full Cinematic Narrative"}
            </h1>
            <p className="cxp01-opening-subtitle">
              Một nơi chốn không thể chỉ nhìn qua màn hình.
            </p>
            {isProduction ? (
              <div style={{ marginTop: "1.25rem" }}>
                <ConciergeTrigger href="/ai-planner" className="hero-primary-cta cxp03-opening-cta">
                  Plan with Adora AI
                </ConciergeTrigger>
              </div>
            ) : null}
          </div>
        </section>

        <section className="cxp01-reduced-section" aria-label="Movement 02 — The World">
          <div className="cxp01-reduced-bg">
            <img
              src={HIGHLAND_PLATE}
              alt="Thung lũng thông sương sớm với vòm đá đón nắng bình minh"
              className="cxp01-plate-image"
            />
            <div className="cxp01-world-scrim" style={{ opacity: 1 }} />
          </div>
          <div className="cxp01-reduced-content">
            <h2 className="cxp01-world-headline">
              Không phải
              <br />
              lật trang.
            </h2>
            <p className="cxp01-world-subline">Mà là bước qua.</p>
          </div>
        </section>

        <section className="cxp01-reduced-section" aria-label="Movement 03 — The Human Moment">
          <div className="cxp01-reduced-bg">
            <img
              src={HUMAN_PLATE}
              alt="Khoảnh khắc tĩnh lặng bên tách cà phê ấm dưới vòm đá đón nắng sớm"
              className="cxp01-plate-image cxp01-plate-image--human"
            />
            <div className="cxp01-human-scrim" />
          </div>
          <div className="cxp01-reduced-content">
            <h2 className="cxp01-human-headline">
              CHẬM
              <br />
              LẠI.
            </h2>
            <p className="cxp01-human-subline">Để khoảnh khắc trở thành hành trình.</p>
          </div>
        </section>

        <ReducedMotionDiscoverySection
          catalogSource={catalogSource}
          catalogDisclosure={catalogDisclosure}
        />
        <ReducedMotionJourneyAndConcierge mode={mode} />
        {isProduction ? <SiteFooter showCta={false} tone="dark" /> : null}
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className={`cxp02-root${isProduction ? " cxp03-production" : ""}`}
      data-cxp02-mode="cinematic"
    >
      {isProduction ? (
        <>
          <noscript>
            <style>{NO_JS_FALLBACK_CSS}</style>
          </noscript>
          <SiteHeader tone="cinematic" />
        </>
      ) : null}
      <div ref={runwayRef} className="cxp02-runway" data-cxp02-runway>
        <div className="cxp02-stage" data-cxp02-stage>
          {!isProduction ? (
            <header className="cxp01-chrome-header">
              <div className="cxp01-chrome-header-inner">
                <Link href="/" className="cxp01-brand-link">
                  <span className="cxp01-brand-wordmark">ADORA</span>
                  <span className="cxp01-brand-tagline">
                    {isMobile ? "THE ART OF GOING SLOW" : "AN INVITATION TO FEEL"}
                  </span>
                </Link>

                <div className="cxp01-header-meta">
                  <span className="cxp01-movement-tag" aria-live="polite">
                    MOVEMENT {movement}
                  </span>
                  <Link href="/ai-planner" className="cxp01-skip-link">
                    AI Planner
                  </Link>
                </div>
              </div>
            </header>
          ) : null}

          {/* Layer 0: Continuous highland world (Identity -> Passage -> World) */}
          <div ref={worldLayerRef} className="cxp01-world-layer" aria-hidden="true">
            <img
              src={HIGHLAND_PLATE}
              alt=""
              fetchPriority="high"
              decoding="sync"
              className="cxp01-plate-image"
            />
            <div ref={worldScrimRef} className="cxp01-world-scrim" />
          </div>

          {/* Act I Discovery Backdrop + Ribbon */}
          <DiscoveryRibbon
            backdropRef={discoveryBackdropRef}
            layerRef={discoveryLayerRef}
            ribbonTrackRef={ribbonTrackRef}
            interactive={discoveryInteractive}
            catalogSource={catalogSource}
            catalogDisclosure={catalogDisclosure}
          />

          {/* Layer 1: Human Moment (revealed behind stone pillar -> reframed as Discovery origin plate) */}
          <div
            ref={humanPortalRef}
            className="cxp01-human-portal-layer"
            style={{ visibility: "hidden" }}
            aria-hidden="true"
          >
            <div ref={humanPlateWrapRef} className="cxp01-human-plate-wrap">
              <img
                src={HUMAN_PLATE}
                alt=""
                decoding="async"
                className="cxp01-plate-image cxp01-plate-image--human"
              />
              <div className="cxp01-human-scrim" />
            </div>
          </div>

          {/* Near-plane weathered stone colonnade pillar (CXP-01S spatial occlusion) */}
          <div
            ref={pillarOccluderRef}
            className="cxp01-pillar-occluder"
            style={{ visibility: "hidden" }}
            aria-hidden="true"
          >
            <img src={PILLAR_OCCLUDER} alt="" decoding="async" className="cxp01-pillar-image" />
          </div>

          {/* Layer 2: Precision vector inverted typographic mask veil */}
          <div ref={veilLayerRef} className="cxp01-veil-layer" aria-hidden="true">
            <svg
              className="cxp01-veil-svg"
              viewBox={isMobile ? "0 0 900 1600" : "0 0 1600 900"}
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <filter id="cxp02-veil-blur">
                  <feGaussianBlur stdDeviation="30" />
                </filter>
                <radialGradient id="cxp02-veil-vignette" cx="50%" cy="48%" r="68%">
                  <stop offset="0%" stopColor="#141812" stopOpacity="0.68" />
                  <stop offset="65%" stopColor="#0d110e" stopOpacity="0.86" />
                  <stop offset="100%" stopColor="#070a08" stopOpacity="0.96" />
                </radialGradient>

                <mask
                  id="cxp02-adora-portal-mask"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width={isMobile ? 900 : 1600}
                  height={isMobile ? 1600 : 900}
                >
                  <rect
                    x="0"
                    y="0"
                    width={isMobile ? 900 : 1600}
                    height={isMobile ? 1600 : 900}
                    fill="white"
                  />

                  <g ref={maskGroupRef}>
                    {isMobile ? (
                      <>
                        <text
                          x={MOBILE_A_X}
                          y={MOBILE_A_Y + 215}
                          textAnchor="middle"
                          fill="black"
                          fontFamily="var(--font-display), Georgia, serif"
                          fontSize="680"
                          fontWeight="500"
                        >
                          A
                        </text>
                        <polygon
                          ref={portalCounterRef}
                          points="438,494 256,955 604,955"
                          fill="black"
                          fillOpacity="0"
                        />
                      </>
                    ) : (
                      <>
                        <text
                          x={DESKTOP_A_X}
                          y="500"
                          textAnchor="middle"
                          fill="black"
                          fontFamily="var(--font-display), Georgia, serif"
                          fontSize="315"
                          fontWeight="500"
                        >
                          A
                        </text>
                        <polygon
                          ref={portalCounterRef}
                          points="350,288 262,500 426,500"
                          fill="black"
                          fillOpacity="0"
                        />
                        <g ref={secondaryLettersRef} fill="black" fillOpacity="1">
                          <text
                            x="578"
                            y="500"
                            textAnchor="middle"
                            fontFamily="var(--font-display), Georgia, serif"
                            fontSize="315"
                            fontWeight="500"
                          >
                            D
                          </text>
                          <text
                            x="814"
                            y="500"
                            textAnchor="middle"
                            fontFamily="var(--font-display), Georgia, serif"
                            fontSize="315"
                            fontWeight="500"
                          >
                            O
                          </text>
                          <text
                            x="1044"
                            y="500"
                            textAnchor="middle"
                            fontFamily="var(--font-display), Georgia, serif"
                            fontSize="315"
                            fontWeight="500"
                          >
                            R
                          </text>
                          <text
                            x="1256"
                            y="500"
                            textAnchor="middle"
                            fontFamily="var(--font-display), Georgia, serif"
                            fontSize="315"
                            fontWeight="500"
                          >
                            A
                          </text>
                        </g>
                      </>
                    )}
                  </g>
                </mask>
              </defs>

              <g mask="url(#cxp02-adora-portal-mask)">
                <image
                  href={HIGHLAND_PLATE}
                  x="-70"
                  y="-70"
                  width={isMobile ? 1040 : 1740}
                  height={isMobile ? 1740 : 1040}
                  preserveAspectRatio="xMidYMid slice"
                  filter="url(#cxp02-veil-blur)"
                  opacity="0.46"
                />
                <rect
                  x="0"
                  y="0"
                  width={isMobile ? 900 : 1600}
                  height={isMobile ? 1600 : 900}
                  fill="url(#cxp02-veil-vignette)"
                />
              </g>
            </svg>
          </div>

          <div ref={outerFrameRef} className="cxp01-outer-frame" aria-hidden="true" />

          {/* Movement 01 — Identity */}
          <section ref={openingOverlayRef} className="cxp01-opening-overlay" aria-label="Identity">
            <h1 className="sr-only">
              {isProduction
                ? "ADORA — Đi xa hơn. Hiểu sâu hơn."
                : "ADORA — Full Cinematic Narrative"}
            </h1>
            <p className="cxp01-opening-subtitle">
              Một nơi chốn không thể chỉ nhìn qua màn hình.
            </p>
            <div className="cxp01-mobile-opening-block">
              <p className="cxp01-mobile-opening-title">
                Một thế giới
                <br />
                đang mở ra.
              </p>
              <span className="cxp01-mobile-opening-cue">Khám phá ADORA</span>
            </div>
            {isProduction ? (
              <ConciergeTrigger
                href="/ai-planner"
                className="hero-primary-cta cxp03-opening-cta"
                tabIndex={openingInteractive ? 0 : -1}
              >
                Plan with Adora AI
              </ConciergeTrigger>
            ) : null}
          </section>

          <div ref={scrollCueRef} className="cxp01-scroll-cue" aria-hidden="true">
            <span className="cxp01-scroll-cue-label">Cuộn để bước qua</span>
            <span className="cxp01-scroll-cue-line" />
          </div>

          {/* Movement 02 — The World */}
          <section
            ref={worldOverlayRef}
            className="cxp01-world-overlay"
            style={{ opacity: 0 }}
            aria-label="The World"
          >
            <div className="cxp01-world-copy">
              <h2 className="cxp01-world-headline">
                Không phải
                <br />
                lật trang.
              </h2>
              <p className="cxp01-world-subline">Mà là bước qua.</p>
              <p className="cxp01-world-eyebrow">Một chữ cái trở thành cửa sổ</p>
            </div>
          </section>

          {/* Movement 03 — The Human Moment */}
          <section
            ref={humanOverlayRef}
            className="cxp01-human-overlay"
            style={{ opacity: 0, pointerEvents: "none" }}
            aria-label="The Human Moment"
          >
            <div className="cxp01-human-copy">
              <h2 className="cxp01-human-headline">
                CHẬM
                <br />
                LẠI.
              </h2>
              <p className="cxp01-human-subline">Để khoảnh khắc trở thành hành trình.</p>
            </div>
          </section>

          {/* Acts II & III — Your Journey & AI Concierge */}
          <JourneyConciergeActs
            journeyBackdropRef={journeyBackdropRef}
            journeyPlateWrapRef={journeyPlateWrapRef}
            journeyOverlayRef={journeyOverlayRef}
            journeyInteractive={journeyInteractive}
            conciergeBackdropRef={conciergeBackdropRef}
            conciergeOverlayRef={conciergeOverlayRef}
            conciergeInteractive={conciergeInteractive}
            mode={mode}
          />

          {isProduction ? (
            <div
              className="cxp01-chrome-footer"
              role="region"
              aria-label="Tiến trình hành trình"
              data-cxp03-movement={movement}
            >
              <div className="cxp01-chrome-footer-inner">
                <span className="cxp01-footer-caption">{movementCaption}</span>
                <div className="cxp01-progress-pill" aria-hidden="true">
                  <span className="cxp01-progress-track">
                    <span ref={progressFillRef} className="cxp01-progress-fill" />
                  </span>
                  <span className="cxp01-progress-marker" />
                </div>
              </div>
            </div>
          ) : (
            <footer className="cxp01-chrome-footer">
              <div className="cxp01-chrome-footer-inner">
                <span className="cxp01-footer-caption">{movementCaption}</span>
                <div className="cxp01-progress-pill" aria-hidden="true">
                  <span className="cxp01-progress-track">
                    <span ref={progressFillRef} className="cxp01-progress-fill" />
                  </span>
                  <span className="cxp01-progress-marker" />
                </div>
              </div>
            </footer>
          )}
        </div>
      </div>
      {isProduction ? <SiteFooter showCta={false} tone="dark" /> : null}
    </main>
  );
}
