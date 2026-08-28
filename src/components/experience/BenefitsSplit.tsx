'use client';

import { useCallback, useEffect, useState } from 'react';

import { ChevronIcon } from '@/components/common/ChevronIcon';
import styles from '@/app/v1/experience/experience.module.css';

type BenefitsGroup = {
  items: readonly { title: string; body: string }[];
  note: string;
};

type Props = {
  teams: BenefitsGroup;
  individual: BenefitsGroup;
};

/** Each item's body opens in the same centered modal as the Experience cards
    and the reviews - a chevron (not the FAQ-style plus/minus) signals that
    clicking the title reveals more, and only one item is ever open at a
    time, so there's no leftover blank space where a description used to
    show inline. */
export function BenefitsSplit({ teams, individual }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const close = useCallback(() => setOpenKey(null), []);

  useEffect(() => {
    if (openKey === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openKey, close]);

  const activeItem = (() => {
    if (!openKey) return null;
    const [group, indexStr] = openKey.split('-');
    const index = Number(indexStr);
    return group === 'teams' ? teams.items[index] : individual.items[index];
  })();

  return (
    <>
      <div className={styles.benefitsSplit}>
        {/* One continuous background per side, rather than each row
            painting its own copy of the gradient - spans every row so the
            dark/light fills read as one solid panel, not banded strips.
            Hidden below 760px, where the two column wrappers below carry
            their own continuous background instead. */}
        <div className={`${styles.benefitsBg} ${styles.benefitsBgDark}`} aria-hidden="true" />
        <div className={`${styles.benefitsBg} ${styles.benefitsBgLight}`} aria-hidden="true" />

        {/* Each column is `display: contents` at desktop width, so its
            children become direct grid items and pair row-for-row with the
            other column (a grid row always sizes to its tallest cell, so
            Teams and Individuals line up exactly no matter how their copy
            lengths differ). Below 760px it becomes a normal block instead,
            so the column stacks as one continuous piece - Teams entirely,
            then Individuals - rather than interleaving row by row. */}
        <div className={`${styles.benefitsCol} ${styles.benefitsColDark}`}>
          <div className={`${styles.benefitsCell} ${styles.benefitsCellDark} ${styles.benefitsCellHeader}`}>
            <h3 id="teams-heading" className={`display ${styles.benefitsPanelHeading}`}>
              For Teams &amp; Organizations
            </h3>
            <p className={styles.benefitsPanelNote}>
              Elevate your company culture through a new generation of
              team building
            </p>
          </div>

          {teams.items.map((item, i) => (
            <div
              key={item.title}
              className={`${styles.benefitsCell} ${styles.benefitsCellDark} ${styles.benefitsCellItem}`}
              data-reveal=""
            >
              <button
                type="button"
                className={styles.benefitsItemToggle}
                onClick={() => setOpenKey(`teams-${i}`)}
                aria-haspopup="dialog"
              >
                <span className={styles.benefitsItemTitle}>{item.title}</span>
                <ChevronIcon className={styles.benefitsItemArrow} />
              </button>
            </div>
          ))}

          <div className={`${styles.benefitsCell} ${styles.benefitsCellDark} ${styles.benefitsCellClosing}`}>
            <p className={styles.benefitsClosing}>{teams.note}</p>
          </div>
        </div>

        <div className={`${styles.benefitsCol} ${styles.benefitsColLight}`}>
          <div className={`${styles.benefitsCell} ${styles.benefitsCellLight} ${styles.benefitsCellHeader}`}>
            <h3 id="individuals-heading" className={`display ${styles.benefitsPanelHeading}`}>
              For Individuals
            </h3>
            <p className={styles.benefitsPanelNote}>
              Create space to reset, recharge, and reconnect from within
            </p>
          </div>

          {individual.items.map((item, i) => (
            <div
              key={item.title}
              className={`${styles.benefitsCell} ${styles.benefitsCellLight} ${styles.benefitsCellItem}`}
              data-reveal=""
            >
              <button
                type="button"
                className={styles.benefitsItemToggle}
                onClick={() => setOpenKey(`individual-${i}`)}
                aria-haspopup="dialog"
              >
                <span className={styles.benefitsItemTitle}>{item.title}</span>
                <ChevronIcon className={styles.benefitsItemArrow} />
              </button>
            </div>
          ))}

          <div className={`${styles.benefitsCell} ${styles.benefitsCellLight} ${styles.benefitsCellClosing}`}>
            <p className={styles.benefitsClosing}>{individual.note}</p>
          </div>
        </div>
      </div>

      {activeItem ? (
        <div
          className={styles.componentOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.title}
          onClick={close}
        >
          <div className={styles.componentModal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.componentModalTitle}>{activeItem.title}</h2>
            <p className={styles.componentModalBody}>{activeItem.body}</p>
            <p className={styles.componentModalHint}>Click outside or press Esc to close</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
