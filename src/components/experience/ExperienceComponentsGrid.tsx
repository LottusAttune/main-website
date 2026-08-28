'use client';

import { useState } from 'react';

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

/** Only one card's details open at a time - opening another closes whichever
    was open, so reading one never leaves the row permanently crowded. */
export function ExperienceComponentsGrid({ cards }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className={styles.componentGrid}>
      {cards.map((card, i) => (
        <ExperienceComponentCard
          key={card.n}
          {...card}
          open={openIndex === i}
          onToggle={() => setOpenIndex((current) => (current === i ? null : i))}
        />
      ))}
    </div>
  );
}
