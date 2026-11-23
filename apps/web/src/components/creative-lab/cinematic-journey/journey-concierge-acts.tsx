"use client";

import Link from "next/link";
import { useState, type RefObject } from "react";

import { ConciergeTrigger } from "@/components/concierge/concierge-trigger";
import { TRIPS } from "@/lib/demo";

const JOURNEY_HORIZON_PLATE = "/images/home/adora-highlands-hero.webp";

interface JourneyConciergeActsProps {
  journeyBackdropRef: RefObject<HTMLDivElement | null>;
  journeyPlateWrapRef: RefObject<HTMLDivElement | null>;
  journeyOverlayRef: RefObject<HTMLElement | null>;
  journeyInteractive: boolean;
  conciergeBackdropRef: RefObject<HTMLDivElement | null>;
  conciergeOverlayRef: RefObject<HTMLElement | null>;
  conciergeInteractive: boolean;
  mode?: "lab" | "production";
}

export function JourneyConciergeActs({
  journeyBackdropRef,
  journeyPlateWrapRef,
  journeyOverlayRef,
  journeyInteractive,
  conciergeBackdropRef,
  conciergeOverlayRef,
  conciergeInteractive,
  mode = "lab",
}: JourneyConciergeActsProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>(TRIPS[0]?.slug ?? "da-lat-3-ngay");
  const activeTrip = TRIPS.find((t) => t.slug === selectedSlug) ?? TRIPS[0];
  if (!activeTrip) return null;

  return (
    <>
      {/* Act II — Discovery -> Your Journey (Widescreen Horizontal Cinema Shutter) */}
      <div
        ref={journeyBackdropRef}
        className="cxp02-journey-backdrop"
        style={{ visibility: "hidden" }}
        aria-hidden="true"
      >
        <div ref={journeyPlateWrapRef} className="cxp02-journey-plate-wrap">
          <img
            src={JOURNEY_HORIZON_PLATE}
            alt=""
            decoding="async"
            className="cxp01-plate-image"
          />
          <div className="cxp02-journey-scrim" />
        </div>
      </div>

      <section
        id={mode === "production" ? "how-it-works" : undefined}
        ref={journeyOverlayRef}
        className="cxp02-journey-overlay"
        style={{ opacity: 0, pointerEvents: "none" }}
        aria-label="Movement 05 — Your Journey"
        aria-hidden={!journeyInteractive}
      >
        <div className="cxp02-journey-grid">
          <div>
            <span className="cxp02-eyebrow">Movement 05 · Hành trình của riêng bạn</span>
            <h2 className="cxp02-journey-headline">
              Từ cảm hứng.
              <br />
              Thành nhịp đi của riêng bạn.
            </h2>
            <p className="cxp02-journey-lead">
              Mỗi khoảnh khắc rời rạc chỉ thực sự sống khi được sắp xếp theo nhịp thở của người đi.
              Chọn một nhịp hành trình mẫu cho Đà Lạt để hình dung cách ADORA kết nối từng buổi trong ngày.
            </p>
            <div className="cxp02-trip-switcher" role="group" aria-label="Chọn nhịp hành trình mẫu">
              {TRIPS.map((trip) => (
                <button
                  key={trip.slug}
                  type="button"
                  className="cxp02-trip-pill"
                  aria-pressed={trip.slug === activeTrip.slug}
                  tabIndex={journeyInteractive ? 0 : -1}
                  onClick={() => setSelectedSlug(trip.slug)}
                >
                  {trip.durationDays} ngày · {trip.pace}
                </button>
              ))}
            </div>
          </div>

          <div className="cxp02-itinerary-preview">
            {activeTrip.days.map((day) => (
              <div key={day.day} className="cxp02-day-item">
                <span className="cxp02-day-label">Ngày 0{day.day}</span>
                <h3 className="cxp02-day-title">{day.title}</h3>
                <p className="cxp02-day-summary">{day.summary}</p>
              </div>
            ))}
            <div className="cxp02-itinerary-meta">
              <span className="cxp02-demo-note">
                {activeTrip.statusLabel} · Kịch bản minh hoạ, chưa gồm đặt chỗ hay báo giá.
              </span>
              <Link
                href={`/trips/${activeTrip.slug}`}
                className="cxp02-destination-link"
                tabIndex={journeyInteractive ? 0 : -1}
              >
                Xem lịch trình mẫu
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Act III — Your Journey -> AI Concierge Studio Finale */}
      <div
        ref={conciergeBackdropRef}
        className="cxp02-concierge-backdrop"
        style={{ opacity: 0 }}
        aria-hidden="true"
      />
      <section
        ref={conciergeOverlayRef}
        className="cxp02-concierge-overlay"
        style={{ opacity: 0, pointerEvents: "none" }}
        aria-label="Movement 06 — AI Travel Concierge"
        aria-hidden={!conciergeInteractive}
        data-concierge-inline={conciergeInteractive ? "true" : undefined}
      >
        <div className="cxp02-concierge-inner">
          <span className="cxp02-eyebrow">Movement 06 · ADORA Travel Concierge</span>
          <h2 className="cxp02-concierge-headline">
            Hành trình của bạn bắt đầu từ một câu hỏi.
          </h2>
          <p className="cxp02-concierge-copy">
            Chia sẻ nhịp đi, khoảng thời gian và điều bạn muốn giữ lại từ cao nguyên.
            ADORA Travel Concierge sẽ mở không gian phác thảo hành trình mẫu ngay trong phiên này.
          </p>
          <div className="cxp02-concierge-actions">
            <ConciergeTrigger
              href="/ai-planner"
              className="cxp01-primary-cta"
              tabIndex={conciergeInteractive ? 0 : -1}
            >
              Mở ADORA Travel Concierge
            </ConciergeTrigger>
            <Link
              href="/ai-planner"
              className="cxp01-secondary-cta"
              tabIndex={conciergeInteractive ? 0 : -1}
            >
              Đi tới trang AI Planner
            </Link>
            {mode === "lab" ? (
              <Link
                href="/creative-lab/typography-world"
                className="cxp01-secondary-cta"
                tabIndex={conciergeInteractive ? 0 : -1}
              >
                Xem bản CXP-01S
              </Link>
            ) : null}
          </div>
          <p className="cxp02-concierge-disclosure">
            Bản xem trước kịch bản dựng sẵn cho Đà Lạt · Chưa kết nối mô hình AI trực tiếp, không phải giá bán hay đặt chỗ.
          </p>
        </div>
      </section>
    </>
  );
}

