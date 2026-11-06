import type { Experience, ExperienceCategory } from "./types.ts";

export const EXPERIENCE_CATEGORY_LABELS: Record<ExperienceCategory, string> = {
  nature: "Thiên nhiên",
  "food-coffee": "Ẩm thực & cà phê",
  culture: "Văn hoá",
  relaxation: "Thư giãn",
  activity: "Hoạt động nhẹ",
};

/**
 * Curated experience ideas for Đà Lạt. These are editorial descriptions, not commercial offers:
 * they carry no price, opening hours, duration, distance, or availability.
 */
export const EXPERIENCES: readonly Experience[] = [
  {
    slug: "rung-thong-binh-minh",
    name: "Đi bộ rừng thông lúc bình minh",
    destinationSlug: "da-lat",
    category: "nature",
    tagline: "Một lối mòn, ít tiếng động và lớp sương còn chưa tan.",
    summary: "Buổi sáng yên tĩnh giữa hàng thông, phù hợp để bắt đầu ngày bằng nhịp chân chậm.",
    description: [
      "Rừng thông quanh Đà Lạt có một nhịp riêng vào lúc sáng sớm: ánh sáng còn thấp, không khí mát và âm thanh gần như chỉ là tiếng bước chân.",
      "Đây là gợi ý biên tập về cách trải nghiệm vùng cao nguyên. ADORA chưa gắn gợi ý này với một điểm cụ thể, đơn vị tổ chức hay lịch hoạt động nào.",
    ],
    image: {
      src: "/images/home/dalat-pine-trail.webp",
      alt: "Lối mòn xuyên rừng thông nhìn về mặt hồ phủ sương",
      position: "center",
    },
    bestMoment: "Buổi sáng sớm",
    pace: "nhẹ",
    suitableFor: ["Người thích đi chậm", "Nhiếp ảnh", "Cặp đôi"],
    tips: ["Mang thêm một lớp áo mỏng cho buổi sáng mát.", "Chọn giày bám tốt nếu đường còn ẩm."],
    provenance: "editorial",
  },
  {
    slug: "ca-phe-nho-giot-cao-nguyen",
    name: "Nghi thức cà phê nhỏ giọt",
    destinationSlug: "da-lat",
    category: "food-coffee",
    tagline: "Vài phút chờ từng giọt rơi, để buổi sáng không bị vội.",
    summary: "Một khoảng dừng trên hiên gỗ với cà phê pha chậm và tầm nhìn ra rừng thông.",
    description: [
      "Cà phê cao nguyên không chỉ là thức uống mà còn là một cách đặt nhịp cho ngày. Pha chậm nghĩa là chấp nhận chờ, và chính khoảng chờ ấy là phần của trải nghiệm.",
      "Nội dung này là mô tả biên tập, không đại diện cho một quán hoặc đối tác cụ thể.",
    ],
    image: {
      src: "/images/home/highland-coffee-ritual.webp",
      alt: "Nghi thức pha cà phê thủ công bên rừng thông cao nguyên",
      position: "center",
    },
    bestMoment: "Sáng hoặc đầu giờ chiều",
    pace: "nhẹ",
    suitableFor: ["Người yêu cà phê", "Đi một mình", "Nghỉ giữa hành trình"],
    tips: ["Dành thời gian ngồi lại thay vì ghé nhanh.", "Hỏi cách pha nếu bạn muốn hiểu thêm về hạt cà phê."],
    provenance: "editorial",
  },
  {
    slug: "vuon-hoa-nha-kinh",
    name: "Buổi sáng ở nhà kính hoa",
    destinationSlug: "da-lat",
    category: "culture",
    tagline: "Nhìn gần nghề trồng hoa của vùng cao nguyên.",
    summary: "Những luống hoa dưới mái nhà kính, nơi ánh sáng mềm và nhịp làm việc của người trồng hoa hiện rõ.",
    description: [
      "Hoa là một phần của bản sắc Đà Lạt. Đi qua một nhà kính hoa vào buổi sáng giúp thấy rõ hơn công việc đằng sau những bó hoa quen thuộc.",
      "Đây là ý tưởng biên tập về văn hoá địa phương. Việc tham quan thực tế cần được xác nhận trực tiếp với từng nơi, và ADORA không nêu giờ mở cửa hay điều kiện vào cửa.",
    ],
    image: {
      src: "/images/discover/dalat-flower-greenhouse.webp",
      alt: "Những luống hoa dưới mái nhà kính, lối đi hẹp hướng về đồi thông",
      position: "center",
    },
    bestMoment: "Buổi sáng",
    pace: "nhẹ",
    suitableFor: ["Gia đình", "Người quan tâm văn hoá địa phương"],
    tips: ["Giữ khoảng cách với cây trồng và xin phép trước khi chụp ảnh.", "Mang nước và mũ nhẹ nếu trời nắng."],
    provenance: "editorial",
  },
  {
    slug: "hoang-hon-ben-ho",
    name: "Hoàng hôn bên hồ",
    destinationSlug: "da-lat",
    category: "relaxation",
    tagline: "Mặt nước lặng, bầu trời đổi màu và một chiếc ghế để ngồi lại.",
    summary: "Khoảng nghỉ cuối ngày bên mặt hồ, trước khi thành phố lên đèn.",
    description: [
      "Cuối chiều, mặt hồ phản chiếu bóng thông và bầu trời chuyển từ đào sang xanh lam. Không có gì cần làm ngoài việc ngồi yên.",
      "Đây là gợi ý thư giãn mang tính biên tập, không gắn với một địa điểm hoặc dịch vụ cụ thể.",
    ],
    image: {
      src: "/images/discover/dalat-lake-dusk.webp",
      alt: "Mặt hồ lặng phản chiếu bóng thông lúc hoàng hôn, cầu gỗ trống ở tiền cảnh",
      position: "center",
    },
    bestMoment: "Cuối chiều",
    pace: "nhẹ",
    suitableFor: ["Cặp đôi", "Người cần nghỉ ngơi", "Nhiếp ảnh"],
    tips: ["Mang thêm áo ấm vì trời nhanh se lạnh.", "Đến sớm một chút để không phải vội."],
    provenance: "editorial",
  },
  {
    slug: "bua-toi-pho-dem",
    name: "Bữa tối ở phố đêm",
    destinationSlug: "da-lat",
    category: "food-coffee",
    tagline: "Than hồng, hơi nóng và những món ăn nhỏ trong tiết trời se lạnh.",
    summary: "Một bữa tối giản dị với món nướng, hơi ấm và ánh đèn vàng của buổi tối cao nguyên.",
    description: [
      "Khi trời se lạnh, những món ăn nóng và nhỏ trở thành một cách thân mật để kết thúc ngày. Bữa tối này gợi ý nhịp ăn chậm, chia nhau từng món.",
      "Đây là mô tả biên tập về ẩm thực địa phương. ADORA không giới thiệu một quầy hàng, nhà hàng hay mức giá cụ thể.",
    ],
    image: {
      src: "/images/discover/dalat-night-food.webp",
      alt: "Bếp than nhỏ với món nướng, bát gốm và hơi nóng giữa buổi tối cao nguyên",
      position: "center",
    },
    bestMoment: "Buổi tối",
    pace: "vừa",
    suitableFor: ["Nhóm bạn", "Người thích ẩm thực địa phương"],
    tips: ["Ưu tiên những món nóng và dùng chậm.", "Hỏi thành phần nếu bạn có nhu cầu ăn uống riêng."],
    provenance: "editorial",
  },
  {
    slug: "ngam-doi-trong-suong",
    name: "Lên điểm cao ngắm đồi trong sương",
    destinationSlug: "da-lat",
    category: "activity",
    tagline: "Một chặng đi bộ ngắn để nhìn những lớp đồi nối nhau trong sương.",
    summary: "Vận động nhẹ lên một điểm cao, đổi lại là tầm nhìn bao quát những lớp đồi thông.",
    description: [
      "Chặng này dành cho những ai muốn vận động nhẹ nhưng vẫn giữ nhịp thong thả. Từ điểm cao, các lớp đồi chồng lên nhau trong sương tạo cảm giác tách khỏi thành phố.",
      "Đây là gợi ý hoạt động biên tập. ADORA không nêu độ khó, thời lượng hay điều kiện an toàn của một lộ trình thực tế; hãy kiểm tra thông tin tại chỗ.",
    ],
    image: {
      src: "/images/home/adora-highlands-hero.webp",
      alt: "Những lớp đồi thông cao nguyên ẩn hiện trong sương sớm",
      position: "28% center",
    },
    bestMoment: "Buổi sáng, khi sương còn thấp",
    pace: "vừa",
    suitableFor: ["Người thích vận động nhẹ", "Nhiếp ảnh", "Nhóm bạn"],
    tips: ["Đi giày bám tốt vì đường dốc có thể trơn.", "Chuẩn bị áo mưa mỏng cho thời tiết thay đổi."],
    provenance: "editorial",
  },
];

export function getExperienceBySlug(slug: string): Experience | undefined {
  return EXPERIENCES.find((experience) => experience.slug === slug);
}

export function getExperiencesForDestination(destinationSlug: string): Experience[] {
  return EXPERIENCES.filter((experience) => experience.destinationSlug === destinationSlug);
}

/** Related experiences: same category first, then the rest of the destination, never the item itself. */
export function getRelatedExperiences(slug: string, limit = 3): Experience[] {
  const current = getExperienceBySlug(slug);
  if (!current) return [];
  const siblings = EXPERIENCES.filter(
    (experience) => experience.destinationSlug === current.destinationSlug && experience.slug !== slug,
  );
  const sameCategory = siblings.filter((experience) => experience.category === current.category);
  const others = siblings.filter((experience) => experience.category !== current.category);
  return [...sameCategory, ...others].slice(0, limit);
}
