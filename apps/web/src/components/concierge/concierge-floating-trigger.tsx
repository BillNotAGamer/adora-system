"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useConcierge } from './concierge-provider';
import { ConciergeTrigger } from './concierge-trigger';
export function ConciergeFloatingTrigger() {
  const { isOpen, menuOpen } = useConcierge();
  const path = usePathname();
  const [eligible, setEligible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const update = () => {
      const focused = document.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
      const collisions = Array.from(document.querySelectorAll<HTMLElement>('footer, [data-concierge-inline], .hero-primary-cta')).some(el => {
        const r = el.getBoundingClientRect(); return el.checkVisibility() && r.top < innerHeight && r.bottom > 0;
      });
      setEligible(!focused && !collisions && (!window.visualViewport || window.visualViewport.height > innerHeight * .8));
    };
    const observer = new IntersectionObserver(update);
    document.querySelectorAll('footer, [data-concierge-inline], .hero-primary-cta').forEach(el => observer.observe(el));
    const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    resize?.observe(document.documentElement);
    update(); document.addEventListener('focusin', update); document.addEventListener('focusout', update); window.addEventListener('scroll', update, { passive: true }); window.visualViewport?.addEventListener('resize', update);
    return () => { observer.disconnect(); resize?.disconnect(); document.removeEventListener('focusin', update); document.removeEventListener('focusout', update); window.removeEventListener('scroll', update); window.visualViewport?.removeEventListener('resize', update); };
  }, [path]);
  if (isOpen || menuOpen || !eligible || !/^\/(destinations|experiences|trips)(\/|$)/.test(path) && path !== '/') return null;
  return <ConciergeTrigger href="/ai-planner" className="concierge-floating" aria-label="Open ADORA Travel Concierge"><span aria-hidden="true">✧</span> Concierge</ConciergeTrigger>;
}
