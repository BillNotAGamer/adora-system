import type { ApiComponents } from "@adora/api-client";

import { apiUrl } from "@/lib/api";

type Destination = ApiComponents["schemas"]["DestinationResponse"];
type DestinationList = ApiComponents["schemas"]["DestinationListResponse"];
type Offer = ApiComponents["schemas"]["OfferResponse"];
type OfferList = ApiComponents["schemas"]["OfferListResponse"];

export type HomepageCatalog = {
  destination: Destination | null;
  offers: Offer[];
  source: "live" | "partial" | "fallback";
};

const REQUEST_TIMEOUT_MS = 1800;

export const EDITORIAL_CATALOG_FALLBACK: HomepageCatalog = {
  destination: null,
  offers: [],
  source: "fallback",
};

async function requestCatalog<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getHomepageCatalog(): Promise<HomepageCatalog> {
  const [destinationsResult, offersResult] = await Promise.allSettled([
    requestCatalog<DestinationList>("/api/v1/destinations?limit=1&offset=0"),
    requestCatalog<OfferList>("/api/v1/offers?limit=3&offset=0"),
  ]);

  const destination =
    destinationsResult.status === "fulfilled" ? (destinationsResult.value.items[0] ?? null) : null;
  const offers = offersResult.status === "fulfilled" ? offersResult.value.items.slice(0, 3) : [];
  const fulfilledCount = Number(destinationsResult.status === "fulfilled") + Number(offersResult.status === "fulfilled");

  return {
    destination,
    offers,
    source: fulfilledCount === 2 ? "live" : fulfilledCount === 1 ? "partial" : "fallback",
  };
}
