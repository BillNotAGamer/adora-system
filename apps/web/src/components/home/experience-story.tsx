import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";
import type { HomepageCatalog } from "@/lib/catalog";

const editorialExperiences = [
  "Sớm mai trong rừng thông",
  "Hương vị cao nguyên",
  "Những khoảng lặng có chủ đích",
];

export function ExperienceStory({ catalog }: Readonly<{ catalog: HomepageCatalog }>) {
  const experienceNames = catalog.offers.length > 0 ? catalog.offers.map((offer) => offer.title) : editorialExperiences;
  const isCatalogBacked = catalog.offers.length > 0;

  return (
    <section id="experiences" className="adora-section bg-[var(--adora-paper)]">
      <div className="adora-container">
        <div className="grid gap-12 lg:grid-cols-[minmax(18rem,.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-[clamp(4rem,8vw,9rem)]">
          <div className="order-2 lg:order-1">
            <Reveal delayMs={0}>
              <p className="adora-eyebrow text-[var(--adora-sage)]">Trải nghiệm có chủ đích</p>
              <h2 className="font-editorial mt-7 max-w-[12ch] text-[clamp(3rem,5.6vw,5.75rem)] leading-[0.96] tracking-[-0.045em]">
                Đi chậm để thấy <em className="text-[var(--adora-sage)]">nhiều hơn.</em>
              </h2>
              <p className="mt-7 max-w-lg text-sm leading-7 text-[var(--adora-text-secondary)] sm:text-base sm:leading-8">
                Những gợi ý dưới đây là lát cắt cảm hứng, không phải cam kết về giá, tồn kho hay khả năng đặt chỗ.
              </p>
            </Reveal>

            <ol className="mt-10 border-t border-[var(--adora-hairline)]">
              {experienceNames.slice(0, 3).map((name, index) => (
                <li key={`${name}-${index}`} className="border-b border-[var(--adora-hairline)] py-5">
                  <Reveal
                    variant="card"
                    delayMs={index * 90}
                    stackOnMobile
                    className="grid grid-cols-[2.5rem_1fr] gap-3"
                  >
                    <span className="font-editorial text-lg text-[var(--adora-gold)]">0{index + 1}</span>
                    <span className="text-sm font-semibold leading-6 sm:text-base">{name}</span>
                  </Reveal>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-[0.67rem] leading-5 font-semibold tracking-[0.1em] text-[var(--adora-text-secondary)] uppercase">
              {isCatalogBacked ? "Tên trải nghiệm từ danh mục công khai · dữ liệu demo có thể được sử dụng" : "Nội dung biên tập tạm thời · danh mục trực tiếp chưa khả dụng"}
            </p>
            <Link href="/experiences" className="editorial-link mt-6">
              Xem các trải nghiệm gợi ý
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="order-1 lg:order-2 lg:translate-y-10">
            <Reveal
              variant="image"
              delayMs={0}
              className="image-reveal relative aspect-[4/3] w-full lg:aspect-[3/2]"
            >
              <Image
                src="/images/home/highland-coffee-ritual.webp"
                alt="Nghi thức pha cà phê thủ công bên rừng thông cao nguyên"
                fill
                sizes="(max-width: 1023px) 100vw, 60vw"
                className="object-cover object-center"
              />
            </Reveal>
            <Reveal delayMs={80} stackOnMobile>
              <p className="mt-4 max-w-xl text-xs leading-5 text-[var(--adora-text-secondary)]">
                Chậm rãi không có nghĩa là ít đi—đó là dành nhiều sự chú ý hơn cho từng khoảnh khắc.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
