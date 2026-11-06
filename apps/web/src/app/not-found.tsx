import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader tone="solid" />
      <main id="main-content" className="adora-container py-24 sm:py-32">
        <p className="adora-eyebrow text-[var(--adora-sage)]">Lỗi 404</p>
        <h1 className="font-editorial mt-7 max-w-[14ch] text-[clamp(3rem,8vw,6.5rem)] leading-[0.94] font-medium tracking-[-0.05em] text-balance">
          Trang này không <em className="font-normal text-[var(--adora-sage)]">tồn tại.</em>
        </h1>
        <p className="mt-7 max-w-lg text-base leading-8 text-[var(--adora-text-secondary)]">
          Liên kết có thể đã cũ hoặc nội dung chưa có trong bản demo. Hãy quay lại một trong các mục chính bên dưới.
        </p>
        <nav aria-label="Gợi ý điều hướng" className="mt-10 flex flex-wrap gap-x-8 gap-y-2">
          <Link href="/" className="editorial-link">
            Trang chủ
          </Link>
          <Link href="/destinations" className="editorial-link">
            Điểm đến
          </Link>
          <Link href="/experiences" className="editorial-link">
            Trải nghiệm
          </Link>
          <Link href="/trips" className="editorial-link">
            Chuyến đi mẫu
          </Link>
        </nav>
      </main>
      <SiteFooter showCta={false} />
    </>
  );
}
