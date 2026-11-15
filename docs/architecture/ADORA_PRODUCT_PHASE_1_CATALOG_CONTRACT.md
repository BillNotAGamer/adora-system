# Product Phase 1 — Destination Catalog Contract

Status: **Phase 1A proposal for Phase 1B; no persistence, new endpoint or migration implemented here.**

## 1. Current source-to-UI flow

Discovery list/detail pages read `apps/web/src/lib/demo/` and filter locally. The homepage alone requests current `/api/v1/destinations` and `/api/v1/offers` concurrently, with 1800ms timeouts and 300-second fetch revalidation. `CatalogStories` awaits Next.js `connection()` inside Suspense, deferring that component to request time while preserving a server-rendered editorial fallback.

Current DestinationResponse contains UUID, slug, name, country, coordinates, operational status and created_at. It cannot supply the rich destination fixture shape. Existing detail lookup is by UUID; fixture detail navigation is by slug. Offers are commercial entities, not editorial experiences. Phase 1A validates current runtime responses and deliberately keeps entire homepage stories editorial, even when transport succeeds. `source: live/partial/fallback` describes validated request outcomes, not approval of live editorial content or commercial availability.

## 2. Target flow and bounded Phase 1B scope

```text
Next destination list/detail Server Components
  → generated public-destination DTOs + runtime validation
    → FastAPI public destination application queries
      → active Destination JOIN published DestinationEditorial
        → PostgreSQL/PostGIS (one existing modular monolith)
```

Deliver one destination listing → slug detail journey with persistent, coherent content. Preserve visual layout/motion. No AI, saved itineraries, booking, offers-as-experiences, general CMS or mobile redesign.

## 3. Content ownership decision (recommended, approval required)

| Option | Benefit | Cost/risk |
|---|---|---|
| A: expand destinations | Simple read | Couples operational identity to editorial publishing; many new presentation fields on immutable-baseline entity |
| B: entirely separate content service/entity | Independent lifecycle | Duplicates identity if slug/name/country are copied; an external CMS/service is unnecessary here |
| C: small hybrid | Existing operational identity + one related editorial row | One join and reviewed additive migration; explicit publishing policy needed |

**Recommend C:** retain `adora.destinations` as authoritative identity and geography; add a one-to-one `adora.destination_editorial` keyed by destination_id, referencing destinations.id with deletion restricted. Do not duplicate UUID, slug, display name, country or coordinates. This is a related table inside the existing database, not a new service.

Proposed editorial fields: region_code (controlled editorial taxonomy), tagline, summary, paragraphs, hero asset reference/metadata, highlights, publication_status (`draft`, `published`), related editorial references, created_at and updated_at. Plain text paragraphs and small bounded structured JSONB for highlights/image metadata are reasonable; do not turn the table into an unvalidated arbitrary JSON document. Validate shape in Pydantic and essential JSON container invariants in SQL. Start with vi-VN only unless localization is explicitly approved.

The existing destination name remains the display name. Do not silently extend active/hidden to mean draft/published: operational visibility and editorial publication are separate gates. A future publication action must validate complete text/image content before publishing.

## 4. Proposed public DTOs

These are proposed types, not generated or exposed endpoints today:

- `PublicDestinationSummary`: id UUID, slug, name, country_code, region `{code,label}`, nullable paired coordinates `{latitude,longitude}`, tagline, summary, hero image, publication_status=`published`, source=`catalog-api`, updated_at (latest relevant public content change).
- `PublicDestinationDetail`: summary fields plus paragraphs, highlights `[{title,note}]`, and typed related editorial references. It may include published_at when the publication lifecycle has been approved and stored.
- `PublicDestinationPage`: items, total, limit, offset. Define `total` as full filtered-result count. Existing current API `count` is page length and must not be silently reinterpreted.
- Image: `{url,width,height,alt,focal_point:{x,y}}`; native dimensions are positive, x/y are normalized 0..1, alternative text is required. DTO validation bounds text/array sizes, slug, UUID, country and coordinates.

The current core destination has created_at but no updated_at. Phase 1B must explicitly touch the related editorial updated_at in the same transaction when operational display fields change, or approve another timestamp strategy; do not claim the baseline already tracks those updates. Region labels should be resolved from the approved taxonomy rather than duplicated as uncontrolled free text.

