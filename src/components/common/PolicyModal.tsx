'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { FAQS } from '@/data/content';
import styles from './IncludedModal.module.css';

const CANCELLATION_POLICY = (() => {
  const faq = FAQS.find((f) => f.q === 'Cancellation Policy');
  if (!faq) throw new Error('"Cancellation Policy" FAQ not found in FAQS');
  return faq;
})();

type Props = {
  /** Passed straight through to the trigger button - callers supply their
   *  own btn variant (light or dark aside) plus any layout classes. */
  triggerClassName: string;
};

/** Same "open in place" pattern as IncludedModal - a mid-flow link to the
 *  FAQ page would navigate away and lose in-progress form state (Book,
 *  Gift), so the policy text opens in a popup instead. Pulled from the
 *  live FAQ answer so it can never drift out of sync with it. */
export function PolicyModal({ triggerClassName }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        Cancellation Policy
      </button>

      {open
        ? createPortal(

        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Cancellation policy"
          onClick={() => setOpen(false)}
        >
          <div className={`${styles.shell} ${styles.shellCompact}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.head}>
              <div className={styles.title} style={{ margin: 0 }}>Cancellation Policy</div>
              <button type="button" className={styles.close} aria-label="Close" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            <p style={{ whiteSpace: 'pre-line' }}>{CANCELLATION_POLICY.a}</p>
            <button type="button" className="btn btn--dark" onClick={() => setOpen(false)}>
              Close
            </button>
            <p className={styles.hint}>Click outside or press Esc to close</p>
          </div>
        </div>
          ,
          document.body
        )
        : null}
    </>
  );
}
