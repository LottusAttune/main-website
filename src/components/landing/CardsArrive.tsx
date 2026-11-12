'use client';

import { useEffect } from 'react';

/**
 * The Sound familiar cards rise gently into place, one after another, the
 * first time their row scrolls into view - then they stay still. If the row
 * is already on screen when the page opens, or the browser has no
 * IntersectionObserver, the cards simply show as they are.
 */
export function CardsArrive({ pending, arrived }: { pending: string; arrived: string }) {
  useEffect(() => {
    const grid = document.querySelector<HTMLElement>('[data-pain-grid]');
    if (!grid || !('IntersectionObserver' in window)) return;
    if (grid.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    grid.classList.add(pending);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        grid.classList.add(arrived);
        observer.disconnect();
      },
      { threshold: 0.3 }
    );
    observer.observe(grid);
    return () => observer.disconnect();
  }, [pending, arrived]);

  return null;
}
