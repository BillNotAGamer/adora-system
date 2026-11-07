import { Reveal } from "@/components/ui/reveal";

const steps = [
  {
    number: "01",
    title: "Chia sẻ điều bạn mong muốn",
    description: "Điểm đến, thời gian, nhịp đi và những điều khiến chuyến đi có ý nghĩa với riêng bạn.",
  },
  {
    number: "02",
    title: "ADORA kết nối những mảnh ghép",
    description: "Cảm hứng biên tập và dữ liệu danh mục được sắp xếp thành một cấu trúc dễ hiểu.",
  },
  {
    number: "03",
    title: "Tinh chỉnh theo cách của bạn",
    description: "Giữ quyền quyết định cuối cùng và điều chỉnh hành trình trước khi các tính năng đặt chỗ được phát triển.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="adora-section bg-[var(--adora-paper)]">
      <div className="adora-container">
        <Reveal delayMs={0} className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="adora-eyebrow text-[var(--adora-sage)]">Cách ADORA hoạt động</p>
            <h2 className="font-editorial mt-7 max-w-[12ch] text-[clamp(3rem,5.7vw,5.8rem)] leading-[0.96] tracking-[-0.045em]">
              Từ một ý tưởng đến một hành trình có nhịp điệu.
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-7 text-[var(--adora-text-secondary)] sm:text-base sm:leading-8 lg:ml-auto">
            Thiết kế đơn giản ở bề mặt, nhưng đủ nền tảng để những giai đoạn tiếp theo kết nối danh mục, lập kế hoạch và đặt chỗ một cách có trách nhiệm.
          </p>
        </Reveal>

        <ol className="mt-14 grid border-t border-[var(--adora-hairline)] md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.number}
              className="border-b border-[var(--adora-hairline)] py-8 md:border-r md:border-b-0 md:px-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
            >
              <Reveal variant="card" delayMs={index * 90} stackOnMobile>
                <span className="font-editorial text-3xl text-[var(--adora-gold)]">{step.number}</span>
                <h3 className="mt-12 max-w-[18rem] text-lg font-semibold leading-7">{step.title}</h3>
                <p className="mt-4 max-w-sm text-sm leading-7 text-[var(--adora-text-secondary)]">{step.description}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
