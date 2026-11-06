"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main id="main-content" className="adora-container py-24 sm:py-32" role="alert">
      <p className="adora-eyebrow text-[var(--adora-sage)]">Đã có sự cố</p>
      <h1 className="font-editorial mt-7 max-w-[14ch] text-[clamp(2.8rem,7vw,5.5rem)] leading-[0.96] font-medium tracking-[-0.05em] text-balance">
        Không thể hiển thị trang này.
      </h1>
      <p className="mt-7 max-w-lg text-base leading-8 text-[var(--adora-text-secondary)]">
        Một lỗi không mong muốn đã xảy ra. Bạn có thể thử tải lại phần này hoặc quay về trang chủ.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3">
        <button type="button" onClick={reset} className="dark-cta inline-flex min-h-12 items-center px-6 text-xs font-bold tracking-[0.1em]">
          Thử lại
        </button>
        <Link href="/" className="editorial-link">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
