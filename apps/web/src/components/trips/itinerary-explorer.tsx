"use client";

import { ChevronDown, MapPin } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";

import { EXPERIENCE_CATEGORY_LABELS, getExperienceBySlug } from "@/lib/demo/experiences";
import { PERIOD_LABELS, formatVnd, getTripBudgetTotalVnd } from "@/lib/demo/trips";
import type { Trip } from "@/lib/demo/types";

/**
 * Client island for the itinerary: day tabs (WAI-ARIA tabs pattern) and an accordion of activities.
 * All content is the static `Trip` fixture; nothing here is fetched, generated, or persisted.
 */
export function ItineraryExplorer({ trip }: Readonly<{ trip: Trip }>) {
  const [activeDay, setActiveDay] = useState(1);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set(trip.days[0]?.activities[0]?.id ? [trip.days[0].activities[0].id] : []));
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const day = trip.days.find((candidate) => candidate.day === activeDay) ?? trip.days[0];
  if (!day) return null;

  function selectDay(next: number, focus = false) {
    const target = trip.days.find((candidate) => candidate.day === next);
    if (!target) return;
    setActiveDay(next);
    const firstId = target.activities[0]?.id;
    if (firstId) setOpenIds((current) => (current.has(firstId) ? current : new Set(current).add(firstId)));
    if (focus) tabRefs.current[trip.days.indexOf(target)]?.focus();
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = trip.days.length - 1;
    const nextIndex =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (nextIndex === null) return;
    event.preventDefault();
    const target = trip.days[nextIndex];
    if (target) selectDay(target.day, true);
  }

  function toggle(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = getTripBudgetTotalVnd(trip);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
      <div className="min-w-0">
        <div role="tablist" aria-label="Chọn ngày trong lịch trình" className="grid auto-cols-fr grid-flow-col border border-[var(--adora-hairline)]">
          {trip.days.map((candidate, index) => {
            const selected = candidate.day === day.day;
            return (
              <button
                key={candidate.day}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                id={`day-tab-${candidate.day}`}
                aria-selected={selected}
                aria-controls={`day-panel-${candidate.day}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => selectDay(candidate.day)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={`min-h-14 border-r border-[var(--adora-hairline)] px-3 py-2 text-left transition-colors last:border-r-0 sm:px-5 ${
                  selected ? "bg-[var(--adora-ink)] text-[var(--adora-paper)]" : "bg-transparent text-[var(--adora-ink)] hover:bg-[var(--adora-ivory)]"
                }`}
              >
                <span className="block text-xs font-bold tracking-[0.12em] uppercase">Ngày {candidate.day}</span>
                <span className={`mt-1 hidden text-xs sm:block ${selected ? "text-white/70" : "text-[var(--adora-text-secondary)]"}`}>
                  {candidate.activities.length} hoạt động
                </span>
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id={`day-panel-${day.day}`} aria-labelledby={`day-tab-${day.day}`} tabIndex={0} className="mt-8" data-testid="day-panel">
          <h3 className="font-editorial text-[clamp(1.9rem,3.4vw,3rem)] leading-[1.02] tracking-[-0.035em]">
            Ngày {day.day}: {day.title}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--adora-text-secondary)]">{day.summary}</p>

          <ol className="mt-8 border-l border-[var(--adora-hairline)]">
            {day.activities.map((activity) => {
              const open = openIds.has(activity.id);
              const experience = activity.experienceSlug ? getExperienceBySlug(activity.experienceSlug) : undefined;
              return (
                <li key={activity.id} className="relative pb-6 pl-6 last:pb-0 sm:pl-8">
                  <span className="absolute top-2 -left-[5px] size-2.5 rounded-full border border-[var(--adora-gold)] bg-[var(--adora-paper)]" aria-hidden="true" />
                  <p className="text-[0.68rem] font-bold tracking-[0.16em] text-[var(--adora-sage)] uppercase">{PERIOD_LABELS[activity.period]}</p>
                  <div className="mt-2 border border-[var(--adora-hairline)] bg-white/50">
                    <h4>
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={`activity-${activity.id}`}
                        onClick={() => toggle(activity.id)}
                        className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left sm:px-5"
                      >
                        <span>
                          <span className="block text-base font-semibold">{activity.title}</span>
                          <span className="mt-1 block text-sm leading-6 font-normal text-[var(--adora-text-secondary)]">{activity.summary}</span>
                        </span>
                        <ChevronDown className={`size-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                      </button>
                    </h4>
                    {open ? (
                      <div id={`activity-${activity.id}`} role="region" aria-label={activity.title} className="border-t border-[var(--adora-hairline)] px-4 py-5 sm:px-5">
                        <p className="text-sm leading-7 text-[var(--adora-text-secondary)]">{activity.detail}</p>
                        <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-[var(--adora-ink)]">
                          <MapPin className="size-3.5 text-[var(--adora-gold)]" aria-hidden="true" />
                          {activity.locationNote}
                          <span className="font-normal text-[var(--adora-text-secondary)]">· khu vực đại diện, không phải địa chỉ</span>
                        </p>
                        {experience ? (
                          <Link href={`/experiences/${experience.slug}`} className="editorial-link mt-4">
                            Xem trải nghiệm · {EXPERIENCE_CATEGORY_LABELS[experience.category]}
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <aside aria-label="Tóm tắt chuyến đi" className="lg:sticky lg:top-6 lg:self-start">
        <div className="border border-[var(--adora-hairline)] bg-[var(--adora-ivory)] p-6">
          <h3 className="text-[0.68rem] font-bold tracking-[0.16em] text-[var(--adora-text-secondary)] uppercase">Tóm tắt chuyến đi</h3>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[var(--adora-hairline)] pb-3">
              <dt className="text-[var(--adora-text-secondary)]">Thời lượng</dt>
              <dd className="font-semibold">{trip.durationDays} ngày</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--adora-hairline)] pb-3">
              <dt className="text-[var(--adora-text-secondary)]">Nhịp đi</dt>
              <dd className="text-right font-semibold">{trip.pace}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--adora-hairline)] pb-3">
              <dt className="text-[var(--adora-text-secondary)]">Ước tính ngày {day.day}</dt>
              <dd className="font-semibold" data-testid="day-budget">{formatVnd(day.illustrativeBudgetVnd)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--adora-text-secondary)]">Ước tính cả chuyến</dt>
              <dd className="font-semibold">{formatVnd(total)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-[var(--adora-text-secondary)]">
            Ước tính minh hoạ cho ăn uống và hoạt động, không gồm lưu trú và di chuyển. Không phải báo giá hay giá trực tiếp.
          </p>
        </div>

        <div className="mt-6 border border-dashed border-[var(--adora-hairline)] p-6">
          <h3 className="text-[0.68rem] font-bold tracking-[0.16em] text-[var(--adora-text-secondary)] uppercase">Ghi chú về bản mẫu</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5 text-[var(--adora-text-secondary)] marker:text-[var(--adora-gold)]">
            {trip.planNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
