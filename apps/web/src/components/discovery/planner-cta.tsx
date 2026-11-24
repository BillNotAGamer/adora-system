import { ConciergeTrigger } from "@/components/concierge/concierge-trigger";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

type PlannerCtaProps = {
  heading: string;
  body: string;
};

/** Call-to-action band that leads to the scripted AI Planner demo. */
export function PlannerCta({ heading, body }: Readonly<PlannerCtaProps>) {
  return (
    <section aria-labelledby="planner-cta-heading" className="bg-[var(--adora-ink)] text-[var(--adora-ivory)]">
      <Reveal className="adora-container grid gap-10 py-20 sm:py-24 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
        <div>
          <p className="adora-eyebrow text-[var(--adora-gold)]">ADORA AI · bản demo</p>
          <h2 id="planner-cta-heading" className="font-editorial mt-6 max-w-[16ch] text-[clamp(2.6rem,5vw,5rem)] leading-[0.98] tracking-[-0.045em]">
            {heading}
          </h2>
        </div>
        <div>
          <p className="max-w-md text-sm leading-7 text-white/72">{body}</p>
          <ConciergeTrigger href="/ai-planner" className="editorial-link mt-8 text-[var(--adora-ivory)]">
            Travel Atelier
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </ConciergeTrigger>
          <p className="mt-4 text-[0.66rem] leading-5 tracking-[0.08em] text-white/50 uppercase">Kịch bản dựng sẵn · chưa kết nối mô hình AI</p>
        </div>
      </Reveal>
    </section>
  );
}
