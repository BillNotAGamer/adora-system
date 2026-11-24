import type { Metadata } from "next";

import { AtelierRouteWorkspace } from "@/components/planner/atelier-route-workspace";
import { PlannerWorkspace, type TripPreview } from "@/components/planner/planner-workspace";
import { IS_ATELIER_MODE } from "@/lib/concierge-atelier/mode";
import { PLANNER_SCENARIOS, TRIPS, getDestinationBySlug } from "@/lib/demo";

export const metadata: Metadata = {
  title: IS_ATELIER_MODE ? "Personal Journey Atelier" : "AI Planner (demo)",
  description: IS_ATELIER_MODE
    ? "Không gian thiết kế hành trình cá nhân hoá của ADORA với kịch bản minh hoạ cho Đà Lạt và ước tính chi phí VND minh bạch."
    : "Bản demo AI Planner của ADORA với kịch bản lập kế hoạch dựng sẵn cho Đà Lạt. Chưa kết nối mô hình AI; không có phản hồi nào được tạo động.",
};

function buildPreviews(): Record<string, TripPreview> {
  const previews: Record<string, TripPreview> = {};
  for (const trip of TRIPS) {
    previews[trip.slug] = {
      slug: trip.slug,
      title: trip.title,
      destinationName: getDestinationBySlug(trip.destinationSlug)?.name ?? "",
      durationDays: trip.durationDays,
      statusLabel: trip.statusLabel,
      cover: trip.cover,
      days: trip.days.map((day) => ({ day: day.day, title: day.title, summary: day.summary })),
    };
  }
  return previews;
}

export default function AiPlannerPage() {
  if (IS_ATELIER_MODE) {
    return <AtelierRouteWorkspace />;
  }

  return (
    <main id="main-content">
      <PlannerWorkspace scenarios={[...PLANNER_SCENARIOS]} previews={buildPreviews()} />
    </main>
  );
}
