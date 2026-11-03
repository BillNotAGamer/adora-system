# ADORA — Content & Navigation Specification (v1.0)

## Primary persona / user intent

1. Curious visitor: discover an inspiring destination, without being forced into an unfinished booking flow.
2. Returning traveler: find the clearly labeled AI Planner preview and understand what is upcoming.
3. Evaluating developer / graduation jury: see a polished visual identity that does not misrepresent features.

## Navigation model

**Desktop:** ADORA (logo link to `/`) | Điểm đến (`#destinations`) | Trải nghiệm (`#experiences`) | Cách Adora hoạt động (`#how-it-works`) | AI Planner (`/ai-planner` preview).

**Mobile:** ADORA | menu button with accessible expanded state; compact list of same working anchors / route.

**Footer:** Homepage anchors + `/ai-planner`. Other routes appear only after verified implementation; do not create `href="#"` dead controls.

## Homepage original copy starter (Vietnamese)

| Region | Copy |
|---|---|
| Hero eyebrow | `HÀNH TRÌNH ĐƯỢC THIẾT KẾ CHO BẠN` |
| Hero heading | `Đi xa. Theo cách của riêng bạn.` |
| Hero intro | `Khám phá những miền đất giàu cảm xúc và hình dung một hành trình mang dấu ấn riêng cùng Adora.` |
| Primary CTA | `Khám phá điểm đến` |
| Secondary CTA | `Xem AI Planner (bản xem trước)` |
| Manifesto eyebrow | `KHÁM PHÁ THEO CÁCH MỚI` |
| Manifesto heading | `Một nơi chốn. Vô vàn cách cảm nhận.` |
| Manifesto copy | `Chúng tôi tin một chuyến đi đáng nhớ bắt đầu từ điều bạn thực sự yêu thích: một con đường thông, một góc cà phê, một buổi sáng thong thả.` |
| Destinations heading | `Những nơi đáng để bắt đầu` |
| Destinations note | `Dữ liệu minh họa phục vụ bản thử nghiệm Adora.` (when demo seed shown) |
| Experiences heading | `Mỗi trải nghiệm là một câu chuyện` |
| AI eyebrow | `ADORA AI — ĐANG PHÁT TRIỂN` |
| AI heading | `Hành trình của bạn, từng bước được cá nhân hóa.` |
| AI body | `Adora AI đang được xây dựng để hỗ trợ bạn định hình những chuyến đi theo sở thích và ngân sách.` |
| AI CTA | `Xem giao diện AI Planner` |
| Steps | `Khám phá` / `Thiết kế hành trình` / `Tùy chỉnh dịch vụ` |
| Closing | `Đi để thấy thế giới. Trở về với câu chuyện của riêng mình.` |

**Writing rule:** Avoid Snami phrases such as `Grecian Travel Redefined`, luxury hotel category names, or verbatim philosophy paragraphs. All ADORA copy should be original and specific to the product's current truth.

## Data contract for homepage

| Data | API | Minimum fields required from live schema | Fallback |
|---|---|---|---|
| Destinations | `GET /api/v1/destinations` | stable ID, name, publish visibility; inspect actual generated contract for remainder | if 0 records, static narrative with `Nội dung đang được cập nhật`; no fake record |
| Places | `GET /api/v1/places` | ID, title/name, destination, media if available | omit place showcase when none |
| Offers | `GET /api/v1/offers` | ID, label/name, kind, price metadata if appropriate, active | omit price or annotate demo; no booking availability implication |

All source fields must be validated by the actual generated OpenAPI type; do not code from this conceptual table alone.

## Service states and messaging

- **Loading:** server-rendered state / accessible placeholder where necessary; do not invent catalog entries.
- **Empty:** `Hiện chưa có dữ liệu điểm đến để giới thiệu.`
- **API unavailable:** retain brand content, show factual `Danh mục đang được cập nhật.`
- **Demo seed:** visible `Dữ liệu minh họa` label where a seeded catalog card is rendered.
- **AI preview:** explicit label `Bản xem trước · AI chưa kết nối`.

## Priority design effort

P0: Homepage first impression, navigation, empty/dataset consistency, mobile typography, preview truth.

P1: richer destination and experience templates after dedicated routes exist.

Deferred: live chatbot, booking checkout, user-specific recommendations, reviews, editorial CMS, advanced motion.
