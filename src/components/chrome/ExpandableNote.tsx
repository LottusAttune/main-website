'use client';

import { useState } from 'react';

import { ChevronIcon } from '@/components/common/ChevronIcon';
import styles from './SiteFooter.module.css';

type Props = {
  label: string;
  labelClassName?: string;
  children: React.ReactNode;
};

export function ExpandableNote({ label, labelClassName, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.expandable}>
      <button
        type="button"
        className={styles.expandableToggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={labelClassName}>{label}</span>
        <span className={`${styles.expandableArrow} ${open ? styles.expandableArrowOpen : ''}`}>
          <ChevronIcon />
        </span>
      </button>
      {open && <div className={styles.expandableBody}>{children}</div>}
    </div>
  );
}
