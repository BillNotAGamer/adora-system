"use client";
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useConcierge } from './concierge-provider';
export function ConciergeTrigger({ onClick, ...props }: ComponentProps<typeof Link>) {
  const { open } = useConcierge();
  return <Link {...props} prefetch={false} data-concierge-trigger data-concierge-inline={props.className?.includes('editorial-link') ? '' : undefined} onClick={event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (event.currentTarget.target && event.currentTarget.target !== '_self') || event.currentTarget.hasAttribute('download') || typeof HTMLDialogElement === 'undefined' || typeof HTMLDialogElement.prototype.showModal !== 'function') return;
    event.preventDefault(); performance.clearMarks('adora-concierge-requested'); performance.clearMarks('adora-concierge-painted'); performance.mark('adora-concierge-requested'); open(event.currentTarget);
  }} />;
}
