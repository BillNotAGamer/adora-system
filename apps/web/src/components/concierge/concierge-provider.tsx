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

import { initialState, reducer, type Action, type State } from "@/lib/concierge/state";
import {
  atelierReducer,
  initialAtelierState,
  type AtelierAction,
} from "@/lib/concierge-atelier/engine";
import {
  CONCIERGE_EXPERIENCE_MODE,
  IS_ATELIER_MODE,
  type ConciergeExperienceMode,
} from "@/lib/concierge-atelier/mode";
import type { AtelierState } from "@/lib/concierge-atelier/types";

export type CinematicMovementId = "01" | "02" | "03" | "04" | "05" | "06";

type CloseOptions = {
  fromPopstate?: boolean;
  navigating?: boolean;
};

type Context = {
  mode: ConciergeExperienceMode;
  state: State;
  dispatch: Dispatch<Action>;
  atelierState?: AtelierState;
  atelierDispatch?: Dispatch<AtelierAction>;
  isOpen: boolean;
  open: (origin: HTMLElement) => void;
  close: (restore?: boolean, options?: CloseOptions) => void;
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  cinematicMovement: CinematicMovementId | null;
  setCinematicMovement: (value: CinematicMovementId | null) => void;
  logPositionRef: { current: number };
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

function Ux1OnlyProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isOpen, setOpen] = useState(false);
  const [Dialog, setDialog] = useState<typeof import("./concierge-dialog").default | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cinematicMovement, setCinematicMovement] = useState<CinematicMovementId | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const logPositionRef = useRef(0);
  const path = usePathname();
  const previousPath = useRef(path);

  function close(restore = true) {
    setOpen(false);
    if (restore) {
      requestAnimationFrame(() => {
        const target = origin.current;
        if (target?.isConnected && target.checkVisibility()) {
          target.focus({ preventScroll: true });
        } else {
          const fallback = [
            document.querySelector<HTMLElement>("a.concierge-floating"),
            ...Array.from(document.querySelectorAll<HTMLElement>('header a[href="/"], main h1')),
          ].find(
            (element) =>
              element && element.checkVisibility() && !element.closest('[aria-hidden="true"]'),
          );
          if (fallback) {
            if (fallback.tagName === "H1") fallback.tabIndex = -1;
            fallback.focus({ preventScroll: true });
          }
        }
      });
    }
  }

  useEffect(() => {
    const dismiss = () => setOpen(false);
    window.addEventListener("popstate", dismiss);
    window.addEventListener("hashchange", dismiss);
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest("a[href]");
      if (
        link &&
        !link.hasAttribute("data-concierge-trigger") &&
        !event.defaultPrevented &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        dismiss();
      }
    };
    document.addEventListener("click", navigate);
    return () => {
      window.removeEventListener("popstate", dismiss);
      window.removeEventListener("hashchange", dismiss);
      document.removeEventListener("click", navigate);
    };
  }, []);

  useEffect(() => {
    if (previousPath.current !== path) {
      previousPath.current = path;
      setOpen(false);
      setMenuOpen(false);
    }
  }, [path]);

  return (
    <ConciergeContext
      value={{
        mode: "ux1-dialog",
        state,
        dispatch,
        isOpen,
        menuOpen,
        setMenuOpen,
        cinematicMovement,
        setCinematicMovement,
        logPositionRef,
        close,
        open: (element) => {
          if (path === "/ai-planner") {
            document.querySelector<HTMLElement>("#planner-prompt")?.focus();
            return;
          }
          origin.current = element;
          setMenuOpen(false);
          setOpen(true);
          if (!Dialog) {
            setLoadError(false);
            void import("./concierge-dialog")
              .then((module) => setDialog(() => module.default))
              .catch(() => setLoadError(true));
          }
        },
      }}
    >
      {children}
      {isOpen && path !== "/ai-planner" ? (
        Dialog ? (
          <Dialog />
        ) : (
          <div role="status" className="concierge-floating">
            {loadError ? "Không mở được Concierge." : "Đang mở Concierge…"}{" "}
            <a href="/ai-planner">Mở trang đầy đủ</a>
            <button type="button" onClick={() => close()}>
              Đóng
            </button>
          </div>
        )
      ) : null}
    </ConciergeContext>
  );
}

function withoutOverlayHistoryFlag(rawState: unknown): Record<string, unknown> {
  if (!rawState || typeof rawState !== "object") return {};
  const copy = { ...(rawState as Record<string, unknown>) };
  delete copy.adoraConciergeOverlay;
  return copy;
}

function AtelierEnabledProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [ux1State, ux1Dispatch] = useReducer(reducer, initialState);
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
  const logPositionRef = useRef(0);
  const path = usePathname();
  const previousPath = useRef(path);
  const isOpenRef = useRef(isOpen);
  const handledPopFromCloseRef = useRef(false);
  const closingForNavigationRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Strip any stale overlay marker left behind from a previous session before reload
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
        mode: CONCIERGE_EXPERIENCE_MODE,
        state: ux1State,
        dispatch: ux1Dispatch,
        atelierState,
        atelierDispatch,
        isOpen,
        menuOpen,
        setMenuOpen,
        cinematicMovement,
        setCinematicMovement,
        logPositionRef,
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

export function ConciergeProvider({ children }: Readonly<{ children: ReactNode }>) {
  if (IS_ATELIER_MODE) {
    return <AtelierEnabledProvider>{children}</AtelierEnabledProvider>;
  }
  return <Ux1OnlyProvider>{children}</Ux1OnlyProvider>;
}
