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
 * first screen, then slides up. On /lp it carries the site's only Book/Gift
 * buttons at the very bottom of a page, since the footer's closing block is
 * text-only to avoid repeating them. On /v1 the top nav's own Book/Gift
 * buttons are already visible at every scroll position, so this bar trades
 * its two buttons for a single quiet text link instead of repeating them.
 */
type Props = {
  /** Prefix for the Book/Gift links. The /v1 backup passes "/v1" so it stays
   *  inside itself rather than sending the reader to the live site. */
  basePath?: string;
};

export function StickyBookBar({ basePath = '' }: Props) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const threshold = () => window.innerHeight * 0.75;

    const update = () => {
      const nearBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 40;
      setShown(window.scrollY > threshold() || nearBottom);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  if (basePath) {
    // On /v1 the top nav already carries the site's real Book/Gift buttons at
    // every scroll position - repeating them here as a second pair of pills
    // read as redundant. This version keeps the same slide-up reveal but
    // trades the two buttons for one quiet text link.
    return (
      <div
        className={`${styles.bar} ${shown ? styles.barShown : ''} ${styles.barDark}`}
        aria-hidden={!shown}
      >
        <span className={styles.label}>
          Two-hour sessions &nbsp;·&nbsp; 1 to 24 people &nbsp;·&nbsp; downtown Toronto
        </span>
        <Link
          href={`${basePath}/offerings`}
          className={styles.quietLink}
          tabIndex={shown ? undefined : -1}
        >
          Book a session <span aria-hidden="true">→</span>
        </Link>
      </div>
    );
  }

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
