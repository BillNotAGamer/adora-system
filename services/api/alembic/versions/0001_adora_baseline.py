"""Adora baseline v1.0: PostgreSQL + PostGIS.

Revision ID: 0001_adora
Revises:
Create Date: 2026-10-31

This is a forward-only initial migration. Apply to an EMPTY database.
"""
from pathlib import Path
from alembic import op

revision = "0001_adora"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Fixed, trusted repository-owned SQL file; not user-controlled.
    sql_file = (Path(__file__).resolve().parents[4] / "infrastructure" /
                "db" / "sql" / "0001_adora_baseline.sql")
    sql = sql_file.read_text(encoding="utf-8")
    # This baseline intentionally contains no PL/pgSQL blocks or semicolons
    # within SQL string literals. Each SQL statement is executed individually.
    sql = "\n".join(line for line in sql.splitlines()
                    if not line.lstrip().startswith("--"))
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    for statement in statements:
        op.execute(statement)


def downgrade():
    raise NotImplementedError("Forward-only baseline; restore from a verified backup.")
