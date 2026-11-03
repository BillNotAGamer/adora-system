# Travel Catalog Architecture

## Module boundaries

Phase 1.2 extends the FastAPI modular monolith with three application modules:

- `catalog`: destinations, places, media metadata, and service-offer definitions.
- `partner`: organization administration, membership assignment, partner-scoped operations.
- `geospatial`: bounded PostGIS nearby-place queries.

HTTP routers validate transport DTOs and translate expected application errors. Services own
transaction boundaries, lifecycle policy, and audit events. Repositories contain explicit typed
SQLAlchemy queries and never commit. All modules reuse the Phase 1.1 metadata registry, async
session, current-principal dependency, role checks, and partner-scope dependency.

## Ownership decisions

The baseline has no partner foreign key on `places` or `place_media`. Place and media mutations are
therefore administrator-only; Phase 1.2 does not invent ownership that the database cannot enforce.
Partners own `service_offers` through `service_offers.partner_id`. Partner-scoped offer reads require
membership; mutations additionally require `owner` or `manager`. `staff` is read-only. An
administrator may explicitly override partner scope.

The public catalog exposes only active destinations, places, and offers. Hidden/archived/draft/
paused records remain available only through the appropriate administrator or partner endpoints.
Catalog records are archived through supported lifecycle status values rather than hard-deleted.
Only detached `place_media` metadata may be deleted; this does not delete an external asset.

## Transactions and errors

Mutation services use one explicit SQLAlchemy transaction for validation, persistence, and audit
logging. Authentication and partner-scope dependencies close their read-only authorization
transactions before handing the shared session to a mutation service. Database uniqueness and
foreign-key failures are translated into stable 404/409 responses; Pydantic handles malformed
request data with the existing safe validation envelope.

No `create_all`, schema rewrite, or new migration was required. `0001_adora` remains authoritative.

## Deferred work

Inventory availability, booking, uploads, catalog moderation workflows, road travel time, search
ranking, full-text search, and AI integration are outside Phase 1.2.
