import type { Metadata } from "next";

import { PlannerWorkspace, type TripPreview } from "@/components/planner/planner-workspace";
import { PLANNER_SCENARIOS, TRIPS, getDestinationBySlug } from "@/lib/demo";

export const metadata: Metadata = {
  title: "AI Planner (demo)",
  description:
    "Bản demo AI Planner của ADORA với kịch bản lập kế hoạch dựng sẵn cho Đà Lạt. Chưa kết nối mô hình AI; không có phản hồi nào được tạo động.",
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
  return (
    <main id="main-content">
      <PlannerWorkspace scenarios={[...PLANNER_SCENARIOS]} previews={buildPreviews()} />
    </main>
  );
}
