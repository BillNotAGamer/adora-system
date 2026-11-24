import type { Metadata } from "next";
import { Be_Vietnam_Pro, Playfair_Display } from "next/font/google";

import { Providers } from "@/app/providers";
import "@/app/globals.css";

const bodyFont = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const displayFont = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ADORA — Hành trình được thiết kế sâu hơn",
    template: "%s · ADORA",
  },
  description:
    "Khám phá Việt Nam qua những hành trình chọn lọc và trải nghiệm lập kế hoạch thông minh cùng ADORA.",
  openGraph: {
    title: "ADORA — Hành trình được thiết kế sâu hơn",
    description:
      "Cảm hứng du lịch, điểm đến chọn lọc và lập kế hoạch thông minh trong một trải nghiệm tinh tế.",
    siteName: "ADORA",
    locale: "vi_VN",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      className={`${bodyFont.variable} ${displayFont.variable}`}
      suppressHydrationWarning
    >
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-[var(--adora-ink)] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[var(--adora-paper)]"
        >
          Bỏ qua tới nội dung chính
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
