/**
 * Local demonstration data model for Web Design 0.3.
 *
 * Everything under `lib/demo/` is curated editorial or demo-fixture material that ships with the
 * web application. None of it is read from, or written to, the Catalog API or the database, and
 * none of it represents live inventory, bookable offers, or real user trips.
 */

/** Where a displayed record comes from. Pages surface this honestly to the reader. */
export type DemoProvenance = "editorial" | "demo-fixture";

export type DemoImage = {
  /** Public path under `apps/web/public`. */
  src: string;
  /** Meaningful Vietnamese alternative text. */
  alt: string;
  /** Optional CSS `object-position` value for deliberate crops. */
  position?: string;
};

export type DestinationRegion = "cao-nguyen" | "ven-bien" | "mien-nui-phia-bac";

export type Destination = {
  slug: string;
  name: string;
  region: DestinationRegion;
  regionLabel: string;
  tagline: string;
  summary: string;
  /** Editorial paragraphs for the detail page. Empty for coming-soon records. */
  description: string[];
  image: DemoImage | null;
  /** Only `available` records have a detail page; `coming-soon` is inspiration only. */
  status: "available" | "coming-soon";
  highlights: { title: string; note: string }[];
  bestFor: string[];
  experienceSlugs: string[];
  tripSlug: string | null;
  provenance: DemoProvenance;
};

export type ExperienceCategory = "nature" | "food-coffee" | "culture" | "relaxation" | "activity";

export type Experience = {
  slug: string;
  name: string;
  destinationSlug: string;
  category: ExperienceCategory;
  tagline: string;
  summary: string;
  description: string[];
  image: DemoImage;
  /** Qualitative guidance only: no opening hours, durations, distances, or prices. */
  bestMoment: string;
  pace: "nhẹ" | "vừa";
  suitableFor: string[];
  tips: string[];
  provenance: DemoProvenance;
};

export type ItineraryPeriod = "morning" | "noon" | "afternoon" | "evening";

export type ItineraryActivity = {
  id: string;
  period: ItineraryPeriod;
  title: string;
  summary: string;
  detail: string;
  /** Representative area label, not an address or a coordinate. */
  locationNote: string;
  /** Optional link to an existing experience record. */
  experienceSlug: string | null;
};

export type ItineraryDay = {
  /** 1-based and strictly increasing within a trip. */
  day: number;
  title: string;
  summary: string;
  /** Illustrative per-day budget in integer VND. Never a live quote. */
  illustrativeBudgetVnd: number;
  activities: ItineraryActivity[];
};

export type Trip = {
  slug: string;
  title: string;
  destinationSlug: string;
  durationDays: number;
  status: "demo-sample" | "demo-draft";
  statusLabel: string;
  intro: string;
  cover: DemoImage;
  pace: string;
  days: ItineraryDay[];
  planNotes: string[];
  provenance: DemoProvenance;
};

export type PlannerScenario = {
  id: string;
  /** Prompt shown as a suggestion and as the user message. */
  prompt: string;
  /** Alternative phrasings that count as the same scripted request. */
  aliases: string[];
  tripSlug: string;
  introduction: string;
  closing: string;
  steps: string[];
};
