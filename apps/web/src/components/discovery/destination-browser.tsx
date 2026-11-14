"use client";

import { ArrowUpRight, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState } from "react";

import { REGION_LABELS } from "@/lib/demo/destinations";
import { DEFAULT_DESTINATION_FILTER, filterDestinations, type DestinationFilter } from "@/lib/demo/filters";
import type { Destination } from "@/lib/demo/types";

const REGION_OPTIONS: { value: DestinationFilter["region"]; label: string }[] = [
  { value: "all", label: "Tất cả vùng" },
  ...Object.entries(REGION_LABELS).map(([value, label]) => ({
    value: value as DestinationFilter["region"],
    label,
  })),
];

const AVAILABILITY_OPTIONS: { value: DestinationFilter["availability"]; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "available", label: "Đã có nội dung" },
  { value: "coming-soon", label: "Sắp ra mắt" },
];

/** Client island: search and filters over the local destination records. */
export function DestinationBrowser({ destinations }: Readonly<{ destinations: Destination[] }>) {
  const [filter, setFilter] = useState<DestinationFilter>(DEFAULT_DESTINATION_FILTER);
  const searchId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const results = filterDestinations(destinations, filter);
  const isFiltered =
    filter.query !== "" || filter.region !== DEFAULT_DESTINATION_FILTER.region || filter.availability !== "all";

  function resetFilters() {
    setFilter(DEFAULT_DESTINATION_FILTER);
    searchInputRef.current?.focus({ preventScroll: true });
  }

  return (
    <div>
      <div className="grid gap-6 border-y border-[var(--adora-hairline)] py-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start lg:gap-12">
        <div>
          <label htmlFor={searchId} className="text-[0.68rem] font-bold tracking-[0.16em] text-[var(--adora-text-secondary)] uppercase">
            Tìm điểm đến
          </label>
          <div className="mt-3 flex min-h-12 items-center gap-3 border border-[var(--adora-hairline)] bg-white/50 px-4 focus-within:border-[var(--adora-ink)]">
            <Search className="size-4 shrink-0 text-[var(--adora-text-secondary)]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              id={searchId}
              type="search"
              value={filter.query}
              onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))}
              placeholder="Ví dụ: Đà Lạt, cao nguyên"
              autoComplete="off"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--adora-text-secondary)]/70"
            />
          </div>
        </div>

        <div className="grid gap-5">
          <fieldset>
            <legend className="text-[0.68rem] font-bold tracking-[0.16em] text-[var(--adora-text-secondary)] uppercase">Vùng</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {REGION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="filter-chip"
                  aria-pressed={filter.region === option.value}
                  onClick={() => setFilter((current) => ({ ...current, region: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[0.68rem] font-bold tracking-[0.16em] text-[var(--adora-text-secondary)] uppercase">Trạng thái nội dung</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="filter-chip"
                  aria-pressed={filter.availability === option.value}
                  onClick={() => setFilter((current) => ({ ...current, availability: option.value }))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <p role="status" aria-live="polite" className="mt-6 text-xs font-semibold text-[var(--adora-text-secondary)]" data-testid="destination-count">
        Hiển thị {results.length} / {destinations.length} điểm đến
      </p>

      {(() => {
        const chipSettleKey = `${filter.region}-${filter.availability}`;
        return results.length > 0 ? (
          <ol key={chipSettleKey} data-filter-settle="" className="mt-4 border-t border-[var(--adora-hairline)]" data-testid="destination-results">
          {results.map((destination, index) => (
            <li key={destination.slug} className="border-b border-[var(--adora-hairline)]">
              {destination.status === "available" ? (
                <Link
                  href={`/destinations/${destination.slug}`}
                  className="group grid grid-cols-[2.25rem_1fr_auto] items-center gap-x-4 gap-y-4 py-6 sm:grid-cols-[3rem_9rem_1fr_auto] sm:gap-x-8"
                >
                  <span className="font-editorial text-lg text-[var(--adora-gold)]">{String(index + 1).padStart(2, "0")}</span>
                  {destination.image ? (
                    <span className="image-reveal relative order-last col-span-3 aspect-[16/9] sm:order-none sm:col-span-1 sm:aspect-[4/3]">
                      <Image
                        src={destination.image.src}
                        alt={destination.image.alt}
                        fill
                        sizes="(max-width: 639px) 100vw, 144px"
                        className="object-cover"
                      />
                    </span>
                  ) : null}
                  <span>
                    <span className="font-editorial block text-3xl leading-none tracking-[-0.03em] sm:text-4xl">{destination.name}</span>
                    <span className="mt-3 block text-sm leading-6 text-[var(--adora-text-secondary)]">{destination.tagline}</span>
                    <span className="mt-3 block text-[0.66rem] font-bold tracking-[0.14em] text-[var(--adora-sage)] uppercase">
                      {destination.regionLabel} · Đã có trang chi tiết
                    </span>
                  </span>
                  <ArrowUpRight
                    className="size-5 transition-[transform,translate,color] duration-[260ms] ease-[var(--adora-ease-editorial)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--adora-gold)] group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:text-[var(--adora-gold)]"
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <div className="grid grid-cols-[2.25rem_1fr] items-start gap-x-4 py-6 sm:grid-cols-[3rem_9rem_1fr_auto] sm:gap-x-8">
                  <span className="font-editorial text-lg text-[var(--adora-gold)]">{String(index + 1).padStart(2, "0")}</span>
                  <span className="hidden sm:block" aria-hidden="true" />
                  <span>
                    <span className="font-editorial block text-3xl leading-none tracking-[-0.03em] text-[var(--adora-ink)]/80 sm:text-4xl">
                      {destination.name}
                    </span>
                    <span className="mt-3 block text-sm leading-6 text-[var(--adora-text-secondary)]">{destination.summary}</span>
                    <span className="mt-3 block text-[0.66rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">
                      {destination.regionLabel}
                    </span>
                  </span>
                  <span className="col-start-2 mt-3 inline-flex min-h-7 items-center self-start border border-dashed border-[var(--adora-hairline)] px-3 text-[0.64rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase sm:col-start-auto sm:mt-0">
                    Sắp ra mắt · cảm hứng biên tập
                  </span>
                </div>
              )}
            </li>
          ))}
        </ol>
        ) : (
          <div
            key={`${chipSettleKey}-empty`}
            data-filter-settle=""
            className="mt-6 border border-dashed border-[var(--adora-hairline)] p-8 text-center sm:p-12"
            data-testid="destination-empty"
          >
            <p className="font-editorial text-3xl tracking-[-0.03em]">Chưa có điểm đến phù hợp.</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--adora-text-secondary)]">
              ADORA mới có một bộ nhỏ nội dung biên tập. Hãy thử từ khoá khác hoặc xoá bộ lọc.
            </p>
            {isFiltered ? (
              <button type="button" className="editorial-link mt-6" onClick={resetFilters}>
                Xoá bộ lọc
              </button>
            ) : null}
          </div>
        );
      })()}
    </div>
  );
}
