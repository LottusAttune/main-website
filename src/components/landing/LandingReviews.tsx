'use client';

import { useCallback, useEffect, useState } from 'react';

import { Wave } from '@/components/common/Wave';
import styles from '@/app/book-now/book-now.module.css';
import modal from '@/components/home/ReviewsCarousel.module.css';

type Review = { name: string; meta: string; text: string };

/**
 * The ad pages' review cards: each shows the first four lines with "Read
 * full review", which opens the whole review in the same pop-up the home
 * page's review carousel uses.
 */
export function LandingReviews({ reviews }: { reviews: readonly Review[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const active = open !== null ? reviews[open] : null;

  return (
    <>
      <div className={styles.reviewGrid}>
        {reviews.map((review, i) => (
          <figure key={review.name} className={`card ${styles.reviewCard}`}>
            <div className={styles.reviewQuote} aria-hidden="true">
              ”
            </div>
            <blockquote className={`${styles.reviewText} ${styles.reviewClamp}`}>
              {review.text}
            </blockquote>
            <button type="button" className={modal.more} onClick={() => setOpen(i)}>
              Read full review
            </button>
            <figcaption className={styles.reviewCaption}>
              <span className={styles.avatar}>{review.name.charAt(0)}</span>
              <span>
                <span className={styles.reviewName}>{review.name}</span>
                <span className={styles.reviewMeta}>{review.meta}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {active ? (
        <div
          className={modal.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={`Full review from ${active.name}`}
          onClick={close}
        >
          <div className={modal.modal} onClick={(e) => e.stopPropagation()}>
            <div className={modal.modalQuote} aria-hidden="true">
              ”
            </div>
            <p className={modal.modalText}>{active.text}</p>
            <div className={modal.modalCaption}>
              <Wave className={modal.wave} />
              <span className={modal.name}>{active.name}</span>
              <span className={modal.modalHint}>Click outside or press Esc to close</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
