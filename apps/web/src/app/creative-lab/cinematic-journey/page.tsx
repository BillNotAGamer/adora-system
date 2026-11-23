import type { Metadata } from "next";

import { CinematicJourneyExperience } from "@/components/creative-lab/cinematic-journey/cinematic-journey-experience";

export const metadata: Metadata = {
  title: "CXP-02: The Full Cinematic Narrative",
  description:
    "Nguyên mẫu hành trình điện ảnh trọn vẹn ADORA CXP-02 — từ thương hiệu, cảnh quan, khoảnh khắc tĩnh lặng đến khám phá Đà Lạt và ADORA Travel Concierge.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CinematicJourneyPage() {
  return <CinematicJourneyExperience />;
}
