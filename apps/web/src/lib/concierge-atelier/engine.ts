import { PERIOD_LABELS, TRIPS } from "../demo/trips.ts";
import { normalizeText } from "../demo/text.ts";
import type {
  AtelierActivity,
  AtelierCostBreakdown,
  AtelierDay,
  AtelierJourney,
  AtelierState,
  CostLineItem,
  PreferenceFact,
  PreferenceKey,
  RefinementKind,
} from "./types.ts";

export interface DiscoveryQuestion {
  key: PreferenceKey;
  eyebrow: string;
  title: string;
  hint: string;
  multi?: boolean;
  optional?: boolean;
  choices: { id: string; label: string; detail?: string }[];
}

export const ATELIER_QUESTIONS: readonly DiscoveryQuestion[] = [
  {
    key: "intention",
    eyebrow: "01 · Cảm hứng khởi đầu",
    title: "Chuyến đi này bạn muốn giữ lại cảm giác nào nhất?",
    hint: "Chọn tối đa 2 cảm hứng — câu hỏi tiếp theo sẽ tự thích ứng theo lựa chọn của bạn.",
    multi: true,
    choices: [
      { id: "calm-nature", label: "Bình yên & thiên nhiên", detail: "Rừng thông, sương sớm, khoảng lặng" },
      { id: "romantic-escape", label: "Lãng mạn hai người", detail: "Nhịp chậm, hoàng hôn, không gian riêng" },
      { id: "coffee-culture", label: "Cà phê & văn hoá bản địa", detail: "Pha thủ công, nhà kính hoa, phố đêm" },
      { id: "friends-explore", label: "Nhóm bạn khám phá", detail: "Chia sẻ món ngon, đi bộ nhẹ, trò chuyện" },
    ],
  },
  {
    key: "companions",
    eyebrow: "02 · Người đồng hành",
    title: "Bạn dự định đi cùng ai?",
    hint: "Giúp ước tính chi phí theo đầu người và nhịp di chuyển phù hợp. Không yêu cầu tuổi hay giới tính.",
    choices: [
      { id: "solo", label: "Một mình", detail: "1 người · linh hoạt tối đa" },
      { id: "couple", label: "Hai người", detail: "2 người · ưu tiên không gian ấm cúng" },
      { id: "small-group", label: "Nhóm bạn nhỏ (4 người)", detail: "4 người · tối ưu chi phí chia sẻ" },
      { id: "family", label: "Gia đình nhỏ (3 người)", detail: "3 người · nhịp êm, ít đi bộ dốc" },
    ],
  },
  {
    key: "destination",
    eyebrow: "03 · Miền đất",
    title: "Bạn đã nghĩ đến miền đất nào chưa?",
    hint: "Bản mẫu tương tác hiện hỗ trợ kịch bản chi tiết cho Đà Lạt; điểm đến khác sẽ được giữ làm ghi chú.",
    choices: [
      { id: "da-lat", label: "Đà Lạt — Cao nguyên sương sớm", detail: "Sẵn sàng phác thảo chi tiết" },
      { id: "suggest-highland", label: "Gợi ý cho tôi một vùng cao nguyên yên tĩnh", detail: "Đề xuất Đà Lạt trong bản mẫu" },
      { id: "other-note", label: "Nơi khác (giữ vào ghi chú)", detail: "Chưa có lịch trình dựng sẵn" },
    ],
  },
  {
    key: "duration",
    eyebrow: "04 · Thời lượng & nhịp đi",
    title: "Bạn có bao nhiêu thời gian cho hành trình này?",
    hint: "Chọn khung thời gian gần nhất để Atelier sắp xếp mật độ trải nghiệm hợp lý.",
    choices: [
      { id: "2", label: "2 ngày cuối tuần", detail: "Gọn, giữ lại những khoảnh khắc tinh túy nhất" },
      { id: "3", label: "3 ngày đi chậm", detail: "Đủ sâu để không phải vội giữa các buổi" },
    ],
  },
  {
    key: "budget",
    eyebrow: "05 · Khung ngân sách minh hoạ",
    title: "Bạn mong muốn mức chi tiêu khoảng nào?",
    hint: "Chỉ dùng để xây dựng cấu trúc chi phí minh hoạ bằng VND — không phải báo giá trực tiếp.",
    choices: [
      { id: "lean", label: "Tinh gọn · ~3–4 triệu / chuyến", detail: "Homestay ấm, ẩm thực địa phương" },
      { id: "balanced", label: "Cân bằng · ~5–7 triệu / chuyến", detail: "Boutique stay yên tĩnh, trải nghiệm chọn lọc" },
      { id: "curated", label: "Tuyển chọn · ~9–12 triệu / chuyến", detail: "Không gian riêng tư cao, xe riêng nội vùng" },
    ],
  },
  {
    key: "accessibility",
    eyebrow: "06 · Lưu ý thoải mái (Tuỳ chọn)",
    title: "Có lưu ý nào về di chuyển hoặc nhịp nghỉ không?",
    hint: "Hoàn toàn tuỳ chọn — bạn có thể bỏ qua. Không cần chia sẻ thông tin y tế cá nhân.",
    optional: true,
    choices: [
      { id: "no-extra", label: "Không cần lưu ý thêm" },
      { id: "gentle-walk", label: "Ưu tiên đường bằng, hạn chế leo dốc" },
      { id: "late-morning", label: "Bắt đầu ngày thong thả sau 8:30" },
    ],
  },
];

