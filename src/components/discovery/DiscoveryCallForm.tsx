'use client';

import { useMemo, useState } from 'react';

import { Calendar, formatDay, isoDay } from '@/components/booking/Calendar';
import type { BlockedCallTime } from '@/lib/settings';
import { DISCOVERY_CALL_TIMES, SITE } from '@/lib/site';
import styles from './DiscoveryCallForm.module.css';

type Props = {
  blockedDates: string[];
  blockedCallTimes: BlockedCallTime[];
  leadDays: number;
};

export function DiscoveryCallForm({
  blockedDates,
  blockedCallTimes,
  leadDays,
}: Props) {
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});
  const [submitted, setSubmitted] = useState(false);

  const invalid = (field: string) => Boolean(fieldErrors[field]?.length);

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
    setFieldErrors({});

    if (!date || !time) {
      setSubmitError('Please choose a date and a time.');
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);

    try {
      const response = await fetch('/api/discovery-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          phone: form.get('phone'),
          company: form.get('company'),
          message: form.get('message'),
          callDate: isoDay(date),
          callTime: time,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
          issues?: Record<string, string[] | undefined>;
        } | null;
        setFieldErrors(body?.issues ?? {});
        const message = body?.error ?? 'We could not send your request.';
        // A validation error is self-explanatory once the field is
        // highlighted - only a real failure needs "contact us instead".
        setSubmitError(
          body?.issues
            ? message
            : `${message} Please email ${SITE.email} or call ${SITE.phone}.`
        );
        return;
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
        <h2 className={styles.successTitle}>Your call is booked</h2>
        <p className={styles.successBody}>
          A confirmation with the video link is on its way to your email —
          if it doesn't show up in a few minutes, check your spam or
          promotions folder. Need a different time? Use the reschedule
          link in that email.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.layout} onSubmit={handleSubmit} noValidate>
      {/* ---------- 01 Date ---------- */}
      <div className={styles.step}>
        <div className={styles.stepHead}>
          <div className={styles.stepNumber}>01</div>
          <h2 className={styles.stepTitle}>When works for you?</h2>
        </div>
        <p className={styles.stepNote}>A 15-20 minute call, over video</p>
        <div className={styles.indent}>
          <Calendar
            label="Call date"
            earliest={earliest}
            blocked={blockedDates}
            selected={date}
            onSelect={(next) => {
              setDate(next);
              // A time that was fine on the old date may be blocked on the new one.
              if (time && blockedCallTimes.some((entry) => entry.date === isoDay(next) && entry.time === time)) {
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

      {/* ---------- 02 Time ---------- */}
      <div className={styles.step}>
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
        <p className={styles.timesNote}>
          Prefer not to book a call? Email us at{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or WhatsApp{' '}
          {SITE.phone}.
        </p>
      </div>

      {/* ---------- 03 Details ---------- */}
      <div className={`${styles.step} ${styles.stepLast}`}>
        <div className={styles.stepHead}>
          <div className={styles.stepNumber}>03</div>
          <h2 className={styles.stepTitle}>Your details</h2>
        </div>
        <div className={`${styles.details} ${styles.indent}`}>
          <input
            className={`field ${invalid('name') ? 'field--invalid' : ''}`}
            type="text"
            name="name"
            required
            placeholder="Full name"
            aria-label="Full name"
            aria-invalid={invalid('name') || undefined}
            autoComplete="name"
          />
          <input
            className={`field ${invalid('email') ? 'field--invalid' : ''}`}
            type="email"
            name="email"
            required
            placeholder="Email"
            aria-label="Email"
            aria-invalid={invalid('email') || undefined}
            autoComplete="email"
          />
          <input
            className={`field ${invalid('phone') ? 'field--invalid' : ''}`}
            type="tel"
            name="phone"
            placeholder="Phone (optional)"
            aria-label="Phone (optional)"
            aria-invalid={invalid('phone') || undefined}
            autoComplete="tel"
          />
          <input
            className={`field ${invalid('company') ? 'field--invalid' : ''}`}
            type="text"
            name="company"
            placeholder="Company Name (optional)"
            aria-label="Company name (optional)"
            aria-invalid={invalid('company') || undefined}
            autoComplete="organization"
          />
          <textarea
            className={`field ${styles.detailsWide} ${styles.textarea} ${invalid('message') ? 'field--invalid' : ''}`}
            name="message"
            rows={3}
            placeholder="Anything you would like us to know (optional)"
            aria-label="Anything you would like us to know"
          />
        </div>

        <button
          type="submit"
          className={`btn btn--dark btn--wide ${styles.submit}`}
          disabled={submitting}
        >
          {submitting ? 'Sending…' : 'Book discovery call'}
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
