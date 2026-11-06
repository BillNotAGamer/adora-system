import { normalizeText } from "./text.ts";
import type { PlannerScenario } from "./types.ts";

/**
 * Scripted AI Planner demonstrations. These are local, deterministic text: nothing here is produced
 * by a model, and no network request is ever made to generate them.
 */
export const PLANNER_SCENARIOS: readonly PlannerScenario[] = [
  {
    id: "dalat-3-days",
    prompt: "Lên kế hoạch chuyến đi 3 ngày tới Đà Lạt.",
    aliases: ["Plan a 3-day trip to Da Lat.", "Lên kế hoạch 3 ngày ở Đà Lạt"],
    tripSlug: "da-lat-3-ngay",
    introduction:
      "Đây là một phản hồi dựng sẵn để minh hoạ cách ADORA trình bày kế hoạch. Với ba ngày ở Đà Lạt và nhịp đi chậm, bản mẫu dưới đây cân bằng thiên nhiên, cà phê và các khoảng nghỉ.",
    closing:
      "Bạn có thể mở lịch trình mẫu đầy đủ để xem từng ngày. Đây không phải kết quả do AI tạo ra và chưa có đặt chỗ hay giá thực tế nào đi kèm.",
    steps: ["Xác định thời lượng: 3 ngày", "Chọn nhịp: chậm, nhiều thiên nhiên", "Sắp xếp theo buổi trong ngày"],
  },
  {
    id: "dalat-slow-weekend",
    prompt: "Gợi ý cuối tuần 2 ngày ở Đà Lạt với cà phê và thiên nhiên.",
    aliases: ["Suggest a calm 2-day weekend in Da Lat."],
    tripSlug: "da-lat-cuoi-tuan-2-ngay",
    introduction:
      "Đây là một phản hồi dựng sẵn khác. Với hai ngày, bản nháp giữ lại những khoảnh khắc nổi bật nhất: rừng thông, cà phê, nhà kính hoa và một điểm ngắm đồi.",
    closing:
      "Mở bản nháp để xem chi tiết. Đây là nội dung viết sẵn, không phải kết quả AI, và chưa có đặt chỗ hay giá thực tế.",
    steps: ["Xác định thời lượng: 2 ngày", "Giữ lại những khoảnh khắc chính", "Bỏ bớt điểm dừng không cần thiết"],
  },
];

/**
 * Returns the scripted scenario that exactly matches the input, or `undefined`. There is
 * deliberately no fuzzy or keyword matching: unsupported text must never look "understood".
 */
export function matchScenario(text: string): PlannerScenario | undefined {
  const needle = normalizeText(text);
  if (!needle) return undefined;
  return PLANNER_SCENARIOS.find((scenario) =>
    [scenario.prompt, ...scenario.aliases].some((candidate) => normalizeText(candidate) === needle),
  );
}

export function getScenarioById(id: string): PlannerScenario | undefined {
  return PLANNER_SCENARIOS.find((scenario) => scenario.id === id);
}

export const UNSUPPORTED_PROMPT_REPLY =
  "ADORA đang ở chế độ demo và chưa kết nối mô hình AI, nên không thể xử lý yêu cầu này. Hãy chọn một trong các gợi ý dựng sẵn bên dưới để xem một kịch bản minh hoạ.";
