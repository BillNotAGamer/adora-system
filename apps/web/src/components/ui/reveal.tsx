"use client";

import { type CSSProperties, type ReactNode, useCallback, useEffect, useRef } from "react";

export type RevealTag = "div" | "li" | "section" | "article" | "figure";
export type RevealVariant = "section" | "card" | "image";

/**
 * Progressive below-the-fold editorial reveal leaf (Specification v1.1 §C.2 + Errata E-1..E-3).
 *
 * Class composition contract (E-3a):
 * `<Reveal>` is a motion-only wrapper controlled by unlayered `[data-reveal]` rules in `globals.css`.
 * `className` may include layout, grid/flex placement, spacing, border, or typography utilities,
 * and MUST NEVER include `opacity-*`, `transition-*`, `duration-*`, `ease-*`, `delay-*`, or
 * transform (`translate-*`, `scale-*`, `rotate-*`) utilities.
 *
 * Fail-visible architecture:
 * - Renders no `data-reveal` attribute during SSR or client hydration (`opacity: 1`, `transform: none`).
 * - Enters `data-reveal="pending"` only inside the first `IntersectionObserver` callback when the
 *   newest entry confirms the element's top edge is strictly below `100%` of the viewport height.
 * - Uses a `1500ms` pre-callback timer only to guard against `IntersectionObserver` failing to
 *   deliver an initial callback; once pending, uses an event-driven viewport geometry guard
 *   (immediate next-frame check, passive `scroll`/`resize`/`hashchange`/`visibilitychange`, and a
 *   shared `document.body` `ResizeObserver`) rather than a time-bounded post-pending timeout.
 */
export interface RevealProps {
  as?: RevealTag;
  variant?: RevealVariant;
  delayMs?: number;
  stackOnMobile?: boolean;
  className?: string;
  children: ReactNode;
}

const PRE_CALLBACK_WATCHDOG_MS = 1500;
const REVEAL_VIEWPORT_RATIO = 0.9;
const MAX_STAGGER_DELAY_MS = 270;

const bodyResizeSubscribers = new Set<() => void>();
let sharedBodyResizeObserver: ResizeObserver | null = null;

function subscribeBodyResize(listener: () => void): () => void {
  if (typeof ResizeObserver === "undefined" || typeof document === "undefined" || !document.body) {
    return () => {};
  }
  bodyResizeSubscribers.add(listener);
  if (!sharedBodyResizeObserver) {
    sharedBodyResizeObserver = new ResizeObserver(() => {
      for (const callback of bodyResizeSubscribers) callback();
    });
    sharedBodyResizeObserver.observe(document.body);
  }
  return () => {
    bodyResizeSubscribers.delete(listener);
    if (bodyResizeSubscribers.size === 0 && sharedBodyResizeObserver) {
      sharedBodyResizeObserver.disconnect();
      sharedBodyResizeObserver = null;
    }
  };
}

