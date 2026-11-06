import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { ExperienceGrid } from "@/components/discovery/experience-grid";
import { PlannerCta } from "@/components/discovery/planner-cta";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DemoBadge } from "@/components/ui/demo-badge";
import {
  PERIOD_LABELS,
  getAvailableDestinations,
  getDestinationBySlug,
  getExperiencesForDestination,
  getTripBySlug,
} from "@/lib/demo";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAvailableDestinations().map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);
  if (!destination || destination.status !== "available") return { title: "Không tìm thấy điểm đến" };
  return { title: destination.name, description: `${destination.tagline} ${destination.summary}` };
}

export default async function DestinationDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);
  if (!destination || destination.status !== "available" || !destination.image) notFound();

  const experiences = getExperiencesForDestination(destination.slug);
  const trip = destination.tripSlug ? getTripBySlug(destination.tripSlug) : undefined;

  return (
    <>
      <main id="main-content" className="overflow-x-clip">
        <section className="relative isolate min-h-[40rem] overflow-hidden bg-[var(--adora-ink)] text-white sm:min-h-[46rem] lg:min-h-[52rem]">
          <Image
            src={destination.image.src}
            alt={destination.image.alt}
            fill
            preload
            sizes="100vw"
            className="-z-30 object-cover"
            style={{ objectPosition: destination.image.position ?? "center" }}
          />
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(0deg,rgba(10,18,16,.82)_0%,rgba(10,18,16,.28)_55%,rgba(10,18,16,.5)_100%)]" />
          <SiteHeader tone="overlay" current="destinations" />
          <div className="adora-container flex min-h-[40rem] flex-col justify-end pt-36 pb-14 sm:min-h-[46rem] sm:pb-20 lg:min-h-[52rem]">
            <Breadcrumbs
              inverted
              items={[{ label: "Trang chủ", href: "/" }, { label: "Điểm đến", href: "/destinations" }, { label: destination.name }]}
            />
            <p className="adora-eyebrow mt-8 text-white/78">{destination.regionLabel} · Việt Nam</p>
            <h1 className="font-editorial mt-5 text-[clamp(4.5rem,15vw,13rem)] leading-[0.84] font-medium tracking-[-0.06em]">{destination.name}</h1>
            <p className="font-editorial mt-6 max-w-[34rem] text-xl leading-snug text-[var(--adora-ivory)] italic sm:text-3xl">{destination.tagline}</p>
            <div className="mt-8">
              <DemoBadge provenance={destination.provenance} inverted />
            </div>
          </div>
        </section>

        <section aria-labelledby="intro-heading" className="adora-section">
          <div className="adora-container grid gap-12 lg:grid-cols-[minmax(14rem,.55fr)_minmax(0,1.45fr)] lg:gap-[clamp(3rem,8vw,9rem)]">
            <div>
              <h2 id="intro-heading" className="adora-eyebrow text-[var(--adora-sage)]">
                Giới thiệu
              </h2>
              <p className="mt-8 text-[0.68rem] font-bold tracking-[0.16em] text-[var(--adora-text-secondary)] uppercase">Phù hợp với</p>
              <ul className="mt-4 grid gap-1 text-sm font-semibold">
                {destination.bestFor.map((item) => (
                  <li key={item} className="border-b border-[var(--adora-hairline)] py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="max-w-3xl space-y-7 text-base leading-8 text-[var(--adora-text-secondary)] sm:text-lg sm:leading-9">
              {destination.description.map((paragraph, index) => (
                <p
                  key={paragraph}
                  className={index === 0 ? "font-editorial text-[clamp(1.6rem,2.8vw,2.5rem)] leading-[1.2] tracking-[-0.025em] text-[var(--adora-ink)]" : ""}
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="highlights-heading" className="bg-[var(--adora-ivory)] py-16 sm:py-24">
          <div className="adora-container">
            <h2 id="highlights-heading" className="font-editorial text-[clamp(2.2rem,4vw,3.6rem)] leading-none tracking-[-0.04em]">
              Điểm nhấn của {destination.name}
            </h2>
            <ol className="mt-12 grid border-t border-[var(--adora-hairline)] sm:grid-cols-2">
              {destination.highlights.map((highlight, index) => (
                <li
                  key={highlight.title}
                  className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-[var(--adora-hairline)] py-7 sm:px-6 sm:odd:border-r sm:odd:pl-0 sm:even:pr-0"
                >
                  <span className="font-editorial text-lg text-[var(--adora-gold)]">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-base font-semibold">{highlight.title}</span>
                    <span className="mt-2 block text-sm leading-6 text-[var(--adora-text-secondary)]">{highlight.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="experiences-heading" className="adora-section">
          <div className="adora-container">
            <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
              <h2 id="experiences-heading" className="font-editorial max-w-[14ch] text-[clamp(2.6rem,5vw,4.8rem)] leading-[0.98] tracking-[-0.045em]">
                Trải nghiệm gợi ý tại {destination.name}
              </h2>
              <Link href="/experiences" className="editorial-link">
                Tất cả trải nghiệm
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <ExperienceGrid experiences={experiences} />
            <p className="mt-12 max-w-xl text-xs leading-5 text-[var(--adora-text-secondary)]">
              Các trải nghiệm trên là gợi ý biên tập, không phải ưu đãi thương mại. ADORA không hiển thị giá, giờ mở cửa, thời gian di chuyển hay tồn kho.
            </p>
          </div>
        </section>

        {trip ? (
          <section aria-labelledby="trip-heading" className="bg-[var(--adora-ivory)] py-16 sm:py-24">
            <div className="adora-container grid gap-12 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:gap-[clamp(3rem,7vw,8rem)]">
              <div>
                <p className="adora-eyebrow text-[var(--adora-sage)]">Hoạt động theo ngày</p>
                <h2 id="trip-heading" className="font-editorial mt-6 text-[clamp(2.4rem,4.4vw,4.2rem)] leading-[0.98] tracking-[-0.045em]">
                  {trip.title}
                </h2>
                <p className="mt-6 max-w-md text-sm leading-7 text-[var(--adora-text-secondary)]">{trip.intro}</p>
                <Link href={`/trips/${trip.slug}`} className="editorial-link mt-8">
                  Xem lịch trình mẫu
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
                <div className="mt-6">
                  <DemoBadge provenance={trip.provenance} />
                </div>
              </div>
              <ol className="border-t border-[var(--adora-hairline)]">
                {trip.days.map((day) => (
                  <li key={day.day} className="grid grid-cols-[4.5rem_1fr] gap-4 border-b border-[var(--adora-hairline)] py-6">
                    <span className="font-editorial text-lg text-[var(--adora-gold)]">Ngày {day.day}</span>
                    <span>
                      <span className="block text-base font-semibold">{day.title}</span>
                      <span className="mt-2 block text-sm leading-6 text-[var(--adora-text-secondary)]">{day.summary}</span>
                      <span className="mt-3 block text-[0.66rem] font-bold tracking-[0.12em] text-[var(--adora-sage)] uppercase">
                        {day.activities.map((activity) => PERIOD_LABELS[activity.period]).join(" · ")}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        <PlannerCta
          heading={`Muốn một nhịp đi riêng cho ${destination.name}?`}
          body="Mở AI Planner để xem một kịch bản lập kế hoạch dựng sẵn. Đây là bản minh hoạ giao diện, ADORA chưa tạo lịch trình bằng AI thật."
        />
      </main>
      <SiteFooter showCta={false} />
    </>
  );
}
