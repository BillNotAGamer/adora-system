import type { ApiComponents } from "@adora/api-client";

import type { Destination } from "./demo/types.ts";

type CatalogDestination = ApiComponents["schemas"]["DestinationResponse"];

/**
 * Minimal view-model boundary for destinations.
 *
 * Pages render this shape, not raw API DTOs or raw demo fixtures. That keeps a future switch from
 * local demo records to the public Catalog API to a single mapping function, while `source` keeps
 * the origin of every record honest. Only the fields that both origins genuinely share are mapped;
 * nothing is invented to make the two look alike.
 */
export type DestinationSummaryViewModel = {
  slug: string;
  name: string;
  source: "catalog-api" | "demo";
  coordinates: { latitude: number; longitude: number } | null;
};

export function fromCatalogDestination(destination: CatalogDestination): DestinationSummaryViewModel {
  const hasCoordinates = destination.latitude !== null && destination.longitude !== null;
  return {
    slug: destination.slug,
    name: destination.name,
    source: "catalog-api",
    coordinates: hasCoordinates
      ? { latitude: destination.latitude as number, longitude: destination.longitude as number }
      : null,
  };
}

export function fromDemoDestination(destination: Destination): DestinationSummaryViewModel {
  return { slug: destination.slug, name: destination.name, source: "demo", coordinates: null };
}