Illustrative proposed response only:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "slug": "da-lat",
  "name": "Đà Lạt",
  "country_code": "VN",
  "region": {"code": "cao-nguyen", "label": "Cao nguyên"},
  "coordinates": {"latitude": 11.94, "longitude": 108.44},
  "tagline": "Thành phố của sương và thông.",
  "summary": "Nội dung biên tập minh họa cho hợp đồng đề xuất.",
  "hero": {"url": "/images/home/dalat-pine-trail.webp", "width": 1086, "height": 1448, "alt": "Lối mòn trong rừng thông", "focal_point": {"x": 0.5, "y": 0.5}},
  "source": "catalog-api",
  "publication_status": "published",
  "updated_at": "2026-11-15T00:00:00Z",
  "paragraphs": ["Đây là ví dụ hợp đồng, không phải phản hồi API đã triển khai."],
  "highlights": [{"title": "Thiên nhiên", "note": "Gợi ý biên tập"}],
  "related_content": []
}
```

Coordinates above illustrate the proposed shape; they are not new verified operational data. Do not infer prices, travel times, opening hours or bookability from this DTO.

## 5. Slug lookup and compatibility

Propose additive `GET /api/v1/public/destinations` and `GET /api/v1/public/destinations/by-slug/{slug}`. Example request: `/api/v1/public/destinations/by-slug/da-lat`. A separate namespace avoids ambiguity with the existing UUID route and gives enriched public DTOs a distinct contract. Keep existing `/api/v1/destinations` and `/api/v1/destinations/{destination_id}` unchanged for current consumers. Do not replace a UUID parameter with a string or alter existing response semantics.

Use the existing unique destinations.slug constraint/index for lookup, joined to the unique editorial destination_id. Enforce slug syntax and canonical lowercase policy on trusted write paths; use parameterized SQLAlchemy queries. Return 404 for unknown, hidden, unpublished or incomplete public records without revealing their internal status. Public endpoints require no role claim; visibility is a server-side database predicate. Authentication never makes a hidden record public through these routes.

Published slugs should be immutable in Phase 1B. Renames/redirect history require a separate approved design; do not break stable URLs silently. Review an EXPLAIN plan and list sorting/pagination before adding redundant indexes. Proposed region filtering uses editorial taxonomy, not offer kinds. Define bounded normalized text filtering and stable secondary ordering by UUID.

## 6. Publication and related-content rules

Public eligibility requires `destination.status == active` AND `editorial.publication_status == published` AND a valid complete editorial unit. Apply the same policy to lists, detail, related references and counts. Draft content is accessible only through a separately authorized administration surface. A database failure is not a 404; use a safe 503/error response.

Frontend `coming-soon` inspiration is not active persistent inventory. Keep it separately identified as editorial inspiration until its publication semantics are approved; do not merge fixture rows into an authoritative live page as if they were database results.

Frontend Experience categories (`nature`, `food-coffee`, etc.) are editorial. Place categories (`attraction`, `hotel`, etc.) and offer kinds (`stay`, `transport`, `experience`) describe operational entities. Do not equate these enums. Initially allow zero related content and retain existing experience routes as disclosed fixtures. A minimal future link may associate an editorial reference with a destination UUID and, optionally, a known place/offer UUID after semantics are approved. No Experience table is authorized in Phase 1A or required for the first destination journey.

## 7. Images and responsive delivery

Use approved asset keys resolved server-side to same-origin or explicitly allowlisted media URLs. Existing place_media belongs to places; do not attach destination heroes to an arbitrary place merely to reuse that table. For Phase 1B, a bounded hero asset reference in the editorial row can resolve the existing local image without an upload service. Keep rights/provenance records and alt text. Do not accept arbitrary fetch URLs, SVG/HTML payloads or user-provided CSS.

The frontend owns CSS crop, layout-specific `sizes`, loading priority and Next Image rendering. API native dimensions and normalized focal points support those decisions; the backend should not dictate viewport CSS or promise generated renditions it cannot serve. An external host would need separately reviewed Next image host configuration. No global image setting or original image replacement is proposed here.

Define URL resolution in the adapter: same-origin relative media URLs refer to the web asset origin, not automatically the FastAPI origin. Do not concatenate API_BASE_URL onto a Next public asset path without an approved delivery mapping.

## 8. Migration and preserved invariants

Phase 1A makes **no schema changes**. Phase 1B would require one reviewed additive revision after `0001_adora`, defining the editorial table, FK, uniqueness, publication and JSON/text constraints. Confirm current revision and schema before choosing the next revision identifier. Never edit the baseline SQL/migration, stamp away drift or call create_all(). Do not run migrations on unknown/external data without approval.

Preserve schema `adora`, UUID identity, unique slug, active/hidden operational constraints, PostGIS geography, existing partner/place/offer relationships, and every booking/inventory/payment constraint. No data destructive backfill. An optional reviewed editorial import must be explicit, idempotent and development-scoped, with approved source provenance. Existing seed_catalog does not automatically constitute an editorial backfill. Schema audit's expected table/revision policy must be deliberately updated and tested if a migration is approved.

## 9. Frontend transition and fallback

Introduce a destination data-source adapter for the new DTOs. Switch the list/detail journey together; do not fetch a live name into fixture imagery. Keep UUIDs internal and route by the returned canonical slug. Validate actual responses before rendering. A valid empty list is an honest empty state, not an excuse to fabricate records.

For Phase 1B decide whether public pages are authoritative-live or explicitly demo-enabled. Recommended: coherent disclosed demo mode for offline development; live mode returns a safe unavailable state on network/schema failure and 404 for missing/unpublished detail. Never silently mask hidden content with a fixture of the same slug. Preserve SSR and bounded request handling. Five-minute public caching is acceptable only if owner-approved publication freshness permits it; otherwise review invalidation explicitly. No private user data enters shared public caches.

## 10. Runtime validation and API-client policy

Phase 1A uses existing Zod for the **current** destination/offer page contracts, checking required fields, UUID/date/number shapes, bounded pagination, page-count consistency and active-only records. Invalid data rejects that request; Promise.allSettled preserves the valid half. HTTP/JSON/timeout failures never expose upstream details. Successful transport still does not authorize mixed editorial presentation. Existing types remain generated from FastAPI.

Phase 1B adds Pydantic DTOs first, exports OpenAPI without connecting to the database, regenerates `packages/api-client/src/schema.d.ts` with the existing openapi-typescript command, and builds/typechecks the package. Add only needed runtime request functions; currently the runtime client exposes health, while generated types cover current Catalog endpoints. Do not hand-copy the proposed DTO into production TypeScript before backend implementation. Keep runtime parsers aligned by typed checks and representative contract tests. Additive APIs preserve old consumers; breaking DTO changes need explicit versioning/migration policy.

## 11. Tests, security and authorization

- Real PostgreSQL: additive migration, FK/unique/JSON invariants, schema audit, lookup by slug, pagination/filter totals, consistent hidden/draft exclusion and query plans. Isolated database or rollback-safe fixtures only.
- API: published success; all ineligible cases 404; invalid slug/filter validation; bounded pagination; media allowlist; stable envelopes; no private fields.
- Frontend: DTO parsing, empty states, source labels, offline/live modes, partial failure, timeouts, matching name/image/copy; actual online list → detail browser flow after infrastructure is approved.
- Regression: existing web unit/lint/type/build, three browser verifiers including motion/H1, API-client generation/build, Ruff/strict mypy and applicable backend tests.
- Mutations remain administrator-only unless a future partner policy explicitly assigns editorial ownership. Partner role alone must not authorize destination editing. Public read filters derive from database state, not user claims.
- Secrets remain server-side; public URLs are not credentials. Safe errors and minimal audit metadata; no raw response bodies, credentials or personal prompts in logs. Preserve existing security/transaction boundaries.

## 12. Proposed Phase 1B file inventory

Backend: add editorial mapping to `app/domain/models/catalog.py` (or a focused adjacent file) and import registry; reviewed Alembic revision; Catalog schemas/repository/service/router; explicit import command only if approved; schema-audit expectations; Catalog visibility/migration tests. Update OpenAPI-generated types and only required API-client runtime methods.

Frontend: add the destination DTO parser/data-source/view-model adapter; wire `app/destinations/page.tsx` and `[slug]/page.tsx`; adapt destination-browser inputs without redesign; preserve fixture mode separately. Update homepage stories only once the enriched endpoint supplies coherent content. Add source-mode and list/detail integration tests. Do not modify Reveal, hero, motion CSS, planner or itinerary persistence.

## 13. Decisions requiring product-owner approval before Phase 1B

1. Approve the small hybrid model and additive editorial migration.
2. Confirm region taxonomy, vi-VN scope, publication requirements and stable-slug policy.
3. Approve enriched public namespace/DTOs and authoritative-live versus explicit demo-mode UX.
4. Approve content provenance, hero assets and who may publish; choose local keys versus media hosting.
5. Supply/approve a controlled database environment, PostGIS compatibility and migration authority. No credentials belong in this document.
6. Confirm that related experiences may remain fixtures/empty references for the first destination slice.

This document is implementation-ready design guidance, not authorization to perform Phase 1B persistence or external mutations.
