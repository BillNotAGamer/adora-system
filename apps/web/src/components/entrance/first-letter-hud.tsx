"use client";

import type { EntrancePhase } from "./first-letter-choreography";

export interface FirstLetterHudProps {
  active: boolean;
  isReducedMode: boolean;
  isMotionOff: boolean;
  phase: EntrancePhase;
  displayPercent: number;
  hudTopPx: number | null;
  statusMessage: string;
}

/**
 * Refined, editorial progress interface for ADORA CXP-05A.
 *
 * - In cinematic mode: floats transparently beneath the live photographic monumental A,
 *   dissolves cleanly once 100% resolves, and unmounts completely on completion.
 * - In reduced-motion mode: provides a calm, static brand preparation state that crossfades
 *   directly into the approved reduced-motion homepage without spatial flight.
 * - Screen reader status announces concise lifecycle states ("Preparing ADORA" -> "ADORA is ready")
 *   without spamming every numeric percentage increment.
 */
export function FirstLetterHud({
  active,
  isReducedMode,
  isMotionOff,
  phase,
  displayPercent,
  hudTopPx,
  statusMessage,
}: Readonly<FirstLetterHudProps>) {
  const rounded = Math.max(0, Math.min(100, Math.round(displayPercent)));
  const formattedPercent = `${String(rounded).padStart(2, "0")}%`;
  const uiHidden = phase === "dissolving-ui" || phase === "transforming" || phase === "complete";

  if (!active && !statusMessage) {
    return null;
  }

  if (!active) {
    // Keep concise polite status mounted briefly only when announcing readiness
    return (
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>
    );
  }

  if (isReducedMode) {
    const fading = phase === "dissolving-ui" || phase === "transforming";
    return (
      <div
        className="cxp05-hud-shell cxp05-hud-shell--reduced"
        data-cxp05-hud="reduced"
        data-cxp05-phase={phase}
        data-cxp05-fading={fading ? "true" : "false"}
        data-cxp05-instant={isMotionOff ? "true" : "false"}
      >
        <div className="cxp05-reduced-lockup">
          <span className="cxp05-reduced-wordmark" aria-hidden="true">
            ADORA
          </span>
          <div className="cxp05-reduced-progress-wrap">
            <div
              className="cxp05-progress-track"
              role="progressbar"
              aria-label="Preparing ADORA"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={rounded}
            >
              <span
                className="cxp05-progress-fill"
                style={{ transform: `scaleX(${(rounded / 100).toFixed(4)})` }}
              />
            </div>
            <div className="cxp05-progress-meta" aria-hidden="true">
              <span className="cxp05-progress-label">ENTERING ADORA</span>
              <span className="cxp05-progress-value">{formattedPercent}</span>
            </div>
          </div>
        </div>
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </div>
      </div>
    );
  }

  return (
    <div
      className="cxp05-hud-shell"
      data-cxp05-hud="cinematic"
      data-cxp05-phase={phase}
      style={
        hudTopPx !== null
          ? ({ ["--cxp05-hud-top"]: `${Math.round(hudTopPx)}px` } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className="cxp05-progress-anchor"
        data-cxp05-ui-hidden={uiHidden ? "true" : "false"}
      >
        <div
          className="cxp05-progress-track"
          role="progressbar"
          aria-label="Preparing ADORA"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
        >
          <span
            className="cxp05-progress-fill"
            style={{ transform: `scaleX(${(displayPercent / 100).toFixed(4)})` }}
          />
        </div>
        <div className="cxp05-progress-meta" aria-hidden="true">
          <span className="cxp05-progress-label">ENTERING ADORA</span>
          <span className="cxp05-progress-value" data-cxp05-percent={rounded}>
            {formattedPercent}
          </span>
        </div>
      </div>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>
    </div>
  );
}
