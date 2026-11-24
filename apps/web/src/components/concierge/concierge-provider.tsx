"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";

import {
  atelierReducer,
  initialAtelierState,
  type AtelierAction,
} from "@/lib/concierge-atelier/engine";
import type { AtelierState } from "@/lib/concierge-atelier/types";

export type CinematicMovementId = "01" | "02" | "03" | "04" | "05" | "06";

type CloseOptions = {
  fromPopstate?: boolean;
  navigating?: boolean;
};

type Context = {
  atelierState: AtelierState;
  atelierDispatch: Dispatch<AtelierAction>;
  isOpen: boolean;
  open: (origin: HTMLElement) => void;
  close: (restore?: boolean, options?: CloseOptions) => void;
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  cinematicMovement: CinematicMovementId | null;
  setCinematicMovement: (value: CinematicMovementId | null) => void;
};

const ConciergeContext = createContext<Context | null>(null);

export function useConcierge() {
  const c = useContext(ConciergeContext);
  if (!c) throw new Error("Concierge provider required");
  return c;
}

function restoreFocusAfterClose(
  originEl: HTMLElement | null,
  wasFloating: boolean,
  wasMobileMenu: boolean,
) {
  const pickAndFocus = (): boolean => {
    if (originEl?.isConnected && originEl.checkVisibility()) {
      originEl.focus({ preventScroll: true });
      return true;
    }
    const candidates = [
      wasFloating ? document.querySelector<HTMLElement>("a.concierge-floating") : null,
      wasMobileMenu
        ? document.querySelector<HTMLElement>('button[aria-controls="mobile-navigation"]')
        : null,
      document.querySelector<HTMLElement>("a.concierge-floating"),
      ...Array.from(document.querySelectorAll<HTMLElement>('header a[href="/"], main h1')),
    ];
    const fallback = candidates.find(
      (element): element is HTMLElement =>
        Boolean(element && element.checkVisibility() && !element.closest('[aria-hidden="true"]')),
    );
    if (fallback) {
      if (fallback.tagName === "H1") fallback.tabIndex = -1;
      fallback.focus({ preventScroll: true });
      return true;
    }
    return false;
  };

  requestAnimationFrame(() => {
    // Allow one extra animation frame for floating triggers that remount after isOpen becomes false
    if (!pickAndFocus()) {
      requestAnimationFrame(() => {
        pickAndFocus();
      });
    }
  });
}

function withoutOverlayHistoryFlag(rawState: unknown): Record<string, unknown> {
  if (!rawState || typeof rawState !== "object") return {};
  const copy = { ...(rawState as Record<string, unknown>) };
  delete copy.adoraConciergeOverlay;
  return copy;
}