export const REFINEMENT_OPTIONS: readonly {
  id: RefinementKind;
  label: string;
  prompt: string;
}[] = [
  {
    id: "slower-pace",
    label: "Làm nhịp đi chậm hơn",
    prompt: "Làm lịch trình thư thả hơn, giảm bớt điểm dừng.",
  },
  {
    id: "lower-budget",
    label: "Giảm ngân sách ước tính",
    prompt: "Tối ưu ngân sách ước tính xuống mức tinh gọn hơn.",
  },
  {
    id: "toggle-duration",
    label: "Đổi thời lượng (2 ↔ 3 ngày)",
    prompt: "Điều chỉnh thời lượng hành trình giữa 2 ngày và 3 ngày.",
  },
  {
    id: "coffee-culture",
    label: "Ưu tiên cà phê & văn hoá",
    prompt: "Ưu tiên trải nghiệm cà phê thủ công và văn hoá bản địa.",
  },
  {
    id: "group-four",
    label: "Chỉnh cho nhóm 4 người",
    prompt: "Điều chỉnh kế hoạch và chi phí chia sẻ cho nhóm 4 người.",
  },
];

const DAY_IMAGES = [
  { src: "/images/home/highland-coffee-ritual.webp", alt: "Nghi thức cà phê thủ công bên rừng thông cao nguyên" },
  { src: "/images/discover/dalat-flower-greenhouse.webp", alt: "Những luống hoa dưới mái nhà kính ở Đà Lạt" },
  { src: "/images/home/dalat-pine-trail.webp", alt: "Lối mòn xuyên rừng thông nhìn về mặt hồ phủ sương" },
];

export const initialAtelierState: AtelierState = {
  phase: "invitation",
  stepIndex: 0,
  editingKey: null,
  answers: {
    intention: [],
    companions: null,
    destination: null,
    duration: null,
    budget: null,
    accessibility: null,
  },
  confirmedInferences: {},
  messages: [
    {
      id: 1,
      role: "assistant",
      eyebrow: "ADORA Atelier · Bản mẫu kịch bản",
      text: "Chào bạn. Đây là không gian phác thảo hành trình cá nhân hoá của ADORA. Chúng ta sẽ trò chuyện từng bước ngắn gọn — bạn luôn có thể bỏ qua, chỉnh sửa, hoặc ghi chú tự do theo cách của mình.",
      provenance: "scripted-atelier",
    },
  ],
  freeNotes: [],
  draft: "",
  error: "",
  nextId: 2,
  activeDay: 1,
  mobileView: "conversation",
  refinements: {
    slowerPace: false,
    lowerBudget: false,
    coffeeCulture: false,
    groupFour: false,
  },
};

export type AtelierAction =
  | { type: "start"; presetIntention?: string }
  | { type: "select_choice"; key: PreferenceKey; value: string }
  | { type: "next_step" }
  | { type: "skip_step" }
  | { type: "go_interpretation" }
  | { type: "edit_preference"; key: PreferenceKey }
  | { type: "confirm_inference"; key: PreferenceKey }
  | { type: "reveal_journey" }
  | { type: "apply_refinement"; kind: RefinementKind }
  | { type: "set_day"; day: number }
  | { type: "set_mobile_view"; view: "conversation" | "canvas" }
  | { type: "draft"; value: string }
  | { type: "submit_text"; text: string }
  | { type: "reset" };

