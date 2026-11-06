import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type Crumb = { label: string; href?: string };

/** Breadcrumb trail; the last crumb is the current page and is not a link. */
export function Breadcrumbs({ items, inverted = false }: Readonly<{ items: Crumb[]; inverted?: boolean }>) {
  const muted = inverted ? "text-white/70 hover:text-white" : "text-[var(--adora-text-secondary)] hover:text-[var(--adora-ink)]";
  return (
    <nav aria-label="Đường dẫn" className="text-xs">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className={`inline-flex min-h-11 items-center font-semibold ${muted}`}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="font-semibold">
                  {item.label}
                </span>
              )}
              {!isLast ? <ChevronRight className="size-3 opacity-50" aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
