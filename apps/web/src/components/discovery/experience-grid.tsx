import { ExperienceCard, type ExperienceCardShape } from "@/components/discovery/experience-card";
import { Reveal } from "@/components/ui/reveal";
import type { Experience } from "@/lib/demo/types";

const PATTERN: { column: string; shape: ExperienceCardShape }[] = [
  { column: "lg:col-span-7", shape: "wide" },
  { column: "lg:col-span-5 lg:mt-24", shape: "tall" },
  { column: "lg:col-span-5", shape: "tall" },
  { column: "lg:col-span-7 lg:mt-24", shape: "wide" },
];

type ExperienceGridProps = {
  experiences: Experience[];
  eagerFirst?: boolean;
  /** Opt-in scroll reveal for pre-rendered showcase grids (e.g. destination detail pages). Keep false on filterable index grids. */
  reveal?: boolean;
  /** Chip-scoped settle key for filterable index views; must exclude typing query state. */
  filterSettleKey?: string;
};

/** Asymmetric 12-column composition that repeats every four items. */
export function ExperienceGrid({
  experiences,
  eagerFirst = false,
  reveal = false,
  filterSettleKey,
}: Readonly<ExperienceGridProps>) {
  return (
    <ul
      key={filterSettleKey}
      data-filter-settle={filterSettleKey !== undefined ? "" : undefined}
      className="grid gap-x-10 gap-y-14 lg:grid-cols-12 lg:items-start lg:gap-y-16"
      data-testid="experience-results"
    >
      {experiences.map((experience, index) => {
        const slot = PATTERN[index % PATTERN.length] ?? { column: "lg:col-span-6", shape: "wide" as const };
        const eager = eagerFirst && index === 0;
        if (reveal) {
          return (
            <Reveal
              as="li"
              key={experience.slug}
              variant="card"
              delayMs={(index % 2) * 90}
              stackOnMobile
              className={slot.column}
            >
              <ExperienceCard experience={experience} shape={slot.shape} eager={eager} />
            </Reveal>
          );
        }
        return (
          <li key={experience.slug} className={slot.column}>
            <ExperienceCard experience={experience} shape={slot.shape} eager={eager} />
          </li>
        );
      })}
    </ul>
  );
}
