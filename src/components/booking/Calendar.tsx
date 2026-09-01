'use client';

import { useState } from 'react';

import styles from './Calendar.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Local `YYYY-MM-DD`. Never use toISOString here — it shifts across timezones. */
export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDay(date: Date): string {
  return date.toLocaleDateString('en-CA', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

type Props = {
  /** Earliest bookable date, derived from the lead time. */
  earliest: Date;
  /** ISO days the owner has closed. */
  blocked: readonly string[];
  selected: Date | null;
  onSelect: (date: Date) => void;
  label: string;
  /** Smaller version for a page with only a date + time to pick, no summary aside. */
  compact?: boolean;
  /** Days of the week (0 = Sunday) always closed, every week. */
  closedWeekdays?: readonly number[];
};

export function Calendar({
  earliest,
  blocked,
  selected,
  onSelect,
  label,
  compact,
  closedWeekdays,
}: Props) {
  const [view, setView] = useState({
    year: earliest.getFullYear(),
    month: earliest.getMonth(),
  });

  const blockedSet = new Set(blocked);
  const first = new Date(view.year, view.month, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  // Never let the owner page back before the earliest bookable month.
  const atEarliestMonth =
    view.year === earliest.getFullYear() && view.month === earliest.getMonth();

  const step = (delta: number) =>
    setView((v) => {
      const next = new Date(v.year, v.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <div
      className={`${styles.calendar} ${compact ? styles.compact : ''}`}
      role="group"
      aria-label={label}
    >
      <div className={styles.head}>
        <button
          type="button"
          className={styles.nav}
          aria-label="Previous month"
          disabled={atEarliestMonth}
          onClick={() => step(-1)}
        >
          ‹
        </button>
        <div className={styles.month} aria-live="polite">
          {first.toLocaleDateString('en-CA', {
            month: 'long',
            year: 'numeric',
          })}
        </div>
        <button
          type="button"
          className={styles.nav}
          aria-label="Next month"
          onClick={() => step(1)}
        >
          ›
        </button>
      </div>

      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className={styles.days}>
        {Array.from({ length: lead }, (_, i) => (
          <div key={`pad-${i}`} className={styles.dayPad} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const n = i + 1;
          const date = new Date(view.year, view.month, n);
          const isBlocked =
            blockedSet.has(isoDay(date)) ||
            (closedWeekdays?.includes(date.getDay()) ?? false);
          const tooSoon = date < earliest;
          const open = !isBlocked && !tooSoon;
          const isSelected =
            selected !== null && isoDay(selected) === isoDay(date);

          return (
            <button
              key={n}
              type="button"
              disabled={!open}
              aria-label={
                isBlocked ? `${formatDay(date)} — unavailable` : formatDay(date)
              }
              aria-pressed={isSelected}
              className={[
                styles.day,
                !open ? styles.dayClosed : '',
                isBlocked ? styles.dayBlocked : '',
                isSelected ? styles.daySelected : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(date)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
