'use client';

import { useEffect, useState } from 'react';

import { INCLUDED_FULL } from '@/data/content';
import styles from './IncludedModal.module.css';

type Props = {
  /** Passed straight through to the trigger button - callers supply their
   *  own btn variant (light or dark aside) plus any layout classes. */
  triggerClassName: string;
};

/** A self-contained "See What's Included" trigger + popup, for anywhere a
 *  mid-flow link to /experience#included would otherwise navigate away and
 *  lose in-progress form state (Book, Gift) - the list opens in place
 *  instead, so nothing already filled in is lost. */
export function IncludedModal({ triggerClassName }: Props) {
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
        See What&apos;s Included
      </button>

      {open ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="What's included"
          onClick={() => setOpen(false)}
        >
          <div className={styles.shell} onClick={(e) => e.stopPropagation()}>
            <div className={styles.title}>What&apos;s Included</div>
            {INCLUDED_FULL.map((text, i) => (
              <div key={text} className="numbered-row">
                <span className="numbered-row__n">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="numbered-row__text">{text}</span>
              </div>
            ))}
            <div className="rule-end" />
            <p className={styles.hint}>Click outside or press Esc to close</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
