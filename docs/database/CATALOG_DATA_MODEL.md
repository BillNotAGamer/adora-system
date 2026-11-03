# Catalog Data Model

## Authoritative tables

| Table | Phase 1.2 role | Lifecycle / ownership |
|---|---|---|
| `destinations` | Public geographic grouping | `active`, `hidden`; admin mutation |
| `places` | Geographic catalog location | `active`, `hidden`, `archived`; admin mutation |
| `place_media` | Ordered media reference metadata | Admin mutation; no asset upload |
| `partners` | Service-owning organization | `pending`, `approved`, `suspended`; admin status |
| `partner_memberships` | User-to-organization authorization | `owner`, `manager`, `staff`; admin assignment |
| `service_offers` | Partner-owned service definition and catalog price | `draft`, `active`, `paused`, `archived` |
| `inventory_slots` | Future dated capacity | Read as a related foundation only; not changed in Phase 1.2 |

Places use `geography(Point,4326)` and must be constructed in longitude/latitude order. Nearby
search uses `ST_DWithin` for filtering and `ST_Distance` for meter distances. The existing
`ix_places_location_gist` GiST index supports the spatial predicate. An integration `EXPLAIN`
check with sequential scans disabled confirms that PostgreSQL can select this index. This is index
eligibility evidence, not a production latency benchmark.

Destination slugs are globally unique. Place slugs are unique within a destination. Media keys are
unique within a place. Offer prices and any inventory overrides are integer VND; floating-point
money is not accepted. Transport offers require a distinct arrival place, while non-transport
offers must not have one.

No Phase 1.2 schema change was necessary. Canonical SQL and Alembic revision `0001_adora` remain
unchanged, and all ORM/schema-drift checks continue to cover the same 24-table baseline.

## Demonstration data

`services/api/scripts/seed_demo_catalog.py --confirm` creates deterministic Da Lat demonstration
rows. UUIDv5 identifiers and natural-key collision checks make the process additive and repeatable.
The command is refused outside `development` and `test`, never deletes data, never creates users or
credentials, and labels flexible place/offer attributes as demo data. Example prices and media keys
are not live commercial information.
