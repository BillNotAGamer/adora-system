import { ArrowUpRight, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TripCard } from "@/components/trips/trip-card";
import { TRIPS } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Chuyến đi mẫu",
  description:
    "Thư viện chuyến đi demo của ADORA: các lịch trình Đà Lạt được viết sẵn để minh hoạ. Chưa có tài khoản, đặt chỗ hay chuyến đi thật.",
};

export default function TripsPage() {
  return (
    <>
      <SiteHeader tone="solid" current="trips" />
      <main id="main-content" className="overflow-x-clip">
        <section className="adora-container pt-12 pb-10 sm:pt-16 lg:pt-20">
          <p className="adora-eyebrow text-[var(--adora-sage)]">Chuyến đi của tôi · bản demo</p>
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)] lg:items-end lg:gap-16">
            <h1 className="font-editorial max-w-[14ch] text-[clamp(2.8rem,6.5vw,5.8rem)] leading-[0.94] font-medium tracking-[-0.05em] text-balance">
              Thư viện chuyến đi <em className="font-normal text-[var(--adora-sage)]">mẫu.</em>
            </h1>
            <p className="max-w-md text-sm leading-7 text-[var(--adora-text-secondary)] sm:text-base sm:leading-8">
              Nơi các hành trình của bạn sẽ được lưu khi ADORA có tài khoản thật. Hiện tại đây là bộ lịch trình viết sẵn để minh hoạ giao diện.
            </p>
          </div>

          <div
            role="note"
            className="mt-10 flex gap-3 border border-[var(--adora-hairline)] bg-[var(--adora-ivory)] p-4 text-sm leading-6 text-[var(--adora-text-secondary)] sm:p-5"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-[var(--adora-sage)]" aria-hidden="true" />
            <p>
              <strong className="font-semibold text-[var(--adora-ink)]">Bạn chưa đăng nhập và chưa lưu chuyến đi nào.</strong> Các chuyến đi bên dưới là dữ liệu demo cục bộ, không gắn với tài khoản, đặt chỗ hay thanh toán.
            </p>
          </div>
        </section>

        <section aria-labelledby="library-heading" className="adora-container pb-[var(--adora-section-space)]">
          <h2 id="library-heading" className="text-[0.68rem] font-bold tracking-[0.16em] text-[var(--adora-text-secondary)] uppercase">
            Thư viện demo · {TRIPS.length} chuyến đi
          </h2>
          <ul className="mt-5 grid gap-6 xl:grid-cols-2">
            {TRIPS.map((trip, index) => (
              <li key={trip.slug}>
                <TripCard trip={trip} eager={index === 0} />
              </li>
            ))}
            <li className="xl:col-span-2">
              <div className="grid gap-4 border border-dashed border-[var(--adora-hairline)] p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8" data-testid="trips-empty-state">
                <div>
                  <h3 className="font-editorial text-2xl tracking-[-0.03em]">Chuyến đi của bạn sẽ xuất hiện ở đây.</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--adora-text-secondary)]">
                    Khi có tài khoản thật, các lịch trình bạn lưu sẽ nằm trong thư viện này. Hiện chưa có chức năng lưu hay đồng bộ.
                  </p>
                </div>
                <Link href="/ai-planner" className="editorial-link">
                  Mở AI Planner demo
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter showCta={false} />
    </>
  );
}
