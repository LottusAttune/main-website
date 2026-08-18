'use client';

import { useState } from 'react';

import { TRAINING } from '@/data/content';
import { SILVANA_FOUNDER } from '@/data/silvana';
import styles from './silvana.module.css';

/**
 * Her deck shows the training areas as a flat list of rows with a + on each,
 * so this opens one at a time in place rather than as stacked cards.
 */
export function CredAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className={styles.credPanel}>
      <div className={styles.credPanelHead}>{SILVANA_FOUNDER.trainingHeading}</div>

      {TRAINING.map((group, i) => (
        <div key={group.title}>
          <button
            type="button"
            className={styles.credRow}
            aria-expanded={open === i}
            onClick={() => setOpen((c) => (c === i ? null : i))}
          >
            <span>
              {group.title}
              {group.title === 'Live Music Performances' ? (
                <span className={styles.handpanTag}>
                  {SILVANA_FOUNDER.handpanLink}
                </span>
              ) : null}
            </span>
            <span className={styles.credSign} aria-hidden="true">
              {open === i ? '−' : '+'}
            </span>
          </button>

          {open === i ? (
            <div className={styles.credBodyOpen}>
              {group.items.map((item) => (
                <p key={item} className={styles.credBullet}>
                  {item}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
