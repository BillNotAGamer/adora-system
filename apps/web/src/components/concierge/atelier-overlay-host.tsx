"use client";

import { useEffect, useId, useRef } from "react";

import { useConcierge } from "@/components/concierge/concierge-provider";
import { ConciergeAtelierExperience } from "@/components/concierge/concierge-atelier-experience";

/**
 * Full-viewport modal <dialog> host for the integrated Personal Journey Atelier.
 * Preserves UX-1's inert background, Escape/close restoration, focus trap, and
 * document overflow scroll lock without mutating homepage scroll position.
 */
export default function AtelierOverlayHost() {
  const { atelierState, atelierDispatch, close } = useConcierge();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const previousOverscroll = root.style.overscrollBehavior;
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "contain";
    if (!element.open && typeof element.showModal === "function") {
      element.showModal();
    }
    const focusTarget = headingRef.current ?? element;
    focusTarget.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => {
      performance.mark("adora-concierge-painted");
    });
    return () => {
      cancelAnimationFrame(frame);
      if (element.open) element.close();
      root.style.overflow = previousOverflow;
      root.style.overscrollBehavior = previousOverscroll;
    };
  }, []);

  if (!atelierState || !atelierDispatch) return null;

  return (
    <dialog
      ref={dialogRef}
      className="cxp04-dialog-host"
      aria-labelledby={titleId}
      aria-describedby={descId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        close(true);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
          ),
        ).filter((el) => el.checkVisibility());
        const first = controls[0];
        const last = controls.at(-1);
        if (!first || !last) return;
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === headingRef.current ||
            document.activeElement === event.currentTarget)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <p id={descId} className="sr-only">
        Không gian phác thảo hành trình cá nhân hoá ADORA theo kịch bản minh hoạ Đà Lạt. Nhấn Escape hoặc nút Đóng để trở về đúng vị trí trước đó.
      </p>
      <ConciergeAtelierExperience
        variant="overlay"
        externalState={atelierState}
        externalDispatch={atelierDispatch}
        titleId={titleId}
        headingRef={headingRef}
        onClose={() => close(true)}
        onNavigateAway={() => close(false, { navigating: true })}
      />
    </dialog>
  );
}
