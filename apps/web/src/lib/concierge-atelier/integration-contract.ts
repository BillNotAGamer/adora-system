/**
 * ADORA CXP-04B — Production Integration Contract (Design Only, Not Activated)
 *
 * Defines the typed adapter boundary for how existing UX-1 Concierge entry points
 * (Header, Mobile Nav, Floating Trigger, Movement 06, /ai-planner) can eventually
 * hand off user intent and draft context into the Personal Journey Atelier without
 * duplicating ConciergeProvider or breaking UX-1 accessibility/rollback guarantees.
 */

import type { AtelierPhase, DiscoveryAnswers, PreferenceKey } from "./types.ts";

export type ConciergeEntrySurface =
  | "site-header"
  | "mobile-menu"
  | "floating-trigger"
  | "movement-06"
  | "ai-planner-route";

export interface Ux1ToAtelierHandoff {
  sourceSurface: ConciergeEntrySurface;
  returnPath: string;
  ux1DraftText?: string;
  ux1Answers?: Partial<DiscoveryAnswers>;
  initialPhase: Extract<AtelierPhase, "invitation" | "discovery">;
}

export interface AtelierWorkspaceController {
  readonly mode: "ux1-dialog" | "atelier-workspace";
  openFromSurface: (handoff: Ux1ToAtelierHandoff, originEl: HTMLElement | null) => void;
  closeAndRestoreFocus: () => void;
  editPreferenceFromCanvas: (key: PreferenceKey) => void;
  fallbackToUx1: () => void;
}
