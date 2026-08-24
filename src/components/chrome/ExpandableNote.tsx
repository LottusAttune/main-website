'use client';

import { useState } from 'react';

import styles from './SiteFooter.module.css';

type Props = {
  label: string;
  children: React.ReactNode;
};

export function ExpandableNote({ label, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.expandable}>
      <button
        type="button"
        className={styles.expandableToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{label}</span>
        <span className={`${styles.expandableArrow} ${open ? styles.expandableArrowOpen : ''}`}>
          ⌄
        </span>
      </button>
      {open && <div className={styles.expandableBody}>{children}</div>}
    </div>
  );
}
