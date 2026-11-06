import type { Metadata } from "next";

import { ExperienceBrowser } from "@/components/discovery/experience-browser";
import { PlannerCta } from "@/components/discovery/planner-cta";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DemoBadge } from "@/components/ui/demo-badge";
import { PageIntro } from "@/components/ui/page-intro";
import { EXPERIENCES } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Trải nghiệm",
  description:
    "Những gợi ý trải nghiệm tại Đà Lạt do ADORA biên tập: thiên nhiên, cà phê, văn hoá và thư giãn. Nội dung demo, không phải ưu đãi thương mại.",
};

export default function ExperiencesPage() {
  return (
    <>
      <SiteHeader tone="solid" current="experiences" />
      <main id="main-content" className="overflow-x-clip">
        <PageIntro
          eyebrow="Trải nghiệm"
          title={
            <>
              Mỗi khoảnh khắc là một <em className="font-normal text-[var(--adora-sage)]">câu chuyện nhỏ.</em>
            </>
          }
          aside={<DemoBadge provenance="editorial" />}
        >
          <p>
            Những ý tưởng trải nghiệm tại Đà Lạt, được viết như gợi ý biên tập. Đây không phải ưu đãi thương mại: không có giá, giờ mở cửa hay tồn kho.
          </p>
        </PageIntro>

        <section aria-labelledby="collection-heading" className="pb-[var(--adora-section-space)]">
          <div className="adora-container">
            <h2 id="collection-heading" className="sr-only">
              Bộ sưu tập trải nghiệm
            </h2>
            <ExperienceBrowser experiences={[...EXPERIENCES]} />
          </div>
        </section>

        <PlannerCta
          heading="Ghép các khoảnh khắc thành một hành trình."
          body="Xem một kịch bản AI Planner dựng sẵn biến những trải nghiệm này thành lịch trình theo ngày. Đây là bản minh hoạ, chưa dùng AI thật."
        />
      </main>
      <SiteFooter showCta={false} />
    </>
  );
}
