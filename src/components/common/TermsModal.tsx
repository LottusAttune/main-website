'use client';

import { useEffect, useState } from 'react';

import type { LegalSection } from '@/components/legal/LegalPage';
import styles from './IncludedModal.module.css';

type Props = {
  triggerClassName: string;
  sections: LegalSection[];
};

/** The Terms & Conditions in a pop-up, so reading them never leaves the booking form. */
export function TermsModal({ triggerClassName, sections }: Props) {
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
      <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>
        Terms &amp; Conditions
      </button>

      {open ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Terms and Conditions"
          onClick={() => setOpen(false)}
        >
          <div className={styles.shell} onClick={(e) => e.stopPropagation()}>
            <div className={styles.title}>Terms &amp; Conditions</div>
            {sections.map((section) => (
              <section key={section.title} style={{ margin: '0 0 16px' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                    fontSize: 15,
                    margin: '0 0 6px',
                    color: 'var(--color-ink)',
                  }}
                >
                  {section.title}
                </h3>
                {section.paragraphs.map((p) => (
                  <p key={p} style={{ margin: '0 0 8px', fontSize: 14.5, lineHeight: 1.65 }}>
                    {p}
                  </p>
                ))}
              </section>
            ))}
            <button type="button" className="btn btn--dark" onClick={() => setOpen(false)}>
              Close
            </button>
            <p className={styles.hint}>Click outside or press Esc to close</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
