'use client';

import { useEffect, useState } from 'react';

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

      {open ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Cancellation policy"
          onClick={() => setOpen(false)}
        >
          <div className={styles.shell} onClick={(e) => e.stopPropagation()}>
            <div className={styles.title}>Cancellation Policy</div>
            <p>{CANCELLATION_POLICY.a}</p>
            <div className="rule-end" />
            <p className={styles.hint}>Click outside or press Esc to close</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
