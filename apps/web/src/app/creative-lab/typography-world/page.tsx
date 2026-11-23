import type { Metadata } from "next";

import { TypographyWorldExperience } from "@/components/creative-lab/typography-world/typography-world-experience";

export const metadata: Metadata = {
  title: "CXP-01: Typography Becomes Landscape",
  description:
    "Nguyên mẫu trải nghiệm điện ảnh ADORA CXP-01 — chuyển hóa chữ ADORA thành không gian cảnh quan và khoảnh khắc du hành.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TypographyWorldPage() {
  return <TypographyWorldExperience />;
}