export function Reveal({
  as: Tag = "div",
  variant = "section",
  delayMs = 0,
  stackOnMobile = false,
  className,
  children,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const revealedRef = useRef(false);

  const setElementRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (revealedRef.current || el.dataset.reveal === "visible") {
      revealedRef.current = true;
      el.dataset.reveal = "visible";
      return;
    }

    const reducedMotionQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const motionOff = document.documentElement.dataset.motion === "off";

    if (reducedMotionQuery?.matches || motionOff || typeof IntersectionObserver === "undefined") {
      revealedRef.current = true;
      el.dataset.revealInstant = "";
      el.dataset.reveal = "visible";
      return;
    }

    let disposed = false;
    let io: IntersectionObserver | null = null;
    let motionAttrObserver: MutationObserver | null = null;
    let unsubscribeBodyResize: (() => void) | null = null;
    let rafId = 0;
    let listeningForPending = false;

    const removePendingListeners = () => {
      if (!listeningForPending) return;
      listeningForPending = false;
      window.removeEventListener("scroll", onViewportEvent);
      window.removeEventListener("resize", onViewportEvent);
      window.removeEventListener("hashchange", onViewportEvent);
      document.removeEventListener("visibilitychange", onViewportEvent);
      el.removeEventListener("focusin", onFocusIn);
      unsubscribeBodyResize?.();
      unsubscribeBodyResize = null;
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const disconnectPreferenceWatchers = () => {
      reducedMotionQuery?.removeEventListener("change", onReducedMotionChange);
      motionAttrObserver?.disconnect();
      motionAttrObserver = null;
    };

    const reveal = (instant = false) => {
      if (revealedRef.current && el.dataset.reveal === "visible") return;
      revealedRef.current = true;
      if (instant) {
        el.dataset.revealInstant = "";
      }
      el.dataset.reveal = "visible";
      window.clearTimeout(preCallbackWatchdog);
      removePendingListeners();
      disconnectPreferenceWatchers();
      io?.disconnect();
      io = null;
    };

    const checkViewportPosition = () => {
      rafId = 0;
      if (disposed || revealedRef.current || !el.isConnected) return;
      if (document.visibilityState === "hidden") return;
      if (el.getClientRects().length === 0) return;
      const rect = el.getBoundingClientRect();
      if (rect.top <= window.innerHeight * REVEAL_VIEWPORT_RATIO || rect.bottom <= 0) {
        reveal();
      }
    };

    const onViewportEvent = () => {
      if (disposed || rafId !== 0 || revealedRef.current) return;
      rafId = window.requestAnimationFrame(checkViewportPosition);
    };

    const onFocusIn = () => {
      if (disposed || revealedRef.current) return;
      reveal(true);
    };

    const onReducedMotionChange = (event: MediaQueryListEvent) => {
      if (disposed || revealedRef.current) return;
      if (event.matches) {
        reveal(true);
      }
    };

    const attachPendingListeners = () => {
      if (disposed || listeningForPending || revealedRef.current) return;
      listeningForPending = true;
      window.addEventListener("scroll", onViewportEvent, { passive: true });
      window.addEventListener("resize", onViewportEvent, { passive: true });
      window.addEventListener("hashchange", onViewportEvent, { passive: true });
      document.addEventListener("visibilitychange", onViewportEvent);
      el.addEventListener("focusin", onFocusIn);
      unsubscribeBodyResize = subscribeBodyResize(onViewportEvent);
    };

    reducedMotionQuery?.addEventListener("change", onReducedMotionChange);
    if (typeof MutationObserver !== "undefined") {
      motionAttrObserver = new MutationObserver(() => {
        if (disposed || revealedRef.current) return;
        if (document.documentElement.dataset.motion === "off") {
          reveal(true);
        }
      });
      motionAttrObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-motion"],
      });
    }

    const preCallbackWatchdog = window.setTimeout(() => {
      if (disposed) return;
      reveal();
    }, PRE_CALLBACK_WATCHDOG_MS);

    io = new IntersectionObserver(
      (entries) => {
        if (disposed || revealedRef.current) return;
        const entry = entries[entries.length - 1];
        if (!entry) return;
        window.clearTimeout(preCallbackWatchdog);

        if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
          reveal();
          return;
        }

        el.dataset.reveal = "pending";
        attachPendingListeners();
        onViewportEvent();
      },
      { threshold: 0, rootMargin: "100000px 0px -10% 0px" },
    );

    io.observe(el);

    return () => {
      disposed = true;
      window.clearTimeout(preCallbackWatchdog);
      removePendingListeners();
      disconnectPreferenceWatchers();
      io?.disconnect();
      io = null;
    };
  }, []);

  const cappedDelay = Math.min(Math.max(0, delayMs), MAX_STAGGER_DELAY_MS);
  const style =
    cappedDelay > 0 ? ({ "--reveal-delay": `${cappedDelay}ms` } as CSSProperties) : undefined;

  return (
    <Tag
      ref={setElementRef}
      data-reveal-variant={variant}
      data-reveal-stack={stackOnMobile ? "" : undefined}
      className={className}
      style={style}
    >
      {children}
    </Tag>
  );
}
