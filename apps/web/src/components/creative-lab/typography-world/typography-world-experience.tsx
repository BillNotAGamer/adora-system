"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import "@/app/creative-lab/typography-world/typography-world.css";
import {
  computeTypographyWorldState,
  type MovementId,
} from "@/components/creative-lab/typography-world/choreography";

const HIGHLAND_PLATE = "/images/cxp01/highland-world.jpg";
const HUMAN_PLATE = "/images/cxp01/human-moment.jpg";
const PILLAR_OCCLUDER = "/images/cxp01/stone-pillar-occluder.png";

// Desktop 1600x900 focal 'A' center and Mobile 900x1600 focal 'A' center
const DESKTOP_A_X = 356;
const DESKTOP_A_Y = 416;
const MOBILE_A_X = 450;
const MOBILE_A_Y = 740;

export function TypographyWorldExperience() {
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
  const progressFillRef = useRef<HTMLSpanElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [movement, setMovement] = useState<MovementId>("01");
  const [movementCaption, setMovementCaption] = useState(
    "THE FIRST INVITATION  /  TYPOGRAPHY BECOMES LANDSCAPE",
  );
  const [humanInteractive, setHumanInteractive] = useState(false);

  const lastMovementRef = useRef<MovementId>("01");
  const lastInteractiveRef = useRef<boolean>(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncQueries = () => {
      setIsMobile(mobileQuery.matches);
      setReducedMotion(motionQuery.matches);
    };

    syncQueries();
    mobileQuery.addEventListener("change", syncQueries);
    motionQuery.addEventListener("change", syncQueries);

    return () => {
      mobileQuery.removeEventListener("change", syncQueries);
      motionQuery.removeEventListener("change", syncQueries);
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
      const state = computeTypographyWorldState(rawProgress, isMobile);

      // Discrete React state updates only on boundary crossings
      if (state.movement !== lastMovementRef.current) {
        lastMovementRef.current = state.movement;
        setMovement(state.movement);
        setMovementCaption(state.movementCaption);
      }
      if (state.humanCtaInteractive !== lastInteractiveRef.current) {
        lastInteractiveRef.current = state.humanCtaInteractive;
        setHumanInteractive(state.humanCtaInteractive);
      }

      // Layer 0: Far highland world plane (dolly + lateral orbit during colonnade pass)
      if (worldLayerRef.current) {
        worldLayerRef.current.style.transform = `translate3d(${state.worldTranslateX.toFixed(3)}%, ${state.worldTranslateY.toFixed(3)}%, 0) scale(${state.worldScale.toFixed(4)})`;
      }
      if (worldScrimRef.current) {
        worldScrimRef.current.style.opacity = state.worldScrimOpacity.toFixed(4);
      }

      // Layer 2: Vector inverted typographic veil & expanding A portal
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
        // Scale strictly up to 1.00 inside the glyph's own interior counter so no polygon edges overhang
        const sx = 0.15 + open * 0.85;
        const sy = 0.15 + open * 0.85;
        portalCounterRef.current.setAttribute(
          "transform",
          `translate(${ax} ${ay}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-ax} ${-ay})`,
        );
        portalCounterRef.current.setAttribute("fill-opacity", open.toFixed(4));
      }

      // Opening chrome & subtitle
      if (outerFrameRef.current) {
        outerFrameRef.current.style.opacity = state.openingFrameOpacity.toFixed(4);
      }
      if (openingOverlayRef.current) {
        openingOverlayRef.current.style.opacity = state.openingTextOpacity.toFixed(4);
        openingOverlayRef.current.style.transform = `translate3d(0, ${state.openingTextOffsetY.toFixed(2)}px, 0)`;
      }
      if (scrollCueRef.current) {
        scrollCueRef.current.style.opacity = state.scrollCueOpacity.toFixed(4);
      }

      // Moment III — The World editorial overlay
      if (worldOverlayRef.current) {
        worldOverlayRef.current.style.opacity = state.worldTextOpacity.toFixed(4);
        worldOverlayRef.current.style.transform = `translate3d(0, ${state.worldTextOffsetY.toFixed(2)}px, 0)`;
      }

      // Moment III -> IV: 2.5D weathered stone colonnade occlusion pass
      const colP = state.colonnadeProgress;
      const revealLeft = state.humanRevealLeftPct;

      if (humanPortalRef.current) {
        if (revealLeft >= 99.9) {
          humanPortalRef.current.style.visibility = "hidden";
          humanPortalRef.current.style.clipPath = "inset(0% 0% 0% 100%)";
        } else {
          humanPortalRef.current.style.visibility = "visible";
          humanPortalRef.current.style.clipPath =
            revealLeft <= 0.1
              ? "inset(0% 0% 0% 0%)"
              : `inset(0% 0% 0% ${revealLeft.toFixed(3)}%)`;
        }
      }

      if (humanPlateWrapRef.current) {
        humanPlateWrapRef.current.style.transform = `translate3d(${state.humanTranslateX.toFixed(3)}%, 0, 0) scale(${state.humanScale.toFixed(4)})`;
      }

      if (pillarOccluderRef.current) {
        const active = colP > 0.001 && colP < 0.999;
        pillarOccluderRef.current.style.visibility = active ? "visible" : "hidden";
        pillarOccluderRef.current.style.width = `${state.pillarWidthPct}%`;
        // Translate in vw units from left: 0 so pillar sweeps smoothly across the viewport
        pillarOccluderRef.current.style.transform = `translate3d(${state.pillarLeftPct.toFixed(3)}vw, 0, 0) scale(${state.pillarScale.toFixed(4)})`;
      }

      // Moment IV — The Human Moment editorial overlay
      if (humanOverlayRef.current) {
        humanOverlayRef.current.style.opacity = state.humanTextOpacity.toFixed(4);
        humanOverlayRef.current.style.transform = `translate3d(0, ${state.humanTextOffsetY.toFixed(2)}px, 0)`;
        humanOverlayRef.current.style.pointerEvents = state.humanCtaInteractive ? "auto" : "none";
      }

      // Footer minimal progress fill
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${Math.max(0.06, state.progress).toFixed(4)})`;
      }
    };

    const scheduleFrame = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(applyFrame);
      }
    };

    // Immediate sync for initial load, reload scroll-restoration, and bfcache/history return
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

  // Coherent, accessible, non-pinned static experience for prefers-reduced-motion
  if (reducedMotion) {
    return (
      <main id="main-content" className="cxp01-reduced-root" data-cxp01-mode="reduced-motion">
        <header className="cxp01-reduced-header">
          <Link href="/" className="cxp01-brand-link">
            <span className="cxp01-brand-wordmark">ADORA</span>
            <span className="cxp01-brand-tagline">AN INVITATION TO FEEL</span>
          </Link>
          <Link href="/ai-planner" className="cxp01-skip-link">
            AI Planner
          </Link>
        </header>

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
                <filter id="reduced-veil-blur">
                  <feGaussianBlur stdDeviation="28" />
                </filter>
                <mask
                  id="reduced-adora-mask"
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
              <g mask="url(#reduced-adora-mask)">
                <image
                  href={HIGHLAND_PLATE}
                  x="-60"
                  y="-60"
                  width={isMobile ? 1020 : 1720}
                  height={isMobile ? 1720 : 1020}
                  preserveAspectRatio="xMidYMid slice"
                  filter="url(#reduced-veil-blur)"
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
            <h1 className="sr-only">ADORA — Typography Becomes Landscape</h1>
            <p className="cxp01-opening-subtitle">
              Một nơi chốn không thể chỉ nhìn qua màn hình.
            </p>
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
            <p className="cxp01-world-eyebrow">Một chữ cái trở thành cửa sổ</p>
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
            <div className="cxp01-cta-group">
              <Link href="/ai-planner" className="cxp01-primary-cta">
                Thiết kế hành trình cùng ADORA
              </Link>
              <Link href="/" className="cxp01-secondary-cta">
                Về trang chủ ADORA
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="cxp01-root" data-cxp01-mode="cinematic">
      <div ref={runwayRef} className="cxp01-runway" data-cxp01-runway>
        <div className="cxp01-stage" data-cxp01-stage>
          {/* Persistent minimal editorial top chrome */}
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

          {/* Layer 0: Single continuous highland-world visual source (Identity -> Passage -> World) */}
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

          {/* Layer 1: Moment IV Human Moment revealed through the expanding architectural arch */}
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

          {/* Near-plane weathered stone colonnade pillar occluding the World -> Human seam */}
          <div
            ref={pillarOccluderRef}
            className="cxp01-pillar-occluder"
            style={{ visibility: "hidden" }}
            aria-hidden="true"
          >
            <img
              src={PILLAR_OCCLUDER}
              alt=""
              decoding="async"
              className="cxp01-pillar-image"
            />
          </div>

          {/* Layer 2: Precision vector inverted typographic mask veil */}
          <div ref={veilLayerRef} className="cxp01-veil-layer" aria-hidden="true">
            <svg
              className="cxp01-veil-svg"
              viewBox={isMobile ? "0 0 900 1600" : "0 0 1600 900"}
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <filter id="cxp01-veil-blur">
                  <feGaussianBlur stdDeviation="30" />
                </filter>
                <radialGradient id="cxp01-veil-vignette" cx="50%" cy="48%" r="68%">
                  <stop offset="0%" stopColor="#141812" stopOpacity="0.68" />
                  <stop offset="65%" stopColor="#0d110e" stopOpacity="0.86" />
                  <stop offset="100%" stopColor="#070a08" stopOpacity="0.96" />
                </radialGradient>

                <mask
                  id="cxp01-adora-portal-mask"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width={isMobile ? 900 : 1600}
                  height={isMobile ? 1600 : 900}
                >
                  {/* White = opaque dark veil; Black = transparent portal revealing highland-world */}
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
                        {/* Monumental single-letter A for mobile portrait composition */}
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
                        {/* Strictly interior counter wedge aligned to Playfair A inner stems */}
                        <polygon
                          ref={portalCounterRef}
                          points="438,494 256,955 604,955"
                          fill="black"
                          fillOpacity="0"
                        />
                      </>
                    ) : (
                      <>
                        {/* Focal first 'A' — elevated slightly to catch the upper-left sunrise sunbeams */}
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

                        {/* Strictly interior counter wedge aligned to Playfair A inner stems */}
                        <polygon
                          ref={portalCounterRef}
                          points="350,288 262,500 426,500"
                          fill="black"
                          fillOpacity="0"
                        />

                        {/* Secondary letters D O R A — recede cleanly as the focal A expands */}
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

              <g mask="url(#cxp01-adora-portal-mask)">
                {/* Softly blurred atmospheric echo of the exact same highland landscape */}
                <image
                  href={HIGHLAND_PLATE}
                  x="-70"
                  y="-70"
                  width={isMobile ? 1040 : 1740}
                  height={isMobile ? 1740 : 1040}
                  preserveAspectRatio="xMidYMid slice"
                  filter="url(#cxp01-veil-blur)"
                  opacity="0.46"
                />
                <rect
                  x="0"
                  y="0"
                  width={isMobile ? 900 : 1600}
                  height={isMobile ? 1600 : 900}
                  fill="url(#cxp01-veil-vignette)"
                />
              </g>
            </svg>
          </div>

          {/* Subtle architectural hairline frame for Moment I */}
          <div ref={outerFrameRef} className="cxp01-outer-frame" aria-hidden="true" />

          {/* Moment I — Accessible primary heading & opening poetic line */}
          <section ref={openingOverlayRef} className="cxp01-opening-overlay" aria-label="Identity">
            <h1 className="sr-only">ADORA — Typography Becomes Landscape</h1>
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
          </section>

          {/* Subtle scroll invitation */}
          <div ref={scrollCueRef} className="cxp01-scroll-cue" aria-hidden="true">
            <span className="cxp01-scroll-cue-label">Cuộn để bước qua</span>
            <span className="cxp01-scroll-cue-line" />
          </div>

          {/* Moment III — The World editorial statement */}
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

          {/* Moment IV — The Human Moment editorial statement & Concierge CTA */}
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
              <div className="cxp01-cta-group">
                <Link
                  href="/ai-planner"
                  className="cxp01-primary-cta"
                  tabIndex={humanInteractive ? 0 : -1}
                >
                  Thiết kế hành trình cùng ADORA
                </Link>
                <Link
                  href="/"
                  className="cxp01-secondary-cta"
                  tabIndex={humanInteractive ? 0 : -1}
                >
                  Về trang chủ ADORA
                </Link>
              </div>
            </div>
          </section>

          {/* Persistent minimal editorial footer bar */}
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
        </div>
      </div>
    </main>
  );
}
