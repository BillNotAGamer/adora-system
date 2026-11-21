"use client";

import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import { initialState, reducer, type Action, type State } from '@/lib/concierge/state';
type Context = { state: State; dispatch: Dispatch<Action>; isOpen: boolean; open: (origin: HTMLElement) => void; close: (restore?: boolean) => void; menuOpen: boolean; setMenuOpen: (value: boolean) => void; logPositionRef: { current: number } };
const ConciergeContext = createContext<Context | null>(null);
export function useConcierge() { const c = useContext(ConciergeContext); if (!c) throw new Error('Concierge provider required'); return c; }
export function ConciergeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isOpen, setOpen] = useState(false);
  const [Dialog, setDialog] = useState<typeof import('./concierge-dialog').default | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const origin = useRef<HTMLElement | null>(null);
  const logPositionRef = useRef(0);
  const path = usePathname();
  const previousPath = useRef(path);
  function close(restore = true) {
    setOpen(false);
    if (restore) requestAnimationFrame(() => {
      const target = origin.current;
      if (target?.isConnected && target.checkVisibility()) target.focus({ preventScroll: true });
      else {
        const fallback = [document.querySelector<HTMLElement>('a.concierge-floating'), ...Array.from(document.querySelectorAll<HTMLElement>('header a[href="/"], main h1'))].find(element => element && element.checkVisibility() && !element.closest('[aria-hidden="true"]'));
        if (fallback) { if (fallback.tagName === 'H1') fallback.tabIndex = -1; fallback.focus({ preventScroll: true }); }
      }
    });
  }
  useEffect(() => {
    const dismiss = () => setOpen(false);
    window.addEventListener('popstate', dismiss);
    window.addEventListener('hashchange', dismiss);
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest('a[href]');
      if (link && !link.hasAttribute('data-concierge-trigger') && !event.defaultPrevented && !event.ctrlKey && !event.metaKey) dismiss();
    };
    document.addEventListener('click', navigate);
    return () => { window.removeEventListener('popstate', dismiss); window.removeEventListener('hashchange', dismiss); document.removeEventListener('click', navigate); };
  }, []);
  useEffect(() => {
    if (previousPath.current !== path) { previousPath.current = path; setOpen(false); setMenuOpen(false); }
  }, [path]);
  return <ConciergeContext value={{ state, dispatch, isOpen, menuOpen, setMenuOpen, logPositionRef, close, open: (element) => {
    if (path === '/ai-planner') { document.querySelector<HTMLElement>('#planner-prompt')?.focus(); return; }
    origin.current = element; setMenuOpen(false); setOpen(true);
    if (!Dialog) { setLoadError(false); void import('./concierge-dialog').then(module => setDialog(() => module.default)).catch(() => setLoadError(true)); }
  } }}>{children}{isOpen && path !== '/ai-planner' ? Dialog ? <Dialog /> : <div role="status" className="concierge-floating">{loadError ? 'Không mở được Concierge.' : 'Đang mở Concierge…'} <a href="/ai-planner">Mở trang đầy đủ</a><button type="button" onClick={() => close()}>Đóng</button></div> : null}</ConciergeContext>;
}
