'use client';

import { useState } from 'react';

import type { BusinessSettings, Pricing, SiteSettings, Slots } from '@/lib/settings';
import type { Integrations } from '@/lib/pipeline';
import { DISCOVERY_CALL_TIMES, TIME_SLOTS, money } from '@/lib/site';
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
  const [callDay, setCallDay] = useState(todayIso);
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

        <div className={`card ${styles.settingsCard}`}>
          <h3 className={styles.settingsTitle}>Blocked dates</h3>
          <p className={styles.priceNote} style={{ marginBottom: 14 }}>
            Click a date to close it. Closed dates are struck through and unclickable on the booking page. Saved immediately.
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
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={off}
                    aria-label={`${day}${off ? ' — closed' : ''}`}
                    className={`${styles.blockDay} ${off ? styles.blockDayOff : ''}`}
                    onClick={() => void run({ action: 'toggleBlockedDate', day, blocked: !off })}
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
            Pick a date, then click a time to close just that slot for discovery calls. Saved immediately.
          </p>

          <label className={styles.priceField} style={{ marginBottom: 14 }}>
            <span className={styles.priceLabel}>Date</span>
            <input className="field" type="date" min={todayIso} value={callDay} onChange={(e) => setCallDay(e.target.value)} />
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
                  onClick={() => void run({ action: 'toggleBlockedCallTime', day: callDay, time: slot, blocked: !off })}
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
                      onClick={() => void run({ action: 'toggleBlockedCallTime', day: entry.date, time: entry.time, blocked: false })}
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
