"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useReducer, useRef, type Dispatch, type RefObject } from "react";

import "@/app/creative-lab/concierge-experience/concierge-atelier.css";
import { AtelierJourneyCanvas } from "@/components/creative-lab/concierge-atelier/atelier-journey-canvas";
import {
  ATELIER_QUESTIONS,
  atelierReducer,
  buildAtelierJourney,
  deriveInterpretation,
  initialAtelierState,
  REFINEMENT_OPTIONS,
  type AtelierAction,
} from "@/lib/concierge-atelier/engine";
import type { AtelierState } from "@/lib/concierge-atelier/types";

const PHASE_LABELS: Record<string, string> = {
  invitation: "Lời mời",
  discovery: "Bước 01 · Khám phá có dẫn dắt",
  interpretation: "Bước 02 · Kiểm chứng hiểu biết",
  reveal: "Bước 03 · Phác thảo hành trình",
  refinement: "Bước 04 · Tinh chỉnh cộng tác",
};

export interface ConciergeAtelierExperienceProps {
  variant?: "lab" | "overlay" | "route";
  externalState?: AtelierState;
  externalDispatch?: Dispatch<AtelierAction>;
  onClose?: () => void;
  onNavigateAway?: () => void;
  titleId?: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}

export function ConciergeAtelierExperience({
  variant = "lab",
  externalState,
  externalDispatch,
  onClose,
  onNavigateAway,
  titleId,
  headingRef,
}: Readonly<ConciergeAtelierExperienceProps> = {}) {
  const [localState, localDispatch] = useReducer(atelierReducer, initialAtelierState);
  const state = externalState ?? localState;
  const dispatch = externalDispatch ?? localDispatch;
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const isOverlay = variant === "overlay";
  const isRoute = variant === "route";
  const isLab = variant === "lab";

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

  const RootTag = isOverlay ? "div" : "main";
  const HeadingTag = isOverlay ? "h2" : "h1";

  return (
    <RootTag
      id={isOverlay ? undefined : "main-content"}
      className={`cxp04-root ${isOverlay ? "cxp04-root--overlay" : ""}`}
      data-cxp04-phase={state.phase}
      data-cxp04-variant={variant}
    >
      {/* Top Studio Header */}
      <header className="cxp04-topbar">
        <div className="cxp04-brand-group">
          {isOverlay ? (
            <span className="cxp04-brand">ADORA</span>
          ) : (
            <Link href="/" className="cxp04-brand" aria-label="ADORA — trở về trang chủ">
              ADORA
            </Link>
          )}
          <span className="cxp04-badge">Personal Journey Atelier</span>
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
          {isOverlay ? (
            <>
              <Link
                href="/ai-planner"
                className="cxp04-top-link cxp04-hide-sm"
                onClick={() => onNavigateAway?.()}
              >
                Mở trang riêng ↗
              </Link>
              <button
                type="button"
                className="cxp04-close-btn"
                aria-label="Đóng Travel Concierge"
                onClick={() => onClose?.()}
                data-cxp04-close-btn
              >
                Đóng ×
              </button>
            </>
          ) : (
            <Link href="/" className="cxp04-top-link">
              ← Trang chủ
            </Link>
          )}
        </div>
      </header>

      {/* STATE I — THE INVITATION */}
      {state.phase === "invitation" ? (
        <section className="cxp04-invitation" aria-label="Lời mời thiết kế hành trình">
          <div className="cxp04-invitation-bg" aria-hidden="true">
            <Image
              src="/images/cxp01/highland-world.jpg"
              alt=""
              fill
              priority={!isOverlay}
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "center 45%" }}
            />
          </div>
          <div className="cxp04-invitation-scrim" aria-hidden="true" />

          <div className="cxp04-invitation-card">
            <span className="cxp04-eyebrow">ADORA · Personal Journey Atelier</span>
            <HeadingTag
              id={titleId}
              ref={headingRef}
              tabIndex={isOverlay ? -1 : undefined}
              className="cxp04-invitation-title"
            >
              Thiết kế một hành trình vừa vặn với nhịp thở của riêng bạn.
            </HeadingTag>
            <p className="cxp04-invitation-lead">
              Bắt đầu từ cảm giác bạn muốn giữ lại — Atelier lắng nghe từng bước, tách bạch giả định trước khi mở lịch trình và chi phí minh bạch.
            </p>

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

            <div className="cxp04-preset-wrap">
              <div className="cxp04-preset-heading">
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
                  Không yêu cầu tuổi, giới tính hay thông tin nhạy cảm. Dữ liệu chỉ tồn tại trong phiên này.
                </p>
              </div>
              <div>
                <div className="cxp04-pillar-title">03 · Chi phí minh bạch</div>
                <p className="cxp04-pillar-text">
                  Tách bạch từng hạng mục VND, giả định và khoản chưa bao gồm — luôn gắn nhãn ước tính minh hoạ.
                </p>
              </div>
            </div>

            <p className="cxp04-disclosure-inline">
              <strong>Lưu ý minh bạch:</strong> Bản xem trước tương tác sử dụng kịch bản dựng sẵn cho Đà Lạt — chưa kết nối AI trực tiếp, không phải báo giá hay đặt chỗ thực tế.
              {isLab && !isRoute ? (
                <>
                  {" "}
                  <Link href="/ai-planner" style={{ color: "#e4c68c", textDecoration: "underline" }}>
                    Mở trang AI Planner
                  </Link>
                  .
                </>
              ) : null}
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
                <HeadingTag
                  id={titleId}
                  ref={headingRef}
                  tabIndex={isOverlay ? -1 : undefined}
                  className="sr-only"
                >
                  ADORA Personal Journey Atelier
                </HeadingTag>
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
                      Kiểm chứng hiểu biết · Sẵn sàng mở phác thảo
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
                      Tinh chỉnh cộng tác
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
              onNavigateLink={onNavigateAway}
            />
          </div>
        </>
      )}
    </RootTag>
  );
}
