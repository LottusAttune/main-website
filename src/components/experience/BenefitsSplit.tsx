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

/** Each item's body reveals inline, right below its own title, instead of
    the full-screen modal used for the Experience cards/reviews - these
    one-line benefits are too short to earn a full dialog. Opens on click,
    closes on click-away or on leaving the row with the mouse, and only one
    item is open at a time. Each column (Teams/Individuals) is independent,
    so an open item pushes only its own column down - never the opposite
    column, and never leaves reserved blank space when closed. */
export function BenefitsSplit({ teams, individual }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  const renderColumn = (
    group: BenefitsGroup,
    prefix: 'teams' | 'individual',
    tone: 'Dark' | 'Light',
  ) =>
    group.items.map((item, i) => {
      const key = `${prefix}-${i}`;
      const open = openKey === key;
      return (
        <div
          key={item.title}
          className={`${styles.benefitsCell} ${styles[`benefitsCell${tone}`]} ${styles.benefitsCellItem}`}
          data-reveal=""
          onMouseLeave={() => {
            if (open) setOpenKey(null);
          }}
        >
          <button
            type="button"
            className={styles.benefitsItemToggle}
            onClick={() => setOpenKey((current) => (current === key ? null : key))}
            aria-expanded={open}
          >
            <span className={styles.benefitsItemTitle}>{item.title}</span>
            <span className={`${styles.benefitsItemArrow} ${open ? styles.benefitsItemArrowOpen : ''}`}>
              <ChevronIcon />
            </span>
          </button>
          {open ? (
            <div className={styles.benefitsFlyout}>
              <p className={styles.benefitsFlyoutBody}>{item.body}</p>
            </div>
          ) : null}
        </div>
      );
    });

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
