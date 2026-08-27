'use client';

import { useCallback, useEffect, useState } from 'react';

import styles from './ReviewsCarousel.module.css';

const GAP = 18;
const AUTOPLAY_MS = 9000;
const EXCERPT_LIMIT = 230;

export type Review = {
  name: string;
  face: string | null;
  meta: string;
  text: string;
};

type Props = {
  reviews: readonly Review[];
};

function perViewFor(width: number): number {
  if (width >= 1180) return 3;
  if (width >= 820) return 2;
  return 1;
}

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
        d="M1 4.5 Q6.5 2.8 12 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ReviewsCarousel({ reviews }: Props) {
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(3);
  const [paused, setPaused] = useState(false);
  const [openReview, setOpenReview] = useState<number | null>(null);

  const maxIndex = Math.max(0, reviews.length - perView);

  useEffect(() => {
    const fit = () => {
      const next = perViewFor(window.innerWidth);
      setPerView(next);
      setIndex((i) => Math.min(i, Math.max(0, reviews.length - next)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [reviews.length]);

  // Autoplay pauses on hover/touch and while the full-review modal is open.
  useEffect(() => {
    if (paused || openReview !== null) return;
    const id = setInterval(() => {
      setIndex((i) => (i >= maxIndex ? 0 : i + 1));
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, openReview, maxIndex]);

  const close = useCallback(() => setOpenReview(null), []);

  useEffect(() => {
    if (openReview === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openReview, close]);

  const peek = perView === 1 ? 0.86 : 0.94;
  const cardWidth = `calc((100% - ${GAP * (perView - 1)}px) / ${perView} * ${peek})`;
  const step = `calc((100% - ${GAP * (perView - 1)}px) / ${perView} + ${GAP}px)`;

  const active = openReview !== null ? reviews[openReview] : null;

  return (
    <div
      className={styles.viewport}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className={styles.window}>
        <div
          className={styles.track}
          style={{ transform: `translateX(calc(-1 * ${index} * ${step}))` }}
        >
          {reviews.map((review, i) => {
            const { excerpt, truncated } = excerptOf(review.text);
            const inView = i >= index && i < index + perView;
            return (
              <figure
                key={review.name}
                className={`card card--lift ${styles.card} ${inView ? styles.cardActive : ''}`}
                style={{ width: cardWidth }}
                aria-hidden={!inView}
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
                      onClick={() => setOpenReview(i)}
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

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.arrow}
          aria-label="Previous review"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          ‹
        </button>
        <div className={styles.dots}>
          {Array.from({ length: maxIndex + 1 }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
              aria-label={`Go to review ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <button
          type="button"
          className={styles.arrow}
          aria-label="Next review"
          disabled={index >= maxIndex}
          onClick={() => setIndex((i) => Math.min(maxIndex, i + 1))}
        >
          ›
        </button>
      </div>

      {active ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={`Full review from ${active.name}`}
          onClick={close}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalQuote} aria-hidden="true">
              ”
            </div>
            <p className={styles.modalText}>{active.text}</p>
            <div className={styles.modalCaption}>
              <Wave />
              <span className={styles.name}>{active.name}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
