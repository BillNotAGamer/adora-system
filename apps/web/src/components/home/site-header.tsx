"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navigation = [
  { href: "#destinations", label: "Điểm đến" },
  { href: "#experiences", label: "Trải nghiệm" },
  { href: "#how-it-works", label: "Cách hoạt động" },
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-40 border-b border-white/18 text-white">
      <div className="adora-container flex h-20 items-center justify-between lg:h-24">
        <Link
          href="/"
          className="text-base font-bold tracking-[0.36em] sm:text-lg"
          aria-label="ADORA — trang chủ"
        >
          ADORA
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-8 lg:flex">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-semibold tracking-[0.08em] text-white/78 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/ai-planner"
            className="inline-flex min-h-11 items-center border border-white/55 px-5 text-xs font-bold tracking-[0.1em] transition-colors hover:bg-white hover:text-[var(--adora-ink)]"
          >
            Plan with Adora AI
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center border border-white/40 lg:hidden"
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
        className={`${isOpen ? "grid" : "hidden"} border-t border-white/18 bg-[var(--adora-ink)] px-[var(--adora-gutter)] py-7 lg:hidden`}
      >
        {navigation.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="border-b border-white/14 py-4 text-sm font-medium"
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </a>
        ))}
        <Link
          href="/ai-planner"
          className="light-cta mt-6 inline-flex min-h-12 items-center justify-center px-5 text-xs font-bold tracking-[0.1em]"
          onClick={() => setIsOpen(false)}
        >
          Plan with Adora AI
        </Link>
      </nav>
    </header>
  );
}
