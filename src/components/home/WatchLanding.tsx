'use client';

import { useEffect } from 'react';

/**
 * Arriving at /#watch (the ad pages' "Discover more" link): place the video
 * so it sits whole on one screen, between the top nav and the bottom bar,
 * instead of wherever the plain anchor jump lands: with "Watch" and the
 * heading above it when they fit, with just the heading when only that
 * fits, otherwise the video alone just under the nav.
 */
export function WatchLanding() {
  useEffect(() => {
    if (window.location.hash !== '#watch') return;

    const place = () => {
      const section = document.getElementById('watch');
      const frame = section?.querySelector<HTMLElement>('[data-watch-frame]');
      if (!section || !frame) return;
      // Settle this section's fade-up at once: measured mid-slide, its
      // heading sits 22px lower than where it ends up.
      section.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        el.style.transition = 'none';
        el.setAttribute('data-reveal', 'shown');
      });
      const nav = document.querySelector('header');
      const navH = nav ? nav.getBoundingClientRect().height : 83;
      const bar = document.querySelector<HTMLElement>('[class*="StickyBookBar_bar"]');
      const barH = bar ? bar.getBoundingClientRect().height : 0;
      const room = window.innerHeight - navH - barH;

      const y = window.scrollY;
      const abs = (el: Element | null | undefined) =>
        el ? el.getBoundingClientRect().top + y : null;
      const frameRect = frame.getBoundingClientRect();
      const frameBottom = frameRect.bottom + y;

      // Best first: "Watch" + heading + video, then heading + video, then
      // the video alone - the first that fits whole between nav and bar.
      const starts = [
        abs(section.querySelector('.eyebrow')),
        abs(document.getElementById('watch-heading')),
        frameRect.top + y,
      ].filter((v): v is number => v !== null);
      const start = starts.find((t) => frameBottom - t <= room) ?? starts[starts.length - 1];
      // A little breathing room above, never so much that the line above
      // (or the section before) peeks in.
      const gap = Math.max(0, Math.min(12, room - (frameBottom - start)));
      const top = start - navH - gap;
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' as ScrollBehavior });
    };

    // Once after the browser's own jump, and again after fonts/layout settle.
    const timers = [setTimeout(place, 60), setTimeout(place, 700)];
    return () => timers.forEach(clearTimeout);
  }, []);

  return null;
}
