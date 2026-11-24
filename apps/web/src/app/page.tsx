import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { CinematicJourneyExperience } from "@/components/creative-lab/cinematic-journey/cinematic-journey-experience";
import { FirstLetterBootScript } from "@/components/entrance/first-letter-boot-script";
import { EDITORIAL_CATALOG_FALLBACK, getHomepageCatalog } from "@/lib/catalog";
import { homepageEditorialPresentation } from "@/lib/catalog-contract";

export const metadata: Metadata = {
  title: "Đi xa hơn. Hiểu sâu hơn.",
  description:
    "Homepage chính thức của ADORA — khám phá điểm đến Việt Nam và bắt đầu một hành trình được thiết kế có chủ đích.",
};

function formatDisclosure(source: "live" | "partial" | "fallback") {
  const { destinationName, catalogAvailable } = homepageEditorialPresentation(source);
  return catalogAvailable
    ? `Gợi ý biên tập minh hoạ cho ${destinationName} · Danh mục trực tiếp đang kết nối (chưa gồm giá bán hay đặt chỗ).`
    : `Gợi ý biên tập minh hoạ cho ${destinationName} · API tạm ngoại tuyến, không phải tồn kho hay giá bán trực tiếp.`;
}

async function LiveCatalogDisclosure() {
  await connection();
  const catalog = await getHomepageCatalog();

  return <span data-catalog-source={catalog.source}>{formatDisclosure(catalog.source)}</span>;
}

export default function Home() {
  const catalogDisclosure = (
    <Suspense
      fallback={
        <span data-catalog-source={EDITORIAL_CATALOG_FALLBACK.source}>
          {formatDisclosure(EDITORIAL_CATALOG_FALLBACK.source)}
        </span>
      }
    >
      <LiveCatalogDisclosure />
    </Suspense>
  );

  return (
    <>
      <FirstLetterBootScript />
      <CinematicJourneyExperience
        mode="production"
        catalogSource={EDITORIAL_CATALOG_FALLBACK.source}
        catalogDisclosure={catalogDisclosure}
      />
    </>
  );
}
