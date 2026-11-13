import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { DestinationBrowser } from "@/components/discovery/destination-browser";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DemoBadge } from "@/components/ui/demo-badge";
import { PageIntro } from "@/components/ui/page-intro";
import { DESTINATIONS, getAvailableDestinations } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Điểm đến",
  description:
    "Khám phá những điểm đến được ADORA biên tập: Đà Lạt với nội dung đầy đủ và những gợi ý sắp ra mắt. Nội dung demo, không phải danh mục vận hành trực tiếp.",
};

export default function DestinationsPage() {
  const featured = getAvailableDestinations()[0];

  return (
    <>
      <SiteHeader tone="solid" current="destinations" />
      <main id="main-content" className="overflow-x-clip">
        <PageIntro
          eyebrow="Điểm đến"
          title={
            <>
              Những miền đất để <em className="font-normal text-[var(--adora-sage)]">đi chậm.</em>
            </>
          }
          aside={<DemoBadge provenance="editorial" />}
        >
          <p>
            Bộ sưu tập nhỏ các điểm đến do ADORA biên tập. Hiện chỉ Đà Lạt có nội dung đầy đủ; những nơi còn lại là cảm hứng sắp ra mắt, chưa phải danh mục
            đang vận hành.
          </p>
        </PageIntro>

        {featured?.image ? (
          <section aria-labelledby="featured-heading" className="bg-[var(--adora-ivory)] py-16 sm:py-24">
            <div className="adora-container">
              <div className="grid items-end gap-10 lg:grid-cols-12 lg:gap-0">
                <div className="image-reveal relative aspect-[4/5] w-full sm:aspect-[16/11] lg:col-span-8 lg:col-start-1 lg:row-start-1 lg:aspect-[16/10]">
                  <Image
                    src={featured.image.src}
                    alt={featured.image.alt}
                    fill
                    preload
                    data-image-settle="featured"
                    sizes="(max-width: 1023px) 100vw, 66vw"
                    className="object-cover"
                  />
                </div>
                <div className="relative bg-[var(--adora-paper)] lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:-ml-8 lg:mb-[-3rem] lg:p-12">
                  <p className="adora-eyebrow text-[var(--adora-sage)]">Điểm đến nổi bật</p>
                  <h2 id="featured-heading" className="font-editorial mt-6 text-[clamp(3rem,5.4vw,5.5rem)] leading-[0.94] tracking-[-0.045em]">
                    {featured.name}
                  </h2>
                  <p className="font-editorial mt-5 text-xl leading-snug text-[var(--adora-sage)] italic sm:text-2xl">{featured.tagline}</p>
                  <ul className="mt-6 flex flex-wrap gap-2" aria-label="Phù hợp với">
                    {featured.bestFor.map((tag) => (
                      <li key={tag} className="border border-[var(--adora-hairline)] px-3 py-1 text-[0.68rem] font-semibold tracking-[0.06em] text-[var(--adora-text-secondary)]">
                        {tag}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-2">
                    <Link href={`/destinations/${featured.slug}`} className="editorial-link">
                      Khám phá {featured.name}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                    {featured.tripSlug ? (
                      <Link href={`/trips/${featured.tripSlug}`} className="editorial-link text-[var(--adora-sage)]">
                        Xem lịch trình mẫu
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="index-heading" className="adora-section">
          <div className="adora-container">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <h2 id="index-heading" className="font-editorial text-[clamp(2.2rem,4vw,3.6rem)] leading-none tracking-[-0.04em]">
                Chỉ mục điểm đến
              </h2>
              <p className="max-w-sm text-xs leading-5 text-[var(--adora-text-secondary)]">
                Bộ lọc hoạt động trên {DESTINATIONS.length} bản ghi biên tập cục bộ. Không có tồn kho hay giá trực tiếp.
              </p>
            </div>
            <DestinationBrowser destinations={[...DESTINATIONS]} />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
