import Link from 'next/link';

import styles from './StickyBookBar.module.css';

export function StickyBookBar() {
  return (
    <div className={styles.bar}>
      <span className={styles.label}>
        Two-hour sessions &nbsp;·&nbsp; 1 to 24 people &nbsp;·&nbsp; downtown Toronto
      </span>
      <Link href="/book" className={`btn btn--cream ${styles.cta}`}>
        Book a session
      </Link>
    </div>
  );
}
