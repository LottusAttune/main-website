'use client';

import { useEffect } from 'react';

/**
 * The same scroll motion as the home page hero (HomeHero.tsx): the photo
 * drifts slower than the page and the copy lifts and fades as you scroll
 * past. Works on the ad page's server-rendered hero through its
 * data-hero / data-hero-bleed / data-hero-copy attributes.
 */
export function HeroMotion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const section = document.querySelector<HTMLElement>('[data-hero]');
    const bleed = document.querySelector<HTMLElement>('[data-hero-bleed]');
    const copy = document.querySelector<HTMLElement>('[data-hero-copy]');
    if (!section || !bleed) return;

    let frame: number | null = null;

    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const y = window.scrollY;
        const height = section.offsetHeight || 1;
        if (y > height * 1.2) return;

        const progress = Math.min(1, y / height);
        bleed.style.transform = `scale(1.14) translate3d(0, ${(progress * 16).toFixed(2)}%, 0)`;
        if (copy) {
          copy.style.transform = `translate3d(0, ${(progress * -38).toFixed(1)}px, 0)`;
          copy.style.opacity = String(Math.max(0, 1 - progress * 1.25));
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