export function ReducedMotionJourneyAndConcierge({
  mode = "lab",
}: Readonly<{ mode?: "lab" | "production" }>) {
  const [selectedSlug, setSelectedSlug] = useState<string>(TRIPS[0]?.slug ?? "da-lat-3-ngay");
  const sampleTrip = TRIPS.find((t) => t.slug === selectedSlug) ?? TRIPS[0];
  if (!sampleTrip) return null;
  return (
    <>
      <section
        id={mode === "production" ? "how-it-works" : undefined}
        className="cxp01-reduced-section"
        aria-label="Movement 05 — Your Journey"
      >
        <div className="cxp01-reduced-bg">
          <img
            src={JOURNEY_HORIZON_PLATE}
            alt="Những lớp đồi thông cao nguyên ẩn hiện trong sương sớm"
            className="cxp01-plate-image"
          />
          <div className="cxp02-journey-scrim" />
        </div>
        <div className="cxp01-reduced-content" style={{ maxWidth: "46rem" }}>
          <span className="cxp02-eyebrow">Movement 05 · Hành trình của riêng bạn</span>
          <h2 className="cxp02-journey-headline">Từ cảm hứng. Thành nhịp đi của riêng bạn.</h2>
          <div className="cxp02-trip-switcher" role="group" aria-label="Chọn nhịp hành trình mẫu">
            {TRIPS.map((trip) => (
              <button
                key={trip.slug}
                type="button"
                className="cxp02-trip-pill"
                aria-pressed={trip.slug === sampleTrip.slug}
                onClick={() => setSelectedSlug(trip.slug)}
              >
                {trip.durationDays} ngày · {trip.pace}
              </button>
            ))}
          </div>
          <div className="cxp02-itinerary-preview" style={{ marginTop: "1.5rem" }}>
            {sampleTrip.days.map((day) => (
              <div key={day.day} className="cxp02-day-item">
                <span className="cxp02-day-label">Ngày 0{day.day}</span>
                <h3 className="cxp02-day-title">{day.title}</h3>
                <p className="cxp02-day-summary">{day.summary}</p>
              </div>
            ))}
          </div>
          <div className="cxp01-cta-group">
            <Link href={`/trips/${sampleTrip.slug}`} className="cxp01-primary-cta">
              Xem lịch trình mẫu {sampleTrip.durationDays} ngày
            </Link>
          </div>
        </div>
      </section>

      <section
        className="cxp02-reduced-concierge"
        aria-label="Movement 06 — AI Travel Concierge"
        data-concierge-inline="true"
      >
        <div className="cxp02-concierge-inner" style={{ marginInline: "auto" }}>
          <span className="cxp02-eyebrow">Movement 06 · ADORA Travel Concierge</span>
          <h2 className="cxp02-concierge-headline">Hành trình của bạn bắt đầu từ một câu hỏi.</h2>
          <p className="cxp02-concierge-copy">
            Mở ADORA Travel Concierge (bản xem trước kịch bản dựng sẵn cho Đà Lạt) để phác thảo hành trình mẫu.
          </p>
          <div className="cxp02-concierge-actions">
            <ConciergeTrigger href="/ai-planner" className="cxp01-primary-cta">
              Mở ADORA Travel Concierge
            </ConciergeTrigger>
            <Link href="/ai-planner" className="cxp01-secondary-cta">
              Đi tới trang AI Planner
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
