import { z } from "zod";
import type { ApiComponents } from "@adora/api-client";

const uuid = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const destination = z.object({
  id: uuid, slug: z.string().min(1), name: z.string().min(1),
  country_code: z.string().length(2), latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(), status: z.literal("active"),
  created_at: timestamp,
}) satisfies z.ZodType<ApiComponents["schemas"]["DestinationResponse"]>;
const offer = z.object({
  id: uuid, partner_id: uuid, place_id: uuid, arrival_place_id: uuid.nullable(),
  title: z.string().min(1), kind: z.string().min(1), description: z.string().nullable(),
  base_price_vnd: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  attributes: z.record(z.string(), z.unknown()), status: z.literal("active"),
  created_at: timestamp, updated_at: timestamp,
}) satisfies z.ZodType<ApiComponents["schemas"]["OfferResponse"]>;
const pagination = { count: z.number().int().nonnegative(), limit: z.number().int().min(1).max(100), offset: z.number().int().nonnegative() };
export const destinationListSchema = z.object({ ...pagination, items: z.array(destination).max(100) })
  .refine(value => value.count === value.items.length && value.count <= value.limit, "Invalid page count");
export const offerListSchema = z.object({ ...pagination, items: z.array(offer).max(100) })
  .refine(value => value.count === value.items.length && value.count <= value.limit, "Invalid page count");

/** Current operational DTOs cannot supply coherent editorial stories. Never mix their names/titles into fixed imagery. */
export function homepageEditorialPresentation(source: "live" | "partial" | "fallback") {
  return {
    destinationName: "Đà Lạt",
    experienceNames: ["Sớm mai trong rừng thông", "Hương vị cao nguyên", "Những khoảng lặng có chủ đích"],
    catalogAvailable: source !== "fallback",
  };
}
