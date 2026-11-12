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
 * first screen, then slides up. On /book-now it carries the site's only Book/Gift
 * buttons at the very bottom of a page, since the footer's closing block is
 * text-only to avoid repeating them. Everywhere else, the top nav's own
 * Book/Gift buttons are already visible at every scroll position, so this
 * bar trades its two buttons for a single quiet text link instead of
 * repeating them.
 */
type Props = {
  /** /book-now's own footer is text-only, so it opts into the two-button form
   *  here instead of the quiet link every other page uses. */
  twoButtons?: boolean;
  /** /book and /gift don't carry the top nav's Book/Gift buttons on mobile/
   *  tablet (see SiteNav), so this bar is the only way to switch between
   *  them without navigating back through the rest of the site - but
   *  showing "Book" while already on /book (or "Gift" on /gift) is a
   *  redundant link to the current page. Suppresses just that one button,
   *  keeping the other. */
  hideAction?: 'book' | 'gift';
  /** id of a section that carries its own booking buttons. Once it scrolls
   *  into view the bar slides away, so the two sets never show together. */
  hideFromId?: string;
};

export function StickyBookBar({ twoButtons = false, hideAction, hideFromId }: Props) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const threshold = () => window.innerHeight * 0.75;

    const update = () => {
      const stop = hideFromId ? document.getElementById(hideFromId) : null;
      if (stop && stop.getBoundingClientRect().top < window.innerHeight) {
        setShown(false);
        return;
      }
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
  }, [hideFromId]);

  if (!twoButtons) {
    // The top nav already carries the site's real Book/Gift buttons at every
    // scroll position on desktop - repeating them here as a second pair of
    // pills reads as redundant, so desktop trades the two buttons for one
    // quiet text link. On mobile/tablet the nav sheds those buttons instead
    // (see SiteNav), so this bar carries the real Book/Gift pair there.
    return (
      <div
        className={`${styles.bar} ${shown ? styles.barShown : ''} ${styles.barDark}`}
        aria-hidden={!shown}
      >
        <span className={styles.label}>
          Two-hour sessions &nbsp;·&nbsp; 1 to 25 people &nbsp;·&nbsp; downtown Toronto
        </span>
        <Link
          href="/book"
          className={styles.quietLink}
          tabIndex={shown ? undefined : -1}
        >
          Book a session <span aria-hidden="true">→</span>
        </Link>
        {/* Tablet has room for the same single-line format as desktop, just
            bigger - only true phone widths need the stacked 3-line version. */}
        <span className={styles.tabletLabel}>
          Two-hour sessions &nbsp;·&nbsp; 1 to 25 people &nbsp;·&nbsp; downtown Toronto
        </span>
        <span className={styles.mobileLabel}>
          Two hour session
          <br />
          Downtown Toronto
          <br />
          1-25 people
        </span>
        <div className={styles.mobileActions}>
          {hideAction !== 'book' && (
            <Link
              href="/book"
              className={`btn btn--cream ${styles.mobileCta}`}
              tabIndex={shown ? undefined : -1}
            >
              Book
            </Link>
          )}
          {hideAction !== 'gift' && (
            <Link
              href="/gift"
              className={`btn btn--outline-dark ${styles.mobileCta}`}
              tabIndex={shown ? undefined : -1}
            >
              Gift
            </Link>
          )}
        </div>
      </div>
    );
  }

  // The ad pages: the same dark bar as the rest of the site, with just Book
  // and Gift at every width. Fixed rather than sticky, so the bar never
  // keeps an empty slot at the end of the page once it has slid away.
  return (
    <div
      className={`${styles.bar} ${styles.barDark} ${styles.barFixed} ${shown ? styles.barShown : ''}`}
      aria-hidden={!shown}
    >
      <span className={styles.label}>
        Two-hour sessions &nbsp;·&nbsp; 1 to 25 people &nbsp;·&nbsp; downtown Toronto
      </span>
      <span className={styles.tabletLabel}>
        Two-hour sessions &nbsp;·&nbsp; 1 to 25 people &nbsp;·&nbsp; downtown Toronto
      </span>
      <span className={styles.mobileLabel}>
        Two hour session
        <br />
        Downtown Toronto
        <br />
        1-25 people
      </span>
      <div className={styles.actions}>
        <Link
          href="/book"
          className={`btn btn--cream ${styles.twoCta}`}
          tabIndex={shown ? undefined : -1}
        >
          Book
        </Link>
        <Link
          href="/gift"
          className={`btn btn--outline-dark ${styles.twoCta}`}
          tabIndex={shown ? undefined : -1}
        >
          Gift
        </Link>
      </div>
    </div>
  );
}
