"use client";

import Link from "next/link";
import type { ReactNode, RefObject } from "react";

import type { HomepageCatalog } from "@/lib/catalog";
import { homepageEditorialPresentation } from "@/lib/catalog-contract";
import { DESTINATIONS, EXPERIENCE_CATEGORY_LABELS, EXPERIENCES } from "@/lib/demo";

const DIURNAL_EXPERIENCE_SLUGS = [
  "rung-thong-binh-minh",
  "vuon-hoa-nha-kinh",
  "hoang-hon-ben-ho",
  "bua-toi-pho-dem",
] as const;

const DIURNAL_EXPERIENCES = DIURNAL_EXPERIENCE_SLUGS.map((slug) =>
  EXPERIENCES.find((exp) => exp.slug === slug),
).filter((exp): exp is NonNullable<typeof exp> => Boolean(exp));

const COMING_SOON_DESTINATIONS = DESTINATIONS.filter((d) => d.status === "coming-soon");

interface DiscoveryRibbonProps {
  backdropRef: RefObject<HTMLDivElement | null>;
  layerRef: RefObject<HTMLElement | null>;
  ribbonTrackRef: RefObject<HTMLDivElement | null>;
  interactive: boolean;
  catalogSource?: HomepageCatalog["source"];
  catalogDisclosure?: ReactNode;
}

export function DiscoveryRibbon({
  backdropRef,
  layerRef,
  ribbonTrackRef,
  interactive,
  catalogSource = "fallback",
  catalogDisclosure,
}: DiscoveryRibbonProps) {
  const { destinationName, catalogAvailable } = homepageEditorialPresentation(catalogSource);
  const disclosureCopy = catalogAvailable
    ? `Gợi ý biên tập minh hoạ cho ${destinationName} · Danh mục trực tiếp đang kết nối (chưa gồm giá bán hay đặt chỗ).`
    : `Gợi ý biên tập minh hoạ cho ${destinationName} · API tạm ngoại tuyến, không phải tồn kho hay giá bán trực tiếp.`;

  return (
    <>
      <div
        ref={backdropRef}
        className="cxp02-discovery-backdrop"
        style={{ opacity: 0 }}
        aria-hidden="true"
      />
      <section
        ref={layerRef}
        className="cxp02-discovery-layer"
        style={{ opacity: 0, pointerEvents: "none" }}
        aria-label="Movement 04 — Discovery"
        aria-hidden={!interactive}
      >
        <div className="cxp02-discovery-grid">
          {/* Sits cleanly over the reframed Human Moment origin plate */}
          <div className="cxp02-origin-caption-slot">
            <span className="cxp02-origin-badge">01 · Sáng sớm · {destinationName}</span>
            <p className="cxp02-origin-title">Từ một tách cà phê ấm</p>
          </div>

          <div className="cxp02-discovery-right">
            <div className="cxp02-discovery-header">
              <div>
                <span className="cxp02-eyebrow">Khám phá theo nhịp ngày</span>
                <h2 className="cxp02-discovery-headline">
                  Ngoài khung cửa này là cả một vùng cao nguyên đang thở.
                </h2>
              </div>
              <Link
                href="/destinations/da-lat"
                className="cxp02-destination-link"
                tabIndex={interactive ? 0 : -1}
              >
                Xem điểm đến {destinationName}
              </Link>
            </div>

            <div className="cxp02-ribbon-viewport">
              <div ref={ribbonTrackRef} className="cxp02-ribbon-track">
                {DIURNAL_EXPERIENCES.map((exp, idx) => (
                  <Link
                    key={exp.slug}
                    href={`/experiences/${exp.slug}`}
                    className="cxp02-ribbon-plate"
                    tabIndex={interactive ? 0 : -1}
                  >
                    <div className="cxp02-ribbon-media">
                      <img
                        src={exp.image.src}
                        alt={exp.image.alt}
                        loading="lazy"
                        className="cxp02-ribbon-img"
                      />
                    </div>
                    <div className="cxp02-ribbon-body">
                      <span className="cxp02-ribbon-meta">
                        0{idx + 2} · {exp.bestMoment} · {EXPERIENCE_CATEGORY_LABELS[exp.category]}
                      </span>
                      <h3 className="cxp02-ribbon-title">{exp.name}</h3>
                      <p className="cxp02-ribbon-tagline">{exp.tagline}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="cxp02-discovery-footnote">
              <span>{catalogDisclosure ?? disclosureCopy}</span>
              <span className="cxp02-coming-soon-list">
                {COMING_SOON_DESTINATIONS.map((dest) => (
                  <span key={dest.slug}>{dest.name} (Sắp ra mắt)</span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export function ReducedMotionDiscoverySection({
  catalogSource = "fallback",
  catalogDisclosure,
}: Readonly<{ catalogSource?: HomepageCatalog["source"]; catalogDisclosure?: ReactNode }>) {
  const { destinationName, catalogAvailable } = homepageEditorialPresentation(catalogSource);
  const disclosureCopy = catalogAvailable
    ? `Gợi ý biên tập minh hoạ cho ${destinationName} · Danh mục trực tiếp đang kết nối (chưa gồm giá bán hay đặt chỗ).`
    : `Gợi ý biên tập minh hoạ cho ${destinationName} · API tạm ngoại tuyến, không phải tồn kho hay giá bán trực tiếp.`;

  return (
    <section className="cxp02-reduced-discovery" aria-label="Movement 04 — Discovery">
      <span className="cxp02-eyebrow">Movement 04 · Khám phá {destinationName}</span>
      <h2 className="cxp02-discovery-headline">
        Ngoài khung cửa này là cả một vùng cao nguyên đang thở.
      </h2>
      <div className="cxp02-reduced-cards">
        {DIURNAL_EXPERIENCES.map((exp, idx) => (
          <Link key={exp.slug} href={`/experiences/${exp.slug}`} className="cxp02-ribbon-plate">
            <div className="cxp02-ribbon-media">
              <img src={exp.image.src} alt={exp.image.alt} className="cxp02-ribbon-img" />
            </div>
            <div className="cxp02-ribbon-body">
              <span className="cxp02-ribbon-meta">
                0{idx + 2} · {exp.bestMoment}
              </span>
              <h3 className="cxp02-ribbon-title">{exp.name}</h3>
              <p className="cxp02-ribbon-tagline">{exp.tagline}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="cxp02-discovery-footnote" style={{ marginTop: "1.5rem" }}>
        <span>{catalogDisclosure ?? disclosureCopy}</span>
        <Link href="/destinations/da-lat" className="cxp02-destination-link">
          Xem điểm đến {destinationName}
        </Link>
      </div>
    </section>
  );
}
