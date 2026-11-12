'use client';

import { useEffect } from 'react';

const OUTBOUND = ['/book', '/gift', '/discovery-call'];

/**
 * Remembers, for this browser tab only, that the visitor left an ad page for
 * one of the booking pages - so that page's "Back" link can step back in
 * history (returning to the same scroll position) instead of reloading the
 * ad page from the top.
 */
export function LandingReturnTracker({ href }: { href: string }) {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a');
      if (!link || link.origin !== window.location.origin) return;
      if (!OUTBOUND.includes(link.pathname)) return;
      try {
        sessionStorage.setItem('la-return', JSON.stringify({ href, target: link.pathname }));
      } catch {
        // Storage blocked: the Back link still works, it just reloads the page.
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [href]);

  return null;
}
