'use client';

import { useState } from 'react';

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
          <svg
            width="11"
            height="7"
            viewBox="0 0 11 7"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 1L5.5 5.5L10 1"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {open && <div className={styles.expandableBody}>{children}</div>}
    </div>
  );
}
