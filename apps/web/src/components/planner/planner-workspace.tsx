"use client";

import { Bot, Compass, MapPin, Menu, MessageSquarePlus, Send, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { UNSUPPORTED_PROMPT_REPLY, matchScenario } from "@/lib/demo/planner-scenarios";
import type { DemoImage, PlannerScenario } from "@/lib/demo/types";

/** Serializable subset of a trip, built on the server so the client island stays small. */
export type TripPreview = {
  slug: string;
  title: string;
  destinationName: string;
  durationDays: number;
  statusLabel: string;
  cover: DemoImage;
  days: { day: number; title: string; summary: string }[];
};

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; kind: "scripted"; scenarioId: string }
  | { id: number; role: "assistant"; kind: "unsupported" };

type PlannerWorkspaceProps = {
  scenarios: PlannerScenario[];
  previews: Record<string, TripPreview>;
};

const DISCOVER_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/destinations", label: "Điểm đến" },
  { href: "/experiences", label: "Trải nghiệm" },
  { href: "/trips", label: "Chuyến đi mẫu" },
];

function DemoLabel({ children }: Readonly<{ children: string }>) {
  return (
    <span className="inline-flex min-h-6 items-center gap-2 border border-[var(--adora-gold)]/60 px-2.5 text-[0.62rem] font-bold tracking-[0.12em] text-[var(--adora-text-secondary)] uppercase">
      <span className="size-1.5 rounded-full bg-[var(--adora-gold)]" aria-hidden="true" />
      {children}
    </span>
  );
}

function markEnteredOnAnimationEnd(event: AnimationEvent<HTMLElement>) {
  if (event.target === event.currentTarget) {
    event.currentTarget.dataset.entered = "true";
  }
}

/**
 * Scripted planner demonstration. Local React state only: no network request, persistence, or model
 * is involved. Only exact matches of predefined prompts produce a scripted reply.
 */
