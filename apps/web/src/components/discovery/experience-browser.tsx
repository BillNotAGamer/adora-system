"use client";

import { Search } from "lucide-react";
import { useId, useRef, useState } from "react";

import { ExperienceGrid } from "@/components/discovery/experience-grid";
import { EXPERIENCE_CATEGORY_LABELS } from "@/lib/demo/experiences";
import { DEFAULT_EXPERIENCE_FILTER, filterExperiences, type ExperienceFilter } from "@/lib/demo/filters";
import type { Experience, ExperienceCategory } from "@/lib/demo/types";

/** Client island: category and text filters over the local experience records. */
export function ExperienceBrowser({ experiences }: Readonly<{ experiences: Experience[] }>) {
  const [filter, setFilter] = useState<ExperienceFilter>(DEFAULT_EXPERIENCE_FILTER);
  const searchId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);

  function resetFilters() {
    setFilter(DEFAULT_EXPERIENCE_FILTER);
    searchInputRef.current?.focus({ preventScroll: true });
  }

  const counts = experiences.reduce<Partial<Record<ExperienceCategory, number>>>((accumulator, experience) => {
    accumulator[experience.category] = (accumulator[experience.category] ?? 0) + 1;
    return accumulator;
  }, {});
  const categories = (Object.keys(EXPERIENCE_CATEGORY_LABELS) as ExperienceCategory[]).filter((category) => (counts[category] ?? 0) > 0);
  const results = filterExperiences(experiences, filter);
  const isFiltered = filter.query !== "" || filter.category !== "all";

  return (
    <div>
      <div className="grid gap-6 border-y border-[var(--adora-hairline)] py-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start lg:gap-12">
        <div>
          <label htmlFor={searchId} className="text-[0.68rem] font-bold tracking-[0.16em] text-[var(--adora-text-secondary)] uppercase">
            Tìm trải nghiệm
          </label>
          <div className="mt-3 flex min-h-12 items-center gap-3 border border-[var(--adora-hairline)] bg-white/50 px-4 focus-within:border-[var(--adora-ink)]">
            <Search className="size-4 shrink-0 text-[var(--adora-text-secondary)]" aria-hidden="true" />
            <input
              ref={searchInputRef}
              id={searchId}
              type="search"
              value={filter.query}
              onChange={(event) => setFilter((current) => ({ ...current, query: event.target.value }))}
              placeholder="Ví dụ: cà phê, rừng thông"
              autoComplete="off"
              className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--adora-text-secondary)]/70"
            />
          </div>
        </div>

        <fieldset>
          <legend className="text-[0.68rem] font-bold tracking-[0.16em] text-[var(--adora-text-secondary)] uppercase">Chủ đề</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="filter-chip"
              aria-pressed={filter.category === "all"}
              onClick={() => setFilter((current) => ({ ...current, category: "all" }))}
            >
              Tất cả ({experiences.length})
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className="filter-chip"
                aria-pressed={filter.category === category}
                onClick={() => setFilter((current) => ({ ...current, category }))}
              >
                {EXPERIENCE_CATEGORY_LABELS[category]} ({counts[category] ?? 0})
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <p role="status" aria-live="polite" className="mt-6 text-xs font-semibold text-[var(--adora-text-secondary)]" data-testid="experience-count">
        Hiển thị {results.length} / {experiences.length} trải nghiệm
      </p>

      <div className="mt-10">
        {results.length > 0 ? (
          <ExperienceGrid experiences={results} eagerFirst filterSettleKey={filter.category} />
        ) : (
          <div
            key={`${filter.category}-empty`}
            data-filter-settle=""
            className="border border-dashed border-[var(--adora-hairline)] p-8 text-center sm:p-12"
            data-testid="experience-empty"
          >
            <p className="font-editorial text-3xl tracking-[-0.03em]">Chưa có trải nghiệm phù hợp.</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--adora-text-secondary)]">
              Bộ gợi ý biên tập hiện còn nhỏ. Hãy thử một từ khoá khác hoặc xoá bộ lọc.
            </p>
            {isFiltered ? (
              <button type="button" className="editorial-link mt-6" onClick={resetFilters}>
                Xoá bộ lọc
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
