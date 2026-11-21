import { ConciergeTrigger } from "@/components/concierge/concierge-trigger";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ItineraryExplorer } from "@/components/trips/itinerary-explorer";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DemoBadge } from "@/components/ui/demo-badge";
import { TRIPS, getDestinationBySlug, getTripBySlug } from "@/lib/demo";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TRIPS.map((trip) => ({ slug: trip.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const trip = getTripBySlug(slug);
  if (!trip) return { title: "Không tìm thấy chuyến đi" };
  return { title: trip.title, description: `${trip.intro} Lịch trình minh hoạ, không phải đặt chỗ thật.` };
}

export default async function TripDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const trip = getTripBySlug(slug);
  if (!trip) notFound();

  const destination = getDestinationBySlug(trip.destinationSlug);
  const activityCount = trip.days.reduce((total, day) => total + day.activities.length, 0);

  return (
    <>
      <SiteHeader tone="solid" current="trips" />
      <main id="main-content" className="overflow-x-clip">
        <section className="adora-container pt-8 pb-10 sm:pb-14">
          <Breadcrumbs items={[{ label: "Trang chủ", href: "/" }, { label: "Chuyến đi mẫu", href: "/trips" }, { label: trip.title }]} />

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:items-end lg:gap-14">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex min-h-7 items-center bg-[var(--adora-ink)] px-3 text-[0.64rem] font-bold tracking-[0.12em] text-[var(--adora-paper)] uppercase">
                  {trip.statusLabel}
                </span>
                <DemoBadge provenance={trip.provenance} />
              </div>
              <h1 className="font-editorial mt-6 max-w-[14ch] text-[clamp(2.6rem,6vw,5.4rem)] leading-[0.95] font-medium tracking-[-0.05em] text-balance">
                {trip.title}
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--adora-text-secondary)] sm:text-base sm:leading-8">{trip.intro}</p>
            </div>
            <div className="image-reveal relative aspect-[16/10] w-full">
              <Image
                src={trip.cover.src}
                alt={trip.cover.alt}
                fill
                preload
                sizes="(max-width: 1023px) 100vw, 45vw"
                className="object-cover"
                style={{ objectPosition: trip.cover.position ?? "center" }}
              />
            </div>
          </div>

          <dl className="mt-10 grid grid-cols-2 border-y border-[var(--adora-hairline)] text-sm sm:grid-cols-4">
            <div className="border-b border-[var(--adora-hairline)] py-4 sm:border-b-0 sm:py-5">
              <dt className="text-[0.66rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">Điểm đến</dt>
              <dd className="mt-1 font-semibold">
                {destination ? (
                  <Link href={`/destinations/${destination.slug}`} className="underline decoration-[var(--adora-gold)] underline-offset-4 hover:text-[var(--adora-sage)]">
                    {destination.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div className="border-b border-[var(--adora-hairline)] py-4 sm:border-b-0 sm:py-5">
              <dt className="text-[0.66rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">Thời lượng</dt>
              <dd className="mt-1 font-semibold">{trip.durationDays} ngày</dd>
            </div>
            <div className="py-4 sm:py-5">
              <dt className="text-[0.66rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">Nhịp đi</dt>
              <dd className="mt-1 font-semibold">{trip.pace}</dd>
            </div>
            <div className="py-4 sm:py-5">
              <dt className="text-[0.66rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">Hoạt động</dt>
              <dd className="mt-1 font-semibold">{activityCount}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="itinerary-heading" className="adora-container pb-[var(--adora-section-space)]">
          <h2 id="itinerary-heading" className="font-editorial mb-8 text-[clamp(2rem,3.6vw,3.2rem)] leading-none tracking-[-0.04em]">
            Lịch trình theo ngày
          </h2>
          <ItineraryExplorer trip={trip} />

          <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-[var(--adora-hairline)] pt-8">
            <Link href="/trips" className="editorial-link">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Tất cả chuyến đi mẫu
            </Link>
            <ConciergeTrigger href="/ai-planner" className="editorial-link">
              Mở AI Planner demo
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </ConciergeTrigger>
          </div>
        </section>
      </main>
      <SiteFooter showCta={false} />
    </>
  );
}
