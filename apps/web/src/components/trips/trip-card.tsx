import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { DemoBadge } from "@/components/ui/demo-badge";
import { getDestinationBySlug } from "@/lib/demo/destinations";
import type { Trip } from "@/lib/demo/types";

/** Compact application-style trip summary card used by My Trips. */
export function TripCard({ trip, eager = false }: Readonly<{ trip: Trip; eager?: boolean }>) {
  const destination = getDestinationBySlug(trip.destinationSlug);
  const activityCount = trip.days.reduce((total, day) => total + day.activities.length, 0);

  return (
    <article className="group border border-[var(--adora-hairline)] bg-white/50 transition-colors hover:border-[var(--adora-ink)]">
      <Link href={`/trips/${trip.slug}`} className="grid sm:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
        <div className="image-reveal relative aspect-[16/10] w-full sm:aspect-auto sm:min-h-56">
          <Image
            src={trip.cover.src}
            alt={trip.cover.alt}
            fill
            preload={eager}
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 40vw, 24vw"
            className="object-cover"
            style={{ objectPosition: trip.cover.position ?? "center" }}
          />
        </div>
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-7 items-center bg-[var(--adora-ink)] px-3 text-[0.64rem] font-bold tracking-[0.12em] text-[var(--adora-paper)] uppercase">
              {trip.statusLabel}
            </span>
            <DemoBadge provenance={trip.provenance} />
          </div>
          <h2 className="font-editorial text-[clamp(1.6rem,2.4vw,2.2rem)] leading-[1.05] tracking-[-0.03em]">{trip.title}</h2>
          <dl className="grid grid-cols-3 gap-3 border-t border-[var(--adora-hairline)] pt-4 text-xs">
            <div>
              <dt className="text-[var(--adora-text-secondary)]">Điểm đến</dt>
              <dd className="mt-1 font-semibold">{destination?.name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--adora-text-secondary)]">Thời lượng</dt>
              <dd className="mt-1 font-semibold">{trip.durationDays} ngày</dd>
            </div>
            <div>
              <dt className="text-[var(--adora-text-secondary)]">Hoạt động</dt>
              <dd className="mt-1 font-semibold">{activityCount}</dd>
            </div>
          </dl>
          <span className="editorial-link mt-auto self-start">
            Xem lịch trình
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </article>
  );
}
