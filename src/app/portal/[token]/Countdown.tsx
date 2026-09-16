'use client';

import { useEffect, useState } from 'react';

import styles from './portal.module.css';

type Props = {
  startsAt: string;
  endsAt: string;
};

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
  };
}

/** Days, hours and minutes to the session, ticking once a minute. */
export function Countdown({ startsAt, endsAt }: Props) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();

  if (now === null) {
    return <div className={styles.countdown} aria-hidden="true" />;
  }
  if (now >= end) {
    return (
      <div className={styles.countdown}>
        <div className={styles.countdownLabel}>Your experience</div>
        <div className={styles.countdownWord}>We hope you left feeling renewed.</div>
      </div>
    );
  }
  if (now >= start) {
    return (
      <div className={styles.countdown}>
        <div className={styles.countdownLabel}>Right now</div>
        <div className={styles.countdownWord}>Your experience is underway.</div>
      </div>
    );
  }
  const { days, hours, minutes } = parts(start - now);
  return (
    <div className={styles.countdown} role="timer" aria-live="off">
      <div className={styles.countdownLabel}>Until your experience</div>
      <div className={styles.countdownRow}>
        <div className={styles.countdownCell}>
          <span className={styles.countdownNum}>{days}</span>
          <span className={styles.countdownUnit}>{days === 1 ? 'day' : 'days'}</span>
        </div>
        <div className={styles.countdownCell}>
          <span className={styles.countdownNum}>{hours}</span>
          <span className={styles.countdownUnit}>{hours === 1 ? 'hour' : 'hours'}</span>
        </div>
        <div className={styles.countdownCell}>
          <span className={styles.countdownNum}>{minutes}</span>
          <span className={styles.countdownUnit}>{minutes === 1 ? 'minute' : 'minutes'}</span>
        </div>
      </div>
    </div>
  );
}
