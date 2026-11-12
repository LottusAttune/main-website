'use client';

import { useEffect } from 'react';

/**
 * Arriving at /#watch (the ad pages' "Discover more" link): place the video
 * so it sits whole on one screen, between the top nav and the bottom bar,
 * instead of wherever the plain anchor jump lands. When the heading and the
 * video fit together, the section starts right under the nav (nothing from
 * the section above showing); when they don't (a tall phone video), the
 * video starts just under the nav.
 */
export function WatchLanding() {
  useEffect(() => {
    if (window.location.hash !== '#watch') return;

    const place = () => {
      const section = document.getElementById('watch');
      const frame = section?.querySelector<HTMLElement>('[data-watch-frame]');
      if (!section || !frame) return;
      const nav = document.querySelector('header');
      const navH = nav ? nav.getBoundingClientRect().height : 83;
      const bar = document.querySelector<HTMLElement>('[class*="StickyBookBar_bar"]');
      const barH = bar ? bar.getBoundingClientRect().height : 0;
      const room = window.innerHeight - navH - barH;

      const y = window.scrollY;
      const sectionTop = section.getBoundingClientRect().top + y;
      const frameRect = frame.getBoundingClientRect();
      const frameTop = frameRect.top + y;
      const frameBottom = frameTop + frameRect.height;

      const top =
        frameBottom - sectionTop <= room
          ? sectionTop - navH
          : // Video only, starting just under the nav - a few px of the
            // section's own cream above it, never a cut-off heading.
            frameTop - navH - Math.max(0, Math.min(12, room - frameRect.height));
      window.scrollTo({ top: Math.max(0, top), behavior: 'instant' as ScrollBehavior });
    };

    // Once after the browser's own jump, and again after fonts/layout settle.
    const timers = [setTimeout(place, 60), setTimeout(place, 700)];
    return () => timers.forEach(clearTimeout);
  }, []);

  return null;
}