export function getTravelerCount(state: AtelierState): number {
  if (state.refinements.groupFour) return 4;
  const comp = state.answers.companions;
  if (comp === "solo") return 1;
  if (comp === "couple") return 2;
  if (comp === "small-group") return 4;
  if (comp === "family") return 3;
  // Deterministic contextual inference when romantic or friends mood was chosen
  if (state.answers.intention.includes("romantic-escape")) return 2;
  if (state.answers.intention.includes("friends-explore")) return 4;
  return 2;
}

function getChoiceLabel(questionIndex: number, choiceId: string): string | null {
  return (
    ATELIER_QUESTIONS[questionIndex]?.choices.find((c) => c.id === choiceId)?.label ?? null
  );
}

export function deriveInterpretation(state: AtelierState): PreferenceFact[] {
  const { answers, confirmedInferences, refinements } = state;

  const intentionLabels = answers.intention
    .map((id) => getChoiceLabel(0, id))
    .filter((v): v is string => Boolean(v));

  let companionValue: string | null = null;
  let companionProv: PreferenceFact["provenance"] = "missing";
  let companionNote: string | undefined;
  if (refinements.groupFour) {
    companionValue = "Nhóm bạn nhỏ (4 người)";
    companionProv = "confirmed";
  } else if (answers.companions) {
    companionValue = getChoiceLabel(1, answers.companions);
    companionProv = "confirmed";
  } else if (answers.intention.includes("romantic-escape")) {
    companionValue = "Hai người (2 khách)";
    companionProv = confirmedInferences.companions ? "confirmed" : "inferred";
    companionNote = "Suy luận từ cảm hứng “Lãng mạn hai người”";
  } else if (answers.intention.includes("friends-explore")) {
    companionValue = "Nhóm bạn nhỏ (4 khách)";
    companionProv = confirmedInferences.companions ? "confirmed" : "inferred";
    companionNote = "Suy luận từ cảm hứng “Nhóm bạn khám phá”";
  }

  let destValue: string | null = null;
  let destProv: PreferenceFact["provenance"] = "missing";
  let destNote: string | undefined;
  if (answers.destination === "da-lat") {
    destValue = "Đà Lạt — Cao nguyên sương sớm";
    destProv = "confirmed";
  } else if (answers.destination === "suggest-highland") {
    destValue = "Đà Lạt (đề xuất cao nguyên yên tĩnh)";
    destProv = confirmedInferences.destination ? "confirmed" : "inferred";
    destNote = "Đề xuất dựa trên mong muốn mở về vùng cao nguyên";
  } else if (answers.destination === "other-note") {
    destValue = "Điểm đến khác (giữ làm ghi chú — bản mẫu dùng Đà Lạt)";
    destProv = "confirmed";
  } else {
    destValue = "Đà Lạt (mặc định của bản mẫu)";
    destProv = confirmedInferences.destination ? "confirmed" : "inferred";
    destNote = "Chưa chọn rõ điểm đến; bản mẫu minh hoạ cho Đà Lạt";
  }

  const durationValue =
    answers.duration === "2"
      ? "2 ngày cuối tuần"
      : answers.duration === "3"
        ? "3 ngày đi chậm"
        : "3 ngày đi chậm (giả định)";
  const durationProv: PreferenceFact["provenance"] = answers.duration
    ? "confirmed"
    : confirmedInferences.duration
      ? "confirmed"
      : "inferred";

  const effectiveBudget = refinements.lowerBudget ? "lean" : answers.budget;
  const budgetLabel = effectiveBudget ? getChoiceLabel(4, effectiveBudget) : null;

  const accessLabel = answers.accessibility
    ? getChoiceLabel(5, answers.accessibility)
    : null;

  return [
    {
      key: "intention",
      label: "Cảm hứng & nhịp đi",
      value: intentionLabels.length > 0 ? intentionLabels.join(" · ") : null,
      provenance: intentionLabels.length > 0 ? "confirmed" : "missing",
    },
    {
      key: "companions",
      label: "Người đồng hành",
      value: companionValue,
      provenance: companionProv,
      rationale: companionNote,
    },
    {
      key: "destination",
      label: "Điểm đến",
      value: destValue,
      provenance: destProv,
      rationale: destNote,
    },
    {
      key: "duration",
      label: "Thời lượng",
      value: durationValue,
      provenance: durationProv,
      rationale: answers.duration ? undefined : "Giả định nhịp 3 ngày để đủ khoảng thở",
    },
    {
      key: "budget",
      label: "Khung ngân sách",
      value: budgetLabel,
      provenance: effectiveBudget ? "confirmed" : "missing",
      rationale: effectiveBudget ? undefined : "Chưa chọn — dùng mức Cân bằng làm giả định minh hoạ",
    },
    {
      key: "accessibility",
      label: "Lưu ý di chuyển (Tuỳ chọn)",
      value: accessLabel,
      provenance: accessLabel ? "confirmed" : "missing",
    },
  ];
}

