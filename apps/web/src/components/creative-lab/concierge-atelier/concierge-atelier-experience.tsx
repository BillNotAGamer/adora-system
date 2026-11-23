"use client";

import Link from "next/link";
import { useMemo, useReducer, useRef } from "react";

import "@/app/creative-lab/concierge-experience/concierge-atelier.css";
import { AtelierJourneyCanvas } from "@/components/creative-lab/concierge-atelier/atelier-journey-canvas";
import {
  ATELIER_QUESTIONS,
  atelierReducer,
  buildAtelierJourney,
  deriveInterpretation,
  initialAtelierState,
  REFINEMENT_OPTIONS,
} from "@/lib/concierge-atelier/engine";

const PHASE_LABELS: Record<string, string> = {
  invitation: "State I · Lời mời",
  discovery: "State II · Khám phá có dẫn dắt",
  interpretation: "State III · Kiểm chứng hiểu biết",
  reveal: "State IV · Phác thảo hành trình",
  refinement: "State V · Tinh chỉnh cộng tác",
};

export function ConciergeAtelierExperience() {
  const [state, dispatch] = useReducer(atelierReducer, initialAtelierState);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const facts = useMemo(() => deriveInterpretation(state), [state]);
  const journey = useMemo(() => buildAtelierJourney(state), [state]);
  const intentionChoices = ATELIER_QUESTIONS[0]?.choices ?? [];
  const activeQuestion = ATELIER_QUESTIONS[state.stepIndex] ?? ATELIER_QUESTIONS[0];

  const isChoiceSelected = (key: string, id: string): boolean => {
    if (key === "intention") return state.answers.intention.includes(id);
    return state.answers[key as keyof typeof state.answers] === id;
  };

  const isRefinementActive = (id: string): boolean => {
    if (id === "slower-pace") return state.refinements.slowerPace;
    if (id === "lower-budget") return state.refinements.lowerBudget;
    if (id === "coffee-culture") return state.refinements.coffeeCulture;
    if (id === "group-four") return state.refinements.groupFour;
    return false;
  };

  const stageStepNum =
    state.phase === "discovery"
      ? 1
      : state.phase === "interpretation"
        ? 2
        : state.phase === "reveal"
          ? 3
          : state.phase === "refinement"
            ? 4
            : 0;

  return (
    <main id="main-content" className="cxp04-root" data-cxp04-phase={state.phase}>
      {/* Top Studio Header */}
      <header className="cxp04-topbar">
        <div className="cxp04-brand-group">
          <Link href="/" className="cxp04-brand" aria-label="ADORA — trở về trang chủ">
            ADORA
          </Link>
          <span className="cxp04-badge">Personal Journey Atelier · CXP-04A Preview</span>
        </div>
        <div className="cxp04-topbar-actions">
          {state.phase !== "invitation" ? (
            <button
              type="button"
              className="cxp04-top-link"
              onClick={() => dispatch({ type: "reset" })}
            >
              Bắt đầu lại
            </button>
          ) : null}
          <Link href="/ai-planner" className="cxp04-top-link">
            AI Planner (UX-1)
          </Link>
          <Link href="/" className="cxp04-top-link">
            Trang chủ
          </Link>
        </div>
      </header>

      {/* STATE I — THE INVITATION */}
      {state.phase === "invitation" ? (
        <section className="cxp04-invitation" aria-label="State I — Lời mời thiết kế hành trình">
          <div className="cxp04-invitation-bg" aria-hidden="true">
            <img
              src="/images/cxp01/highland-world.jpg"
              alt=""
              fetchPriority="high"
            />
          </div>
          <div className="cxp04-invitation-scrim" aria-hidden="true" />

          <div className="cxp04-invitation-card">
            <span className="cxp04-eyebrow">ADORA Travel Concierge · The Personal Journey Atelier</span>
            <h1 className="cxp04-invitation-title">
              Thiết kế một hành trình vừa vặn với nhịp thở của riêng bạn.
            </h1>
            <p className="cxp04-invitation-lead">
              Thay vì điền biểu mẫu dài hay nhận một danh sách địa điểm rập khuôn, hãy bắt đầu bằng cảm giác bạn muốn giữ lại. Atelier sẽ lắng nghe từng bước, tóm tắt điều đã hiểu, rồi phác thảo lịch trình cùng cấu trúc chi phí minh bạch.
            </p>

            <div className="cxp04-invitation-pillars">
              <div>
                <div className="cxp04-pillar-title">01 · Đối thoại có nhịp</div>
                <p className="cxp04-pillar-text">
                  Câu hỏi tự thích ứng theo mục đích chuyến đi; bạn có thể bỏ qua hoặc sửa bất cứ lúc nào.
                </p>
              </div>
              <div>
                <div className="cxp04-pillar-title">02 · Tôn trọng riêng tư</div>
                <p className="cxp04-pillar-text">
                  Không yêu cầu tuổi, giới tính hay thông tin nhạy cảm. Dữ liệu chỉ tồn tại trong phiên thử này.
                </p>
              </div>
              <div>
                <div className="cxp04-pillar-title">03 · Chi phí minh bạch</div>
                <p className="cxp04-pillar-text">
                  Tách bạch từng hạng mục VND, giả định và khoản chưa bao gồm — luôn gắn nhãn ước tính minh hoạ.
                </p>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(244,239,230,0.68)", fontWeight: 600 }}>
                Hoặc chạm vào một cảm hứng để bắt đầu ngay:
              </div>
              <div className="cxp04-preset-row">
                {intentionChoices.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="cxp04-preset-chip"
                    onClick={() => dispatch({ type: "start", presetIntention: c.id })}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="cxp04-invitation-actions">
              <button
                type="button"
                className="cxp04-primary-btn"
                onClick={() => dispatch({ type: "start" })}
                data-cxp04-start-btn
              >
                Bắt đầu phác thảo hành trình →
              </button>
            </div>

            <p className="cxp04-disclosure-inline">
              <strong>Lưu ý minh bạch:</strong> Đây là nguyên mẫu tương tác sử dụng kịch bản dựng sẵn cho Đà Lạt — chưa kết nối mô hình AI trực tiếp, không phải báo giá hay hệ thống đặt chỗ thực tế.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* Mobile Tab Switcher (Conversation <-> Journey Canvas) */}
          <div className="cxp04-mobile-switcher" role="tablist" aria-label="Chuyển đổi góc nhìn">
            <button
              type="button"
              role="tab"
              aria-selected={state.mobileView === "conversation"}
              className="cxp04-mobile-tab"
              onClick={() => dispatch({ type: "set_mobile_view", view: "conversation" })}
            >
              Trò chuyện
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={state.mobileView === "canvas"}
              className="cxp04-mobile-tab"
              onClick={() => dispatch({ type: "set_mobile_view", view: "canvas" })}
            >
              {state.phase === "reveal" || state.phase === "refinement"
                ? `Hành trình (${journey.durationDays} ngày)`
                : "Hồ sơ & Tóm tắt"}
            </button>
          </div>

          <div className="cxp04-workspace" data-mobile-view={state.mobileView}>
            {/* Left Column: Conversational Atelier */}
            <section className="cxp04-dialogue-col" aria-label="Đối thoại thiết kế hành trình">
              <div className="cxp04-stage-strip">
                <h1 className="sr-only">ADORA Personal Journey Atelier</h1>
                <span>{PHASE_LABELS[state.phase]}</span>
                <div className="cxp04-stage-dots" aria-hidden="true">
                  {[1, 2, 3, 4].map((dot) => (
                    <span
                      key={dot}
                      className="cxp04-stage-dot"
                      data-active={stageStepNum === dot}
                      data-done={stageStepNum > dot}
                    />
                  ))}
                </div>
              </div>

              <div className="cxp04-dialogue-scroll">
                <div
                  className="cxp04-thread"
                  role="log"
                  aria-label="Lịch sử đối thoại Atelier"
                  aria-live="polite"
                  aria-relevant="additions text"
                >
                  {state.messages.map((msg) => (
                    <article
                      key={msg.id}
                      className="cxp04-msg"
                      data-role={msg.role}
                      data-provenance={msg.provenance}
                    >
                      <p className="cxp04-msg-eyebrow">{msg.eyebrow}</p>
                      <p>{msg.text}</p>
                    </article>
                  ))}
                </div>

                {/* State II: Active Guided Discovery Card */}
                {state.phase === "discovery" && activeQuestion ? (
                  <div className="cxp04-question-card" data-cxp04-question={activeQuestion.key}>
                    <span className="cxp04-eyebrow" style={{ color: "#586c65" }}>
                      {state.editingKey ? `Chỉnh sửa · ${activeQuestion.eyebrow}` : activeQuestion.eyebrow}
                    </span>
                    <h2 className="cxp04-question-title">{activeQuestion.title}</h2>
                    <p className="cxp04-question-hint">{activeQuestion.hint}</p>

                    <div className="cxp04-choice-grid">
                      {activeQuestion.choices.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          className="cxp04-choice-btn"
                          aria-pressed={isChoiceSelected(activeQuestion.key, choice.id)}
                          onClick={() =>
                            dispatch({
                              type: "select_choice",
                              key: activeQuestion.key,
                              value: choice.id,
                            })
                          }
                        >
                          <span className="cxp04-choice-label">{choice.label}</span>
                          {choice.detail ? (
                            <span className="cxp04-choice-detail">{choice.detail}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>

                    {state.error ? (
                      <p className="cxp04-error" role="alert">
                        {state.error}
                      </p>
                    ) : null}

                    <div className="cxp04-question-actions">
                      <button
                        type="button"
                        className="cxp04-dark-btn"
                        onClick={() => dispatch({ type: "next_step" })}
                        data-cxp04-next-btn
                      >
                        {state.editingKey ? "Lưu thay đổi" : "Tiếp tục →"}
                      </button>
                      <button
                        type="button"
                        className="cxp04-ghost-btn"
                        onClick={() => dispatch({ type: "skip_step" })}
                      >
                        {activeQuestion.optional ? "Bỏ qua mục tuỳ chọn" : "Bỏ qua"}
                      </button>
                      {!state.editingKey ? (
                        <button
                          type="button"
                          className="cxp04-ghost-btn"
                          onClick={() => dispatch({ type: "go_interpretation" })}
                        >
                          Xem tóm tắt ngay
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {/* State III: Prompt to review & reveal on mobile or desktop */}
                {state.phase === "interpretation" ? (
                  <div className="cxp04-question-card">
                    <span className="cxp04-eyebrow" style={{ color: "#586c65" }}>
                      State III · Sẵn sàng mở phác thảo
                    </span>
                    <h2 className="cxp04-question-title">
                      Mọi thông tin bạn chọn đã được tách rõ với các giả định tạm thời.
                    </h2>
                    <p className="cxp04-question-hint">
                      Bạn có thể bấm “Xác nhận” hoặc “Sửa” ở bảng Hồ sơ (hoặc tab Hồ sơ trên di động) trước khi xem hành trình và chi phí minh hoạ.
                    </p>
                    <div className="cxp04-question-actions">
                      <button
                        type="button"
                        className="cxp04-dark-btn"
                        onClick={() => dispatch({ type: "reveal_journey" })}
                      >
                        Mở bản phác thảo hành trình →
                      </button>
                      <button
                        type="button"
                        className="cxp04-ghost-btn"
                        onClick={() => dispatch({ type: "set_mobile_view", view: "canvas" })}
                      >
                        Kiểm tra bảng tóm tắt
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* State IV & V: Collaborative Refinement Box */}
                {state.phase === "reveal" || state.phase === "refinement" ? (
                  <div className="cxp04-refinement-box" aria-label="Tinh chỉnh hành trình">
                    <span className="cxp04-eyebrow" style={{ color: "#586c65" }}>
                      State V · Tinh chỉnh cộng tác
                    </span>
                    <p className="cxp04-question-hint" style={{ marginTop: "0.4rem" }}>
                      Thử thay đổi nhịp đi, ngân sách, số ngày hoặc nhóm khách — lịch trình và cấu trúc chi phí minh hoạ sẽ cập nhật tức thì.
                    </p>
                    <div className="cxp04-refinement-chips">
                      {REFINEMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          className="cxp04-refine-chip"
                          aria-pressed={isRefinementActive(opt.id)}
                          onClick={() => dispatch({ type: "apply_refinement", kind: opt.id })}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Sticky Natural-Language Composer */}
              <form
                className="cxp04-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  dispatch({ type: "submit_text", text: state.draft });
                }}
              >
                <label htmlFor="cxp04-composer-input" className="cxp04-composer-label">
                  Ghi chú hoặc yêu cầu tinh chỉnh tự do · Bản mẫu kịch bản
                </label>
                <div className="cxp04-composer-row">
                  <textarea
                    id="cxp04-composer-input"
                    ref={composerRef}
                    rows={2}
                    maxLength={1000}
                    value={state.draft}
                    placeholder="Ví dụ: “Làm nhịp đi chậm hơn” hoặc ghi chú riêng của bạn…"
                    onChange={(e) => dispatch({ type: "draft", value: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        dispatch({ type: "submit_text", text: state.draft });
                      }
                    }}
                  />
                  <button type="submit" className="cxp04-dark-btn" aria-label="Gửi ghi chú">
                    Gửi ↗
                  </button>
                </div>
                <p className="cxp04-composer-note">
                  Enter để gửi · Shift+Enter xuống dòng. Bản mẫu chưa kết nối AI trực tiếp — yêu cầu ngoài kịch bản sẽ được giữ nguyên làm ghi chú.
                </p>
              </form>
            </section>

            {/* Right Column: Living Journey Canvas */}
            <AtelierJourneyCanvas
              phase={state.phase}
              facts={facts}
              freeNotes={state.freeNotes}
              journey={journey}
              activeDay={state.activeDay}
              onSelectDay={(day) => dispatch({ type: "set_day", day })}
              onEditPreference={(key) => dispatch({ type: "edit_preference", key })}
              onConfirmInference={(key) => dispatch({ type: "confirm_inference", key })}
              onRevealJourney={() => dispatch({ type: "reveal_journey" })}
            />
          </div>
        </>
      )}
    </main>
  );
}
