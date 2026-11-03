"""Deterministic, additive Da Lat demonstration catalog seeding."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import NAMESPACE_URL, UUID, uuid5

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models.catalog import Destination, Place, PlaceMedia, ServiceOffer
from app.domain.models.partner import Partner
from app.modules.catalog.service import geography_point


def demo_uuid(name: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"https://adora.local/demo/{name}")


@dataclass(frozen=True)
class SeedResult:
    created: int
    existing: int


class DemoSeedConflictError(RuntimeError):
    """A natural key is already owned by a non-demo deterministic identifier."""


async def seed_demo_catalog(session: AsyncSession) -> SeedResult:
    """Add deterministic demonstration rows without deleting or rewriting existing data."""

    created = 0
    existing = 0
    destination_id = demo_uuid("destination/da-lat")
    partner_ids = [demo_uuid("partner/pine-trails"), demo_uuid("partner/highland-stays")]
    place_specs = [
        ("xuan-huong-lake", "Xuan Huong Lake", "attraction", 11.9416, 108.4419),
        ("da-lat-market", "Da Lat Market", "other", 11.9422, 108.4368),
        ("demo-highland-hotel", "Demo Highland Hotel", "hotel", 11.9369, 108.4381),
        ("demo-garden-restaurant", "Demo Garden Restaurant", "restaurant", 11.9471, 108.4472),
    ]
    place_ids = {slug: demo_uuid(f"place/{slug}") for slug, *_rest in place_specs}

    async with session.begin():
        destination = (
            await session.execute(select(Destination).where(Destination.slug == "da-lat-demo"))
        ).scalar_one_or_none()
        if destination is not None and destination.id != destination_id:
            raise DemoSeedConflictError("destination slug da-lat-demo is already in use")
        if destination is None:
            session.add(
                Destination(
                    id=destination_id,
                    slug="da-lat-demo",
                    name="Da Lat (Demonstration Catalog)",
                    country_code="VN",
                    center=geography_point(108.4583, 11.9404),
                    status="active",
                )
            )
            created += 1
        else:
            existing += 1

        partner_specs = [
            (partner_ids[0], "ADORA Demo Pine Trails Co.", "Pine Trails Demo"),
            (partner_ids[1], "ADORA Demo Highland Stays Co.", "Highland Stays Demo"),
        ]
        for partner_id, legal_name, public_name in partner_specs:
            if await session.get(Partner, partner_id) is None:
                session.add(
                    Partner(
                        id=partner_id,
                        legal_name=legal_name,
                        public_name=public_name,
                        status="approved",
                    )
                )
                created += 1
            else:
                existing += 1

        await session.flush()
        for slug, name, category, latitude, longitude in place_specs:
            place = (
                await session.execute(
                    select(Place).where(
                        Place.destination_id == destination_id,
                        Place.slug == slug,
                    )
                )
            ).scalar_one_or_none()
            if place is not None and place.id != place_ids[slug]:
                raise DemoSeedConflictError(f"place slug {slug} is already in use")
            if place is None:
                session.add(
                    Place(
                        id=place_ids[slug],
                        destination_id=destination_id,
                        slug=slug,
                        name=name,
                        category=category,
                        location=geography_point(longitude, latitude),
                        description="Demonstration catalog record; not verified commercial data.",
                        attributes={"demo_data": True, "source": "ADORA Phase 1.2 seed"},
                        status="active",
                    )
                )
                created += 1
            else:
                existing += 1

        await session.flush()
        media_specs = [
            (
                demo_uuid("media/xuan-huong-placeholder"),
                place_ids["xuan-huong-lake"],
                "demo://xuan-huong-lake/cover",
            ),
            (
                demo_uuid("media/hotel-placeholder"),
                place_ids["demo-highland-hotel"],
                "demo://highland-hotel/cover",
            ),
        ]
        for media_id, place_id, media_key in media_specs:
            if await session.get(PlaceMedia, media_id) is None:
                session.add(
                    PlaceMedia(
                        id=media_id,
                        place_id=place_id,
                        media_key=media_key,
                        media_kind="image",
                        sort_order=0,
                    )
                )
                created += 1
            else:
                existing += 1

        offer_specs = [
            ServiceOffer(
                id=demo_uuid("offer/highland-stay"),
                partner_id=partner_ids[1],
                place_id=place_ids["demo-highland-hotel"],
                title="Demonstration Highland Stay",
                kind="stay",
                description="Example-only catalog price; not a live commercial offer.",
                base_price_vnd=1_200_000,
                attributes={"demo_data": True, "price_disclaimer": "example_only"},
                status="active",
            ),
            ServiceOffer(
                id=demo_uuid("offer/lake-experience"),
                partner_id=partner_ids[0],
                place_id=place_ids["xuan-huong-lake"],
                title="Demonstration Lakeside Experience",
                kind="experience",
                description="Example-only catalog price; not a live commercial offer.",
                base_price_vnd=250_000,
                attributes={"demo_data": True, "price_disclaimer": "example_only"},
                status="active",
            ),
            ServiceOffer(
                id=demo_uuid("offer/demo-transfer"),
                partner_id=partner_ids[0],
                place_id=place_ids["da-lat-market"],
                arrival_place_id=place_ids["xuan-huong-lake"],
                title="Demonstration City Transfer",
                kind="transport",
                description="Example-only transfer definition; no live inventory.",
                base_price_vnd=120_000,
                attributes={"demo_data": True, "price_disclaimer": "example_only"},
                status="active",
            ),
        ]
        for offer in offer_specs:
            if await session.get(ServiceOffer, offer.id) is None:
                session.add(offer)
                created += 1
            else:
                existing += 1

    return SeedResult(created=created, existing=existing)
