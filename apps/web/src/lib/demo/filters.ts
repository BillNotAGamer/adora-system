import { getDestinationBySlug } from "./destinations.ts";
import { EXPERIENCES } from "./experiences.ts";
import { normalizeText } from "./text.ts";
import type { Destination, DestinationRegion, Experience, ExperienceCategory } from "./types.ts";

export type DestinationFilter = {
  query: string;
  region: DestinationRegion | "all";
  availability: "all" | "available" | "coming-soon";
};

export const DEFAULT_DESTINATION_FILTER: DestinationFilter = { query: "", region: "all", availability: "all" };

export function filterDestinations(destinations: readonly Destination[], filter: DestinationFilter): Destination[] {
  const needle = normalizeText(filter.query);
  return destinations.filter((destination) => {
    if (filter.region !== "all" && destination.region !== filter.region) return false;
    if (filter.availability !== "all" && destination.status !== filter.availability) return false;
    if (!needle) return true;
    const haystack = normalizeText(
      [destination.name, destination.regionLabel, destination.tagline, destination.bestFor.join(" ")].join(" "),
    );
    return haystack.includes(needle);
  });
}

export type ExperienceFilter = {
  query: string;
  category: ExperienceCategory | "all";
};

export const DEFAULT_EXPERIENCE_FILTER: ExperienceFilter = { query: "", category: "all" };

export function filterExperiences(experiences: readonly Experience[], filter: ExperienceFilter): Experience[] {
  const needle = normalizeText(filter.query);
  return experiences.filter((experience) => {
    if (filter.category !== "all" && experience.category !== filter.category) return false;
    if (!needle) return true;
    const destinationName = getDestinationBySlug(experience.destinationSlug)?.name ?? "";
    const haystack = normalizeText(
      [experience.name, experience.tagline, experience.summary, destinationName, experience.suitableFor.join(" ")].join(
        " ",
      ),
    );
    return haystack.includes(needle);
  });
}

/** Category counts over the full experience set, used to label filter chips honestly. */
export function countExperiencesByCategory(): Record<ExperienceCategory, number> {
  const counts: Record<ExperienceCategory, number> = {
    nature: 0,
    "food-coffee": 0,
    culture: 0,
    relaxation: 0,
    activity: 0,
  };
  for (const experience of EXPERIENCES) counts[experience.category] += 1;
  return counts;
}
