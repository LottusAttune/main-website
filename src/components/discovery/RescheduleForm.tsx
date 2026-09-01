'use client';

import { useMemo, useState } from 'react';

import { Calendar, formatDay, isoDay } from '@/components/booking/Calendar';
import type { BlockedCallTime } from '@/lib/settings';
import { DISCOVERY_CALL_TIMES, SITE } from '@/lib/site';
import styles from './DiscoveryCallForm.module.css';

type Props = {
  token: string;
  name: string;
  currentDate: string;
  currentTime: string;
  blockedDates: string[];
  blockedCallTimes: BlockedCallTime[];
  leadDays: number;
};

export function RescheduleForm({
  token,
  name,
  currentDate,
  currentTime,
  blockedDates,
  blockedCallTimes,
  leadDays,
}: Props) {
  const initialDate = useMemo(() => {
    const [y, m, d] = currentDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [currentDate]);

  const [date, setDate] = useState<Date | null>(initialDate);
  const [time, setTime] = useState<string | null>(currentTime);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const earliest = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return new Date(today.getTime() + leadDays * 86_400_000);
  }, [leadDays]);

  const blockedTimesForDate = date
    ? new Set(
        blockedCallTimes
          .filter((entry) => entry.date === isoDay(date))
          .map((entry) => entry.time)
      )
    : new Set<string>();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    if (!date || !time) {
      setSubmitError('Please choose a date and a time.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/discovery-calls/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          callDate: isoDay(date),
          callTime: time,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? 'We could not save your new time.');
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? `${error.message} Please email ${SITE.email} or call ${SITE.phone}.`
          : 'Something went wrong.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`card ${styles.success}`} role="status">
        <h2 className={styles.successTitle}>Your call has been moved</h2>
        <p className={styles.successBody}>
          An updated confirmation with the video link is on its way to your
          email — if it doesn't show up in a few minutes, check your spam or
          promotions folder. Need to change it again? Just use this same
          link.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.layout} onSubmit={handleSubmit} noValidate>
      <div className={styles.step}>
        <div className={styles.stepHead}>
          <div className={styles.stepNumber}>01</div>
          <h2 className={styles.stepTitle}>Pick a new date</h2>
        </div>
        <p className={styles.stepNote}>
          Hi {name}, currently booked for {formatDay(initialDate)} at{' '}
          {currentTime}
        </p>
        <div className={styles.indent}>
          <Calendar
            label="Call date"
            earliest={earliest}
            blocked={blockedDates}
            selected={date}
            onSelect={(next) => {
              setDate(next);
              if (
                time &&
                blockedCallTimes.some(
                  (entry) => entry.date === isoDay(next) && entry.time === time
                )
              ) {
                setTime(null);
              }
            }}
            compact
            closedWeekdays={[0]}
          />
        </div>
        <p className={styles.calendarNote}>
          Available from {formatDay(earliest)} onward
        </p>
      </div>

      <div className={`${styles.step} ${styles.stepLast}`}>
        <div className={styles.stepHead}>
          <div className={styles.stepNumber}>02</div>
          <h2 className={styles.stepTitle}>What time?</h2>
        </div>
        <div className={`${styles.times} ${styles.indent}`}>
          {DISCOVERY_CALL_TIMES.map((slot) => {
            const isBlocked = blockedTimesForDate.has(slot);
            return (
              <button
                key={slot}
                type="button"
                disabled={isBlocked}
                className={`${styles.timeBtn} ${time === slot ? styles.timeBtnOn : ''} ${isBlocked ? styles.timeBtnOff : ''}`}
                aria-pressed={time === slot}
                aria-label={isBlocked ? `${slot} — unavailable` : slot}
                onClick={() => setTime(slot)}
              >
                {slot}
              </button>
            );
          })}
        </div>

        <button
          type="submit"
          className={`btn btn--dark btn--wide ${styles.submit}`}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Confirm new time'}
        </button>

        {submitError ? (
          <div className={styles.formError} role="alert">
            {submitError}
          </div>
        ) : null}
      </div>
    </form>
  );
}
