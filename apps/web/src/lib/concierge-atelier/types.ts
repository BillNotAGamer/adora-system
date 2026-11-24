/**
 * ADORA CXP-04A — Personal Journey Atelier
 * Cleanly separates Conversation State, User Preference Provenance, and Travel Domain Data
 * so a future live AI provider can replace the deterministic prototype engine without UI rewrites.
 */

export type AtelierPhase =
  | "invitation"
  | "discovery"
  | "interpretation"
  | "reveal"
  | "refinement";

export type FactProvenance = "confirmed" | "inferred" | "missing";

export type PreferenceKey =
  | "intention"
  | "companions"
  | "destination"
  | "duration"
  | "budget"
  | "accessibility";

export interface PreferenceFact {
  key: PreferenceKey;
  label: string;
  value: string | null;
  provenance: FactProvenance;
  rationale?: string;
}

export interface AtelierMessage {
  id: number;
  role: "user" | "assistant";
  eyebrow: string;
  text: string;
  /** Distinguishes scripted prototype replies from future live model responses. */
  provenance: "user-input" | "scripted-atelier" | "unsupported-notice";
}

export type CostCategory =
  | "accommodation"
  | "transport"
  | "activities"
  | "food"
  | "buffer";

export interface CostLineItem {
  category: CostCategory;
  label: string;
  amountVnd: number;
  assumption: string;
}

export interface AtelierCostBreakdown {
  currency: "VND";
  provenance: "illustrative-estimate";
  travelerCount: number;
  items: CostLineItem[];
  totalVnd: number;
  perPersonVnd: number;
  uncertaintyRange: string;
  exclusions: string[];
}

export interface AtelierActivity {
  id: string;
  periodLabel: string;
  timeWindow: string;
  title: string;
  summary: string;
  locationNote: string;
  experienceSlug: string | null;
}

export interface AtelierDay {
  day: number;
  title: string;
  summary: string;
  moodImageSrc: string;
  moodImageAlt: string;
  activities: AtelierActivity[];
}

export interface RevisionSummary {
  kind: RefinementKind;
  title: string;
  whatChanged: string;
  whyChanged: string;
  assumptionsChanged: string[];
}

export interface AtelierJourney {
  slug: string;
  title: string;
  subtitle: string;
  destinationName: string;
  durationDays: number;
  paceLabel: string;
  coverSrc: string;
  coverAlt: string;
  accommodationAssumption: string;
  transportAssumption: string;
  days: AtelierDay[];
  cost: AtelierCostBreakdown;
  appliedRefinements: string[];
  lastRevision: RevisionSummary | null;
  notes: string[];
  provenance: "scripted-demo-fixture";
}

export type RefinementKind =
  | "slower-pace"
  | "lower-budget"
  | "toggle-duration"
  | "coffee-culture"
  | "group-four";

export interface DiscoveryAnswers {
  intention: string[];
  companions: string | null;
  destination: string | null;
  duration: "2" | "3" | null;
  budget: "lean" | "balanced" | "curated" | null;
  accessibility: string | null;
}

export interface AtelierState {
  phase: AtelierPhase;
  stepIndex: number;
  editingKey: PreferenceKey | null;
  answers: DiscoveryAnswers;
  skippedKeys: Partial<Record<PreferenceKey, boolean>>;
  confirmedInferences: Partial<Record<PreferenceKey, boolean>>;
  messages: AtelierMessage[];
  freeNotes: string[];
  draft: string;
  error: string;
  nextId: number;
  activeDay: number;
  mobileView: "conversation" | "canvas";
  lastRevision: RevisionSummary | null;
  refinements: {
    slowerPace: boolean;
    lowerBudget: boolean;
    coffeeCulture: boolean;
    groupFour: boolean;
  };
}
