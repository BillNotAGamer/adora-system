"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useConcierge } from "@/components/concierge/concierge-provider";
import { ConciergeTrigger } from "@/components/concierge/concierge-trigger";

export type NavSection = "destinations" | "experiences" | "trips";

const navigation: { href: string; label: string; section?: NavSection }[] = [
  { href: "/destinations", label: "Điểm đến", section: "destinations" },
  { href: "/experiences", label: "Trải nghiệm", section: "experiences" },
  { href: "/trips", label: "Chuyến đi mẫu", section: "trips" },
  { href: "/#how-it-works", label: "Cách hoạt động" },
];

type SiteHeaderProps = {
  /** `overlay` sits on top of a dark hero; `cinematic` pins cleanly above the dark scrollytelling stage; `solid` is used on light editorial pages. */
  tone?: "overlay" | "solid" | "cinematic";
  /** Marks the matching primary link with `aria-current` and a visible indicator. */
  current?: NavSection;
};

export function SiteHeader({ tone = "overlay", current }: Readonly<SiteHeaderProps>) {
  const { menuOpen: isOpen, setMenuOpen: updateMenu } = useConcierge();
  const isOverlay = tone === "overlay";
  const isCinematic = tone === "cinematic";
  const isDark = isOverlay || isCinematic;

  const headerClass = isCinematic
    ? "fixed inset-x-0 top-0 z-40 border-b border-[#f4efe6]/18 bg-gradient-to-b from-[#080c0a]/80 via-[#080c0a]/42 to-transparent text-[#f4efe6] backdrop-blur-[2px]"
    : isOverlay
      ? "absolute inset-x-0 top-0 z-40 border-b border-white/18 text-white"
      : "relative z-40 border-b border-[var(--adora-hairline)] bg-[var(--adora-paper)] text-[var(--adora-ink)]";
  const linkClass = isDark
    ? "text-xs font-semibold tracking-[0.08em] text-white/82 transition-colors hover:text-white"
    : "text-xs font-semibold tracking-[0.08em] text-[var(--adora-text-secondary)] transition-colors hover:text-[var(--adora-ink)]";
  const ctaClass = isDark
    ? "inline-flex min-h-11 items-center border border-white/55 bg-[#080c0a]/35 px-5 text-xs font-bold tracking-[0.1em] transition-colors hover:bg-white hover:text-[var(--adora-ink)]"
    : "inline-flex min-h-11 items-center border border-[var(--adora-ink)] px-5 text-xs font-bold tracking-[0.1em] transition-colors hover:bg-[var(--adora-ink)] hover:text-[var(--adora-paper)]";
  const toggleClass = isDark
    ? "inline-flex size-11 items-center justify-center border border-white/40 bg-[#080c0a]/35 lg:hidden"
    : "inline-flex size-11 items-center justify-center border border-[var(--adora-ink)]/40 lg:hidden";
  const panelClass = isCinematic
    ? "border-t border-[#f4efe6]/18 bg-[#0b0e0c]/96 text-[#f4efe6] backdrop-blur-md"
    : isOverlay
      ? "border-t border-white/18 bg-[var(--adora-ink)] text-white"
      : "border-t border-[var(--adora-hairline)] bg-[var(--adora-ivory)] text-[var(--adora-ink)]";
  const panelLinkClass = isDark ? "border-b border-white/14" : "border-b border-[var(--adora-hairline)]";

  return (
    <header className={headerClass}>
      <div
        className={
          isCinematic
            ? "flex h-20 w-full items-center justify-between px-[clamp(1.25rem,4vw,3.75rem)] lg:h-24"
            : "adora-container flex h-20 items-center justify-between lg:h-24"
        }
      >
        <Link
          href="/"
          className="text-base font-bold tracking-[0.36em] sm:text-lg"
          aria-label="ADORA — trang chủ"
        >
          ADORA
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-8 lg:flex">
          {navigation.map((item) => {
            const isCurrent = item.section !== undefined && item.section === current;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={`${linkClass} ${isCurrent ? "border-b border-[var(--adora-gold)] pb-1 !text-inherit" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
          <ConciergeTrigger href="/ai-planner" className={ctaClass}>
            Travel Atelier
          </ConciergeTrigger>
        </nav>

        <button
          type="button"
          className={toggleClass}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Đóng trình đơn" : "Mở trình đơn"}
          onClick={() => updateMenu(!isOpen)}
        >
          {isOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      <nav
        id="mobile-navigation"
        aria-label="Điều hướng di động"
        className={`${isOpen ? "grid" : "hidden"} ${panelClass} px-[var(--adora-gutter)] py-7 lg:hidden`}
      >
        {navigation.map((item) => {
          const isCurrent = item.section !== undefined && item.section === current;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent ? "page" : undefined}
              className={`${panelLinkClass} flex min-h-12 items-center py-3 text-sm font-medium`}
              onClick={() => updateMenu(false)}
            >
              {item.label}
            </Link>
          );
        })}
        <ConciergeTrigger
          href="/ai-planner"
          className={`${isDark ? "light-cta" : "dark-cta"} mt-6 inline-flex min-h-12 items-center justify-center px-5 text-xs font-bold tracking-[0.1em]`}
          onClick={() => updateMenu(false)}
        >
          Travel Atelier
        </ConciergeTrigger>
      </nav>
    </header>
  );
}
