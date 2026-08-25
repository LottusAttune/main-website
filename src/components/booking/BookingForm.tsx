'use client';

import { useMemo, useState } from 'react';

import { quoteFor } from '@/lib/quote';
import type { DiscountCode, Pricing, Slots } from '@/lib/settings';
import {
  MAX_PARTICIPANTS,
  SITE,
  TIME_SLOTS,
  TWO_SESSION_THRESHOLD,
  groupPriceFor,
  money,
} from '@/lib/site';
import { Calendar, formatDay, isoDay } from './Calendar';
import styles from './BookingForm.module.css';

type Props = {
  pricing: Pricing;
  slots: Slots;
  blockedDates: string[];
  codes: DiscountCode[];
  leadTimeDays: number;
};

type CodeState = {
  applied: DiscountCode | null;
  message: string;
  ok: boolean;
};

const QUICK_PARTY = [1, 2, 3, 4, 5, 6];

export function BookingForm({
  pricing,
  slots,
  blockedDates,
  codes,
  leadTimeDays,
}: Props) {
  const [party, setParty] = useState<number | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [date2, setDate2] = useState<Date | null>(null);
  const [time2, setTime2] = useState<string | null>(null);
  const [teamAddon, setTeamAddon] = useState(false);
  const [refreshments, setRefreshments] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [code, setCode] = useState<CodeState>({
    applied: null,
    message: '',
    ok: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const earliest = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return new Date(today.getTime() + leadTimeDays * 86_400_000);
  }, [leadTimeDays]);

  const people = party ?? 0;
  const needsSecond = people > TWO_SESSION_THRESHOLD;
  const openSlots = TIME_SLOTS.filter((slot) => slots[slot.key] !== false);

  const quote = quoteFor(
    {
      participants: people,
      teamAddon,
      refreshments,
      percentOff: code.applied?.percentOff,
      discountLabel: code.applied?.code,
    },
    pricing
  );

  const applyCode = () => {
    const entered = codeInput.trim().toUpperCase();
    if (!entered) {
      setCode({ applied: null, message: '', ok: false });
      return;
    }
    const match = codes.find((c) => c.code === entered && c.isActive);
    if (!match) {
      setCode({
        applied: null,
        message: 'That code is not recognised.',
        ok: false,
      });
      return;
    }
    if (people < 2) {
      setCode({
        applied: null,
        message: 'Codes apply to group bookings of two or more.',
        ok: false,
      });
      return;
    }
    setCode({
      applied: match,
      message: `${match.code} applied — ${match.percentOff}% off.`,
      ok: true,
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');

    if (!party) {
      setSubmitError('Please choose how many people will join.');
      return;
    }
    if (!date || !time) {
      setSubmitError('Please choose a date and a time.');
      return;
    }
    if (needsSecond && (!date2 || !time2)) {
      setSubmitError(
        'Groups larger than 12 run across two sessions — please choose the second date and time.'
      );
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          phone: form.get('phone'),
          message: form.get('message'),
          participants: party,
          sessionDate: isoDay(date),
          sessionTime: time,
          sessionDate2: date2 ? isoDay(date2) : null,
          sessionTime2: time2,
          teamAddon,
          refreshments,
          discountCode: code.applied?.code ?? null,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? 'We could not send your request.');
      }

      setSubmitted(true);
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
        <h2 className={styles.successTitle}>Your request is with Silvana</h2>
        <p className={styles.successBody}>
          She confirms every booking personally and will be in touch shortly. If
          you need to reach her sooner, write to{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call {SITE.phone}.
        </p>
      </div>
    );
  }

  // Step numbers shift when the second-session step appears.
  const addonStep = needsSecond ? '05' : '04';
  const detailsStep = needsSecond ? '06' : '05';

  return (
    <form className={styles.layout} onSubmit={handleSubmit} noValidate>
      <div>
        {/* ---------- 01 Participants ---------- */}
        <div className={styles.step}>
          <div className={styles.stepHead}>
            <div className={styles.stepNumber}>01</div>
            <h2 className={styles.stepTitle}>
              How many people will join the Lotus Attune experience?
            </h2>
          </div>
          <p className={styles.stepNote}>
            Sessions are offered for 1 to 24 participants
          </p>
          <div className={`${styles.partyRow} ${styles.indent}`}>
            {QUICK_PARTY.map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.partyBtn} ${party === n ? styles.partyBtnOn : ''}`}
                aria-pressed={party === n}
                onClick={() => {
                  setParty(n);
                  setDate2(null);
                  setTime2(null);
                }}
              >
                {n}
              </button>
            ))}
            <select
              className={`select ${styles.partySelect}`}
              aria-label="7 to 24 participants"
              value={party && party >= 7 ? String(party) : ''}
              onChange={(e) => {
                setParty(e.target.value ? Number(e.target.value) : null);
                setDate2(null);
                setTime2(null);
              }}
            >
              <option value="">7 to 24 participants…</option>
              {Array.from({ length: MAX_PARTICIPANTS - 6 }, (_, i) => {
                const n = i + 7;
                return (
                  <option key={n} value={n}>
                    {n} participants — {money(groupPriceFor(n))}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* ---------- 02 Date ---------- */}
        <div className={styles.step}>
          <div className={styles.stepHead}>
            <div className={styles.stepNumber}>02</div>
            <h2 className={styles.stepTitle}>When would you like to visit us?</h2>
          </div>
          <p className={styles.stepNote}>
            Select your preferred date to relax and reset
          </p>
          <div className={styles.indent}>
            <Calendar
              label="Session date"
              earliest={earliest}
              blocked={blockedDates}
              selected={date}
              onSelect={setDate}
            />
          </div>
          <p className={styles.calendarNote}>
            Available from {formatDay(earliest)} onward
          </p>
        </div>

        {/* ---------- 03 Time ---------- */}
        <div className={styles.step}>
          <div className={styles.stepHead}>
            <div className={styles.stepNumber}>03</div>
            <h2 className={styles.stepTitle}>What time of day?</h2>
          </div>
          <p className={styles.stepNote}>Each session runs two hours</p>
          <div className={`${styles.times} ${styles.indent}`}>
            {openSlots.map((slot) => (
              <button
                key={slot.key}
                type="button"
                className={`${styles.timeBtn} ${time === slot.label ? styles.timeBtnOn : ''}`}
                aria-pressed={time === slot.label}
                onClick={() => setTime(slot.label)}
              >
                <span className={styles.timeLabel}>{slot.label}</span>
                <span className={styles.timeNote}>{slot.note}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ---------- 04 Second session (groups over 12) ---------- */}
        {needsSecond ? (
          <div className={styles.step}>
            <div className={styles.stepHead}>
              <div className={styles.stepNumber}>04</div>
              <h2 className={styles.stepTitle}>Your second session</h2>
            </div>
            <p className={`${styles.stepNote} ${styles.stepNoteWide}`}>
              For groups larger than 12 participants, the experience is offered
              across two sessions. Please select your preferred date and time for
              the second session.
            </p>
            <div className={styles.indent}>
              <Calendar
                label="Second session date"
                earliest={earliest}
                blocked={blockedDates}
                selected={date2}
                onSelect={setDate2}
              />
              <div className={`${styles.times} ${styles.timesTight}`}>
                {openSlots.map((slot) => (
                  <button
                    key={slot.key}
                    type="button"
                    className={`${styles.timeBtn} ${styles.timeBtnCompact} ${
                      time2 === slot.label ? styles.timeBtnOn : ''
                    }`}
                    aria-pressed={time2 === slot.label}
                    onClick={() => setTime2(slot.label)}
                  >
                    <span
                      className={`${styles.timeLabel} ${styles.timeLabelOnly}`}
                    >
                      {slot.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* ---------- Add-ons ---------- */}
        <div className={styles.step}>
          <div className={styles.stepHead}>
            <div className={styles.stepNumber}>{addonStep}</div>
            <h2 className={styles.stepTitle}>Optional add-ons</h2>
          </div>
          <p className={styles.stepNote}>
            Available for group and corporate bookings
          </p>
          <div className={`${styles.addons} ${styles.indent}`}>
            <button
              type="button"
              className="toggle-row"
              aria-pressed={teamAddon}
              onClick={() => setTeamAddon((v) => !v)}
            >
              <span
                style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}
              >
                <span className="toggle-row__dot" />
                <span style={{ minWidth: 0, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 16.5, marginBottom: 4 }}>
                    Customized mindful team-building activity
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      color: 'var(--color-muted)',
                    }}
                  >
                    30-minute session extension — for organizations and corporate
                    teams
                  </span>
                </span>
              </span>
              <span className="toggle-row__price">{money(pricing.teamAddon)}</span>
            </button>

            <button
              type="button"
              className="toggle-row"
              aria-pressed={refreshments}
              onClick={() => setRefreshments((v) => !v)}
            >
              <span
                style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}
              >
                <span className="toggle-row__dot" />
                <span style={{ minWidth: 0, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 16.5, marginBottom: 4 }}>
                    Organic tea, snacks and refreshments
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      color: 'var(--color-muted)',
                    }}
                  >
                    {money(pricing.refreshments)} per participant
                  </span>
                </span>
              </span>
              <span className="toggle-row__price">
                {people >= 2
                  ? money(pricing.refreshments * people)
                  : `${money(pricing.refreshments)} pp`}
              </span>
            </button>
          </div>
        </div>

        {/* ---------- Your details ---------- */}
        <div className={`${styles.step} ${styles.stepLast}`}>
          <div className={styles.stepHead} style={{ marginBottom: 30 }}>
            <div className={styles.stepNumber}>{detailsStep}</div>
            <h2 className={styles.stepTitle}>Your details</h2>
          </div>
          <div className={`${styles.details} ${styles.indent}`}>
            <input
              className="field"
              type="text"
              name="name"
              required
              placeholder="Full name"
              aria-label="Full name"
              autoComplete="name"
            />
            <input
              className="field"
              type="email"
              name="email"
              required
              placeholder="Email"
              aria-label="Email"
              autoComplete="email"
            />
            <input
              className={`field ${styles.detailsWide}`}
              type="tel"
              name="phone"
              placeholder="Phone | WhatsApp"
              aria-label="Phone or WhatsApp"
              autoComplete="tel"
            />
            <textarea
              className={`field ${styles.detailsWide} ${styles.textarea}`}
              name="message"
              rows={4}
              placeholder="Anything you would like us to know — occasion, accessibility needs, questions"
              aria-label="Anything you would like us to know"
            />
          </div>
        </div>
      </div>

      {/* ---------- Summary ---------- */}
      <aside className={styles.summary}>
        <div className={styles.summaryTitle}>Your Session</div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="summary-line">
            <span className="summary-line__label">Participants</span>
            <span className="summary-line__value">
              {people === 1 ? '1 person' : people >= 2 ? `${people} people` : '—'}
            </span>
          </div>
          <div className="summary-line">
            <span className="summary-line__label">Date</span>
            <span className="summary-line__value">
              {date ? formatDay(date) : '—'}
            </span>
          </div>
          <div className="summary-line">
            <span className="summary-line__label">Time</span>
            <span className="summary-line__value">{time ?? '—'}</span>
          </div>
          {needsSecond ? (
            <div className="summary-line">
              <span className="summary-line__label">Second session</span>
              <span className="summary-line__value">
                {date2 ? `${formatDay(date2)}${time2 ? ` · ${time2}` : ''}` : '—'}
              </span>
            </div>
          ) : null}
          {quote.lines
            .filter((_, i) => i > 0)
            .map((line) => (
              <div key={line.label} className="summary-line">
                <span className="summary-line__label">{line.label}</span>
                <span className="summary-line__value">{line.value}</span>
              </div>
            ))}
          <div className="rule-end" />
        </div>

        <div className={styles.codeBlock}>
          <label className={styles.codeLabel} htmlFor="discount-code">
            Discount code
          </label>
          <div className={styles.codeRow}>
            <input
              id="discount-code"
              className={`field ${styles.codeInput}`}
              type="text"
              placeholder="Enter code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
            />
            <button
              type="button"
              className={styles.codeApply}
              onClick={applyCode}
            >
              APPLY
            </button>
          </div>
          {code.message ? (
            <div
              className={`${styles.codeMessage} ${code.ok ? styles.codeOk : styles.codeBad}`}
              role="status"
            >
              {code.message}
            </div>
          ) : null}
        </div>

        <div className={styles.estimate}>
          <div className={styles.codeLabel}>Estimated</div>
          <div className={styles.estimateValue}>
            {people >= 1 ? money(quote.total) : '—'}
          </div>
          <div className={styles.estimateNote}>
            {people === 1
              ? `Private session · package of four: ${money(pricing.privatePackage)} – save ${money(pricing.privateSession * 4 - pricing.privatePackage)}`
              : people >= 2
                ? `${people} participants${needsSecond ? ' · across two sessions' : ''}`
                : 'Select the number of participants'}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn--dark btn--wide"
          disabled={submitting}
        >
          {submitting ? 'Sending…' : 'Request booking'}
        </button>

        {submitError ? (
          <div className={styles.formError} role="alert">
            {submitError}
          </div>
        ) : null}

        <p className={styles.reassurance}>
          We confirm every booking personally. For alternative times, reach us at{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or {SITE.phone}.
        </p>
      </aside>
    </form>
  );
}
