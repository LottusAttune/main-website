'use client';

import { useEffect } from 'react';

/**
 * A group rises gently into place the first time it scrolls into view, then
 * stays still (the same fade-up the website uses on "Why This Exists").
 * `target` names the element by its data-arrive attribute; the CSS module
 * supplies `pending` (hidden, just below) and `arrived` (in place, with each
 * item's own delay). If the group is already on screen when the page opens,
 * or the browser has no IntersectionObserver, it simply shows as it is.
 */
export function ArriveOnce({
  target,
  pending,
  arrived,
}: {
  target: string;
  pending: string;
  arrived: string;
}) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-arrive="${target}"]`);
    if (!el || !('IntersectionObserver' in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    el.classList.add(pending);
    const show = () => {
      el.classList.add(arrived);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) show();
      },
      { threshold: 0.15 }
    );
    // A jump straight past it (a link further down the page) never counts
    // as "in view" - show it as soon as it is above the screen.
    const onScroll = () => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.85) show();
    };
    observer.observe(el);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [target, pending, arrived]);

  return null;
}
