# ORM mapping audit

## Authority and integrity

The source schema is `infrastructure/db/sql/0001_adora_baseline.sql`, mirrored by immutable revision
`0001_adora`. During Phase 1.1 both files retained their Phase 1.0 SHA-256 values:

- SQL: `B28D2C1877DC88ADEF6B04C1E424EF324308897CA5A1ABA1B92C6254A7F56FE9`
- migration: `6DD49C8B2F6D8D6ED0EFF2F5ACBB71DE80135CA181482DA3145D8AFBBFFC22B3`

No `0002` revision was needed. No `create_all`, manual baseline execution, stamp, truncate, database
reset, or volume deletion was used.

## Mapping coverage

All 24 tables and 198 columns are mapped under schema `adora`. The audit checks exact table/column
sets, nullability, compatible type families, server-generated values, primary keys, booking/quote
and hold/slot composite foreign keys, critical functional/partial indexes, both PostGIS geography
columns, both generated line totals, and the Alembic revision.

Live results on PostgreSQL 18.6 / PostGIS 3.6:

```text
PASS: 24 tables, 198 columns, 4 critical composite foreign keys,
10 critical indexes, revision 0001_adora
```

`alembic check` also reports `No new upgrade operations detected`.

## Reflection notes

PostgreSQL reflects stored generated totals as nullable even though the expressions are non-null for
rows accepted by the baseline quantity/price constraints. Alembic identifies these as generated
identity-column nullability differences and ignores them. The independent audit permits only this
specific reflection mismatch and still validates the computed expression. GeoAlchemy2's automatic
spatial-index flag is disabled in metadata because the SQL baseline explicitly owns the intended
GiST index; this prevents phantom index diffs.
