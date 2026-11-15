import { ArrowUpRight, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";
import type { HomepageCatalog } from "@/lib/catalog";
import { homepageEditorialPresentation } from "@/lib/catalog-contract";

export function DestinationStory({ catalog }: Readonly<{ catalog: HomepageCatalog }>) {
  const { destinationName, catalogAvailable } = homepageEditorialPresentation(catalog.source);

  return (
    <section id="destinations" className="adora-section bg-[var(--adora-ivory)]">
      <div className="adora-container">
        <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,.8fr)] lg:gap-[clamp(4rem,8vw,9rem)]">
          <div className="relative">
            <Reveal
              variant="image"
              delayMs={0}
              className="image-reveal relative aspect-[4/5] max-h-[52rem] w-full lg:aspect-[5/6]"
            >
              <Image
                src="/images/home/dalat-pine-trail.webp"
                alt="Lối mòn xuyên rừng thông nhìn về mặt hồ phủ sương"
                fill
                sizes="(max-width: 1023px) 100vw, 58vw"
                className="object-cover"
              />
            </Reveal>
            <Reveal
              variant="card"
              delayMs={160}
              className="absolute -bottom-6 left-4 bg-[var(--adora-paper)] px-4 py-3 text-[0.64rem] font-bold tracking-[0.16em] uppercase sm:left-8 lg:-right-8 lg:left-auto"
            >
              Cao nguyên Việt Nam · 11°56′N
            </Reveal>
          </div>

          <div className="pb-2 lg:pb-16">
            <Reveal delayMs={80} stackOnMobile>
              <p className="adora-eyebrow text-[var(--adora-sage)]">Điểm đến chọn lọc</p>
              <p className="mt-8 flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--adora-text-secondary)] uppercase">
                <MapPin className="size-4 text-[var(--adora-gold)]" aria-hidden="true" />
                {catalogAvailable ? "Gợi ý biên tập · chưa liên kết nội dung danh mục" : "Gợi ý biên tập · API tạm ngoại tuyến"}
              </p>
              <h2 className="font-editorial mt-5 text-[clamp(3.6rem,8vw,7rem)] leading-[0.9] tracking-[-0.05em]">
                {destinationName}
              </h2>
              <p className="font-editorial mt-6 text-2xl leading-snug italic text-[var(--adora-sage)] sm:text-3xl">
                Thành phố của sương, thông và những khoảng lặng.
              </p>
            </Reveal>
            <Reveal delayMs={160} stackOnMobile>
              <p className="mt-7 max-w-xl text-sm leading-7 text-[var(--adora-text-secondary)] sm:text-base sm:leading-8">
                Một lát cắt biên tập để gợi mở nhịp đi chậm: buổi sớm qua rừng thông, cà phê ấm giữa khí trời cao nguyên và những con đường để cảm nhận thay vì vội đi qua.
              </p>
              <Link href="/destinations/da-lat" className="editorial-link mt-9">
                Tiếp tục câu chuyện
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
