'use client';

import { useEffect } from 'react';

/**
 * Fades section children up 22px as they enter the viewport.
 *
 * Elements opt in with a bare `data-reveal` attribute and start *visible*. This
 * hook hides only the ones it is about to observe, so if JavaScript never runs,
 * the observer is throttled, or motion is reduced, the page still reads — it
 * simply does not animate.
 */

export function useScrollReveal(): void {
  useEffect(() => {
    const reveal = (el: Element) => el.setAttribute('data-reveal', 'shown');
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal=""]')
    );
    if (targets.length === 0) return;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // IntersectionObserver is suspended while the document is hidden, so a page
    // opened in a background tab would stay blank. Skip the animation instead.
    const backgrounded = document.visibilityState !== 'visible';

    if (reducedMotion || backgrounded || !('IntersectionObserver' in window)) {
      targets.forEach(reveal);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );

    targets.forEach((el, i) => {
      // Anything already on screen at load is revealed outright, so the top of
      // the page never flashes empty.
      if (el.getBoundingClientRect().top < window.innerHeight) {
        reveal(el);
        return;
      }
      el.setAttribute('data-reveal', 'hidden');
      el.style.transitionDelay = `${(i % 3) * 60}ms`;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}
