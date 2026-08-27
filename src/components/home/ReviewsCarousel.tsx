'use client';

import { useCallback, useEffect, useState } from 'react';

import styles from './ReviewsCarousel.module.css';

const EXCERPT_LIMIT = 230;
/** Seconds per card - keeps the drift slow and easy to read regardless of
    how many reviews there are. */
const SECONDS_PER_CARD = 8;

export type Review = {
  name: string;
  face: string | null;
  meta: string;
  text: string;
};

type Props = {
  reviews: readonly Review[];
};

function excerptOf(text: string): { excerpt: string; truncated: boolean } {
  if (text.length <= EXCERPT_LIMIT) return { excerpt: text, truncated: false };
  return {
    excerpt: `${text.slice(0, EXCERPT_LIMIT - 4).replace(/[\s,.;]+$/, '')}…`,
    truncated: true,
  };
}

/** A small signature-like flourish next to each reviewer's name, in place of
    a circle that was neither a real photo nor adding real information. */
function Wave() {
  return (
    <svg
      className={styles.wave}
      width="13"
      height="8"
      viewBox="0 0 13 8"
      aria-hidden="true"
    >
      <path
        d="M1 5 C5 1 8 7 12 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ReviewsCarousel({ reviews }: Props) {
  const [paused, setPaused] = useState(false);
  const [openReview, setOpenReview] = useState<Review | null>(null);

  const close = useCallback(() => setOpenReview(null), []);

  useEffect(() => {
    if (!openReview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openReview, close]);

  // Rendered twice back to back so the CSS animation can scroll from 0 to
  // -50% and loop with no visible seam, instead of snapping back to start.
  const loop = [...reviews, ...reviews];
  const duration = `${reviews.length * SECONDS_PER_CARD}s`;

  return (
    <div
      className={styles.viewport}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      onTouchCancel={() => setPaused(false)}
    >
      <div className={styles.window}>
        <div
          className={styles.track}
          style={{
            animationDuration: duration,
            animationPlayState: paused || openReview ? 'paused' : 'running',
          }}
        >
          {loop.map((review, i) => {
            const { excerpt, truncated } = excerptOf(review.text);
            return (
              <figure
                key={`${review.name}-${i}`}
                className={`card card--lift ${styles.card}`}
              >
                <div className={styles.quoteMark} aria-hidden="true">
                  ”
                </div>
                <blockquote className={styles.excerpt}>{excerpt}</blockquote>
                <figcaption className={styles.footer}>
                  {truncated ? (
                    <button
                      type="button"
                      className={styles.more}
                      onClick={() => setOpenReview(review)}
                    >
                      Read full review
                    </button>
                  ) : (
                    <span />
                  )}
                  <span className={styles.signature}>
                    <Wave />
                    <span className={styles.name}>{review.name}</span>
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>

      {openReview ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={`Full review from ${openReview.name}`}
          onClick={close}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalQuote} aria-hidden="true">
              ”
            </div>
            <p className={styles.modalText}>{openReview.text}</p>
            <div className={styles.modalCaption}>
              <Wave />
              <span className={styles.name}>{openReview.name}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
