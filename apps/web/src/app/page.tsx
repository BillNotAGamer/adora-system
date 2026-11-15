import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { AiPlannerSection } from "@/components/home/ai-planner-section";
import { BrandPhilosophy } from "@/components/home/brand-philosophy";
import { DestinationStory } from "@/components/home/destination-story";
import { EditorialHero } from "@/components/home/editorial-hero";
import { ExperienceStory } from "@/components/home/experience-story";
import { HowItWorks } from "@/components/home/how-it-works";
import { SiteFooter } from "@/components/layout/site-footer";
import { EDITORIAL_CATALOG_FALLBACK, getHomepageCatalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Đi xa hơn. Hiểu sâu hơn.",
  description:
    "Homepage chính thức của ADORA — khám phá điểm đến Việt Nam và bắt đầu một hành trình được thiết kế có chủ đích.",
};

async function CatalogStories() {
  await connection();
  const catalog = await getHomepageCatalog();

  return (
    <>
      <DestinationStory catalog={catalog} />
      <ExperienceStory catalog={catalog} />
    </>
  );
}

function CatalogStoriesFallback() {
  return (
    <>
      <DestinationStory catalog={EDITORIAL_CATALOG_FALLBACK} />
      <ExperienceStory catalog={EDITORIAL_CATALOG_FALLBACK} />
    </>
  );
}

export default function Home() {

  return (
    <main id="main-content" className="min-h-screen overflow-x-clip">
      <EditorialHero />
      <BrandPhilosophy />
      <Suspense fallback={<CatalogStoriesFallback />}>
        <CatalogStories />
      </Suspense>
      <AiPlannerSection />
      <HowItWorks />
      <SiteFooter />
    </main>
  );
}
