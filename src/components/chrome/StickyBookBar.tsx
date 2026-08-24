'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import styles from './StickyBookBar.module.css';

/**
 * The booking bar is a reminder for people already reading, not a competitor to
 * the hero's own call to action — on the home and landing pages it would sit
 * about eighty pixels below an identical BOOK A SESSION button.
 *
 * So it stays out of the way until the reader has scrolled past roughly the
 * first screen, then slides up. It also carries the site's only Book/Gift
 * buttons at the very bottom of a page, since the footer's closing block is
 * text-only to avoid repeating them.
 */
export function StickyBookBar() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const threshold = () => window.innerHeight * 0.75;

    const update = () => setShown(window.scrollY > threshold());

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div
      className={`${styles.bar} ${shown ? styles.barShown : ''}`}
      aria-hidden={!shown}
    >
      <span className={styles.label}>
        Two-hour sessions &nbsp;·&nbsp; 1 to 24 people &nbsp;·&nbsp; downtown Toronto
      </span>
      <div className={styles.actions}>
        <Link
          href="/book"
          className={`btn btn--cream ${styles.cta}`}
          tabIndex={shown ? undefined : -1}
        >
          Book a session
        </Link>
        <Link
          href="/gift"
          className={`btn btn--outline-dark ${styles.cta}`}
          tabIndex={shown ? undefined : -1}
        >
          Gift a session
        </Link>
      </div>
    </div>
  );
}
