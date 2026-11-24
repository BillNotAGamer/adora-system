import type { Metadata } from "next";

import { AtelierRouteWorkspace } from "@/components/planner/atelier-route-workspace";

export const metadata: Metadata = {
  title: "Personal Journey Atelier",
  description:
    "Không gian thiết kế hành trình cá nhân hoá của ADORA với kịch bản minh hoạ cho Đà Lạt và ước tính chi phí VND minh bạch.",
};

export default function AiPlannerPage() {
  return <AtelierRouteWorkspace />;
}
