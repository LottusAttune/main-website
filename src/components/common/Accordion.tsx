'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';

import styles from './Accordion.module.css';

export type AccordionItem = {
  title: string;
  /** A prose answer (FAQ) or a list of credentials (Founder). */
  answer?: string;
  items?: readonly string[];
};

type Props = {
  items: readonly AccordionItem[];
  tone?: 'light' | 'dark';
  /** Index open on first render, or null for all closed. */
  defaultOpen?: number | null;
  /** Show an "N entries" count beside each title. */
  showCounts?: boolean;
  /** Smaller type and tighter spacing, for a shorter list sharing space with other content. */
  compact?: boolean;
};

/** One panel open at a time. Body height is measured, never capped. */
export function Accordion({
  items,
  tone = 'light',
  defaultOpen = null,
  showCounts = false,
  compact = false,
}: Props) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  const bodyRefs = useRef<Array<HTMLDivElement | null>>([]);
  const baseId = useId();
  const dark = tone === 'dark';

  // Measure real content height rather than capping at a fixed max-height, so a
  // long answer never clips.
  useLayoutEffect(() => {
    bodyRefs.current.forEach((el, i) => {
      if (!el) return;
      el.style.maxHeight = open === i ? `${el.scrollHeight}px` : '0px';
    });
  }, [open]);

  return (
    <div>
      {items.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${baseId}-panel-${i}`;
        const headId = `${baseId}-head-${i}`;
        const count = item.items?.length ?? 0;

        return (
          <div
            key={item.title}
            className={`${styles.item} ${dark ? styles.itemDark : ''}`}
          >
            <button
              type="button"
              id={headId}
              className={[
                styles.head,
                dark ? styles.headDark : '',
                compact ? styles.headCompact : '',
                isOpen ? (dark ? styles.headDarkOpen : styles.headOpen) : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen((current) => (current === i ? null : i))}
            >
              <span className={styles.headLabel}>
                <span>{item.title}</span>
                {showCounts && count > 0 ? (
                  <span className={styles.count}>
                    {count} {count === 1 ? 'entry' : 'entries'}
                  </span>
                ) : null}
              </span>
              <span
                className={[
                  'sign',
                  isOpen ? 'sign--open' : '',
                  dark ? 'sign--gold-light' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden="true"
              />
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={headId}
              ref={(el) => {
                bodyRefs.current[i] = el;
              }}
              className={`${styles.body} ${isOpen ? styles.bodyOpen : ''} ${compact ? styles.bodyCompact : ''}`}
            >
              {item.answer ? (
                <p className={`${styles.answer} ${compact ? styles.answerCompact : ''}`}>
                  {item.answer}
                </p>
              ) : null}
              {item.items ? (
                <div className={`${styles.bullets} ${dark ? styles.bulletsDark : ''}`}>
                  {item.items.map((entry) => (
                    <div key={entry} className={styles.bullet}>
                      <span>{entry}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      <div className={dark ? styles.itemDark : styles.item} />
    </div>
  );
}
