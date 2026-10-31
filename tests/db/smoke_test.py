"""Adora DB smoke test. Runs against migrated local DB; ALWAYS rolls back fixtures.

Run: python tests/db/smoke_test.py  # from repository root, with psycopg installed
"""
import os
import uuid
from psycopg import connect, errors

DSN = os.getenv("DATABASE_URL", "postgresql://adora:adora_dev_only@localhost:5432/adora")
DSN = DSN.replace("postgresql+psycopg://", "postgresql://", 1)


def run():
    conn = connect(DSN)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT PostGIS_Version()")
            assert cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='adora' AND table_type='BASE TABLE'")
            assert cur.fetchone()[0] == 24

            suffix = uuid.uuid4().hex[:12]
            cur.execute("INSERT INTO adora.users(email,password_hash,display_name) VALUES (%s,%s,%s) RETURNING id",
                        (f"smoke-{suffix}@example.invalid", "not-a-real-password-hash", "Smoke User"))
            user_id = cur.fetchone()[0]
            cur.execute("INSERT INTO adora.users(email,password_hash,display_name) VALUES (%s,%s,%s) RETURNING id",
                        (f"smoke-2-{suffix}@example.invalid", "not-a-real-password-hash", "Smoke Other User"))
            another_user_id = cur.fetchone()[0]
            cur.execute("INSERT INTO adora.partners(legal_name,public_name,status) VALUES ('Test','Test','approved') RETURNING id")
            partner_id = cur.fetchone()[0]
            cur.execute("INSERT INTO adora.destinations(slug,name) VALUES (%s,'Da Lat') RETURNING id", (f"dalat-test-{suffix}",))
            dest_id = cur.fetchone()[0]
            cur.execute("""INSERT INTO adora.places(destination_id, slug, name, category, location)
                           VALUES (%s,%s,'Test Hotel','hotel',ST_SetSRID(ST_MakePoint(108.44,11.94),4326)::geography)
                           RETURNING id""", (dest_id, f"hotel-{suffix}"))
            place_id = cur.fetchone()[0]
            cur.execute("""SELECT ST_DWithin(location,
                           ST_SetSRID(ST_MakePoint(108.44,11.94),4326)::geography, 1000)
                           FROM adora.places WHERE id=%s""", (place_id,))
            assert cur.fetchone()[0] is True, "PostGIS geospatial lookup failed"
            cur.execute("""INSERT INTO adora.service_offers(partner_id,place_id,title,kind,base_price_vnd,status)
                           VALUES (%s,%s,'Deluxe Room','stay',700000,'active') RETURNING id""",
                        (partner_id,place_id))
            offer_id = cur.fetchone()[0]
            cur.execute("""INSERT INTO adora.inventory_slots(offer_id,service_start_at,service_end_at,capacity)
                           VALUES (%s,now()+interval '1 day',now()+interval '2 days',1) RETURNING id""",
                        (offer_id,))
            slot_id = cur.fetchone()[0]
            reserve = """UPDATE adora.inventory_slots SET held_quantity=held_quantity+1
                         WHERE id=%s AND status='open'
                         AND capacity-held_quantity-confirmed_quantity>=1"""
            cur.execute(reserve, (slot_id,))
            assert cur.rowcount == 1, "Initial hold failed"
            cur.execute(reserve, (slot_id,))
            assert cur.rowcount == 0, "Overbooking guard failed"

            cur.execute("""INSERT INTO adora.booking_quotes(user_id,total_vnd,expires_at)
                           VALUES (%s,700000,now()+interval '20 minutes') RETURNING id""", (user_id,))
            quote_id = cur.fetchone()[0]
            cur.execute("SAVEPOINT ownership_test")
            try:
                cur.execute("""INSERT INTO adora.bookings(booking_code,user_id,quote_id,total_vnd,hold_expires_at)
                               VALUES (%s,%s,%s,700000,now()+interval '15 minutes')""",
                            (f"AD-INVALID-{suffix}", another_user_id, quote_id))
                raise AssertionError("Quote ownership constraint did not fire")
            except errors.ForeignKeyViolation:
                pass
            finally:
                cur.execute("ROLLBACK TO SAVEPOINT ownership_test")
                cur.execute("RELEASE SAVEPOINT ownership_test")
        print("PASS: 24 tables, PostGIS lookup, inventory guard, quote ownership FK")
    finally:
        conn.rollback()  # Do not persist fixture rows.
        conn.close()


if __name__ == "__main__":
    run()
