import { Reveal } from "@/components/ui/reveal";

export function BrandPhilosophy() {
  return (
    <section id="philosophy" className="adora-section bg-[var(--adora-paper)]">
      <div className="adora-container grid gap-12 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)] lg:gap-24">
        <Reveal delayMs={0}>
          <p className="adora-eyebrow text-[var(--adora-sage)]">Triết lý ADORA</p>
          <p className="mt-8 max-w-xs text-sm leading-7 text-[var(--adora-text-secondary)]">
            Công nghệ nên lùi lại vừa đủ để cảm xúc, con người và bản sắc địa phương bước lên phía trước.
          </p>
        </Reveal>
        <div>
          <Reveal delayMs={80}>
            <h2 className="font-editorial max-w-[15ch] text-[clamp(2.9rem,6vw,6.25rem)] leading-[0.98] tracking-[-0.045em]">
              Không chỉ là nơi bạn đến. <em className="text-[var(--adora-sage)]">Là cách bạn cảm nhận.</em>
            </h2>
          </Reveal>
          <Reveal delayMs={160} className="mt-12 grid gap-8 border-t border-[var(--adora-hairline)] pt-8 sm:grid-cols-2">
            <p className="text-sm leading-7 text-[var(--adora-text-secondary)] sm:text-base sm:leading-8">
              ADORA bắt đầu từ một câu hỏi đơn giản: nếu một hành trình được xây dựng quanh điều bạn thật sự quan tâm, nó sẽ khác đi như thế nào?
            </p>
            <p className="text-sm leading-7 text-[var(--adora-text-secondary)] sm:text-base sm:leading-8">
              Câu trả lời là trải nghiệm khám phá có chiều sâu hơn—thông tin đủ rõ, lựa chọn đủ tinh và kế hoạch đủ linh hoạt để bạn vẫn được tự do.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