/**
 * Pure, mathematically consistent VND cost estimator.
 * Guarantees totalVnd === sum(items.amountVnd) and perPersonVnd === Math.round(totalVnd / travelerCount).
 */
export function computeJourneyCost(
  durationDays: number,
  budgetTier: "lean" | "balanced" | "curated",
  travelerCount: number,
  slowerPace: boolean,
): AtelierCostBreakdown {
  const nights = Math.max(1, durationDays - 1);
  const rooms = Math.ceil(travelerCount / 2);

  const nightlyRate =
    budgetTier === "lean" ? 750_000 : budgetTier === "curated" ? 2_400_000 : 1_350_000;
  const transportPerDay =
    budgetTier === "lean" ? 220_000 : budgetTier === "curated" ? 750_000 : 380_000;
  const activityPerPersonPerDay = slowerPace
    ? budgetTier === "lean"
      ? 120_000
      : 180_000
    : budgetTier === "lean"
      ? 180_000
      : budgetTier === "curated"
        ? 360_000
        : 240_000;
  const foodPerPersonPerDay =
    budgetTier === "lean" ? 280_000 : budgetTier === "curated" ? 650_000 : 420_000;

  const accommodation = nights * rooms * nightlyRate;
  const transport = durationDays * transportPerDay;
  const activities = durationDays * travelerCount * activityPerPersonPerDay;
  const food = durationDays * travelerCount * foodPerPersonPerDay;
  const buffer = Math.round((accommodation + transport + activities + food) * 0.08 / 10_000) * 10_000;

  const items: CostLineItem[] = [
    {
      category: "accommodation",
      label: `Lưu trú (${nights} đêm · ${rooms} phòng)`,
      amountVnd: accommodation,
      assumption:
        budgetTier === "lean"
          ? "Homestay/nhà gỗ yên tĩnh khu ven trung tâm"
          : budgetTier === "curated"
            ? "Boutique villa / resort rừng thông tuyển chọn"
            : "Boutique stay ấm cúng, yên tĩnh",
    },
    {
      category: "transport",
      label: `Di chuyển nội vùng (${durationDays} ngày)`,
      amountVnd: transport,
      assumption:
        budgetTier === "curated"
          ? "Xe riêng có tài xế theo lịch trình"
          : "Taxi nội vùng / thuê xe chủ động",
    },
    {
      category: "activities",
      label: "Trải nghiệm & phí tham quan",
      amountVnd: activities,
      assumption: slowerPace
        ? "Nhịp chậm (2–3 điểm dừng chọn lọc mỗi ngày)"
        : "Đi bộ rừng thông, nhà kính hoa & trải nghiệm địa phương",
    },
    {
      category: "food",
      label: "Ẩm thực & cà phê cao nguyên",
      amountVnd: food,
      assumption: "Cà phê pha chậm, bữa trưa nhẹ & bữa tối ấm",
    },
    {
      category: "buffer",
      label: "Khoản dự phòng (~8%)",
      amountVnd: buffer,
      assumption: "Dự phòng thời tiết, đồ ấm hoặc điểm dừng phát sinh",
    },
  ];

  const totalVnd = items.reduce((sum, item) => sum + item.amountVnd, 0);
  const perPersonVnd = Math.round(totalVnd / Math.max(1, travelerCount));

  return {
    currency: "VND",
    provenance: "illustrative-estimate",
    travelerCount,
    items,
    totalVnd,
    perPersonVnd,
    uncertaintyRange: "±15–20% tuỳ mùa cao điểm, cuối tuần và hạng lưu trú thực tế",
    exclusions: [
      "Vé máy bay hoặc xe giường nằm liên tỉnh đến Đà Lạt",
      "Bảo hiểm du lịch và mua sắm quà lưu niệm cá nhân",
      "Chưa gồm đặt chỗ, thuế phụ thu lễ Tết hay báo giá từ đối tác",
    ],
  };
}