export function PlannerWorkspace({ scenarios, previews }: Readonly<PlannerWorkspaceProps>) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const nextId = useRef(1);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const latestTurnRef = useRef<HTMLElement>(null);
  const mobilePreviewRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastWelcomePointerTypeRef = useRef<string | null>(null);
  const pendingSuggestionFocusRef = useRef<"prompt" | "turn" | null>(null);

  const activeScenario = scenarios.find((scenario) => scenario.id === activeScenarioId) ?? null;
  const preview = activeScenario ? previews[activeScenario.tripSlug] : undefined;

  useEffect(() => {
    const root = workspaceRef.current;
    return () => {
      if (!root) return;
      for (const element of root.querySelectorAll<HTMLElement>("[data-planner-enter]")) {
        element.dataset.entered = "true";
      }
    };
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    if (messages.length === 0) {
      log.scrollTop = 0;
      return;
    }
    const latestTurn = latestTurnRef.current;
    if (latestTurn) {
      const logRect = log.getBoundingClientRect();
      const turnRect = latestTurn.getBoundingClientRect();
      const targetTop = log.scrollTop + (turnRect.top - logRect.top) - 12;
      log.scrollTop = Math.max(0, targetTop);
    } else {
      log.scrollTop = log.scrollHeight;
    }

    const pendingFocus = pendingSuggestionFocusRef.current;
    if (pendingFocus) {
      pendingSuggestionFocusRef.current = null;
      if (pendingFocus === "turn") {
        latestTurnRef.current?.focus({ preventScroll: true });
      } else {
        textareaRef.current?.focus({ preventScroll: true });
      }
    }
  }, [messages]);

  function scrollToElement(element: HTMLElement | null) {
    const log = logRef.current;
    if (!log || !element) return;
    const logRect = log.getBoundingClientRect();
    const targetRect = element.getBoundingClientRect();
    const top = Math.max(0, log.scrollTop + (targetRect.top - logRect.top) - 12);
    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motion === "off";
    if (typeof log.scrollTo === "function") {
      log.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    } else {
      log.scrollTop = top;
    }
  }

  useEffect(() => {
    if (menuOpen) closeButtonRef.current?.focus();
  }, [menuOpen]);

  function closeMenu(returnFocus: boolean) {
    setMenuOpen(false);
    if (returnFocus) menuButtonRef.current?.focus();
  }

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const scenario = matchScenario(trimmed);
    const userId = nextId.current++;
    const replyId = nextId.current++;
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text: trimmed },
      scenario
        ? { id: replyId, role: "assistant", kind: "scripted", scenarioId: scenario.id }
        : { id: replyId, role: "assistant", kind: "unsupported" },
    ]);
    if (scenario) setActiveScenarioId(scenario.id);
    setDraft("");
  }

  function onWelcomeSuggestionPointerDown(event: PointerEvent<HTMLButtonElement>) {
    lastWelcomePointerTypeRef.current = event.pointerType || "mouse";
  }

  function onWelcomeSuggestionClick(prompt: string) {
    const pointerType = lastWelcomePointerTypeRef.current;
    lastWelcomePointerTypeRef.current = null;
    pendingSuggestionFocusRef.current = pointerType === "touch" ? "turn" : "prompt";
    submit(prompt);
  }

  function startNewConversation() {
    setMessages([]);
    setActiveScenarioId(null);
    setDraft("");
    nextId.current = 1;
    pendingSuggestionFocusRef.current = null;
    closeMenu(false);
    textareaRef.current?.focus();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(draft);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Never submit while an input method (e.g. Vietnamese Telex/VNI) is composing a character.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit(draft);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div ref={workspaceRef} className="flex h-dvh w-full overflow-hidden bg-[var(--adora-paper)] text-[var(--adora-ink)]">
      <aside
        aria-label="Thanh bên AI Planner"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) closeMenu(true);
        }}
        className={`${menuOpen ? "fixed inset-0 z-50 flex" : "hidden"} w-full shrink-0 flex-col overflow-y-auto bg-[var(--adora-ink)] p-6 text-[var(--adora-ivory)] md:static md:z-auto md:flex md:w-72`}
      >
        <div className="flex items-center justify-between">
          <Link href="/" className="text-base font-bold tracking-[0.34em]" aria-label="ADORA — về trang chủ">
            ADORA
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => closeMenu(true)}
            className="inline-flex size-11 items-center justify-center border border-white/30 md:hidden"
            aria-label="Đóng thanh bên"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={startNewConversation}
          className="light-cta mt-8 flex min-h-12 w-full items-center justify-center gap-2 px-4 text-xs font-bold tracking-[0.1em]"
        >
          <MessageSquarePlus className="size-4" aria-hidden="true" />
          Cuộc trò chuyện demo mới
        </button>

        <section className="mt-8" aria-labelledby="suggested-heading">
          <h2 id="suggested-heading" className="text-[0.66rem] font-bold tracking-[0.16em] text-white/55 uppercase">
            Gợi ý cuộc trò chuyện
          </h2>
          <p className="mt-2 text-xs leading-5 text-white/55">Kịch bản dựng sẵn, không phải lịch sử của tài khoản.</p>
          <ul className="mt-3 grid gap-1">
            {scenarios.map((scenario) => (
              <li key={scenario.id}>
                <button
                  type="button"
                  onClick={() => {
                    submit(scenario.prompt);
                    closeMenu(false);
                  }}
                  className="min-h-11 w-full px-3 py-2 text-left text-sm leading-5 text-white/80 transition-colors hover:bg-white/8 hover:text-white"
                >
                  {scenario.prompt}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-label="Khám phá ADORA" className="mt-8">
          <h2 className="text-[0.66rem] font-bold tracking-[0.16em] text-white/55 uppercase">Khám phá</h2>
          <ul className="mt-3 grid gap-1">
            {DISCOVER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="flex min-h-11 items-center px-3 text-sm text-white/80 transition-colors hover:bg-white/8 hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-auto flex items-center gap-3 border-t border-white/15 pt-5">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/10" aria-hidden="true">
            <UserRound className="size-4" />
          </span>
          <p className="text-xs leading-5 text-white/60">
            Tài khoản
            <span className="block text-white/40">Chưa kết nối · khu vực giữ chỗ</span>
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1">
        <section aria-label="Cuộc trò chuyện với ADORA Planner" className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center gap-3 border-b border-[var(--adora-hairline)] bg-[var(--adora-paper)] px-4 py-2.5 sm:min-h-[4.25rem] sm:px-7">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-label="Mở thanh bên"
              className="inline-flex size-11 shrink-0 items-center justify-center border border-[var(--adora-hairline)] md:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold sm:text-lg">ADORA AI Travel Planner</h1>
              <p className="truncate text-xs text-[var(--adora-text-secondary)] sm:text-sm">Chế độ demo · kịch bản dựng sẵn · chưa kết nối mô hình AI</p>
            </div>
            <span className="hidden sm:block">
              <DemoLabel>Chế độ demo</DemoLabel>
            </span>
          </header>

          {preview ? (
            <nav
              aria-label="Điều hướng kịch bản và xem trước lịch trình"
              data-testid="mobile-planner-jumpbar"
              data-planner-enter="jumpbar"
              onAnimationEnd={markEnteredOnAnimationEnd}
              className="flex items-center justify-between gap-2 border-b border-[var(--adora-hairline)] bg-[var(--adora-ivory)]/80 px-4 py-1.5 text-[0.72rem] xl:hidden sm:px-7 sm:text-xs"
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => scrollToElement(latestTurnRef.current)}
                  className="border border-[var(--adora-hairline)] bg-white/80 px-2 py-1 font-semibold text-[var(--adora-ink)] transition-colors hover:border-[var(--adora-ink)] sm:px-2.5"
                >
                  Phản hồi kịch bản
                </button>
                <button
                  type="button"
                  onClick={() => scrollToElement(mobilePreviewRef.current)}
                  className="border border-[var(--adora-hairline)] bg-white/80 px-2 py-1 font-semibold text-[var(--adora-ink)] transition-colors hover:border-[var(--adora-ink)] sm:px-2.5"
                >
                  Xem trước ({preview.durationDays} ngày)
                </button>
              </div>
              <Link href={`/trips/${preview.slug}`} className="shrink-0 font-bold tracking-[0.06em] text-[var(--adora-ink)] uppercase underline underline-offset-4">
                Lịch trình ↗
              </Link>
            </nav>
          ) : null}

          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-label="Nội dung cuộc trò chuyện"
            className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 sm:px-7 sm:py-6 lg:px-12"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:gap-5">
              {isEmpty ? (
                <div>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center bg-[var(--adora-ink)] text-[var(--adora-gold)]" aria-hidden="true">
                      <Bot className="size-4" />
                    </span>
                    <p className="adora-eyebrow text-[var(--adora-sage)]">Bản demo có kịch bản</p>
                  </div>
                  <h2 className="font-editorial mt-3 text-[clamp(1.8rem,3.6vw,2.85rem)] leading-[1.04] tracking-[-0.035em]">
                    Bạn muốn đi đâu tiếp theo?
                  </h2>
                  <p className="mt-2.5 max-w-xl text-sm leading-6 text-[var(--adora-text-secondary)]">
                    ADORA chưa kết nối mô hình AI. Hãy chọn một gợi ý dựng sẵn bên dưới để xem cách một cuộc trò chuyện lập kế hoạch sẽ trông như thế nào.
                  </p>
                  <ul className="mt-4 grid gap-2.5 sm:mt-5 sm:grid-cols-2" aria-label="Gợi ý câu hỏi">
                    {scenarios.map((scenario) => (
                      <li key={scenario.id}>
                        <button
                          type="button"
                          onPointerDown={onWelcomeSuggestionPointerDown}
                          onClick={() => onWelcomeSuggestionClick(scenario.prompt)}
                          className="group flex w-full items-start gap-3 border border-[var(--adora-hairline)] bg-white/50 p-3.5 text-left transition-colors hover:border-[var(--adora-ink)] sm:min-h-20 sm:flex-col sm:p-4"
                        >
                          <Compass className="mt-0.5 size-4 shrink-0 text-[var(--adora-gold)] sm:mt-0 sm:size-5" aria-hidden="true" />
                          <span className="text-sm leading-5 font-semibold sm:leading-6">{scenario.prompt}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <article aria-label="ADORA Planner" className="max-w-xl border border-[var(--adora-hairline)] bg-white/60 p-4 text-sm leading-6 sm:p-5 sm:leading-7">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-[0.68rem] font-bold tracking-[0.14em] uppercase">ADORA Planner</span>
                  <DemoLabel>Tin nhắn mở đầu · dựng sẵn</DemoLabel>
                </div>
                <p>
                  Xin chào! Mình là ADORA Planner ở chế độ demo. Mình chưa kết nối mô hình AI, nhưng có thể trình diễn một kịch bản lập kế hoạch dựng sẵn. Hãy chọn một gợi ý để bắt đầu.
                </p>
              </article>

              {messages.map((message, index) => {
                if (message.role === "user") {
                  const isLatestUserMessage = index >= messages.length - 2;
                  const matchedScenario = matchScenario(message.text);
                  return (
                    <article
                      key={message.id}
                      ref={isLatestUserMessage ? latestTurnRef : undefined}
                      aria-label="Bạn"
                      tabIndex={-1}
                      data-planner-enter="user"
                      onAnimationEnd={markEnteredOnAnimationEnd}
                      className="ml-auto max-w-[90%] border border-[var(--adora-hairline)] bg-[var(--adora-ivory)] px-4 py-3 text-sm leading-6 outline-none sm:max-w-[80%] sm:px-5 sm:py-3.5"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[0.66rem] font-bold tracking-[0.14em] text-[var(--adora-text-secondary)] uppercase">Bạn</span>
                        {matchedScenario ? <DemoLabel>Kịch bản dựng sẵn</DemoLabel> : null}
                      </div>
                      <p className="break-words whitespace-pre-wrap font-medium">{message.text}</p>
                    </article>
                  );
                }

                if (message.kind === "unsupported") {
                  return (
                    <article
                      key={message.id}
                      aria-label="ADORA Planner"
                      data-planner-enter="reply"
                      onAnimationEnd={markEnteredOnAnimationEnd}
                      className="max-w-xl border border-dashed border-[var(--adora-gold)] bg-white/60 p-4 text-sm leading-6 sm:p-5 sm:leading-7"
                    >
                      <div className="mb-2.5 flex flex-wrap items-center gap-2">
                        <span className="text-[0.68rem] font-bold tracking-[0.14em] uppercase">ADORA Planner</span>
                        <DemoLabel>Thông báo hệ thống</DemoLabel>
                      </div>
                      <p data-testid="unsupported-reply">{UNSUPPORTED_PROMPT_REPLY}</p>
                      <ul className="mt-3.5 grid gap-2" aria-label="Gợi ý dựng sẵn">
                        {scenarios.map((scenario) => (
                          <li key={scenario.id}>
                            <button
                              type="button"
                              onClick={() => submit(scenario.prompt)}
                              className="filter-chip h-auto min-h-11 w-full py-2 text-left leading-5"
                            >
                              {scenario.prompt}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </article>
                  );
                }

                const scenario = scenarios.find((candidate) => candidate.id === message.scenarioId);
                const trip = scenario ? previews[scenario.tripSlug] : undefined;
                if (!scenario || !trip) return null;
                return (
                  <article
                    key={message.id}
                    aria-label="ADORA Planner"
                    data-testid="scripted-reply"
                    data-planner-enter="reply"
                    onAnimationEnd={markEnteredOnAnimationEnd}
                    className="max-w-2xl border border-[var(--adora-hairline)] bg-white/60 p-3.5 text-sm leading-6 sm:p-5 sm:leading-7"
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 sm:mb-2">
                      <span className="text-[0.68rem] font-bold tracking-[0.14em] uppercase">ADORA Planner</span>
                      <DemoLabel>Phản hồi dựng sẵn · không phải AI</DemoLabel>
                    </div>
                    <p>{scenario.introduction}</p>
                    <ol className="mt-2.5 grid gap-1 text-xs font-semibold text-[var(--adora-text-secondary)] sm:mt-3" aria-label="Các bước trong kịch bản">
                      {scenario.steps.map((step, stepIndex) => (
                        <li key={step} className="flex gap-2.5">
                          <span className="font-editorial text-[var(--adora-gold)]">{stepIndex + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                    <ol className="mt-4 hidden border-t border-[var(--adora-hairline)] xl:block" aria-label={`Tóm tắt ${trip.title}`}>
                      {trip.days.map((day) => (
                        <li key={day.day} className="grid grid-cols-[4.25rem_1fr] gap-3 border-b border-[var(--adora-hairline)] py-2.5">
                          <span className="font-editorial text-base text-[var(--adora-gold)]">Ngày {day.day}</span>
                          <span>
                            <span className="block font-semibold">{day.title}</span>
                            <span className="block text-[var(--adora-text-secondary)]">{day.summary}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-2.5 text-xs leading-5 text-[var(--adora-text-secondary)] sm:mt-3 sm:text-sm sm:leading-6">{scenario.closing}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 sm:mt-3.5">
                      <Link href={`/trips/${trip.slug}`} className="dark-cta inline-flex min-h-10 items-center gap-2.5 px-4 text-xs font-bold tracking-[0.1em] sm:min-h-11 sm:px-5">
                        Mở lịch trình · {trip.title}
                      </Link>
                    </div>
                  </article>
                );
              })}

              {preview ? (
                <section
                  key={preview.slug}
                  ref={mobilePreviewRef}
                  aria-label="Xem trước lịch trình"
                  data-testid="trip-preview-mobile"
                  data-planner-enter="reply"
                  onAnimationEnd={markEnteredOnAnimationEnd}
                  className="border border-[var(--adora-hairline)] bg-[var(--adora-ivory)] p-4 sm:p-5 xl:hidden"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <DemoLabel>{preview.statusLabel}</DemoLabel>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--adora-text-secondary)]">
                      <MapPin className="size-3.5 text-[var(--adora-gold)]" aria-hidden="true" />
                      {preview.destinationName} · {preview.durationDays} ngày
                    </span>
                  </div>
                  <h2 className="font-editorial mt-2 text-xl leading-[1.08] tracking-[-0.03em] sm:text-2xl">
                    Xem trước: {preview.title}
                  </h2>
                  <ol className="mt-3 border-t border-[var(--adora-hairline)]">
                    {preview.days.map((day) => (
                      <li key={day.day} className="border-b border-[var(--adora-hairline)] py-2 text-xs sm:py-2.5">
                        <span className="font-bold tracking-[0.12em] text-[var(--adora-sage)] uppercase">Ngày {day.day} · </span>
                        <span className="font-semibold text-[var(--adora-ink)]">{day.title}</span>
                        <span className="mt-0.5 block leading-5 text-[var(--adora-text-secondary)]">{day.summary}</span>
                      </li>
                    ))}
                  </ol>
                  <Link href={`/trips/${preview.slug}`} className="editorial-link mt-3">
                    Xem lịch trình đầy đủ
                  </Link>
                </section>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[var(--adora-hairline)] bg-[var(--adora-paper)] px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-3.5 lg:px-12">
            <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl" aria-label="Soạn tin nhắn demo">
              <div className="flex items-end gap-2.5 border border-[var(--adora-hairline)] bg-white/70 p-1.5 focus-within:border-[var(--adora-ink)] sm:gap-3 sm:p-2">
                <label htmlFor="planner-prompt" className="sr-only">
                  Mô tả chuyến đi (bản demo)
                </label>
                <textarea
                  id="planner-prompt"
                  ref={textareaRef}
                  rows={1}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Mô tả chuyến đi bạn mong muốn…"
                  className="max-h-36 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm leading-6 outline-none placeholder:text-[var(--adora-text-secondary)]/70"
                />
                <button
                  type="submit"
                  disabled={draft.trim() === ""}
                  className="dark-cta inline-flex size-11 shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Gửi tin nhắn demo"
                >
                  <Send className="size-4" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-1.5 text-[0.72rem] leading-4 text-[var(--adora-text-secondary)] sm:text-xs sm:leading-5">
                Enter để gửi, Shift+Enter xuống dòng. Chỉ các gợi ý dựng sẵn được hỗ trợ; tin nhắn không được gửi tới máy chủ hay mô hình AI.
              </p>
            </form>
          </div>
        </section>

        <aside aria-label="Xem trước lịch trình" className="hidden w-[22rem] shrink-0 flex-col overflow-y-auto border-l border-[var(--adora-hairline)] bg-[var(--adora-ivory)] xl:flex">
          {preview ? (
            <div
              key={preview.slug}
              data-testid="trip-preview"
              data-planner-enter="preview"
              onAnimationEnd={markEnteredOnAnimationEnd}
            >
              <div className="image-reveal relative aspect-[16/10] w-full">
                <Image
                  src={preview.cover.src}
                  alt={preview.cover.alt}
                  fill
                  sizes="352px"
                  className="object-cover"
                  style={{ objectPosition: preview.cover.position ?? "center" }}
                />
              </div>
              <div className="p-6">
                <DemoLabel>{preview.statusLabel}</DemoLabel>
                <h2 className="font-editorial mt-4 text-3xl leading-[1.05] tracking-[-0.035em]">{preview.title}</h2>
                <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--adora-text-secondary)]">
                  <MapPin className="size-3.5 text-[var(--adora-gold)]" aria-hidden="true" />
                  {preview.destinationName} · {preview.durationDays} ngày
                </p>
                <ol className="mt-6 border-t border-[var(--adora-hairline)]">
                  {preview.days.map((day) => (
                    <li key={day.day} className="border-b border-[var(--adora-hairline)] py-4 text-sm">
                      <span className="text-[0.66rem] font-bold tracking-[0.14em] text-[var(--adora-sage)] uppercase">Ngày {day.day}</span>
                      <span className="mt-1 block font-semibold">{day.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--adora-text-secondary)]">{day.summary}</span>
                    </li>
                  ))}
                </ol>
                <Link href={`/trips/${preview.slug}`} className="editorial-link mt-6">
                  Xem lịch trình đầy đủ
                </Link>
                <p className="mt-4 text-xs leading-5 text-[var(--adora-text-secondary)]">
                  Bản xem trước minh hoạ. Không có tuyến đường, khoảng cách hay đặt chỗ nào được tính toán.
                </p>
              </div>
            </div>
          ) : (
            <div className="m-6 flex min-h-64 flex-col justify-center border border-dashed border-[var(--adora-hairline)] p-6" data-testid="trip-preview-empty">
              <h2 className="font-editorial text-2xl tracking-[-0.03em]">Xem trước lịch trình</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--adora-text-secondary)]">
                Chọn một gợi ý dựng sẵn để hiển thị bản xem trước lịch trình tại đây.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
