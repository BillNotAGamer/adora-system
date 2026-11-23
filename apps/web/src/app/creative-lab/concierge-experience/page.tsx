import type { Metadata } from "next";

import { ConciergeAtelierExperience } from "@/components/creative-lab/concierge-atelier/concierge-atelier-experience";

export const metadata: Metadata = {
  title: "CXP-04A: The Personal Journey Atelier",
  description:
    "Nguyên mẫu tương tác ADORA Personal Journey Atelier — đối thoại thiết kế hành trình, kiểm chứng hiểu biết, lịch trình Đà Lạt và cấu trúc chi phí minh hoạ.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ConciergeExperiencePage() {
  return <ConciergeAtelierExperience />;
}
