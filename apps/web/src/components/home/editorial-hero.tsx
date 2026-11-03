import { ArrowDown, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/home/site-header";

export function EditorialHero() {
  return (
    <section className="relative isolate min-h-[47rem] overflow-hidden bg-[var(--adora-ink)] text-white sm:min-h-[52rem] lg:min-h-screen">
      <Image
        src="/images/home/adora-highlands-hero.webp"
        alt="Những lớp đồi thông cao nguyên ẩn hiện trong sương sớm"
        fill
        preload
        sizes="100vw"
        className="-z-30 object-cover object-[61%_center] sm:object-center"
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(10,18,16,.82)_0%,rgba(10,18,16,.47)_43%,rgba(10,18,16,.1)_78%),linear-gradient(0deg,rgba(10,18,16,.7)_0%,transparent_44%)]" />
      <div className="hero-grain pointer-events-none absolute inset-0 -z-10 opacity-[0.13]" />
      <SiteHeader />

      <div className="adora-container flex min-h-[47rem] items-end pb-16 pt-36 sm:min-h-[52rem] sm:pb-20 lg:min-h-screen lg:items-center lg:pb-12 lg:pt-40">
        <div className="max-w-[58rem]">
          <p className="adora-eyebrow text-white/78">Du lịch, được thiết kế sâu hơn</p>
          <h1 className="font-editorial mt-7 max-w-[13ch] text-[clamp(3.2rem,9.2vw,8.25rem)] leading-[0.89] font-medium tracking-[-0.055em] text-balance">
            Đi xa hơn. <em className="font-normal text-[var(--adora-ivory)]">Hiểu sâu hơn.</em>
          </h1>
          <p className="mt-7 max-w-[38rem] text-sm leading-7 text-white/76 sm:text-base sm:leading-8 lg:mt-9 lg:text-lg">
            ADORA kết nối cảm hứng, dữ liệu điểm đến và trí tuệ nhân tạo để mỗi chuyến đi trở thành một hành trình có chủ đích.
          </p>
          <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center lg:mt-11">
            <Link
              href="/ai-planner"
              className="light-cta hero-primary-cta group inline-flex min-h-13 items-center gap-4 px-6 text-xs font-bold tracking-[0.11em] transition-colors"
            >
              Plan with Adora AI
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <a href="#destinations" className="editorial-link text-white/86">
              Khám phá điểm đến
            </a>
          </div>
        </div>
      </div>

      <a
        href="#philosophy"
        className="absolute right-[var(--adora-gutter)] bottom-8 hidden min-h-12 items-center gap-3 text-[0.65rem] font-bold tracking-[0.18em] text-white/65 uppercase lg:flex"
      >
        Cuộn để khám phá
        <span className="flex h-12 w-px overflow-hidden bg-white/25" aria-hidden="true">
          <span className="hero-scroll-line h-full w-px bg-white" />
        </span>
        <ArrowDown className="size-3" aria-hidden="true" />
      </a>
    </section>
  );
}
