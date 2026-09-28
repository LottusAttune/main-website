import styles from '@/app/experience/experience.module.css';

type BenefitsGroup = {
  items: readonly string[];
  note: string;
};

type Props = {
  teams: BenefitsGroup;
  individual: BenefitsGroup;
};

/** Each side lists its benefits in full, straight away - no titles and no
    "See details" toggle to open first. */
export function BenefitsSplit({ teams, individual }: Props) {
  const renderColumn = (group: BenefitsGroup, tone: 'Dark' | 'Light') => (
    <ul className={`${styles.benefitsCell} ${styles[`benefitsCell${tone}`]} ${styles.benefitsCellItems}`}>
      {group.items.map((item) => (
        <li key={item} className={styles.benefitsItemRow}>
          <span className={styles.benefitsItemMark} aria-hidden="true" />
          <span className={styles.benefitsItemText}>{item}</span>
        </li>
      ))}
    </ul>
  );

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

        {renderColumn(teams, 'Dark')}

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

        {renderColumn(individual, 'Light')}

        <div className={`${styles.benefitsCell} ${styles.benefitsCellLight} ${styles.benefitsCellClosing}`}>
          <p className={styles.benefitsClosing}>{individual.note}</p>
        </div>
      </div>
    </div>
  );
}
