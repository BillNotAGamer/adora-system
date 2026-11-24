"use client";

import { useConcierge } from "@/components/concierge/concierge-provider";
import { ConciergeAtelierExperience } from "@/components/concierge/concierge-atelier-experience";

/**
 * Integrated /ai-planner route view when Atelier preview mode is explicitly enabled.
 * Shares state with the global ConciergeProvider so homepage -> /ai-planner transitions
 * keep the active session without creating a second provider.
 */
export function AtelierRouteWorkspace() {
  const { atelierState, atelierDispatch } = useConcierge();

  return (
    <ConciergeAtelierExperience
      variant="route"
      externalState={atelierState}
      externalDispatch={atelierDispatch}
    />
  );
}
