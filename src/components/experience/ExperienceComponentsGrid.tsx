'use client';

import { useCallback, useEffect, useState } from 'react';

import styles from '@/app/v1/experience/experience.module.css';
import { ExperienceComponentCard } from './ExperienceComponentCard';

export type ExperienceComponentCardData = {
  n: string;
  title: string;
  body: string;
  photoSrc: string;
  photoWidth: number;
  photoHeight: number;
  photoPosition: string;
  mirror?: boolean;
};

type Props = {
  cards: ExperienceComponentCardData[];
};

/** "Details" opens a centered modal (same pattern as the review cards' "Read
    full review") instead of an in-place reveal - every card looks identical
    when open, none of them can overlap the Benefits panel below, and there's
    no uneven depth between a short description and a long one. */
export function ExperienceComponentsGrid({ cards }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const close = useCallback(() => setOpenIndex(null), []);
  const active = openIndex !== null ? cards[openIndex] : null;

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openIndex, close]);

  return (
    <div className={styles.componentGrid}>
      {cards.map((card, i) => (
        <ExperienceComponentCard
          key={card.n}
          {...card}
          open={openIndex === i}
          onOpen={() => setOpenIndex(i)}
        />
      ))}

      {active ? (
        <div
          className={styles.componentOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={close}
        >
          <div className={styles.componentModal} onClick={(e) => e.stopPropagation()}>
            <span className={styles.componentModalNumber}>{active.n}</span>
            <h2 className={styles.componentModalTitle}>{active.title}</h2>
            <p className={styles.componentModalBody}>{active.body}</p>
            <p className={styles.componentModalHint}>Click outside or press Esc to close</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
