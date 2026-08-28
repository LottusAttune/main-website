'use client';

import { useState } from 'react';

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

/** One toggle per side reveals all 3 of that side's descriptions at once
    (2 clicks total to see everything, not 6) - a single "See details" click
    rather than opening each benefit individually. Opens on click, closes on
    click-away or on leaving the panel with the mouse. The two sides are
    independent, so opening one never affects the other. */
export function BenefitsSplit({ teams, individual }: Props) {
  const [openSide, setOpenSide] = useState<'teams' | 'individual' | null>(null);

  const renderColumn = (group: BenefitsGroup, side: 'teams' | 'individual', tone: 'Dark' | 'Light') => {
    const open = openSide === side;
    return (
      <div
        className={`${styles.benefitsCell} ${styles[`benefitsCell${tone}`]} ${styles.benefitsCellItems}`}
        onMouseLeave={() => {
          if (open) setOpenSide(null);
        }}
      >
        {group.items.map((item) => (
          <div key={item.title} className={styles.benefitsItemRow}>
            <span className={styles.benefitsItemTitle}>{item.title}</span>
            {open ? <p className={styles.benefitsFlyoutBody}>{item.body}</p> : null}
          </div>
        ))}

        <button
          type="button"
          className={styles.benefitsItemToggle}
          onClick={() => setOpenSide((current) => (current === side ? null : side))}
          aria-expanded={open}
        >
          <span>{open ? 'Hide details' : 'See details'}</span>
          <span className={`${styles.benefitsItemArrow} ${open ? styles.benefitsItemArrowOpen : ''}`}>
            <ChevronIcon />
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className={styles.benefitsSplit}>
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

        {renderColumn(teams, 'teams', 'Dark')}

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

        {renderColumn(individual, 'individual', 'Light')}

        <div className={`${styles.benefitsCell} ${styles.benefitsCellLight} ${styles.benefitsCellClosing}`}>
          <p className={styles.benefitsClosing}>{individual.note}</p>
        </div>
      </div>
    </div>
  );
}
