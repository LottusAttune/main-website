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

  return (
    <div
      className={`${styles.bar} ${shown ? styles.barShown : ''} ${basePath ? styles.barDark : ''}`}
      aria-hidden={!shown}
    >
      <span className={styles.label}>
        Two-hour sessions &nbsp;·&nbsp; 1 to 24 people &nbsp;·&nbsp; downtown Toronto
      </span>
      <div className={styles.actions}>
        <Link
          href={basePath ? `${basePath}/offerings` : '/book'}
          className={`btn btn--cream ${styles.cta} ${basePath ? styles.ctaSquared : ''}`}
          tabIndex={shown ? undefined : -1}
        >
          Book a session
        </Link>
        <Link
          href={`${basePath}/gift`}
          className={`btn btn--outline-dark ${styles.cta} ${basePath ? `${styles.ctaSquared} ${styles.giftCta}` : ''}`}
          tabIndex={shown ? undefined : -1}
        >
          Gift a session
        </Link>
      </div>
    </div>
  );
}
