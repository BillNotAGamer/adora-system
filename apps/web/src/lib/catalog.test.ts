import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getHomepageCatalog } from "./catalog.ts";
import { destinationListSchema, offerListSchema, homepageEditorialPresentation } from "./catalog-contract.ts";

const id = "11111111-1111-4111-8111-111111111111";
const created_at = "2026-11-15T00:00:00Z";
const destination = { id, slug: "ha-noi", name: "Hà Nội", country_code: "VN", latitude: 21, longitude: 105, status: "active", created_at };
const offer = { id, partner_id: id, place_id: id, arrival_place_id: null, title: "An unrelated offer", kind: "experience", description: null, base_price_vnd: 100, attributes: {}, status: "active", created_at, updated_at: created_at };
const page = (items: unknown[]) => ({ items, count: items.length, limit: 3, offset: 0 });
const request = (destinations: unknown, offers: unknown): typeof fetch => async url => Response.json(String(url).includes("/destinations") ? destinations : offers);

describe("homepage Catalog runtime boundary", () => {
  it("accepts complete current DTOs without claiming editorial mapping", async () => {
    const result = await getHomepageCatalog(request(page([destination]), page([offer])));
    assert.equal(result.source, "live");
    assert.equal(result.destination?.id, id);
    assert.equal(result.offers.length, 1);
    const presentation = homepageEditorialPresentation(result.source);
    assert.equal(presentation.destinationName, "Đà Lạt");
    assert.ok(!presentation.experienceNames.includes(offer.title));
  });
  it("rejects missing required destination fields", () => {
    const { name: _name, ...missing } = destination;
    void _name;
    assert.equal(destinationListSchema.safeParse(page([missing])).success, false);
  });
  it("rejects incorrect field types and invalid UUIDs", () => {
    for (const change of [{ latitude: "21" }, { id: "not-a-uuid" }, { created_at: "yesterday" }]) {
      assert.equal(destinationListSchema.safeParse(page([{ ...destination, ...change }])).success, false);
    }
  });
  it("rejects invalid pagination and missing envelopes", () => {
    assert.equal(destinationListSchema.safeParse({ ...page([destination]), count: 2 }).success, false);
    assert.equal(destinationListSchema.safeParse({ items: [] }).success, false);
    assert.equal(destinationListSchema.safeParse({ ...page([destination, destination]), limit: 1 }).success, false);
  });
  it("rejects hidden/unpublished destinations and inactive offers", () => {
    assert.equal(destinationListSchema.safeParse(page([{ ...destination, status: "hidden" }])).success, false);
    assert.equal(offerListSchema.safeParse(page([{ ...offer, status: "draft" }])).success, false);
  });
  it("rejects incomplete offers and unsafe money values", () => {
    assert.equal(offerListSchema.safeParse(page([{ title: "Incomplete" }])).success, false);
    assert.equal(offerListSchema.safeParse(page([{ ...offer, base_price_vnd: -1 }])).success, false);
  });
  it("preserves the valid half when destinations are malformed", async () => {
    const result = await getHomepageCatalog(request({ items: "bad" }, page([offer])));
    assert.equal(result.source, "partial"); assert.equal(result.destination, null); assert.equal(result.offers.length, 1);
  });
  it("preserves destinations when offers fail", async () => {
    const result = await getHomepageCatalog(async url => String(url).includes("/offers") ? new Response("private failure", { status: 500 }) : Response.json(page([destination])));
    assert.equal(result.source, "partial"); assert.equal(result.destination?.id, id); assert.deepEqual(result.offers, []);
  });
  it("handles invalid JSON without exposing upstream details", async () => {
    const result = await getHomepageCatalog(async () => new Response("private upstream data"));
    assert.deepEqual(result, { destination: null, offers: [], source: "fallback" });
  });
  it("handles a fully offline API", async () => {
    const result = await getHomepageCatalog(async () => { throw new Error("offline"); });
    assert.equal(result.source, "fallback");
  });
  it("bounds real signal-based timeout and preserves fetch revalidation", async () => {
    const started = Date.now();
    const result = await getHomepageCatalog(async (_url, init) => {
      assert.equal((init as RequestInit & { next: { revalidate: number } }).next.revalidate, 300);
      return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("timeout")), { once: true }));
    });
    assert.equal(result.source, "fallback"); assert.ok(Date.now() - started < 4000);
  });
  it("accepts empty results while retaining editorial presentation", async () => {
    const result = await getHomepageCatalog(request(page([]), page([])));
    assert.equal(result.source, "live"); assert.equal(result.destination, null); assert.deepEqual(result.offers, []);
    for (const source of ["live", "partial", "fallback"] as const) {
      assert.equal(homepageEditorialPresentation(source).destinationName, "Đà Lạt");
    }
  });
});
