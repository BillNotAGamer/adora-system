import type { ApiComponents } from "@adora/api-client";

import { apiUrl } from "./api.ts";
import { destinationListSchema, offerListSchema } from "./catalog-contract.ts";

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

async function requestCatalog<T>(path: string, parse: (value: unknown) => T, request: typeof fetch): Promise<T> {
  const response = await request(apiUrl(path), {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }

  return parse(await response.json());
}

export async function getHomepageCatalog(request: typeof fetch = fetch): Promise<HomepageCatalog> {
  const [destinationsResult, offersResult] = await Promise.allSettled([
    requestCatalog<DestinationList>("/api/v1/destinations?limit=1&offset=0", value => destinationListSchema.parse(value), request),
    requestCatalog<OfferList>("/api/v1/offers?limit=3&offset=0", value => offerListSchema.parse(value), request),
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
