import { ConciergeTrigger } from "@/components/concierge/concierge-trigger";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";

type SiteFooterProps = {
  /** The closing call-to-action block is used on the homepage and long editorial pages. */
  showCta?: boolean;
  /** `dark` blends seamlessly with the obsidian cinematic homepage finale. */
  tone?: "light" | "dark";
};

export function SiteFooter({ showCta = true, tone = "light" }: Readonly<SiteFooterProps>) {
  const isDark = tone === "dark";

  return (
    <footer className={isDark ? "bg-[#080b09] text-[#f4efe6]" : "bg-[var(--adora-ivory)]"}>
      <div
        className={`adora-container border-t ${isDark ? "border-[#f4efe6]/16" : "border-[var(--adora-hairline)]"} ${showCta ? "py-14 sm:py-20" : "py-10"}`}
      >
        {showCta ? (
          <Reveal delayMs={0} className="grid gap-12 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div>
              <p className="adora-eyebrow text-[var(--adora-sage)]">Hành trình tiếp theo</p>
              <h2 className="font-editorial mt-7 max-w-[13ch] text-[clamp(2.8rem,5.6vw,5.8rem)] leading-[0.96] tracking-[-0.045em]">
                Bắt đầu bằng một câu hỏi thật hay.
              </h2>
            </div>
            <ConciergeTrigger href="/ai-planner" className="editorial-link lg:ml-auto">
              Plan with Adora AI
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </ConciergeTrigger>
          </Reveal>
        ) : null}

        <div
          className={`${showCta ? `mt-20 border-t ${isDark ? "border-[#f4efe6]/16" : "border-[var(--adora-hairline)]"} pt-8` : ""} grid gap-9 text-xs ${isDark ? "text-[#f4efe6]/70" : "text-[var(--adora-text-secondary)]"} sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:items-center lg:gap-10`}
        >
          <Link
            href="/"
            className={`text-sm font-bold tracking-[0.34em] ${isDark ? "text-[#f4efe6]" : "text-[var(--adora-ink)]"}`}
            aria-label="ADORA — trang chủ"
          >
            ADORA
          </Link>
          <nav aria-label="Điều hướng chân trang" className="flex flex-wrap gap-x-6 gap-y-1">
            <Link href="/" className={`inline-flex min-h-11 items-center ${isDark ? "hover:text-[#e4c68c]" : "hover:text-[var(--adora-ink)]"}`}>
              Trang chủ
            </Link>
            <Link href="/destinations" className={`inline-flex min-h-11 items-center ${isDark ? "hover:text-[#e4c68c]" : "hover:text-[var(--adora-ink)]"}`}>
              Điểm đến
            </Link>
            <Link href="/experiences" className={`inline-flex min-h-11 items-center ${isDark ? "hover:text-[#e4c68c]" : "hover:text-[var(--adora-ink)]"}`}>
              Trải nghiệm
            </Link>
            <ConciergeTrigger href="/ai-planner" className={`inline-flex min-h-11 items-center ${isDark ? "hover:text-[#e4c68c]" : "hover:text-[var(--adora-ink)]"}`}>
              AI Planner
            </ConciergeTrigger>
            <Link href="/trips" className={`inline-flex min-h-11 items-center ${isDark ? "hover:text-[#e4c68c]" : "hover:text-[var(--adora-ink)]"}`}>
              Chuyến đi mẫu
            </Link>
          </nav>
          <p>© 2026 ADORA · Graduation Project</p>
        </div>
      </div>
    </footer>
  );
}
