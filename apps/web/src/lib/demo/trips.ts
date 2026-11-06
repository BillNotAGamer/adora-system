import type { ItineraryPeriod, Trip } from "./types.ts";

export const PERIOD_LABELS: Record<ItineraryPeriod, string> = {
  morning: "Sáng",
  noon: "Trưa",
  afternoon: "Chiều",
  evening: "Tối",
};

/** Canonical ordering used to validate that an itinerary day progresses through the day. */
export const PERIOD_ORDER: Record<ItineraryPeriod, number> = {
  morning: 0,
  noon: 1,
  afternoon: 2,
  evening: 3,
};

/**
 * Illustrative trips. They are demonstration fixtures: no reservation, payment, voucher, route
 * calculation, or AI generation stands behind them. Sequencing is approximate (period of day only).
 */
export const TRIPS: readonly Trip[] = [
  {
    slug: "da-lat-3-ngay",
    title: "Đà Lạt — 3 ngày chậm",
    destinationSlug: "da-lat",
    durationDays: 3,
    status: "demo-sample",
    statusLabel: "Bản mẫu minh hoạ",
    intro:
      "Một lịch trình ba ngày dựng sẵn để minh hoạ cách ADORA sắp xếp rừng thông, cà phê và những khoảng nghỉ thành một nhịp đi mạch lạc.",
    cover: {
      src: "/images/home/adora-highlands-hero.webp",
      alt: "Những lớp đồi thông cao nguyên ẩn hiện trong sương sớm",
      position: "61% center",
    },
    pace: "Chậm, nhiều thiên nhiên",
    days: [
      {
        day: 1,
        title: "Làm quen với nhịp cao nguyên",
        summary: "Đến nơi, đi dạo nhẹ, một ly cà phê chậm và hoàng hôn bên hồ.",
        illustrativeBudgetVnd: 1200000,
        activities: [
          {
            id: "d1-arrive",
            period: "morning",
            title: "Đến nơi và đi dạo nhẹ",
            summary: "Nhận nhịp thành phố bằng một buổi đi bộ không có đích đến cố định.",
            detail:
              "Ngày đầu không cần lấp đầy. Hãy để cơ thể làm quen với không khí mát và độ cao, đi dạo một vòng ngắn quanh khu trung tâm.",
            locationNote: "Khu trung tâm thành phố",
            experienceSlug: null,
          },
          {
            id: "d1-coffee",
            period: "afternoon",
            title: "Nghi thức cà phê nhỏ giọt",
            summary: "Một khoảng dừng trên hiên gỗ với cà phê pha chậm.",
            detail:
              "Chọn một nơi yên tĩnh để ngồi lại thay vì ghé nhanh. Đây là ý tưởng về nhịp nghỉ, không phải đề xuất một quán cụ thể.",
            locationNote: "Khu đồi thông yên tĩnh",
            experienceSlug: "ca-phe-nho-giot-cao-nguyen",
          },
          {
            id: "d1-lake",
            period: "evening",
            title: "Hoàng hôn bên hồ",
            summary: "Ngồi yên bên mặt hồ khi trời chuyển màu.",
            detail: "Kết thúc ngày bằng một khoảng lặng bên mặt nước. Mang theo áo ấm vì buổi tối nhanh se lạnh.",
            locationNote: "Khu vực quanh hồ",
            experienceSlug: "hoang-hon-ben-ho",
          },
        ],
      },
      {
        day: 2,
        title: "Rừng thông và nghề trồng hoa",
        summary: "Bình minh giữa hàng thông, một buổi chiều ở nhà kính hoa và bữa tối ấm.",
        illustrativeBudgetVnd: 1500000,
        activities: [
          {
            id: "d2-pine",
            period: "morning",
            title: "Đi bộ rừng thông lúc bình minh",
            summary: "Một lối mòn yên tĩnh khi sương chưa tan.",
            detail: "Bắt đầu sớm để có ánh sáng thấp và không gian riêng. Chọn giày bám tốt nếu đường còn ẩm.",
            locationNote: "Rừng thông ven thành phố",
            experienceSlug: "rung-thong-binh-minh",
          },
          {
            id: "d2-lunch",
            period: "noon",
            title: "Bữa trưa nhẹ và nghỉ ngơi",
            summary: "Một bữa trưa thong thả trước khi đi tiếp.",
            detail: "Dành thời gian nghỉ giữa ngày để buổi chiều không bị dồn nén.",
            locationNote: "Gần nơi lưu trú",
            experienceSlug: null,
          },
          {
            id: "d2-flowers",
            period: "afternoon",
            title: "Nhà kính hoa",
            summary: "Nhìn gần nghề trồng hoa của vùng cao nguyên.",
            detail: "Đi chậm giữa các luống hoa và xin phép trước khi chụp ảnh. Việc tham quan thực tế cần được xác nhận riêng.",
            locationNote: "Vùng trồng hoa quanh thành phố",
            experienceSlug: "vuon-hoa-nha-kinh",
          },
          {
            id: "d2-dinner",
            period: "evening",
            title: "Bữa tối ở phố đêm",
            summary: "Những món nóng nhỏ trong tiết trời se lạnh.",
            detail: "Chia nhau từng món và ăn chậm. ADORA chưa gợi ý một nhà hàng hay mức giá cụ thể.",
            locationNote: "Khu phố đêm trung tâm",
            experienceSlug: "bua-toi-pho-dem",
          },
        ],
      },
      {
        day: 3,
        title: "Đồi trong sương và khép lại chuyến đi",
        summary: "Một chặng đi bộ nhẹ, bữa trưa thong thả và thời gian thu xếp trước khi về.",
        illustrativeBudgetVnd: 900000,
        activities: [
          {
            id: "d3-viewpoint",
            period: "morning",
            title: "Lên điểm cao ngắm đồi trong sương",
            summary: "Những lớp đồi thông nối nhau khi sương còn thấp.",
            detail:
              "Chặng vận động nhẹ cuối cùng. Hãy kiểm tra điều kiện đường đi tại chỗ vì ADORA chưa có dữ liệu lộ trình.",
            locationNote: "Vùng đồi quanh thành phố",
            experienceSlug: "ngam-doi-trong-suong",
          },
          {
            id: "d3-lunch",
            period: "noon",
            title: "Bữa trưa thong thả",
            summary: "Một bữa ăn giản dị để khép lại chuyến đi.",
            detail: "Giữ nhịp chậm đến phút cuối, tránh nhồi thêm điểm dừng.",
            locationNote: "Gần nơi lưu trú",
            experienceSlug: null,
          },
          {
            id: "d3-close",
            period: "afternoon",
            title: "Thu xếp và trở về",
            summary: "Khoảng thời gian dự phòng trước khi di chuyển.",
            detail:
              "Chừa một khoảng đệm cho việc thu xếp hành lý. ADORA không tính thời gian di chuyển trong bản mẫu này.",
            locationNote: "Nơi lưu trú",
            experienceSlug: null,
          },
        ],
      },
    ],
    planNotes: [
      "Đây là lịch trình minh hoạ được viết sẵn, không do AI tạo ra.",
      "Thứ tự trong ngày chỉ mang tính ước lượng theo buổi, không có giờ hay thời gian di chuyển.",
      "Ngân sách là ước tính minh hoạ cho ăn uống và hoạt động, không gồm lưu trú, không phải báo giá.",
      "Chưa có đặt chỗ, thanh toán hay voucher nào gắn với lịch trình này.",
    ],
    provenance: "demo-fixture",
  },
  {
    slug: "da-lat-cuoi-tuan-2-ngay",
    title: "Đà Lạt — cuối tuần 2 ngày",
    destinationSlug: "da-lat",
    durationDays: 2,
    status: "demo-draft",
    statusLabel: "Bản nháp minh hoạ",
    intro:
      "Một bản nháp ngắn hơn cho người chỉ có hai ngày: giữ lại những khoảnh khắc đáng nhớ nhất, bỏ bớt những điểm dừng không cần thiết.",
    cover: {
      src: "/images/discover/dalat-lake-dusk.webp",
      alt: "Mặt hồ lặng phản chiếu bóng thông lúc hoàng hôn, cầu gỗ trống ở tiền cảnh",
      position: "center",
    },
    pace: "Chậm, gọn",
    days: [
      {
        day: 1,
        title: "Sương sớm và cà phê chậm",
        summary: "Bình minh giữa hàng thông, cà phê và hoàng hôn bên hồ.",
        illustrativeBudgetVnd: 1100000,
        activities: [
          {
            id: "w1-pine",
            period: "morning",
            title: "Đi bộ rừng thông lúc bình minh",
            summary: "Một lối mòn yên tĩnh khi sương chưa tan.",
            detail: "Bắt đầu sớm để có ánh sáng thấp và không gian riêng.",
            locationNote: "Rừng thông ven thành phố",
            experienceSlug: "rung-thong-binh-minh",
          },
          {
            id: "w1-coffee",
            period: "afternoon",
            title: "Nghi thức cà phê nhỏ giọt",
            summary: "Một khoảng dừng với cà phê pha chậm.",
            detail: "Ngồi lại thay vì ghé nhanh. Đây là ý tưởng về nhịp nghỉ.",
            locationNote: "Khu đồi thông yên tĩnh",
            experienceSlug: "ca-phe-nho-giot-cao-nguyen",
          },
          {
            id: "w1-lake",
            period: "evening",
            title: "Hoàng hôn bên hồ",
            summary: "Ngồi yên bên mặt hồ khi trời chuyển màu.",
            detail: "Mang theo áo ấm vì buổi tối nhanh se lạnh.",
            locationNote: "Khu vực quanh hồ",
            experienceSlug: "hoang-hon-ben-ho",
          },
        ],
      },
      {
        day: 2,
        title: "Hoa, đồi và bữa tối ấm",
        summary: "Nhà kính hoa, một điểm ngắm đồi và bữa tối giản dị.",
        illustrativeBudgetVnd: 1000000,
        activities: [
          {
            id: "w2-flowers",
            period: "morning",
            title: "Nhà kính hoa",
            summary: "Nhìn gần nghề trồng hoa của vùng cao nguyên.",
            detail: "Đi chậm giữa các luống hoa và xin phép trước khi chụp ảnh.",
            locationNote: "Vùng trồng hoa quanh thành phố",
            experienceSlug: "vuon-hoa-nha-kinh",
          },
          {
            id: "w2-viewpoint",
            period: "afternoon",
            title: "Lên điểm cao ngắm đồi",
            summary: "Những lớp đồi thông nối nhau trong ánh chiều.",
            detail: "Kiểm tra điều kiện đường đi tại chỗ trước khi khởi hành.",
            locationNote: "Vùng đồi quanh thành phố",
            experienceSlug: "ngam-doi-trong-suong",
          },
          {
            id: "w2-dinner",
            period: "evening",
            title: "Bữa tối ở phố đêm",
            summary: "Những món nóng nhỏ trong tiết trời se lạnh.",
            detail: "Chia nhau từng món và ăn chậm để khép lại chuyến đi.",
            locationNote: "Khu phố đêm trung tâm",
            experienceSlug: "bua-toi-pho-dem",
          },
        ],
      },
    ],
    planNotes: [
      "Đây là bản nháp minh hoạ được viết sẵn, không do AI tạo ra.",
      "Thứ tự trong ngày chỉ mang tính ước lượng theo buổi, không có giờ hay thời gian di chuyển.",
      "Ngân sách là ước tính minh hoạ, không phải báo giá.",
    ],
    provenance: "demo-fixture",
  },
];

export function getTripBySlug(slug: string): Trip | undefined {
  return TRIPS.find((trip) => trip.slug === slug);
}

/** Trips (by slug) that include a given experience. */
export function getTripsFeaturingExperience(experienceSlug: string): Trip[] {
  return TRIPS.filter((trip) =>
    trip.days.some((day) => day.activities.some((activity) => activity.experienceSlug === experienceSlug)),
  );
}

export function getTripBudgetTotalVnd(trip: Trip): number {
  return trip.days.reduce((total, day) => total + day.illustrativeBudgetVnd, 0);
}

/** Formats an integer VND amount. Always labelled illustrative by the caller. */
export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}