export function ConciergeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [atelierState, atelierDispatch] = useReducer(atelierReducer, initialAtelierState);
  const [isOpen, setOpen] = useState(false);
  const [AtelierHost, setAtelierHost] = useState<
    typeof import("./atelier-overlay-host").default | null
  >(null);
  const [loadError, setLoadError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cinematicMovement, setCinematicMovement] = useState<CinematicMovementId | null>(null);

  const origin = useRef<HTMLElement | null>(null);
  const originWasFloating = useRef(false);
  const originWasMobileMenu = useRef(false);
  const path = usePathname();
  const previousPath = useRef(path);
  const isOpenRef = useRef(isOpen);
  const handledPopFromCloseRef = useRef(false);
  const closingForNavigationRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (
      typeof window !== "undefined" &&
      (window.history.state as { adoraConciergeOverlay?: boolean } | null)?.adoraConciergeOverlay ===
        true
    ) {
      window.history.replaceState(
        withoutOverlayHistoryFlag(window.history.state),
        "",
        window.location.href,
      );
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const ensureAtelierHostLoaded = useCallback(() => {
    if (!AtelierHost) {
      setLoadError(false);
      void import("./atelier-overlay-host")
        .then((module) => {
          if (mountedRef.current) setAtelierHost(() => module.default);
        })
        .catch(() => {
          if (mountedRef.current) setLoadError(true);
        });
    }
  }, [AtelierHost]);

  const close = useCallback((restore = true, options?: CloseOptions) => {
    isOpenRef.current = false;
    setOpen(false);

    if (options?.navigating) {
      closingForNavigationRef.current = true;
      if (
        typeof window !== "undefined" &&
        (window.history.state as { adoraConciergeOverlay?: boolean } | null)
          ?.adoraConciergeOverlay === true
      ) {
        window.history.replaceState(
          withoutOverlayHistoryFlag(window.history.state),
          "",
          window.location.href,
        );
      }
      return;
    }

    if (
      !options?.fromPopstate &&
      typeof window !== "undefined" &&
      (window.history.state as { adoraConciergeOverlay?: boolean } | null)?.adoraConciergeOverlay ===
        true
    ) {
      handledPopFromCloseRef.current = true;
      window.history.back();
    }

    if (restore) {
      restoreFocusAfterClose(
        origin.current,
        originWasFloating.current,
        originWasMobileMenu.current,
      );
    }
  }, []);

  useEffect(() => {
    const onPopstate = (event: PopStateEvent) => {
      if (handledPopFromCloseRef.current) {
        handledPopFromCloseRef.current = false;
        return;
      }
      if (closingForNavigationRef.current) {
        closingForNavigationRef.current = false;
        isOpenRef.current = false;
        setOpen(false);
        return;
      }
      const wantsOverlay = Boolean(
        (event.state as { adoraConciergeOverlay?: boolean } | null)?.adoraConciergeOverlay,
      );
      const currentPathname = window.location.pathname;
      if (wantsOverlay && currentPathname !== "/ai-planner") {
        ensureAtelierHostLoaded();
        isOpenRef.current = true;
        setOpen(true);
      } else if (isOpenRef.current) {
        close(true, { fromPopstate: true });
      }
    };

    const onHashchange = () => {
      if (isOpenRef.current) {
        close(false, { navigating: true });
      }
    };

    const onDocumentClick = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest("a[href]");
      if (
        link &&
        !link.hasAttribute("data-concierge-trigger") &&
        !event.defaultPrevented &&
        !event.ctrlKey &&
        !event.metaKey &&
        isOpenRef.current
      ) {
        close(false, { navigating: true });
      }
    };

    window.addEventListener("popstate", onPopstate);
    window.addEventListener("hashchange", onHashchange);
    document.addEventListener("click", onDocumentClick);
    return () => {
      window.removeEventListener("popstate", onPopstate);
      window.removeEventListener("hashchange", onHashchange);
      document.removeEventListener("click", onDocumentClick);
    };
  }, [close, ensureAtelierHostLoaded]);

  useEffect(() => {
    if (previousPath.current !== path) {
      previousPath.current = path;
      closingForNavigationRef.current = false;
      isOpenRef.current = false;
      setOpen(false);
      setMenuOpen(false);
    }
  }, [path]);

  const open = useCallback(
    (element: HTMLElement) => {
      const currentPathname = typeof window !== "undefined" ? window.location.pathname : path;
      if (currentPathname === "/ai-planner") {
        const focusTarget = document.querySelector<HTMLElement>(
          "#cxp04-composer-input, [data-cxp04-start-btn], main h1",
        );
        focusTarget?.focus();
        return;
      }
      if (isOpenRef.current) return;

      origin.current = element;
      originWasFloating.current = element.classList.contains("concierge-floating");
      originWasMobileMenu.current = Boolean(element.closest("#mobile-navigation"));
      closingForNavigationRef.current = false;

      isOpenRef.current = true;
      setMenuOpen(false);
      setOpen(true);

      if (
        typeof window !== "undefined" &&
        (window.history.state as { adoraConciergeOverlay?: boolean } | null)
          ?.adoraConciergeOverlay !== true
      ) {
        const baseState = withoutOverlayHistoryFlag(window.history.state);
        window.history.pushState(
          { ...baseState, adoraConciergeOverlay: true },
          "",
          window.location.href,
        );
      }

      ensureAtelierHostLoaded();
    },
    [ensureAtelierHostLoaded, path],
  );

  return (
    <ConciergeContext
      value={{
        atelierState,
        atelierDispatch,
        isOpen,
        menuOpen,
        setMenuOpen,
        cinematicMovement,
        setCinematicMovement,
        close,
        open,
      }}
    >
      {children}
      {isOpen && path !== "/ai-planner" ? (
        AtelierHost ? (
          <AtelierHost />
        ) : (
          <div role="status" className="concierge-floating">
            {loadError ? "Không mở được Atelier." : "Đang mở Personal Journey Atelier…"}{" "}
            <a href="/ai-planner" onClick={() => close(false, { navigating: true })}>
              Mở trang đầy đủ
            </a>
            <button type="button" onClick={() => close(true)}>
              Đóng
            </button>
          </div>
        )
      ) : null}
    </ConciergeContext>
  );
}
