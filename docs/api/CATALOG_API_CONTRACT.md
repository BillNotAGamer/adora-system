# Catalog API Contract

FastAPI OpenAPI is authoritative. Generated TypeScript declarations live in
`packages/api-client/src/schema.d.ts`.

## Public endpoints

| Method and path | Behavior |
|---|---|
| `GET /api/v1/destinations` | Paginated active destinations |
| `GET /api/v1/destinations/{destination_id}` | Active destination detail |
| `GET /api/v1/places` | Active places; destination, category, and escaped name filters |
| `GET /api/v1/places/nearby` | Bounded PostGIS radius search, deterministic distance/UUID order |
| `GET /api/v1/places/{place_id}` | Active place detail |
| `GET /api/v1/places/{place_id}/media` | Stable media metadata order |
| `GET /api/v1/offers` | Active offers; partner/place/destination/kind filters |
| `GET /api/v1/offers/{offer_id}` | Active offer detail |

Pagination uses bounded `limit` and non-negative `offset`; response `count` is the number returned,
not a total-count query. Offset pagination can shift while concurrent catalog updates occur.

Nearby search accepts latitude `[-90,90]`, longitude `[-180,180]`, radius `(0,50000]` meters, and
limit `[1,100]`. Results are geodesic straight-line distances in meters, not road distance or travel
time. Optional destination and category filters are evaluated in PostgreSQL.

## Administrator endpoints

| Method and path | Behavior |
|---|---|
| `GET/POST /api/v1/admin/destinations` | List all / create destination |
| `PATCH /api/v1/admin/destinations/{id}` | Update or change visibility |
| `GET/POST /api/v1/admin/places` | List all / create place |
| `PATCH /api/v1/admin/places/{id}` | Update, hide, or archive place |
| `POST /api/v1/admin/places/{id}/media` | Attach media metadata |
| `PATCH/DELETE /api/v1/admin/place-media/{id}` | Update/detach metadata |

All administrator endpoints reload current roles and account status from PostgreSQL. Place media
stores a reference key, kind, and ordering only; no Cloudinary or upload contract exists.

## Status and validation behavior

- `401`: missing or invalid access token.
- `403`: role, account, membership, or ownership denial.
- `404`: entity absent or not publicly visible.
- `409`: uniqueness/constraint conflict.
- `422`: malformed DTO, coordinate, price, category, lifecycle, or route-shape input.
