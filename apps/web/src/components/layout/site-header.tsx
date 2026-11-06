"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type NavSection = "destinations" | "experiences" | "trips";

const navigation: { href: string; label: string; section?: NavSection }[] = [
  { href: "/destinations", label: "Điểm đến", section: "destinations" },
  { href: "/experiences", label: "Trải nghiệm", section: "experiences" },
  { href: "/trips", label: "Chuyến đi mẫu", section: "trips" },
  { href: "/#how-it-works", label: "Cách hoạt động" },
];

type SiteHeaderProps = {
  /** `overlay` sits on top of a dark hero; `solid` is used on light editorial pages. */
  tone?: "overlay" | "solid";
  /** Marks the matching primary link with `aria-current` and a visible indicator. */
  current?: NavSection;
};

export function SiteHeader({ tone = "overlay", current }: Readonly<SiteHeaderProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const isOverlay = tone === "overlay";

  const headerClass = isOverlay
    ? "absolute inset-x-0 top-0 z-40 border-b border-white/18 text-white"
    : "relative z-40 border-b border-[var(--adora-hairline)] bg-[var(--adora-paper)] text-[var(--adora-ink)]";
  const linkClass = isOverlay
    ? "text-xs font-semibold tracking-[0.08em] text-white/78 transition-colors hover:text-white"
    : "text-xs font-semibold tracking-[0.08em] text-[var(--adora-text-secondary)] transition-colors hover:text-[var(--adora-ink)]";
  const ctaClass = isOverlay
    ? "inline-flex min-h-11 items-center border border-white/55 px-5 text-xs font-bold tracking-[0.1em] transition-colors hover:bg-white hover:text-[var(--adora-ink)]"
    : "inline-flex min-h-11 items-center border border-[var(--adora-ink)] px-5 text-xs font-bold tracking-[0.1em] transition-colors hover:bg-[var(--adora-ink)] hover:text-[var(--adora-paper)]";
  const toggleClass = isOverlay
    ? "inline-flex size-11 items-center justify-center border border-white/40 lg:hidden"
    : "inline-flex size-11 items-center justify-center border border-[var(--adora-ink)]/40 lg:hidden";
  const panelClass = isOverlay
    ? "border-t border-white/18 bg-[var(--adora-ink)] text-white"
    : "border-t border-[var(--adora-hairline)] bg-[var(--adora-ivory)] text-[var(--adora-ink)]";
  const panelLinkClass = isOverlay ? "border-b border-white/14" : "border-b border-[var(--adora-hairline)]";

  return (
    <header className={headerClass}>
      <div className="adora-container flex h-20 items-center justify-between lg:h-24">
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
          <Link href="/ai-planner" className={ctaClass}>
            Plan with Adora AI
          </Link>
        </nav>

        <button
          type="button"
          className={toggleClass}
          aria-expanded={isOpen}
          aria-controls="mobile-navigation"
          aria-label={isOpen ? "Đóng trình đơn" : "Mở trình đơn"}
          onClick={() => setIsOpen((open) => !open)}
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
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/ai-planner"
          className={`${isOverlay ? "light-cta" : "dark-cta"} mt-6 inline-flex min-h-12 items-center justify-center px-5 text-xs font-bold tracking-[0.1em]`}
          onClick={() => setIsOpen(false)}
        >
          Plan with Adora AI
        </Link>
      </nav>
    </header>
  );
}
