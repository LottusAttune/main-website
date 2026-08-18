'use client';

import { useState } from 'react';

import { FAQS, REVIEWS } from '@/data/content';
import { SILVANA_HOME } from '@/data/silvana';
import { FilmFrame } from '@/components/home/FilmFrame';
import { ReviewsCarousel } from '@/components/home/ReviewsCarousel';
import styles from './silvana.module.css';

export function HomeFilm() {
  return (
    <div className={styles.heroMedia}>
      <FilmFrame />
    </div>
  );
}

export function HomeReviews() {
  return (
    <div className={styles.band}>
      <div className={styles.shell}>
        <h2 className={styles.bandTitle}>{SILVANA_HOME.reviewsHeading}</h2>
        <ReviewsCarousel reviews={REVIEWS} />
      </div>
    </div>
  );
}

/**
 * Her FAQ is a grid of pill buttons rather than a stacked accordion — press
 * one and its answer opens underneath.
 */
export function HomeFaq() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className={styles.section}>
      <div className={styles.shell}>
        <h2 className={styles.bandTitle}>{SILVANA_HOME.faqHeading}</h2>

        <div className={styles.faqGrid}>
          {FAQS.map((faq, i) => (
            <button
              key={faq.q}
              type="button"
              aria-expanded={open === i}
              className={`${styles.faqPill} ${open === i ? styles.faqPillOn : ''}`}
              onClick={() => setOpen((c) => (c === i ? null : i))}
            >
              {faq.q}
            </button>
          ))}
        </div>

        {open !== null ? (
          <p className={styles.faqAnswer} role="region">
            {FAQS[open].a}
          </p>
        ) : null}
      </div>
    </section>
  );
}