export function buildAtelierJourney(state: AtelierState): AtelierJourney {
  const durationDays = state.answers.duration === "2" ? 2 : 3;
  const baseTrip = TRIPS.find((t) => t.durationDays === durationDays) ?? TRIPS[0];
  if (!baseTrip) {
    throw new Error("Expected at least one demo trip fixture in TRIPS.");
  }
  const travelerCount = getTravelerCount(state);
  const budgetTier: "lean" | "balanced" | "curated" = state.refinements.lowerBudget
    ? "lean"
    : state.answers.budget ?? "balanced";

  const timeWindows: Record<string, string> = {
    Sáng: state.answers.accessibility === "late-morning" ? "08:45 – 11:15" : "06:30 – 09:30",
    Trưa: "11:45 – 14:00",
    Chiều: "15:00 – 17:30",
    Tối: "18:30 – 20:45",
  };

  const days: AtelierDay[] = baseTrip.days.map((d, idx) => {
    let activities: AtelierActivity[] = d.activities.map((a) => {
      const periodLabel = PERIOD_LABELS[a.period];
      return {
        id: a.id,
        periodLabel,
        timeWindow: timeWindows[periodLabel] ?? "Linh hoạt",
        title: a.title,
        summary: a.summary,
        locationNote: a.locationNote,
        experienceSlug: a.experienceSlug,
      };
    });

    if (state.refinements.slowerPace && activities.length > 3) {
      activities = activities.slice(0, 3);
    }

    if (state.refinements.coffeeCulture && idx === 1) {
      activities = activities.map((act) =>
        act.experienceSlug === "rung-thong-binh-minh"
          ? {
              ...act,
              title: "Xưởng rang & cà phê thủ công buổi sớm",
              summary: "Thử hạt Arabica Cầu Đất pha nhỏ giọt và trò chuyện cùng người rang bản địa.",
              locationNote: "Xưởng rang nhỏ vùng đồi thông",
              experienceSlug: "ca-phe-nho-giot-cao-nguyen",
            }
          : act,
      );
    }

    const mood = DAY_IMAGES[idx % DAY_IMAGES.length] ?? {
      src: baseTrip.cover.src,
      alt: baseTrip.cover.alt,
    };
    return {
      day: d.day,
      title: d.title,
      summary: state.refinements.slowerPace
        ? `${d.summary} (Đã giãn nhịp, chừa thêm khoảng nghỉ giữa ngày.)`
        : d.summary,
      moodImageSrc: mood.src,
      moodImageAlt: mood.alt,
      activities,
    };
  });

  const cost = computeJourneyCost(
    durationDays,
    budgetTier,
    travelerCount,
    state.refinements.slowerPace,
  );

  const appliedRefinements: string[] = [];
  if (state.refinements.slowerPace) appliedRefinements.push("Giãn nhịp đi chậm hơn");
  if (state.refinements.lowerBudget) appliedRefinements.push("Tối ưu ngân sách tinh gọn");
  if (state.refinements.coffeeCulture) appliedRefinements.push("Ưu tiên cà phê & văn hoá bản địa");
  if (state.refinements.groupFour) appliedRefinements.push("Cấu trúc chia sẻ cho nhóm 4 người");

  const paceLabel = state.refinements.slowerPace
    ? "Rất chậm · nhiều khoảng thở"
    : state.refinements.coffeeCulture
      ? "Chậm · đậm cà phê & bản địa"
      : baseTrip.pace;

  return {
    slug: baseTrip.slug,
    title:
      durationDays === 2
        ? "Đà Lạt — Hai ngày giữ trọn khoảng lặng"
        : "Đà Lạt — Ba ngày thở cùng cao nguyên",
    subtitle:
      "Bản phác thảo dựng sẵn từ các lựa chọn của bạn — dùng để hình dung nhịp đi và cấu trúc chi phí trước khi đặt chỗ thực tế.",
    destinationName: "Đà Lạt",
    durationDays,
    paceLabel,
    coverSrc: baseTrip.cover.src,
    coverAlt: baseTrip.cover.alt,
    accommodationAssumption: cost.items[0]?.assumption ?? "Boutique stay yên tĩnh",
    transportAssumption: cost.items[1]?.assumption ?? "Di chuyển nội vùng linh hoạt",
    days,
    cost,
    appliedRefinements,
    notes: [...baseTrip.planNotes],
    provenance: "scripted-demo-fixture",
  };
}

