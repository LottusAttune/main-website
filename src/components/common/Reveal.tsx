'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';

/**
 * Mount once per page. Everything marked `data-reveal="hidden"` below it fades
 * up on scroll. Kept as a component so pages can stay Server Components.
 */
export function Reveal() {
  useScrollReveal();
  return null;
}
