import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";

import { ExperienceCard } from "@/components/discovery/experience-card";
import { PlannerCta } from "@/components/discovery/planner-cta";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Reveal } from "@/components/ui/reveal";
import {
  EXPERIENCES,
  EXPERIENCE_CATEGORY_LABELS,
  getDestinationBySlug,
  getExperienceBySlug,
  getRelatedExperiences,
  getTripsFeaturingExperience,
} from "@/lib/demo";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return EXPERIENCES.map((experience) => ({ slug: experience.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const experience = getExperienceBySlug(slug);
  if (!experience) return { title: "Không tìm thấy trải nghiệm" };
  return { title: experience.name, description: `${experience.tagline} ${experience.summary}` };
}

export default async function ExperienceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const experience = getExperienceBySlug(slug);
  if (!experience) notFound();

  const destination = getDestinationBySlug(experience.destinationSlug);
  const related = getRelatedExperiences(experience.slug, 3);
  const trips = getTripsFeaturingExperience(experience.slug);

  return (
    <>
      <SiteHeader tone="solid" current="experiences" />
      <main id="main-content" className="overflow-x-clip">
        <section className="adora-container pt-8 pb-12 sm:pb-16 lg:pb-20">
          <Breadcrumbs
            items={[{ label: "Trang chủ", href: "/" }, { label: "Trải nghiệm", href: "/experiences" }, { label: experience.name }]}
          />
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(16rem,.7fr)] lg:items-end lg:gap-[clamp(3rem,7vw,8rem)]">
            <div>
              <p className="adora-eyebrow adora-load-rise text-[var(--adora-sage)]">
                {EXPERIENCE_CATEGORY_LABELS[experience.category]}
                {destination ? ` · ${destination.name}` : ""}
              </p>
              <h1 className="font-editorial adora-hero-heading-rise mt-7 max-w-[16ch] text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.94] font-medium tracking-[-0.05em] text-balance">
                {experience.name}
              </h1>
            </div>
            <div className="adora-load-rise">
              <p className="font-editorial text-xl leading-snug text-[var(--adora-sage)] italic sm:text-2xl">{experience.tagline}</p>
              <div className="mt-6">
                <DemoBadge provenance={experience.provenance} />
              </div>
            </div>
          </div>
        </section>

        <div className="adora-container">
          <div className="image-reveal relative aspect-[4/3] w-full sm:aspect-[16/10] lg:aspect-[21/9]">
            <Image
              src={experience.image.src}
              alt={experience.image.alt}
              fill
              preload
              data-image-settle=""
              sizes="(max-width: 1360px) 100vw, 1360px"
              className="object-cover"
              style={{ objectPosition: experience.image.position ?? "center" }}
            />
          </div>
        </div>

        <section aria-labelledby="story-heading" className="adora-section">
          <div className="adora-container grid gap-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)] lg:gap-[clamp(3rem,7vw,8rem)]">
            <div className="max-w-2xl">
              <Reveal>
                <h2 id="story-heading" className="adora-eyebrow text-[var(--adora-sage)]">
                  Về trải nghiệm này
                </h2>
              </Reveal>
              <div className="mt-8 space-y-6 text-base leading-8 text-[var(--adora-text-secondary)] sm:text-lg sm:leading-9">
                {experience.description.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            <aside aria-label="Thông tin gợi ý" className="grid content-start gap-8">
              <dl className="grid border-t border-[var(--adora-ink)]">
                <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-[var(--adora-hairline)] py-4">
                  <dt className="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">Thời điểm gợi ý</dt>
                  <dd className="text-sm font-semibold">{experience.bestMoment}</dd>
                </div>
                <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-[var(--adora-hairline)] py-4">
                  <dt className="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">Nhịp</dt>
                  <dd className="text-sm font-semibold">{experience.pace === "nhẹ" ? "Nhẹ nhàng" : "Vừa phải"}</dd>
                </div>
                <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-[var(--adora-hairline)] py-4">
                  <dt className="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">Phù hợp với</dt>
                  <dd className="text-sm font-semibold">{experience.suitableFor.join(" · ")}</dd>
                </div>
                {destination ? (
                  <div className="grid grid-cols-[7.5rem_1fr] gap-3 border-b border-[var(--adora-hairline)] py-4">
                    <dt className="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">Điểm đến</dt>
                    <dd className="text-sm font-semibold">
                      <Link href={`/destinations/${destination.slug}`} className="underline decoration-[var(--adora-gold)] underline-offset-4 hover:text-[var(--adora-sage)]">
                        {destination.name}
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div>
                <h3 className="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">Lưu ý nhỏ</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--adora-text-secondary)] marker:text-[var(--adora-gold)]">
                  {experience.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>

              {trips.length > 0 ? (
                <div>
                  <h3 className="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">Có trong lịch trình mẫu</h3>
                  <ul className="mt-3 grid gap-1">
                    {trips.map((trip) => (
                      <li key={trip.slug}>
                        <Link href={`/trips/${trip.slug}`} className="editorial-link">
                          {trip.title}
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div
                role="note"
                className="border border-dashed border-[var(--adora-hairline)] p-5 text-sm leading-6 text-[var(--adora-text-secondary)]"
              >
                <p className="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--adora-ink)] uppercase">Đặt chỗ · chưa khả dụng</p>
                <p className="mt-2">
                  ADORA chưa có đặt chỗ, thanh toán hay dữ liệu tồn kho cho trải nghiệm này. Trang chỉ mang tính gợi ý biên tập.
                </p>
              </div>
            </aside>
          </div>
        </section>

        {related.length > 0 ? (
          <section aria-labelledby="related-heading" className="bg-[var(--adora-ivory)] py-16 sm:py-24">
            <div className="adora-container">
              <Reveal>
                <h2 id="related-heading" className="font-editorial text-[clamp(2.2rem,4vw,3.6rem)] leading-none tracking-[-0.04em]">
                  Trải nghiệm liên quan
                </h2>
              </Reveal>
              <ul className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item, index) => (
                  <Reveal as="li" key={item.slug} variant="card" delayMs={index * 90} stackOnMobile>
                    <ExperienceCard experience={item} shape="square" />
                  </Reveal>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <PlannerCta
          heading="Đưa khoảnh khắc này vào một hành trình."
          body="Mở AI Planner để xem kịch bản dựng sẵn sắp xếp các trải nghiệm thành lịch trình theo ngày. Đây là bản minh hoạ, chưa dùng AI thật."
        />
      </main>
      <SiteFooter showCta={false} />
    </>
  );
}
