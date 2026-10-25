'use client';

import { useState } from 'react';

import type { BusinessSettings, Pricing, SiteSettings, Slots } from '@/lib/settings';
import type { Integrations } from '@/lib/pipeline';
import {
  DISCOVERY_CALL_EXTRA_OPEN_DATES,
  DISCOVERY_CALL_LEAD_DAYS,
  discoveryCallTimesFor,
  sessionSlotsFor,
  TIME_SLOTS,
  money,
} from '@/lib/site';
import { useStudioAction } from '../useStudioAction';
import styles from '../studio.module.css';

const PRICE_FIELDS: Array<{ key: keyof Pricing; label: string; note: string }> = [
  { key: 'privateSession', label: 'Private session', note: 'One-on-one, per session' },
  { key: 'privatePackage', label: 'Package of four', note: 'Private sessions, prepaid' },
  { key: 'teamAddon', label: 'Team-building add-on', note: 'Per corporate event' },
  { key: 'deposit', label: 'Security deposit', note: 'Groups over 6, refundable' },
];

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function isoDay(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Why a date is not open for discovery calls on the website, or null when
 *  it is open. Mirrors the website: weekends closed (Sundays always, Saturdays
 *  unless opened as a one-off), blocked days, session days and the lead time. */
function discoveryDayClosedReason(
  iso: string,
  blockedDates: readonly string[],
  bookedEventDates: readonly string[],
  callOpenTimes: readonly { date: string; time: string }[] = []
): string | null {
  const [y, m, d] = iso.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  const weekday = day.getDay();
  if (weekday === 0) return 'Closed: Sundays are not open for discovery calls.';
  if (weekday === 6 && !DISCOVERY_CALL_EXTRA_OPEN_DATES.includes(iso)) {
    return 'Closed: Saturdays are not open for discovery calls.';
  }
  if (blockedDates.includes(iso) && !callOpenTimes.some((o) => o.date === iso)) {
    return 'Blocked for events. No discovery calls unless you open times.';
  }
  if (bookedEventDates.includes(iso)) return 'Closed: a session is booked on this day.';
  const now = new Date();
  const earliest = new Date(now.getFullYear(), now.getMonth(), now.getDate() + DISCOVERY_CALL_LEAD_DAYS);
  if (day < earliest) return 'Closed: too soon. Calls open from ' + DISCOVERY_CALL_LEAD_DAYS + ' days ahead.';
  return null;
}

type TextKey = {
  [K in keyof BusinessSettings]: BusinessSettings[K] extends string ? K : never;
}[keyof BusinessSettings];
type NumKey = {
  [K in keyof BusinessSettings]: BusinessSettings[K] extends number ? K : never;
}[keyof BusinessSettings];

export function Settings({ settings, integrations }: { settings: SiteSettings; integrations: Integrations }) {
  const { run, pending, error } = useStudioAction();

  const [pricing, setPricing] = useState<Pricing>(settings.pricing);
  const [slots, setSlots] = useState<Slots>(settings.slots);
  const [leadTime, setLeadTime] = useState(settings.leadTimeDays);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  const [biz, setBiz] = useState<BusinessSettings>(settings.business);
  const [bizDirty, setBizDirty] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);

  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const blockedSet = new Set(settings.blockedDates);
  const first = new Date(view.year, view.month, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const todayIso = isoDay(now.getFullYear(), now.getMonth(), now.getDate());
  // Start on the first date the website actually offers for discovery calls.
  const [callDay, setCallDay] = useState(() => {
    for (let i = 0; i < 60; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const iso = isoDay(d.getFullYear(), d.getMonth(), d.getDate());
      if (!discoveryDayClosedReason(iso, settings.blockedDates, settings.bookedEventDates, settings.callOpenTimes)) return iso;
    }
    return todayIso;
  });
  const [closedFilter, setClosedFilter] = useState('');
  const [eventDay, setEventDay] = useState<string | null>(null);
  const callDayClosedReason = discoveryDayClosedReason(callDay, settings.blockedDates, settings.bookedEventDates, settings.callOpenTimes);
  const blockedCallTimeSet = new Set(
    settings.blockedCallTimes.filter((entry) => entry.date === callDay).map((entry) => entry.time)
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
    const ok = await run({ action: 'publishSettings', pricing, slots, leadTimeDays: leadTime });
    if (ok) {
      setDirty(false);
      setSaved(true);
    }
  };

  const setText = (key: TextKey, value: string) => {
    setBiz((b) => ({ ...b, [key]: value }));
    setBizDirty(true);
    setBizSaved(false);
  };
  const setNum = (key: NumKey, value: number) => {
    setBiz((b) => ({ ...b, [key]: value }));
    setBizDirty(true);
    setBizSaved(false);
  };
  const toggle = (key: 'autoSendProposals' | 'autoSendInvoices') => {
    setBiz((b) => ({ ...b, [key]: !b[key] }));
    setBizDirty(true);
    setBizSaved(false);
  };

  const saveBusiness = async () => {
    const ok = await run({ action: 'updateBusiness', ...biz });
    if (ok) {
      setBizDirty(false);
      setBizSaved(true);
    }
  };

  const text = (key: TextKey, label: string, note?: string, multiline?: boolean) => (
    <label className={styles.priceField}>
      <span className={styles.priceLabel}>{label}</span>
      {multiline ? (
        <textarea
          className={styles.textarea}
          value={biz[key]}
          onChange={(e) => setText(key, e.target.value)}
        />
      ) : (
        <input
          className={`field ${styles.priceInput}`}
          type="text"
          value={biz[key]}
          onChange={(e) => setText(key, e.target.value)}
        />
      )}
      {note ? <span className={styles.priceNote}>{note}</span> : null}
    </label>
  );

  const num = (key: NumKey, label: string, note?: string, step = 1) => (
    <label className={styles.priceField}>
      <span className={styles.priceLabel}>{label}</span>
      <input
        className={`field ${styles.priceInput}`}
        type="number"
        min={0}
        step={step}
        inputMode="decimal"
        value={biz[key]}
        onChange={(e) => setNum(key, Number(e.target.value))}
      />
      {note ? <span className={styles.priceNote}>{note}</span> : null}
    </label>
  );

  const saveRow = (
    <div className={styles.publishRow}>
      <button type="button" className="btn btn--dark" disabled={pending || !bizDirty} onClick={() => void saveBusiness()}>
        {pending ? 'Saving…' : 'Save'}
      </button>
      {bizDirty ? (
        <span className={styles.dirtyNote}>Unsaved changes.</span>
      ) : bizSaved ? (
        <span className={styles.savedNote}>Saved. New documents use these details.</span>
      ) : null}
    </div>
  );

  const connections: Array<{ label: string; on: boolean; how: string }> = [
    { label: 'Email (Resend)', on: integrations.email, how: 'RESEND_API_KEY - and verify lotusattune.com as a sending domain in Resend.' },
    { label: 'PDFs (PDFShift)', on: integrations.pdf, how: 'PDFSHIFT_API_KEY. Optional PDFSHIFT_SANDBOX=1 for watermarked test PDFs.' },
    { label: 'Card payments (Stripe)', on: integrations.stripe, how: 'STRIPE_SECRET_KEY, plus STRIPE_WEBHOOK_SECRET from a webhook on /api/stripe/webhook (event checkout.session.completed).' },
    { label: 'Google Calendar', on: integrations.calendar, how: 'GOOGLE_CALENDAR_CLIENT_ID / _SECRET / _REFRESH_TOKEN.' },
  ];

  return (
    <>
      {error ? <div className={styles.notice}>{error}</div> : null}

      <div className={styles.settingsGrid}>
        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Connections</h3>
          <p className={styles.priceNote} style={{ marginBottom: 12 }}>
            Keys live in Vercel &rarr; Project &rarr; Settings &rarr; Environment Variables. Redeploy after adding one.
          </p>
          {connections.map((c) => (
            <div key={c.label} className={styles.switchRow}>
              <span>
                <span className={`${styles.integration} ${c.on ? '' : styles.integrationOff}`} style={{ marginBottom: 6 }}>
                  <span className={styles.integrationDot} />
                  {c.label} · {c.on ? 'connected' : 'not connected'}
                </span>
                <span className={styles.priceNote} style={{ display: 'block' }}>{c.how}</span>
              </span>
            </div>
          ))}
          <p className={styles.priceNote} style={{ marginTop: 12 }}>
            Daily reminders and balance charges run from a Vercel Cron (9 am Toronto) that needs CRON_SECRET set.
          </p>
        </div>

        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Automation</h3>
          <div className={styles.switchRow}>
            <span>
              Send invoices automatically
              <span className={styles.priceNote} style={{ display: 'block' }}>
                The moment a booking request lands, the confirmation email goes out with the invoice attached
                ({biz.depositPercent}% deposit to confirm the date). Off = the invoice waits as a draft and the
                confirmation says it will follow. Also sends the invoice when a proposal is accepted online.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={biz.autoSendInvoices}
              aria-label="Send invoices automatically"
              className={`${styles.switch} ${biz.autoSendInvoices ? styles.switchOn : ''}`}
              onClick={() => toggle('autoSendInvoices')}
            >
              <span className={styles.switchKnob} />
            </button>
          </div>
          <p className={styles.priceNote} style={{ marginTop: 10 }}>
            Always automatic: the confirmation email after a request, the receipt and booking confirmation after a
            payment, the reminder {biz.reminderDaysBefore} days before, and {biz.balanceDaysBefore} days before the
            session either the balance charge (card on file) or a balance-due email with payment links.
          </p>
          {saveRow}
        </div>

        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Invoices &amp; proposals</h3>
          <div className={styles.priceFields}>
            {text('businessName', 'Business name')}
            {text('businessEmail', 'Email on documents')}
            {text('businessPhone', 'Phone on documents')}
            {text('invoicePrefix', 'Number prefix', `Invoices read ${biz.invoicePrefix || 'LA'}-${now.getFullYear()}-0001, proposals ${biz.invoicePrefix || 'LA'}-P-…`)}
            {num('invoiceDueDays', 'Invoice due (days)', 'From the issue date')}
            {num('proposalValidDays', 'Proposal valid (days)')}
            {text('taxLabel', 'Tax label', 'HST in Ontario')}
            {text('taxNumber', 'Tax number', 'Leave blank until registered')}
            {num('taxRatePercent', 'Tax rate %', '0 = no tax line. Ontario HST is 13.', 0.5)}
          </div>
          <div style={{ marginTop: 14 }}>
            {text('businessAddress', 'Business address', 'Printed under your name on invoices', true)}
          </div>
          <div style={{ marginTop: 14 }}>
            {text('paymentInstructions', 'E-transfer instructions', 'E.g. "Send an Interac e-transfer to info@lotusattune.com - auto-deposit is on." Shown on every invoice.', true)}
          </div>
          <div style={{ marginTop: 14 }}>
            {text('proposalIntro', 'Proposal opening paragraph', 'Leave blank for the standard wording.', true)}
          </div>
          <div style={{ marginTop: 14 }}>
            {text('invoiceFooter', 'Invoice footer', 'Terms, thank-you, anything you want on every invoice.', true)}
          </div>
          {saveRow}
        </div>

        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Payments &amp; cancellations</h3>
          <p className={styles.priceNote} style={{ marginBottom: 14 }}>
            E-transfer is always offered first, with no fee. Card options appear once Stripe is connected.
          </p>
          <div className={styles.priceFields}>
            {num('cardFeePercent', 'Card processing fee %', 'Added on top of card payments', 0.1)}
            {num('depositPercent', 'Card deposit %', '0 or 100 disables the deposit option')}
            {num('balanceDaysBefore', 'Charge balance (days before)', 'Deposit plan only, to the card on file')}
            {num('cancellationFee', `Cancellation fee (${money(biz.cancellationFee || 0)})`, 'Charged to the card on file')}
            {num('cancellationHours', 'Late-cancel window (hours)', 'Inside this window the fee applies')}
            {num('reminderDaysBefore', 'Reminder (days before)')}
          </div>
          <div style={{ marginTop: 14 }}>
            {text('cancellationPolicy', 'Cancellation policy text', 'Printed in confirmation and reminder emails. Blank = the wording from the website FAQ.', true)}
          </div>
          <div style={{ marginTop: 14 }}>
            {text('venueDetails', 'Venue address & building access', 'Street address and buzzer - shared by both venues. Printed in confirmations and used as the calendar location.', true)}
          </div>
          <div style={{ marginTop: 14 }}>
            {text('venueDirectionsLounge', 'Once inside: Private Wellness Lounge', 'How to find this specific venue once through the door - only shown to clients booked here.', true)}
          </div>
          <div style={{ marginTop: 14 }}>
            {text('venueDirectionsSignature', 'Once inside: Premium Signature Venue', 'How to find this specific venue once through the door - only shown to clients booked here.', true)}
          </div>
          <div style={{ marginTop: 14 }}>
            {text('parking', 'Parking', 'Shared by both venues. Printed after the lobby directions in confirmations and the booking page.', true)}
          </div>
          {saveRow}
        </div>

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
                Fixed tiered rate, not editable here: $250 per participant up to 10, then $100 per participant for 11–24.
              </span>
            </div>
          </div>

          <div className={styles.publishRow}>
            <button type="button" className="btn btn--dark" disabled={pending} onClick={publish}>
              {pending ? 'Publishing…' : 'Publish to website'}
            </button>
            {dirty ? (
              <span className={styles.dirtyNote}>Unpublished changes — the website still shows the old figures.</span>
            ) : saved ? (
              <span className={styles.savedNote}>Published. The website is up to date.</span>
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
                  setSlots((current) => ({ ...current, [slot.key]: !current[slot.key] }));
                  setDirty(true);
                  setSaved(false);
                }}
              >
                <span className={styles.switchKnob} />
              </button>
            </div>
          ))}

          <h3 className={styles.settingsTitle} style={{ marginTop: 28 }}>Minimum lead time</h3>
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
            <span className={styles.priceNote}>Dates before this are closed on the booking page. Publish above to apply.</span>
          </label>
        </div>

        <div className={styles.calendarPair}>
        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Blocked dates</h3>
          <p className={styles.priceNote} style={{ marginBottom: 14 }}>
            Click a date, then close the whole day or just one time window. Red days are closed all day, tinted days
            have one window closed. Saved immediately.
          </p>

          <div>
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
                {first.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
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
                <div key={`${d}-${i}`} className={styles.priceNote} style={{ textAlign: 'center' }}>
                  {d}
                </div>
              ))}
              {Array.from({ length: lead }, (_, i) => (
                <div key={`pad-${i}`} className={styles.blockPad} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = isoDay(view.year, view.month, i + 1);
                const off = blockedSet.has(day);
                const partial = !off && settings.blockedSessionSlots.some((w) => w.date === day);
                const selected = day === eventDay;
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${day}${off ? ' — closed all day' : partial ? ' — one window closed' : ''}`}
                    className={`${styles.blockDay} ${off ? styles.blockDayOff : ''} ${partial ? styles.blockDayPartial : ''} ${selected ? styles.blockDaySel : ''}`}
                    onClick={() => setEventDay(day)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {eventDay ? (
            <div style={{ marginTop: 16 }}>
              <span className={styles.priceLabel}>
                {new Date(
                  Number(eventDay.slice(0, 4)),
                  Number(eventDay.slice(5, 7)) - 1,
                  Number(eventDay.slice(8, 10))
                ).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  aria-pressed={blockedSet.has(eventDay)}
                  className={`${styles.blockDay} ${blockedSet.has(eventDay) ? styles.blockDayOff : ''}`}
                  style={{ width: 'auto', padding: '0 14px' }}
                  onClick={() => void run({ action: 'toggleBlockedDate', day: eventDay, blocked: !blockedSet.has(eventDay) })}
                >
                  {blockedSet.has(eventDay) ? 'Whole day closed' : 'Close whole day'}
                </button>
                {blockedSet.has(eventDay)
                  ? null
                  : sessionSlotsFor(eventDay).map((slot) => {
                      const windowOff = settings.blockedSessionSlots.some(
                        (w) => w.date === eventDay && w.time === slot.label
                      );
                      return (
                        <button
                          key={slot.label}
                          type="button"
                          aria-pressed={windowOff}
                          aria-label={`${slot.label}${windowOff ? ' — closed' : ''}`}
                          className={`${styles.blockDay} ${windowOff ? styles.blockDayOff : ''}`}
                          style={{ width: 'auto', padding: '0 14px' }}
                          onClick={() =>
                            void run({
                              action: 'toggleBlockedSessionSlot',
                              day: eventDay,
                              time: slot.label,
                              blocked: !windowOff,
                            })
                          }
                        >
                          {slot.label}
                        </button>
                      );
                    })}
              </div>
              {blockedSet.has(eventDay) ? (
                <p className={styles.priceNote} style={{ marginTop: 6 }}>
                  Open the whole day to close a single window instead.
                </p>
              ) : null}
            </div>
          ) : null}

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
        </div>

        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Discovery call times</h3>
          <p className={styles.priceNote} style={{ marginBottom: 14 }}>
            Click a day, then click a time to close just that slot. Greyed days are not offered on the website. Red days
            are blocked in Blocked dates above. Saved immediately.
          </p>

          <div>
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
                {new Date(view.year, view.month, 1).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })}
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
                <div key={`c-${d}-${i}`} className={styles.priceNote} style={{ textAlign: 'center' }}>
                  {d}
                </div>
              ))}
              {Array.from({ length: (new Date(view.year, view.month, 1).getDay() + 6) % 7 }, (_, i) => (
                <div key={`cpad-${i}`} className={styles.blockPad} />
              ))}
              {Array.from({ length: new Date(view.year, view.month + 1, 0).getDate() }, (_, i) => {
                const day = isoDay(view.year, view.month, i + 1);
                const reason = discoveryDayClosedReason(day, settings.blockedDates, settings.bookedEventDates, settings.callOpenTimes);
                const blockedWholeDay = settings.blockedDates.includes(day);
                const callsOpened = blockedWholeDay && settings.callOpenTimes.some((o) => o.date === day);
                const someClosed = settings.blockedCallTimes.some((e) => e.date === day);
                const selected = day === callDay;
                const cls = [
                  styles.blockDay,
                  blockedWholeDay && !callsOpened ? styles.blockDayOff : '',
                  reason && !blockedWholeDay ? styles.blockDayDisabled : '',
                  (!reason && someClosed) || callsOpened ? styles.blockDayPartial : '',
                  selected ? styles.blockDaySel : '',
                ].join(' ');
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${day}${reason ? ' — ' + reason : someClosed ? ' — some times closed' : ''}`}
                    title={callsOpened ? 'Blocked for events, discovery calls open at some times' : reason ?? (someClosed ? 'Some times closed' : 'Open')}
                    className={cls}
                    onClick={() => setCallDay(day)}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <span className={styles.priceLabel}>
              {new Date(Number(callDay.slice(0, 4)), Number(callDay.slice(5, 7)) - 1, Number(callDay.slice(8, 10))).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>

            {(() => {
              const baseReason = discoveryDayClosedReason(callDay, [], settings.bookedEventDates, []);
              if (baseReason) {
                return (
                  <div style={{ marginTop: 8 }}>
                    <p className={styles.priceNote}>{baseReason}</p>
                  </div>
                );
              }
              if (!settings.blockedDates.includes(callDay)) return null;
              return (
                <div style={{ marginTop: 8 }}>
                  <p className={styles.priceNote}>
                    Blocked for events. Click the times you are available for discovery calls (outlined = open).
                    Sessions stay blocked.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {discoveryCallTimesFor(callDay).map((slot) => {
                      const open = settings.callOpenTimes.some((o) => o.date === callDay && o.time === slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          aria-pressed={open}
                          aria-label={`${slot}${open ? ' — open for calls' : ' — closed'}`}
                          className={`${styles.blockDay} ${open ? styles.blockDaySel : ''}`}
                          style={{ width: 'auto', padding: '0 14px' }}
                          onClick={() => void run({ action: 'toggleOpenCallTime', day: callDay, time: slot, open: !open })}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {!discoveryDayClosedReason(callDay, [], settings.bookedEventDates, []) && !settings.blockedDates.includes(callDay) ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {discoveryCallTimesFor(callDay).map((slot) => {
                  const off = blockedCallTimeSet.has(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={off}
                      aria-label={`${slot}${off ? ' — closed' : ''}`}
                      className={`${styles.blockDay} ${off ? styles.blockDayOff : ''}`}
                      style={{ width: 'auto', padding: '0 14px' }}
                      onClick={() => void run({ action: 'toggleBlockedCallTime', day: callDay, time: slot, blocked: !off })}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {(() => {
            const fmt = (iso: string) =>
              new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))).toLocaleDateString('en-CA', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
            const byDate = new Map<string, string[]>();
            const stale: Array<{ date: string; time: string }> = [];
            for (const entry of sortedBlockedCallTimes) {
              if (entry.date < todayIso) continue;
              if (discoveryDayClosedReason(entry.date, settings.blockedDates, settings.bookedEventDates, settings.callOpenTimes)) {
                stale.push(entry);
                continue;
              }
              byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry.time]);
            }
            const needle = closedFilter.trim().toLowerCase();
            const groups = [...byDate.entries()].filter(
              ([date, times]) => !needle || `${fmt(date)} ${times.join(' ')}`.toLowerCase().includes(needle)
            );
            if (byDate.size === 0 && stale.length === 0) return null;
            return (
              <div style={{ marginTop: 20 }}>
                <span className={styles.priceLabel}>Days with closed times</span>
                {byDate.size > 3 ? (
                  <input
                    className="field"
                    style={{ marginTop: 8 }}
                    placeholder="Search, for example Nov or 4:00 pm"
                    value={closedFilter}
                    onChange={(e) => setClosedFilter(e.target.value)}
                  />
                ) : null}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {groups.map(([date, times]) => (
                    <div key={date} className={styles.codeRow}>
                      <button
                        type="button"
                        className={styles.priceNote}
                        style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer' }}
                        onClick={() => {
                          setCallDay(date);
                          setView({ year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) - 1 });
                        }}
                      >
                        {fmt(date)} &middot; {times.join(', ')}
                      </button>
                      <button
                        type="button"
                        className={`btn btn--outline ${styles.smallBtn}`}
                        onClick={async () => {
                          for (const time of times) {
                            await run({ action: 'toggleBlockedCallTime', day: date, time, blocked: false });
                          }
                        }}
                      >
                        Reopen day
                      </button>
                    </div>
                  ))}
                  {groups.length === 0 && byDate.size > 0 ? <span className={styles.priceNote}>No match.</span> : null}
                </div>
                {stale.length > 0 ? (
                  <div style={{ marginTop: 14 }}>
                    <p className={styles.priceNote}>
                      {stale.length} closed times are on days that are already closed (weekends, blocked days or session days), so they do nothing.
                    </p>
                    <button
                      type="button"
                      className={`btn btn--outline ${styles.smallBtn}`}
                      style={{ marginTop: 6 }}
                      onClick={async () => {
                        for (const entry of stale) {
                          await run({ action: 'toggleBlockedCallTime', day: entry.date, time: entry.time, blocked: false });
                        }
                      }}
                    >
                      Remove them
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })()}
          </div>
        </div>
        </div>

        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Discount codes</h3>
          <p className={styles.priceNote} style={{ marginBottom: 8 }}>Saved immediately.</p>
          {settings.codes.map((code) => (
            <div key={code.code} className={styles.codeRow}>
              <span>
                <span className={styles.codeName}>{code.code}</span>
                <span className={styles.codePercent}>
                  {code.amountOff ? `${money(code.amountOff)} off` : `${code.percentOff}% off`}
                  {code.minParticipants !== 2 ? ` · ${code.minParticipants}+ participants` : ''}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={code.isActive}
                aria-label={`${code.code} active`}
                className={`${styles.switch} ${code.isActive ? styles.switchOn : ''}`}
                onClick={() => void run({ action: 'toggleCode', code: code.code, isActive: !code.isActive })}
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
