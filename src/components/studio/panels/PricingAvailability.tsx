'use client';

import { useState } from 'react';

import type { Pricing, SiteSettings, Slots } from '@/lib/settings';
import { DISCOVERY_CALL_TIMES, TIME_SLOTS } from '@/lib/site';
import { useStudioAction } from '../useStudioAction';
import styles from '../studio.module.css';

const PRICE_FIELDS: Array<{
  key: keyof Pricing;
  label: string;
  note: string;
}> = [
  { key: 'privateSession', label: 'Private session', note: 'One-on-one, per session' },
  { key: 'privatePackage', label: 'Package of four', note: 'Private sessions, prepaid' },
  { key: 'teamAddon', label: 'Team-building add-on', note: 'Per corporate event' },
  { key: 'refreshments', label: 'Refreshments', note: 'Per participant, optional' },
  { key: 'deposit', label: 'Security deposit', note: 'Groups over 6, refundable' },
];

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function isoDay(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function PricingAvailability({ settings }: { settings: SiteSettings }) {
  const { run, pending, error } = useStudioAction();

  const [pricing, setPricing] = useState<Pricing>(settings.pricing);
  const [slots, setSlots] = useState<Slots>(settings.slots);
  const [leadTime, setLeadTime] = useState(settings.leadTimeDays);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const now = new Date();
  const [view, setView] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const blockedSet = new Set(settings.blockedDates);
  const first = new Date(view.year, view.month, 1);
  // Monday-first week: shift Sunday (0) to the end of the row.
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const todayIso = isoDay(now.getFullYear(), now.getMonth(), now.getDate());
  const [callDay, setCallDay] = useState(todayIso);
  const blockedCallTimeSet = new Set(
    settings.blockedCallTimes
      .filter((entry) => entry.date === callDay)
      .map((entry) => entry.time)
  );
  const sortedBlockedCallTimes = [...settings.blockedCallTimes].sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
  );

  const change = <K extends keyof Pricing>(key: K, value: number) => {
    setPricing((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setSaved(false);
  };

  const publish = async () => {
    const ok = await run({
      action: 'publishSettings',
      pricing,
      slots,
      leadTimeDays: leadTime,
    });
    if (ok) {
      setDirty(false);
      setSaved(true);
    }
  };

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      <div className={styles.settingsGrid}>
        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Pricing</h3>
          <div className={styles.priceFields}>
            {PRICE_FIELDS.map((field) => (
              <label key={field.key} className={styles.priceField}>
                <span className={styles.priceLabel}>{field.label}</span>
                <input
                  className={`field ${styles.priceInput}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={pricing[field.key]}
                  onChange={(e) => change(field.key, Number(e.target.value))}
                />
                <span className={styles.priceNote}>{field.note}</span>
              </label>
            ))}
            <div className={styles.priceField}>
              <span className={styles.priceLabel}>Group &amp; Corporate rate</span>
              <span className={styles.priceNote}>
                Fixed tiered rate, not editable here: $250 per participant up
                to 10, then $100 per participant for 11–24.
              </span>
            </div>
          </div>

          <div className={styles.publishRow}>
            <button
              type="button"
              className="btn btn--dark"
              disabled={pending}
              onClick={publish}
            >
              {pending ? 'Publishing…' : 'Publish to website'}
            </button>
            {dirty ? (
              <span className={styles.dirtyNote}>
                Unpublished changes — the website still shows the old figures.
              </span>
            ) : saved ? (
              <span className={styles.savedNote}>
                Published. The website is up to date.
              </span>
            ) : null}
          </div>
        </div>

        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Time slots</h3>
          {TIME_SLOTS.map((slot) => (
            <div key={slot.key} className={styles.switchRow}>
              <span>
                {slot.label}
                <span className={styles.codePercent}>{slot.note}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={slots[slot.key]}
                aria-label={`${slot.label} available`}
                className={`${styles.switch} ${slots[slot.key] ? styles.switchOn : ''}`}
                onClick={() => {
                  setSlots((current) => ({
                    ...current,
                    [slot.key]: !current[slot.key],
                  }));
                  setDirty(true);
                  setSaved(false);
                }}
              >
                <span className={styles.switchKnob} />
              </button>
            </div>
          ))}

          <h3 className={styles.settingsTitle} style={{ marginTop: 28 }}>
            Minimum lead time
          </h3>
          <label className={styles.priceField}>
            <span className={styles.priceLabel}>Calendar days ahead</span>
            <input
              className={`field ${styles.priceInput}`}
              type="number"
              min={0}
              max={365}
              inputMode="numeric"
              value={leadTime}
              onChange={(e) => {
                setLeadTime(Number(e.target.value));
                setDirty(true);
                setSaved(false);
              }}
            />
            <span className={styles.priceNote}>
              Dates before this are closed on the booking page.
            </span>
          </label>
        </div>

        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Blocked dates</h3>
          <p className={styles.priceNote} style={{ marginBottom: 14 }}>
            Click a date to close it. Closed dates are struck through and
            unclickable on the booking page. Saved immediately.
          </p>

          <div className={styles.blockCalendar}>
            <div className={styles.blockHead}>
              <button
                type="button"
                className={styles.blockNav}
                aria-label="Previous month"
                onClick={() =>
                  setView((v) => {
                    const d = new Date(v.year, v.month - 1, 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })
                }
              >
                ‹
              </button>
              <span className={styles.blockMonth}>
                {first.toLocaleDateString('en-CA', {
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              <button
                type="button"
                className={styles.blockNav}
                aria-label="Next month"
                onClick={() =>
                  setView((v) => {
                    const d = new Date(v.year, v.month + 1, 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })
                }
              >
                ›
              </button>
            </div>

            <div className={styles.blockGrid}>
              {WEEKDAYS.map((d, i) => (
                <div
                  key={`${d}-${i}`}
                  className={styles.priceNote}
                  style={{ textAlign: 'center' }}
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: lead }, (_, i) => (
                <div key={`pad-${i}`} className={styles.blockPad} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = isoDay(view.year, view.month, i + 1);
                const off = blockedSet.has(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={off}
                    aria-label={`${day}${off ? ' — closed' : ''}`}
                    className={`${styles.blockDay} ${off ? styles.blockDayOff : ''}`}
                    onClick={() =>
                      void run({
                        action: 'toggleBlockedDate',
                        day,
                        blocked: !off,
                      })
                    }
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              className={`btn btn--outline ${styles.smallBtn}`}
              disabled={settings.blockedDates.length === 0}
              onClick={() => void run({ action: 'clearBlockedDates' })}
            >
              Clear all
            </button>
          </div>
        </div>

        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Discovery call times</h3>
          <p className={styles.priceNote} style={{ marginBottom: 14 }}>
            Pick a date, then click a time to close just that slot for
            discovery calls. Saved immediately.
          </p>

          <label className={styles.priceField} style={{ marginBottom: 14 }}>
            <span className={styles.priceLabel}>Date</span>
            <input
              className="field"
              type="date"
              min={todayIso}
              value={callDay}
              onChange={(e) => setCallDay(e.target.value)}
            />
          </label>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DISCOVERY_CALL_TIMES.map((slot) => {
              const off = blockedCallTimeSet.has(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={off}
                  aria-label={`${slot}${off ? ' — closed' : ''}`}
                  className={`${styles.blockDay} ${off ? styles.blockDayOff : ''}`}
                  style={{ width: 'auto', padding: '0 14px' }}
                  onClick={() =>
                    void run({
                      action: 'toggleBlockedCallTime',
                      day: callDay,
                      time: slot,
                      blocked: !off,
                    })
                  }
                >
                  {slot}
                </button>
              );
            })}
          </div>

          {sortedBlockedCallTimes.length > 0 ? (
            <div style={{ marginTop: 20 }}>
              <span className={styles.priceLabel}>Currently closed</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {sortedBlockedCallTimes.map((entry) => (
                  <div key={`${entry.date}-${entry.time}`} className={styles.codeRow}>
                    <span className={styles.priceNote}>
                      {entry.date} &middot; {entry.time}
                    </span>
                    <button
                      type="button"
                      className={`btn btn--outline ${styles.smallBtn}`}
                      onClick={() =>
                        void run({
                          action: 'toggleBlockedCallTime',
                          day: entry.date,
                          time: entry.time,
                          blocked: false,
                        })
                      }
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Discount codes</h3>
          <p className={styles.priceNote} style={{ marginBottom: 8 }}>
            Group bookings of two or more only. Saved immediately.
          </p>
          {settings.codes.map((code) => (
            <div key={code.code} className={styles.codeRow}>
              <span>
                <span className={styles.codeName}>{code.code}</span>
                <span className={styles.codePercent}>{code.percentOff}% off</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={code.isActive}
                aria-label={`${code.code} active`}
                className={`${styles.switch} ${code.isActive ? styles.switchOn : ''}`}
                onClick={() =>
                  void run({
                    action: 'toggleCode',
                    code: code.code,
                    isActive: !code.isActive,
                  })
                }
              >
                <span className={styles.switchKnob} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
