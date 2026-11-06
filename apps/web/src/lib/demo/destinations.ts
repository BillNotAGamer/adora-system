import type { Destination } from "./types.ts";

const DA_LAT_DESCRIPTION = [
  "Đà Lạt không được nhớ vì một địa danh duy nhất, mà vì nhịp sống chậm của cao nguyên: buổi sáng có sương, những con dốc thông và những khoảng lặng giữa các cuộc gặp.",
  "Trang này là chất liệu biên tập do ADORA dựng sẵn để minh hoạ cách một điểm đến được kể trong sản phẩm. Nội dung không phải dữ liệu vận hành trực tiếp và không thể hiện tồn kho hay giá bán.",
  "Từ đây, bạn có thể đi tiếp tới các trải nghiệm gợi ý hoặc xem một lịch trình mẫu ba ngày. Mọi bước đều là bản xem trước để minh hoạ trải nghiệm ADORA.",
];

/**
 * Curated destination records. Only Đà Lạt has full editorial content; the others are explicitly
 * inspiration placeholders with no detail page, no imagery, and no experiences.
 */
export const DESTINATIONS: readonly Destination[] = [
  {
    slug: "da-lat",
    name: "Đà Lạt",
    region: "cao-nguyen",
    regionLabel: "Cao nguyên",
    tagline: "Thành phố của sương, thông và những khoảng lặng.",
    summary: "Một nhịp đi chậm giữa rừng thông, cà phê cao nguyên và những buổi chiều bên hồ.",
    description: DA_LAT_DESCRIPTION,
    image: {
      src: "/images/home/dalat-pine-trail.webp",
      alt: "Lối mòn xuyên rừng thông nhìn về mặt hồ phủ sương",
      position: "center",
    },
    status: "available",
    highlights: [
      { title: "Rừng thông và lối mòn", note: "Những buổi sáng sương mỏng phù hợp với nhịp đi bộ chậm." },
      { title: "Cà phê cao nguyên", note: "Một nghi thức nhỏ để bắt đầu hoặc khép lại ngày." },
      { title: "Hồ và hoàng hôn", note: "Khoảng nghỉ yên tĩnh trước khi thành phố lên đèn." },
      { title: "Vườn hoa và nhà kính", note: "Nhìn gần hơn nghề trồng hoa của vùng cao nguyên." },
    ],
    bestFor: ["Đi chậm", "Thiên nhiên", "Cà phê", "Cuối tuần ngắn"],
    experienceSlugs: [
      "rung-thong-binh-minh",
      "ca-phe-nho-giot-cao-nguyen",
      "vuon-hoa-nha-kinh",
      "hoang-hon-ben-ho",
      "bua-toi-pho-dem",
      "ngam-doi-trong-suong",
    ],
    tripSlug: "da-lat-3-ngay",
    provenance: "editorial",
  },
  {
    slug: "hoi-an",
    name: "Hội An",
    region: "ven-bien",
    regionLabel: "Ven biển",
    tagline: "Phố cổ bên sông và những buổi chiều chậm.",
    summary: "Cảm hứng biên tập cho một chặng ven biển miền Trung. Nội dung đầy đủ sẽ được bổ sung sau.",
    description: [],
    image: null,
    status: "coming-soon",
    highlights: [],
    bestFor: ["Văn hoá", "Ẩm thực"],
    experienceSlugs: [],
    tripSlug: null,
    provenance: "editorial",
  },
  {
    slug: "sa-pa",
    name: "Sa Pa",
    region: "mien-nui-phia-bac",
    regionLabel: "Miền núi phía Bắc",
    tagline: "Ruộng bậc thang, mây thấp và những con đường đèo.",
    summary: "Cảm hứng biên tập cho một chặng miền núi phía Bắc. Nội dung đầy đủ sẽ được bổ sung sau.",
    description: [],
    image: null,
    status: "coming-soon",
    highlights: [],
    bestFor: ["Thiên nhiên", "Đi bộ đường dài"],
    experienceSlugs: [],
    tripSlug: null,
    provenance: "editorial",
  },
  {
    slug: "phu-quoc",
    name: "Phú Quốc",
    region: "ven-bien",
    regionLabel: "Ven biển",
    tagline: "Biển lặng, rừng nhiệt đới và chiều muộn bên bờ cát.",
    summary: "Cảm hứng biên tập cho một chặng đảo phía Nam. Nội dung đầy đủ sẽ được bổ sung sau.",
    description: [],
    image: null,
    status: "coming-soon",
    highlights: [],
    bestFor: ["Thư giãn", "Biển"],
    experienceSlugs: [],
    tripSlug: null,
    provenance: "editorial",
  },
];

export const REGION_LABELS: Record<string, string> = {
  "cao-nguyen": "Cao nguyên",
  "ven-bien": "Ven biển",
  "mien-nui-phia-bac": "Miền núi phía Bắc",
};

export function getDestinationBySlug(slug: string): Destination | undefined {
  return DESTINATIONS.find((destination) => destination.slug === slug);
}

/** Destinations with a full detail page. Coming-soon records are intentionally excluded. */
export function getAvailableDestinations(): Destination[] {
  return DESTINATIONS.filter((destination) => destination.status === "available");
}
