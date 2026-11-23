"use client";

import Link from "next/link";

import { formatVnd } from "@/lib/demo/trips";
import type {
  AtelierJourney,
  AtelierPhase,
  PreferenceFact,
  PreferenceKey,
} from "@/lib/concierge-atelier/types";

interface AtelierJourneyCanvasProps {
  phase: AtelierPhase;
  facts: PreferenceFact[];
  freeNotes: string[];
  journey: AtelierJourney;
  activeDay: number;
  onSelectDay: (day: number) => void;
  onEditPreference: (key: PreferenceKey) => void;
  onConfirmInference: (key: PreferenceKey) => void;
  onRevealJourney: () => void;
}

const STATUS_LABELS: Record<PreferenceFact["provenance"], string> = {
  confirmed: "Đã xác nhận",
  inferred: "Suy luận tạm",
  missing: "Còn mở",
};

export function AtelierJourneyCanvas({
  phase,
  facts,
  freeNotes,
  journey,
  activeDay,
  onSelectDay,
  onEditPreference,
  onConfirmInference,
  onRevealJourney,
}: Readonly<AtelierJourneyCanvasProps>) {
  const showJourney = phase === "reveal" || phase === "refinement";
  const currentDay = journey.days.find((d) => d.day === activeDay) ?? journey.days[0];

  return (
    <aside className="cxp04-canvas-col" aria-label="Không gian hành trình và chi phí minh hoạ">
      {/* Contextual Visual Mood Plate */}
      <div className="cxp04-canvas-hero">
        <img src={journey.coverSrc} alt={journey.coverAlt} />
        <div className="cxp04-canvas-hero-scrim" aria-hidden="true" />
        <div className="cxp04-canvas-hero-content">
          <span className="cxp04-eyebrow">
            {showJourney
              ? `Bản phác thảo minh hoạ · ${journey.durationDays} ngày · ${journey.cost.travelerCount} khách`
              : "Khung cảnh đang thành hình · Đà Lạt"}
          </span>
          <h2 className="cxp04-canvas-title">
            {showJourney ? journey.title : "Hồ sơ hành trình của riêng bạn"}
          </h2>
          <p className="cxp04-canvas-sub">
            {showJourney
              ? `${journey.paceLabel} · ${journey.accommodationAssumption}`
              : "Mỗi lựa chọn bạn xác nhận sẽ được tách bạch rõ ràng với các giả định tạm thời trước khi mở lịch trình."}
          </p>
        </div>
      </div>

      {/* State II & III: Interpretation Trust Ledger */}
      {!showJourney ? (
        <section className="cxp04-ledger" aria-label="Tóm tắt hiểu biết về chuyến đi">
          <span className="cxp04-eyebrow">
            {phase === "interpretation"
              ? "State III · Kiểm chứng trước khi phác thảo"
              : "Hồ sơ đang cập nhật"}
          </span>
          <div className="cxp04-ledger-list">
            {facts.map((fact) => (
              <div key={fact.key} className="cxp04-ledger-row">
                <div>
                  <div className="cxp04-ledger-key">{fact.label}</div>
                  <p className="cxp04-ledger-val">{fact.value ?? "Chưa xác định"}</p>
                  {fact.rationale ? (
                    <p className="cxp04-ledger-rationale">{fact.rationale}</p>
                  ) : null}
                </div>
                <div className="cxp04-ledger-controls">
                  <span className="cxp04-status-pill" data-status={fact.provenance}>
                    {STATUS_LABELS[fact.provenance]}
                  </span>
                  {fact.provenance === "inferred" ? (
                    <button
                      type="button"
                      className="cxp04-inline-btn"
                      onClick={() => onConfirmInference(fact.key)}
                    >
                      Xác nhận
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="cxp04-inline-btn"
                    onClick={() => onEditPreference(fact.key)}
                  >
                    Sửa<span className="sr-only"> {fact.label}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {freeNotes.length > 0 ? (
            <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid rgba(244,239,230,0.12)" }}>
              <div className="cxp04-ledger-key">Ghi chú tự do · giữ nguyên văn</div>
              <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.1rem", fontSize: "0.82rem", color: "rgba(244,239,230,0.82)" }}>
                {freeNotes.map((note, idx) => (
                  <li key={`${idx}-${note.slice(0, 12)}`}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {phase === "interpretation" ? (
            <div style={{ marginTop: "1.35rem", display: "flex", flexWrap: "wrap", gap: "0.85rem", alignItems: "center" }}>
              <button
                type="button"
                className="cxp04-primary-btn"
                onClick={onRevealJourney}
                data-cxp04-reveal-btn
              >
                Mở bản phác thảo hành trình
              </button>
              <span style={{ fontSize: "0.74rem", color: "rgba(244,239,230,0.65)" }}>
                Bản mẫu Đà Lạt dựng sẵn · có thể tinh chỉnh sau khi mở.
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* State IV & V: Day-by-Day Editorial Reveal & Transparent Cost Composition */}
      {showJourney && currentDay ? (
        <>
          {journey.appliedRefinements.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }} aria-label="Các tinh chỉnh đang áp dụng">
              {journey.appliedRefinements.map((tag) => (
                <span key={tag} className="cxp04-status-pill" data-status="confirmed">
                  ✓ {tag}
                </span>
              ))}
            </div>
          ) : null}

          <section aria-label="Lịch trình minh hoạ từng ngày">
            <div className="cxp04-day-tabs" role="tablist" aria-label="Chọn ngày trong hành trình">
              {journey.days.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  role="tab"
                  aria-selected={d.day === currentDay.day}
                  className="cxp04-day-tab"
                  onClick={() => onSelectDay(d.day)}
                >
                  Ngày 0{d.day}
                </button>
              ))}
            </div>

            <div className="cxp04-day-panel" role="tabpanel" style={{ marginTop: "0.85rem" }}>
              <div className="cxp04-day-media">
                <img src={currentDay.moodImageSrc} alt={currentDay.moodImageAlt} />
              </div>
              <div className="cxp04-day-body">
                <span className="cxp04-eyebrow">Ngày 0{currentDay.day} · {journey.destinationName}</span>
                <h3 className="cxp04-day-title">{currentDay.title}</h3>
                <p className="cxp04-canvas-sub">{currentDay.summary}</p>

                <ol className="cxp04-activity-list">
                  {currentDay.activities.map((act) => (
                    <li key={act.id} className="cxp04-activity-item">
                      <div className="cxp04-activity-meta">
                        {act.periodLabel} · {act.timeWindow} · {act.locationNote}
                      </div>
                      <h4 className="cxp04-activity-title">{act.title}</h4>
                      <p className="cxp04-activity-desc">{act.summary}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          {/* Transparent VND Cost Composition */}
          <section className="cxp04-cost-card" aria-label="Cấu trúc chi phí minh hoạ">
            <div className="cxp04-cost-header">
              <div>
                <span className="cxp04-eyebrow">Ước tính minh hoạ — không phải báo giá trực tiếp</span>
                <div className="cxp04-cost-per-person">
                  Giả định cho {journey.cost.travelerCount} khách · ~{formatVnd(journey.cost.perPersonVnd)} / người
                </div>
              </div>
              <div className="cxp04-cost-total" data-cxp04-cost-total>
                {formatVnd(journey.cost.totalVnd)}
              </div>
            </div>

            <div className="cxp04-cost-bar" aria-hidden="true">
              {journey.cost.items.map((item) => (
                <span
                  key={item.category}
                  className="cxp04-cost-seg"
                  data-cat={item.category}
                  style={{ width: `${(item.amountVnd / Math.max(1, journey.cost.totalVnd)) * 100}%` }}
                />
              ))}
            </div>

            <div className="cxp04-cost-rows">
              {journey.cost.items.map((item) => (
                <div key={item.category} className="cxp04-cost-row">
                  <div>
                    <div className="cxp04-cost-row-label">{item.label}</div>
                    <div className="cxp04-cost-row-assumption">{item.assumption}</div>
                  </div>
                  <div className="cxp04-cost-row-amt">{formatVnd(item.amountVnd)}</div>
                </div>
              ))}
            </div>

            <div className="cxp04-cost-disclaimer">
              <strong>Độ dao động ước tính:</strong> {journey.cost.uncertaintyRange}.
              <div style={{ marginTop: "0.4rem" }}>
                <strong>Không bao gồm:</strong>
                <ul>
                  {journey.cost.exclusions.map((ex) => (
                    <li key={ex}>{ex}</li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: "0.85rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                <Link
                  href={`/trips/${journey.slug}`}
                  style={{ color: "#e4c68c", textDecoration: "underline", fontWeight: 600 }}
                >
                  Xem trang lịch trình mẫu đầy đủ ↗
                </Link>
                <Link
                  href="/destinations/da-lat"
                  style={{ color: "#f4efe6", textDecoration: "underline" }}
                >
                  Khám phá điểm đến Đà Lạt
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </aside>
  );
}
