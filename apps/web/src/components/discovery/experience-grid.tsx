import { ExperienceCard, type ExperienceCardShape } from "@/components/discovery/experience-card";
import type { Experience } from "@/lib/demo/types";

const PATTERN: { column: string; shape: ExperienceCardShape }[] = [
  { column: "lg:col-span-7", shape: "wide" },
  { column: "lg:col-span-5 lg:mt-24", shape: "tall" },
  { column: "lg:col-span-5", shape: "tall" },
  { column: "lg:col-span-7 lg:mt-24", shape: "wide" },
];

/** Asymmetric 12-column composition that repeats every four items. */
export function ExperienceGrid({ experiences, eagerFirst = false }: Readonly<{ experiences: Experience[]; eagerFirst?: boolean }>) {
  return (
    <ul className="grid gap-x-10 gap-y-14 lg:grid-cols-12 lg:items-start lg:gap-y-16" data-testid="experience-results">
      {experiences.map((experience, index) => {
        const slot = PATTERN[index % PATTERN.length] ?? { column: "lg:col-span-6", shape: "wide" as const };
        return (
          <li key={experience.slug} className={slot.column}>
            <ExperienceCard experience={experience} shape={slot.shape} eager={eagerFirst && index === 0} />
          </li>
        );
      })}
    </ul>
  );
}
