'use client';

import { useEffect } from 'react';

/**
 * Items rise gently into place as each one comes into view while scrolling,
 * then stay still - the same fade-up the website uses ("Why This Exists").
 * Items that come into view together arrive one after another.
 *
 * `target` names the container by its data-arrive attribute; `items` picks
 * the pieces inside it. The CSS module supplies `pending` (on the
 * container: items hidden, just below) and `shown` (on each item).
 * Anything already on screen when the page opens, or already scrolled
 * past (a jump to a link further down), simply shows.
 */
export function ArriveOnce({
  target,
  items,
  pending,
  shown,
}: {
  target: string;
  items: string;
  pending: string;
  shown: string;
}) {
  useEffect(() => {
    const box = document.querySelector<HTMLElement>(`[data-arrive="${target}"]`);
    if (!box) return;
    let waiting = Array.from(box.querySelectorAll<HTMLElement>(items));
    // Items already visible at load just show, without animating.
    waiting = waiting.filter((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add(shown);
        el.style.transition = 'none';
        return false;
      }
      return true;
    });
    if (waiting.length === 0) return;
    // Only the chosen pieces are hidden until they arrive.
    waiting.forEach((el) => {
      el.dataset.arriveItem = '';
    });
    box.classList.add(pending);

    let frame: number | null = null;
    const check = () => {
      frame = null;
      let step = 0;
      waiting = waiting.filter((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.85) {
          el.style.transitionDelay = `${step * 130}ms`;
          el.classList.add(shown);
          // Once in place, hand the element back to its own styles (a
          // card's hover lift keeps its normal speed, with no delay).
          const settle = (event: TransitionEvent) => {
            if (event.target !== el) return;
            el.removeEventListener('transitionend', settle);
            el.style.transitionDelay = '';
            el.classList.remove(shown);
            el.dataset.arrived = '';
          };
          el.addEventListener('transitionend', settle);
          step += 1;
          return false;
        }
        return true;
      });
      if (waiting.length === 0) window.removeEventListener('scroll', onScroll);
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(check);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [target, items, pending, shown]);

  return null;
}
