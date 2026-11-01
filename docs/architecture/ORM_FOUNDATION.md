# ORM foundation

ADORA uses one SQLAlchemy 2.x registry at `services/api/app/domain/models`. The registry maps the
existing `adora` PostgreSQL schema; it is not a schema-creation mechanism. Application startup must
never call `create_all()`.

The model files follow the business boundaries while sharing `Base.metadata`:

- `identity.py`: users, roles, refresh sessions.
- `partner.py`: partners and scoped memberships.
- `catalog.py` / `inventory.py`: PostGIS catalog and bookable capacity.
- `itinerary.py`: itineraries and AI generation audit data.
- `booking.py`: quotes, bookings, generated totals, and holds.
- `payment.py`: payment attempts/events and vouchers.
- `governance.py`: idempotency, audit, and outbox records.

Mappings preserve the baseline UUID defaults, TIMESTAMPTZ, JSONB, `geography(Point,4326)`, generated
line totals, composite keys, delete policies, checks, functional/partial indexes, and schema names.
Repositories receive an `AsyncSession`; application services own explicit transaction boundaries.
No generic repository or hidden commit layer is used.

`alembic/env.py` now loads this metadata and scopes comparison to `adora`. Because the local role is
also named `adora`, Alembic explicitly treats `public` as its reflection default so schema-qualified
foreign keys compare correctly. `alembic check` is required before a reviewed migration is created.

Run:

```powershell
$env:DATABASE_URL = 'postgresql+psycopg://adora:change_me_for_local_development@127.0.0.1:55432/adora'
services\api\.venv\Scripts\python.exe -m alembic -c services/api/alembic.ini check
services\api\.venv\Scripts\python.exe services/api/scripts/audit_schema.py
```

Revision `0001_adora` and its canonical SQL remain immutable. Any later schema change starts at
`0002`, is manually reviewed, and includes PostgreSQL integration tests.
