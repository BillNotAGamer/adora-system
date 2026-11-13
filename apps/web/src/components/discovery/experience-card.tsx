import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { EXPERIENCE_CATEGORY_LABELS } from "@/lib/demo/experiences";
import type { Experience } from "@/lib/demo/types";

export type ExperienceCardShape = "wide" | "tall" | "square";

const SHAPE_CLASS: Record<ExperienceCardShape, string> = {
  wide: "aspect-[4/3] sm:aspect-[3/2]",
  tall: "aspect-[4/3] sm:aspect-[4/5]",
  square: "aspect-[4/3] sm:aspect-square",
};

const SHAPE_SIZES: Record<ExperienceCardShape, string> = {
  wide: "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 58vw",
  tall: "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 40vw",
  square: "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw",
};

type ExperienceCardProps = {
  experience: Experience;
  shape?: ExperienceCardShape;
  /** Hero-priority images are only for the first visible card on a page. */
  eager?: boolean;
};

/** Editorial experience tile. Server-renderable; also used inside client filter islands. */
export function ExperienceCard({ experience, shape = "wide", eager = false }: Readonly<ExperienceCardProps>) {
  return (
    <article>
      <Link href={`/experiences/${experience.slug}`} className="group block">
        <div className={`image-reveal relative w-full ${SHAPE_CLASS[shape]}`}>
          <Image
            src={experience.image.src}
            alt={experience.image.alt}
            fill
            sizes={SHAPE_SIZES[shape]}
            preload={eager}
            className="object-cover"
            style={{ objectPosition: experience.image.position ?? "center" }}
          />
        </div>
        <p className="mt-5 text-[0.66rem] font-bold tracking-[0.16em] text-[var(--adora-sage)] uppercase">
          {EXPERIENCE_CATEGORY_LABELS[experience.category]} · {experience.bestMoment}
        </p>
        <h3 className="font-editorial mt-3 flex items-start justify-between gap-4 text-[clamp(1.7rem,2.6vw,2.4rem)] leading-[1.05] tracking-[-0.035em]">
          <span>{experience.name}</span>
          <ArrowUpRight
            className="mt-1 size-5 shrink-0 transition-[transform,translate,color] duration-[260ms] ease-[var(--adora-ease-editorial)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--adora-gold)] group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:text-[var(--adora-gold)]"
            aria-hidden="true"
          />
        </h3>
        <p className="mt-3 max-w-md text-sm leading-6 text-[var(--adora-text-secondary)]">{experience.tagline}</p>
      </Link>
    </article>
  );
}
