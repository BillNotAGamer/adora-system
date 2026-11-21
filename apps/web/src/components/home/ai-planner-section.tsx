import { ConciergeTrigger } from "@/components/concierge/concierge-trigger";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";

export function AiPlannerSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--adora-ink)] py-[clamp(5.5rem,10vw,10rem)] text-[var(--adora-ivory)]">
      <div className="absolute top-0 right-0 h-full w-1/2 bg-[radial-gradient(circle_at_80%_20%,rgba(179,154,112,.18),transparent_58%)]" aria-hidden="true" />
      <div className="adora-container relative grid items-center gap-14 lg:grid-cols-[minmax(0,.9fr)_minmax(22rem,1.1fr)] lg:gap-[clamp(5rem,10vw,10rem)]">
        <Reveal delayMs={0}>
          <p className="adora-eyebrow text-[var(--adora-gold)]">Adora Intelligence</p>
          <h2 className="font-editorial mt-7 max-w-[11ch] text-[clamp(3.1rem,6.2vw,6.4rem)] leading-[0.94] tracking-[-0.05em]">
            Ý tưởng của bạn. <em className="text-[var(--adora-gold)]">Một hành trình rõ ràng.</em>
          </h2>
          <p className="mt-7 max-w-xl text-sm leading-7 text-white/65 sm:text-base sm:leading-8">
            Không gian lập kế hoạch của ADORA đang được xây dựng để biến sở thích, thời gian và nhịp đi của bạn thành một bản phác thảo hành trình mạch lạc.
          </p>
          <ConciergeTrigger href="/ai-planner" className="editorial-link mt-9 text-[var(--adora-ivory)]">
            Plan with Adora AI
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </ConciergeTrigger>
          <p className="mt-5 text-[0.67rem] leading-5 tracking-[0.08em] text-white/42 uppercase">
            Bản xem trước giao diện · chưa kết nối mô hình AI
          </p>
        </Reveal>

        <Reveal
          delayMs={100}
          stackOnMobile
          className="relative mx-auto w-full max-w-2xl border border-white/15 bg-white/[0.055] p-3 shadow-2xl shadow-black/20 sm:p-5"
        >
          <div className="border border-white/12 bg-[#202523] p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-[var(--adora-gold)] text-[var(--adora-ink)]">
                  <Sparkles className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold tracking-[0.12em] uppercase">Adora AI</p>
                  <p className="mt-1 text-[0.66rem] text-white/42">Planning preview</p>
                </div>
              </div>
              <span className="size-2 rounded-full bg-[var(--adora-gold)]" aria-hidden="true" />
            </div>

            <div className="space-y-4 py-7 text-sm leading-6">
              <div
                data-sample-bubble="1"
                className="ml-auto max-w-[85%] bg-[var(--adora-ivory)] px-4 py-3 text-[var(--adora-ink)]"
              >
                Tôi muốn ba ngày ở Đà Lạt—chậm, nhiều thiên nhiên và có thời gian cho cà phê.
              </div>
              <div
                data-sample-bubble="2"
                className="max-w-[88%] border border-white/12 bg-white/[0.04] px-4 py-3 text-white/72"
              >
                Tôi sẽ giúp bạn định hình một nhịp đi cân bằng giữa rừng thông, trải nghiệm địa phương và những khoảng nghỉ vừa đủ.
              </div>
            </div>

            <div className="flex min-h-13 items-center justify-between border border-white/14 px-4 text-xs text-white/35">
              <span>Mô tả chuyến đi bạn mong muốn…</span>
              <span className="text-[var(--adora-gold)]">↗</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