function detectRefinementFromText(text: string): RefinementKind | null {
  const n = normalizeText(text);
  if (n.includes("cham") || n.includes("thu tha") || n.includes("it di") || n.includes("relax")) {
    return "slower-pace";
  }
  if (n.includes("ngan sach") || n.includes("tiet kiem") || n.includes("re hon") || n.includes("budget")) {
    return "lower-budget";
  }
  if (n.includes("2 ngay") || n.includes("3 ngay") || n.includes("them 1 ngay") || n.includes("them ngay")) {
    return "toggle-duration";
  }
  if (n.includes("ca phe") || n.includes("van hoa") || n.includes("coffee")) {
    return "coffee-culture";
  }
  if (n.includes("4 nguoi") || n.includes("nhom")) {
    return "group-four";
  }
  return null;
}

export function atelierReducer(state: AtelierState, action: AtelierAction): AtelierState {
  switch (action.type) {
    case "reset":
      return initialAtelierState;

    case "draft":
      return { ...state, draft: action.value, error: "" };

    case "set_day":
      return { ...state, activeDay: action.day };

    case "set_mobile_view":
      return { ...state, mobileView: action.view };

    case "start": {
      const nextAnswers = action.presetIntention
        ? { ...state.answers, intention: [action.presetIntention] }
        : state.answers;
      const presetLabel = action.presetIntention
        ? getChoiceLabel(0, action.presetIntention)
        : null;
      const messages = presetLabel
        ? [
            ...state.messages,
            {
              id: state.nextId,
              role: "user" as const,
              eyebrow: "Bạn",
              text: `Mình muốn một chuyến đi mang cảm giác: ${presetLabel}.`,
              provenance: "user-input" as const,
            },
            {
              id: state.nextId + 1,
              role: "assistant" as const,
              eyebrow: "ADORA Atelier · Bản mẫu kịch bản",
              text:
                action.presetIntention === "romantic-escape"
                  ? "Một nhịp đi lãng mạn và riêng tư rất hợp với sương sớm Đà Lạt. Mình tạm ghi nhận giả định 2 người — bạn có thể xác nhận hoặc đổi ở bước kế tiếp."
                  : "Rất rõ cảm hứng rồi. Cho mình thêm một vài thông tin ngắn gọn để phác thảo nhịp đi phù hợp nhất cho bạn.",
              provenance: "scripted-atelier" as const,
            },
          ]
        : state.messages;

      return {
        ...state,
        phase: "discovery",
        stepIndex: action.presetIntention ? 1 : 0,
        answers: nextAnswers,
        messages,
        nextId: presetLabel ? state.nextId + 2 : state.nextId,
        error: "",
      };
    }

    case "select_choice": {
      const q = ATELIER_QUESTIONS.find((item) => item.key === action.key);
      if (!q || !q.choices.some((c) => c.id === action.value)) return state;
      if (action.key === "intention") {
        const cur = state.answers.intention;
        const exists = cur.includes(action.value);
        if (!exists && cur.length >= 2) {
          return { ...state, error: "Chọn tối đa 2 cảm hứng chính để giữ hành trình tập trung." };
        }
        const nextIntention = exists
          ? cur.filter((v) => v !== action.value)
          : [...cur, action.value];
        return {
          ...state,
          answers: { ...state.answers, intention: nextIntention },
          error: "",
        };
      }
      if (action.key === "duration") {
        const dur = action.value === "2" ? "2" : "3";
        return {
          ...state,
          answers: { ...state.answers, duration: dur },
          activeDay: 1,
          error: "",
        };
      }
      if (action.key === "budget") {
        const b = action.value as "lean" | "balanced" | "curated";
        return {
          ...state,
          answers: { ...state.answers, budget: b },
          refinements: { ...state.refinements, lowerBudget: b === "lean" },
          error: "",
        };
      }
      return {
        ...state,
        answers: { ...state.answers, [action.key]: action.value },
        error: "",
      };
    }

    case "next_step": {
      const q = ATELIER_QUESTIONS[state.stepIndex];
      const userSummary = (() => {
        if (!q) return null;
        if (q.key === "intention") {
          const labels = state.answers.intention
            .map((id) => q.choices.find((c) => c.id === id)?.label)
            .filter(Boolean);
          return labels.length ? labels.join(" · ") : null;
        }
        const val = state.answers[q.key];
        return val ? q.choices.find((c) => c.id === val)?.label ?? null : null;
      })();

      const appended = userSummary
        ? [
            ...state.messages,
            {
              id: state.nextId,
              role: "user" as const,
              eyebrow: "Bạn",
              text: userSummary,
              provenance: "user-input" as const,
            },
          ]
        : state.messages;

      if (state.editingKey) {
        return {
          ...state,
          phase: "interpretation",
          editingKey: null,
          messages: appended,
          nextId: userSummary ? state.nextId + 1 : state.nextId,
          error: "",
        };
      }

      // Contextual branching: if romantic-escape was selected and user is on step 0,
      // skip straight to destination (step 2) while marking companions as INFERRED (2 people) for review!
      let nextIdx = state.stepIndex + 1;
      if (
        state.stepIndex === 0 &&
        state.answers.intention.includes("romantic-escape") &&
        !state.answers.companions
      ) {
        nextIdx = 2;
      }

      if (nextIdx >= ATELIER_QUESTIONS.length) {
        return {
          ...state,
          phase: "interpretation",
          messages: [
            ...appended,
            {
              id: userSummary ? state.nextId + 1 : state.nextId,
              role: "assistant",
              eyebrow: "ADORA Atelier · Tóm tắt hiểu biết",
              text: "Mình đã tổng hợp lại những gì bạn xác nhận và một vài giả định tạm thời ở bảng bên cạnh. Bạn kiểm tra nhanh và chỉnh sửa bất kỳ điểm nào trước khi mở lịch trình mẫu nhé.",
              provenance: "scripted-atelier",
            },
          ],
          nextId: userSummary ? state.nextId + 2 : state.nextId + 1,
          error: "",
        };
      }

      return {
        ...state,
        stepIndex: nextIdx,
        messages: appended,
        nextId: userSummary ? state.nextId + 1 : state.nextId,
        error: "",
      };
    }

    case "skip_step": {
      if (state.editingKey) {
        return { ...state, phase: "interpretation", editingKey: null, error: "" };
      }
      const nextIdx = state.stepIndex + 1;
      if (nextIdx >= ATELIER_QUESTIONS.length) {
        return { ...state, phase: "interpretation", error: "" };
      }
      return { ...state, stepIndex: nextIdx, error: "" };
    }

    case "go_interpretation":
      return { ...state, phase: "interpretation", editingKey: null, error: "" };

    case "edit_preference": {
      const idx = ATELIER_QUESTIONS.findIndex((q) => q.key === action.key);
      if (idx < 0) return state;
      return {
        ...state,
        phase: "discovery",
        stepIndex: idx,
        editingKey: action.key,
        mobileView: "conversation",
        error: "",
      };
    }

    case "confirm_inference":
      return {
        ...state,
        confirmedInferences: { ...state.confirmedInferences, [action.key]: true },
      };

    case "reveal_journey":
      return {
        ...state,
        phase: "reveal",
        activeDay: 1,
        mobileView: "canvas",
        messages: [
          ...state.messages,
          {
            id: state.nextId,
            role: "assistant",
            eyebrow: "ADORA Atelier · Bản phác thảo",
            text: "Bản phác thảo hành trình Đà Lạt cùng cấu trúc chi phí minh hoạ đã sẵn sàng. Bạn có thể xem từng ngày và tinh chỉnh nhịp đi, ngân sách hoặc thời lượng ngay bên dưới.",
            provenance: "scripted-atelier",
          },
        ],
        nextId: state.nextId + 1,
        error: "",
      };

    case "apply_refinement": {
      const opt = REFINEMENT_OPTIONS.find((r) => r.id === action.kind);
      const nextRef = { ...state.refinements };
      const nextAnswers = { ...state.answers };
      let reply = "";

      if (action.kind === "slower-pace") {
        nextRef.slowerPace = !nextRef.slowerPace;
        reply = nextRef.slowerPace
          ? "Đã giãn nhịp hành trình: giới hạn tối đa 3 khoảnh khắc chọn lọc mỗi ngày và cập nhật lại chi phí trải nghiệm."
          : "Đã khôi phục mật độ trải nghiệm tiêu chuẩn cho hành trình.";
      } else if (action.kind === "lower-budget") {
        nextRef.lowerBudget = !nextRef.lowerBudget;
        reply = nextRef.lowerBudget
          ? "Đã chuyển giả định lưu trú và ẩm thực sang mức Tinh gọn — tổng ước tính minh hoạ đã được tính lại theo từng hạng mục."
          : "Đã trở lại mức ngân sách Cân bằng ban đầu.";
      } else if (action.kind === "toggle-duration") {
        const nextDur = state.answers.duration === "2" ? "3" : "2";
        nextAnswers.duration = nextDur;
        reply = `Đã chuyển lịch trình sang khung ${nextDur} ngày và cập nhật toàn bộ từng ngày cùng bảng chi phí minh hoạ.`;
      } else if (action.kind === "coffee-culture") {
        nextRef.coffeeCulture = !nextRef.coffeeCulture;
        reply = nextRef.coffeeCulture
          ? "Đã ưu tiên trải nghiệm xưởng rang & cà phê thủ công buổi sớm vào Ngày 02."
          : "Đã khôi phục hoạt động đi bộ rừng thông bình minh vào Ngày 02.";
      } else if (action.kind === "group-four") {
        nextRef.groupFour = !nextRef.groupFour;
        reply = nextRef.groupFour
          ? "Đã điều chỉnh cấu trúc phòng và chi phí di chuyển chia sẻ cho nhóm 4 người."
          : "Đã khôi phục số lượng khách theo lựa chọn ban đầu.";
      }

      return {
        ...state,
        phase: "refinement",
        answers: nextAnswers,
        refinements: nextRef,
        activeDay: 1,
        messages: [
          ...state.messages,
          {
            id: state.nextId,
            role: "user",
            eyebrow: "Bạn · Tinh chỉnh",
            text: opt?.prompt ?? action.kind,
            provenance: "user-input",
          },
          {
            id: state.nextId + 1,
            role: "assistant",
            eyebrow: "ADORA Atelier · Đã cập nhật bản mẫu",
            text: reply,
            provenance: "scripted-atelier",
          },
        ],
        nextId: state.nextId + 2,
        error: "",
      };
    }

    case "submit_text": {
      const trimmed = action.text.trim();
      if (!trimmed) return state;
      if (trimmed.length > 1000) {
        return { ...state, error: "Vui lòng giới hạn ghi chú trong 1000 ký tự." };
      }

      // If in reveal/refinement and text clearly matches a deterministic refinement intent:
      if (state.phase === "reveal" || state.phase === "refinement") {
        const matchedRefinement = detectRefinementFromText(trimmed);
        if (matchedRefinement) {
          const updated = atelierReducer(
            { ...state, draft: "" },
            { type: "apply_refinement", kind: matchedRefinement },
          );
          return updated;
        }
      }

      // Honest fallback for unsupported free-text requests (never pretends live AI!)
      return {
        ...state,
        draft: "",
        error: "",
        freeNotes: [...state.freeNotes, trimmed],
        messages: [
          ...state.messages,
          {
            id: state.nextId,
            role: "user",
            eyebrow: "Bạn · Ghi chú tự do",
            text: trimmed,
            provenance: "user-input",
          },
          {
            id: state.nextId + 1,
            role: "assistant",
            eyebrow: "ADORA Atelier · Giới hạn bản mẫu",
            text: "Mình đã giữ nguyên ghi chú này trong hồ sơ chuyến đi. Vì đây là bản mẫu kịch bản dựng sẵn cho Đà Lạt (chưa kết nối mô hình AI trực tiếp hay hệ thống đặt chỗ), yêu cầu tự do này chưa thể tự động tạo lịch trình mới — bạn có thể dùng các lựa chọn tinh chỉnh bên cạnh để thử thay đổi bản mẫu.",
            provenance: "unsupported-notice",
          },
        ],
        nextId: state.nextId + 2,
      };
    }
  }
}
