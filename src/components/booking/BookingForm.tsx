'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { IncludedModal } from '@/components/common/IncludedModal';
import { PolicyModal } from '@/components/common/PolicyModal';
import { TermsModal } from '@/components/common/TermsModal';
import type { LegalSection } from '@/components/legal/LegalPage';
import { quoteFor } from '@/lib/quote';
import type { DiscountCode, Pricing, Slots } from '@/lib/settings';
import {
  CORPORATE_INTRO_MIN_PARTICIPANTS,
  corporateIntroPriceFor,
  MAX_PARTICIPANTS,
  SITE,
  TEAM_ADDON_MIN_PARTICIPANTS,
  TIME_SLOTS,
  TWO_SESSION_THRESHOLD,
  groupPriceFor,
  money,
  venueNoteFor,
} from '@/lib/site';
import { Calendar, formatDay, isoDay } from './Calendar';
import styles from './BookingForm.module.css';

type Props = {
  pricing: Pricing;
  slots: Slots;
  blockedDates: string[];
  codes: DiscountCode[];
  leadTimeDays: number;
  terms: LegalSection[];
  /** The figures behind "pay today": tax, deposit share, card fee, balance timing. */
  payTerms: {
    taxRatePercent: number;
    taxLabel: string;
    depositPercent: number;
    cardFeePercent: number;
    balanceDaysBefore: number;
  };
};

type CodeState = {
  applied: DiscountCode | null;
  message: string;
  ok: boolean;
};

const QUICK_PARTY = [1, 2, 3, 4, 5, 6];
const GRATUITY_PERCENTS = [10, 15, 18, 20] as const;
type GratuityChoice = (typeof GRATUITY_PERCENTS)[number] | 'custom';

/** What the booking API hands back so the client can pay the deposit on the spot. */
type BookingPayment = {
  method: 'card' | 'etransfer';
  invoiceNumber: string;
  invoiceTotal: number;
  deposit: number | null;
  depositPercent: number;
  checkoutUrl: string | null;
  invoiceUrl: string;
  portalUrl: string | null;
  instructions: string;
};

export function BookingForm({
  pricing,
  slots,
  blockedDates,
  codes,
  leadTimeDays,
  terms,
  payTerms,
}: Props) {
  const [plan, setPlan] = useState<'deposit' | 'full' | 'etransfer'>('deposit');
  const [party, setParty] = useState<number | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [time2, setTime2] = useState<string | null>(null);
  const [teamAddon, setTeamAddon] = useState(false);
  const [isPackage, setIsPackage] = useState(false);
  const [isCorporateIntro, setIsCorporateIntro] = useState(false);
  // null = nothing chosen yet - the 15% pill shows only a subtle suggested
  // tint, and no gratuity is added to the total until the person actually
  // clicks a choice.
  const [gratuityChoice, setGratuityChoice] = useState<GratuityChoice | null>(
    null
  );
  const [customGratuity, setCustomGratuity] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [code, setCode] = useState<CodeState>({
    applied: null,
    message: '',
    ok: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [payment, setPayment] = useState<BookingPayment | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [agreed, setAgreed] = useState(false);
  // On phones the summary sits below a long form: a slim bar keeps the total
  // and the way to pay in reach until the summary itself scrolls into view.
  const asideRef = useRef<HTMLElement | null>(null);
  const [asideInView, setAsideInView] = useState(false);
  useEffect(() => {
    const node = asideRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setAsideInView(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [submitted]);

  const invalid = (field: string) => Boolean(fieldErrors[field]?.length);

  // Arriving from the Offerings estimator's "Book this session" link -
  // pre-fill step 01 with what was already chosen there instead of asking
  // again. Still shown and still editable, just not blank.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = Number(params.get('participants'));
    if (Number.isInteger(requested) && requested >= 1 && requested <= MAX_PARTICIPANTS) {
      setParty(requested);
    }
    if (params.get('isPackage') === '1') setIsPackage(true);
    if (params.get('isCorporateIntro') === '1') setIsCorporateIntro(true);
    if (params.get('teamAddon') === '1') setTeamAddon(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const earliest = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return new Date(today.getTime() + leadTimeDays * 86_400_000);
  }, [leadTimeDays]);

  const people = party ?? 0;
  const needsSecond = people > TWO_SESSION_THRESHOLD;
  const openSlots = TIME_SLOTS.filter((slot) => slots[slot.key] !== false);

  // Drop these once the headcount no longer qualifies, rather than leaving a
  // checked-but-no-longer-applicable choice sitting there.
  useEffect(() => {
    if (isPackage && people !== 1) setIsPackage(false);
  }, [people, isPackage]);

  useEffect(() => {
    if (isCorporateIntro && people < CORPORATE_INTRO_MIN_PARTICIPANTS) {
      setIsCorporateIntro(false);
    }
  }, [people, isCorporateIntro]);

  const gratuityAmount =
    gratuityChoice === 'custom' ? Number(customGratuity) || 0 : undefined;
  const gratuityPercent =
    gratuityChoice === 'custom' || gratuityChoice === null
      ? undefined
      : gratuityChoice;

  const quote = quoteFor(
    {
      participants: people,
      isPackage,
      isCorporateIntro,
      teamAddon,
      percentOff: code.applied?.percentOff,
      amountOff: code.applied?.amountOff,
      discountLabel: code.applied?.code,
      discountMinParticipants: code.applied?.minParticipants,
      gratuityPercent,
      gratuityAmount,
    },
    pricing
  );

  // What the checkout will actually ask for: tax on everything but the
  // gratuity, then the deposit share, then the card fee on what is paid.
  const taxable = quote.total - quote.gratuity;
  const invoiceTotal = quote.total + Math.round((taxable * payTerms.taxRatePercent) / 100);
  const depositOffered = payTerms.depositPercent > 0 && payTerms.depositPercent < 100;
  const depositNow = Math.round((invoiceTotal * payTerms.depositPercent) / 100);
  const cardFee = (amount: number) => Math.round((amount * payTerms.cardFeePercent) / 100);
  const depositWithFee = depositNow + cardFee(depositNow);
  const fullWithFee = invoiceTotal + cardFee(invoiceTotal);

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
    if (people < match.minParticipants) {
      setCode({
        applied: null,
        message: `${match.code} applies to bookings of ${match.minParticipants} or more.`,
        ok: false,
      });
      return;
    }
    setCode({
      applied: match,
      message: `${match.code} applied — ${
        match.amountOff ? `${money(match.amountOff)} off` : `${match.percentOff}% off`
      }.`,
      ok: true,
    });
  };

  const removeCode = () => {
    setCodeInput('');
    setCode({ applied: null, message: '', ok: false });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError('');
    setFieldErrors({});

    if (!party) {
      setSubmitError('Please choose how many people will join.');
      return;
    }
    if (!date || !time) {
      setSubmitError('Please choose a date and a time.');
      return;
    }
    if (needsSecond && !time2) {
      setSubmitError(
        'Groups larger than 12 run across two sessions on the same day — please choose a second time slot.'
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
          company: form.get('company'),
          message: form.get('message'),
          participants: party,
          sessionDate: isoDay(date),
          sessionTime: time,
          // Split sessions run the same day, just at a second time slot.
          sessionDate2: needsSecond ? isoDay(date) : null,
          sessionTime2: needsSecond ? time2 : null,
          teamAddon,
          isPackage,
          isCorporateIntro,
          discountCode: code.applied?.code ?? null,
          gratuityPercent: gratuityPercent ?? null,
          gratuityAmount: gratuityAmount ?? null,
          acceptTerms: agreed,
          paymentPlan: plan,
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

      const created = (await response.json().catch(() => null)) as { payment?: BookingPayment | null } | null;
      const pay = created?.payment ?? null;
      setPayment(pay);
      // Straight to the secure deposit page: the request is saved and the
      // confirmation email is on its way whatever happens next. Without a
      // card link (Stripe not connected, or no deposit on this booking) the
      // confirmation card below takes over.
      if (pay?.checkoutUrl) {
        setRedirecting(true);
        window.location.assign(pay.checkoutUrl);
        return;
      }
      setSubmitted(true);
      // The confirmation replaces a long form; bring it into view rather
      // than leaving the reader where the button used to be.
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
      <div className={`card ${styles.success}`} role="status" tabIndex={-1} ref={(el) => el?.focus()}>
        <h2 className={styles.successTitle}>Request confirmed</h2>
        <p className={styles.successBody}>Thank you for your request.</p>
        <div className={styles.successGrid}>
          <div>
            <div className={styles.successLabel}>What you can expect</div>
            <p className={styles.successBody}>
              We&rsquo;ll review your request within 24 hours and come back to you
              by email. Your confirmation email is on its way
              {payment ? ` with invoice ${payment.invoiceNumber} attached` : ''}.
              {payment?.deposit != null ? ` A ${payment.depositPercent}% deposit confirms your date.` : ''}
            </p>
          </div>
          <div>
            <div className={styles.successLabel}>What you can do</div>
            <p className={styles.successBody}>
              You can start preparing: comfortable clothing and warm socks are all
              you need. Everything else is provided.
            </p>
          </div>
        </div>
        {payment ? (
          <div className={styles.successPay}>
            <div className={styles.successLabel}>
              {payment.method === 'etransfer' ? 'Confirm your date by e-transfer' : payment.deposit != null ? 'Confirm your date now' : 'Pay now'}
            </div>
            <p className={styles.successBody}>
              {payment.deposit != null
                ? `A ${payment.depositPercent}% deposit of ${money(payment.deposit)} confirms your date. The remaining ${money(payment.invoiceTotal - payment.deposit)} is due four calendar days before your session.`
                : payment.method === 'etransfer'
                  ? `Your invoice comes to ${money(payment.invoiceTotal)}, paid in full by e-transfer with no card fee. Your booking is confirmed as soon as we receive the transfer, and you get a confirmation email with all the details.`
                  : `Your invoice comes to ${money(payment.invoiceTotal)}.`}
            </p>
            {payment.method === 'etransfer' ? (
              <div className={styles.etransferBox}>
                <div className={styles.successLabel}>Send by Interac e-transfer</div>
                <div className={styles.etransferRow}><span>Amount</span><strong>{money(payment.deposit ?? payment.invoiceTotal)}</strong></div>
                <div className={styles.etransferRow}><span>Reference</span><strong>{payment.invoiceNumber}</strong></div>
                <p className={styles.successBody} style={{ whiteSpace: 'pre-line' }}>{payment.instructions}</p>
              </div>
            ) : null}
            <div className={styles.successActions}>
              <a className="btn btn--dark" href={payment.invoiceUrl}>
                {payment.method === 'etransfer' ? 'View invoice' : 'View invoice and pay'}
              </a>
              {payment.portalUrl ? (
                <a className="btn btn--outline" href={payment.portalUrl}>
                  Your booking page
                </a>
              ) : null}
            </div>
            <p className={styles.successNote}>
              {payment.method === 'etransfer'
                ? 'These details are also in your email. Changed your mind? The invoice has a card option too.'
                : `Or send ${money(payment.deposit ?? payment.invoiceTotal)} by e-transfer using the details in your email.`}
            </p>
          </div>
        ) : null}
        <p className={styles.successNote}>
          Need to reach us sooner? Write to{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call {SITE.phone}.
        </p>
      </div>
    );
  }

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
            Sessions are offered for 1 to 24 participants. Groups larger than
            12 are split across two sessions. Corporate Introductory pricing
            is available from 7 participants.
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
                setTime2(null);
              }}
            >
              <option value="">7 to 24 participants…</option>
              {Array.from({ length: MAX_PARTICIPANTS - 6 }, (_, i) => {
                const n = i + 7;
                return (
                  <option key={n} value={n}>
                    {n} participants
                  </option>
                );
              })}
            </select>
          </div>

          {people > 0 && (
            <div className={`${styles.venueNote} ${styles.indent}`}>{venueNoteFor(people)}</div>
          )}

          {people === 1 && (
            <div className={`${styles.tierChoice} ${styles.indent}`}>
              <button
                type="button"
                className={`${styles.timeBtn} ${!isPackage ? styles.timeBtnOn : ''}`}
                aria-pressed={!isPackage}
                onClick={() => setIsPackage(false)}
              >
                <span className={styles.tierLabel}>1 session</span>
                <span className={styles.timeNote}>
                  {money(pricing.privateSession)}
                </span>
              </button>
              <button
                type="button"
                className={`${styles.timeBtn} ${isPackage ? styles.timeBtnOn : ''}`}
                aria-pressed={isPackage}
                onClick={() => setIsPackage(true)}
              >
                <span className={styles.tierLabel}>Package of four</span>
                <span className={styles.timeNote}>
                  {money(pricing.privatePackage)} — save{' '}
                  {money(pricing.privateSession * 4 - pricing.privatePackage)}
                </span>
              </button>
            </div>
          )}

          {people >= CORPORATE_INTRO_MIN_PARTICIPANTS && (
            <div className={`${styles.tierChoice} ${styles.indent}`}>
              <button
                type="button"
                className={`${styles.timeBtn} ${!isCorporateIntro ? styles.timeBtnOn : ''}`}
                aria-pressed={!isCorporateIntro}
                onClick={() => setIsCorporateIntro(false)}
              >
                <span className={styles.tierLabel}>Standard group</span>
                <span className={styles.timeNote}>
                  {money(groupPriceFor(people))} — per-participant group rate
                </span>
              </button>
              <button
                type="button"
                className={`${styles.timeBtn} ${isCorporateIntro ? styles.timeBtnOn : ''}`}
                aria-pressed={isCorporateIntro}
                onClick={() => setIsCorporateIntro(true)}
              >
                <span className={styles.tierLabel}>Corporate Introductory</span>
                <span className={styles.timeNote}>
                  {money(corporateIntroPriceFor(people))} — first-time organizational clients
                </span>
              </button>
            </div>
          )}
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
          <p className={styles.stepNote}>
            {needsSecond
              ? 'Each session runs two hours. Groups larger than 12 run across two sessions on the same day, so choose two time slots below'
              : 'Each session runs two hours'}
          </p>
          <div className={`${styles.times} ${styles.indent}`}>
            {openSlots.map((slot) => {
              const isOn = needsSecond
                ? time === slot.label || time2 === slot.label
                : time === slot.label;
              return (
                <button
                  key={slot.key}
                  type="button"
                  className={`${styles.timeBtn} ${isOn ? styles.timeBtnOn : ''}`}
                  aria-pressed={isOn}
                  onClick={() => {
                    if (!needsSecond) {
                      setTime(slot.label);
                      return;
                    }
                    // Toggle in and out of a two-slot selection, same day.
                    if (time === slot.label) {
                      setTime(time2);
                      setTime2(null);
                    } else if (time2 === slot.label) {
                      setTime2(null);
                    } else if (!time) {
                      setTime(slot.label);
                    } else if (!time2) {
                      setTime2(slot.label);
                    } else {
                      setTime2(slot.label);
                    }
                  }}
                >
                  <span className={styles.timeLabel}>{slot.label}</span>
                  <span className={styles.timeNote}>{slot.note}</span>
                </button>
              );
            })}
          </div>
          <p className={styles.timesNote}>
            For alternative times, reach us at{' '}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or {SITE.phone}.
          </p>
        </div>

        {/* ---------- Add-ons ---------- */}
        <div className={`${styles.step} ${party !== null && party >= TEAM_ADDON_MIN_PARTICIPANTS ? '' : styles.stepQuietMobile}`}>
          <div className={styles.stepHead}>
            <div className={styles.stepNumber}>04</div>
            <h2 className={styles.stepTitle}>Optional add-on</h2>
          </div>
          <p className={styles.stepNote}>
            Available for {TEAM_ADDON_MIN_PARTICIPANTS}+ participants
          </p>
          <div className={`${styles.addons} ${styles.indent}`}>
            {party !== null && party >= TEAM_ADDON_MIN_PARTICIPANTS && (
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
                    <span style={{ display: 'block', fontSize: 16.5, marginBottom: 2 }}>
                      Customized mindful team-building activity
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 15,
                        color: 'var(--color-muted)',
                        marginBottom: 4,
                      }}
                    >
                      For organizations and corporate teams
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 13.5,
                        lineHeight: 1.65,
                        color: 'var(--color-muted)',
                      }}
                    >
                      45-minute extension, featuring a facilitated activity
                      focused on recognition, values alignment, mindful
                      communication, or team connection — customized to your
                      team objectives
                    </span>
                  </span>
                </span>
                <span className="toggle-row__price">{money(pricing.teamAddon)}</span>
              </button>
            )}
          </div>
        </div>

        {/* ---------- Gratuity ---------- */}
        <div className={styles.step}>
          <div className={styles.stepHead}>
            <div className={styles.stepNumber}>05</div>
            <h2 className={styles.stepTitle}>Would you like to include gratuity?</h2>
          </div>
          <p className={styles.stepNote}>Optional — tap again to remove</p>
          <div className={`${styles.gratuityRow} ${styles.indent}`}>
            {GRATUITY_PERCENTS.map((pct) => (
              <button
                key={pct}
                type="button"
                className={`${styles.gratuityBtn} ${gratuityChoice === pct ? styles.gratuityBtnOn : ''}`}
                aria-pressed={gratuityChoice === pct}
                onClick={() =>
                  setGratuityChoice((c) => (c === pct ? null : pct))
                }
              >
                {pct}%
              </button>
            ))}
            <button
              type="button"
              className={`${styles.gratuityBtn} ${gratuityChoice === 'custom' ? styles.gratuityBtnOn : ''}`}
              aria-pressed={gratuityChoice === 'custom'}
              onClick={() =>
                setGratuityChoice((c) => (c === 'custom' ? null : 'custom'))
              }
            >
              Amount
            </button>
          </div>
          {gratuityChoice === 'custom' ? (
            <div className={styles.indent} style={{ marginTop: 12 }}>
              <input
                className="field"
                type="number"
                inputMode="decimal"
                min={0}
                step="1"
                placeholder="Enter an amount ($)"
                aria-label="Gratuity amount"
                value={customGratuity}
                onChange={(e) => setCustomGratuity(e.target.value)}
                style={{ maxWidth: 220 }}
              />
            </div>
          ) : null}
        </div>

        {/* ---------- Your details ---------- */}
        <div className={`${styles.step} ${styles.stepLast}`}>
          <div className={styles.stepHead} style={{ marginBottom: 20 }}>
            <div className={styles.stepNumber}>06</div>
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
              required
              placeholder="Phone | WhatsApp"
              aria-label="Phone or WhatsApp"
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
              rows={4}
              placeholder="Anything you would like us to know — occasion, accessibility needs, questions"
              aria-label="Anything you would like us to know"
            />
          </div>
        </div>
      </div>

      {/* ---------- Summary ---------- */}
      <aside className={styles.summary} ref={asideRef}>
        <div className={styles.summaryTitle}>Your Session</div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="summary-line">
            <span className="summary-line__label">Participants</span>
            <span className="summary-line__value">
              {people === 1 ? '1 person' : people >= 2 ? `${people} people` : '—'}
            </span>
          </div>
          {quote.lines[0] ? (
            <div className="summary-line">
              <span className="summary-line__label">
                {people === 1
                  ? quote.lines[0].label
                  : isCorporateIntro
                    ? 'Corporate Introductory'
                    : 'Standard group'}
              </span>
              <span className="summary-line__value">{quote.lines[0].value}</span>
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
          <div className={`summary-line ${styles.totalLine}`}>
            <span className="summary-line__label">Total</span>
            <span className="summary-line__value">
              {people >= 1 ? money(quote.total) : '—'}
            </span>
          </div>
        </div>

        {people === 1 || people < 1 ? (
          <div className={styles.estimateNote}>
            {people === 1
              ? `Private session · package of four: ${money(pricing.privatePackage)} – save ${money(pricing.privateSession * 4 - pricing.privatePackage)}`
              : 'Select the number of participants'}
          </div>
        ) : null}

        {date ? (
          <div className={`summary-line ${needsSecond ? styles.dateTimeStack : ''}`}>
            <span className="summary-line__label">Date &amp; time</span>
            {needsSecond ? (
              <>
                <span className="summary-line__value">
                  {date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  {' · '}
                  <span className={styles.dateTimeNote}>Split across two sessions</span>
                </span>
                <span className={styles.dateTimeNote}>
                  {time ?? '—'}
                  {time2 ? ` + ${time2}` : ''}
                </span>
              </>
            ) : (
              <span className="summary-line__value">
                {date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                {time ? ` · ${time}` : ''}
              </span>
            )}
          </div>
        ) : null}

        <div className={styles.codeBlock}>
          <label className="visually-hidden" htmlFor="discount-code">
            Discount code
          </label>
          <div className={styles.codeRow}>
            <input
              id="discount-code"
              className={`field ${styles.codeInput}`}
              type="text"
              placeholder="Enter discount code"
              value={codeInput}
              disabled={Boolean(code.applied)}
              onChange={(e) => setCodeInput(e.target.value)}
            />
            <button
              type="button"
              className={styles.codeApply}
              onClick={code.applied ? removeCode : applyCode}
            >
              {code.applied ? 'REMOVE' : 'APPLY'}
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

        {people >= 1 ? (
          <div className={styles.payToday}>
            <div className={styles.payTitle}>Make your payment</div>

            <div className={styles.payGroup}>
              <div className={styles.payGroupLabel}>
                By card{payTerms.cardFeePercent > 0 ? ` · ${payTerms.cardFeePercent}% card fee` : ''}
              </div>
              <div className={styles.tierChoice} role="radiogroup" aria-label="Pay by card">
                {depositOffered ? (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={plan === 'deposit'}
                    className={`${styles.timeBtn} ${plan === 'deposit' ? styles.timeBtnOn : ''}`}
                    onClick={() => setPlan('deposit')}
                  >
                    <span className={styles.tierLabel}>{payTerms.depositPercent}% deposit</span>
                    <span className={styles.timeNote}>
                      {money(depositWithFee)} now, {money(invoiceTotal - depositNow)} {payTerms.balanceDaysBefore} days before
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  role="radio"
                  aria-checked={plan === 'full' || (!depositOffered && plan !== 'etransfer')}
                  className={`${styles.timeBtn} ${plan === 'full' || (!depositOffered && plan !== 'etransfer') ? styles.timeBtnOn : ''}`}
                  onClick={() => setPlan('full')}
                >
                  <span className={styles.tierLabel}>Pay in full</span>
                  <span className={styles.timeNote}>{money(fullWithFee)} now, nothing more to pay</span>
                </button>
              </div>
              <div className={styles.payGroupNote}>
                Card, Apple Pay and Google Pay on the secure Stripe page.
                {depositOffered ? ' With the deposit, the balance is charged to the same card automatically.' : ''}
              </div>
            </div>

            <div className={styles.payGroup}>
              <div className={styles.payGroupLabel}>By Interac e-transfer · no fee</div>
              <div className={styles.tierChoice} role="radiogroup" aria-label="Pay by e-transfer">
                <button
                  type="button"
                  role="radio"
                  aria-checked={plan === 'etransfer'}
                  className={`${styles.timeBtn} ${plan === 'etransfer' ? styles.timeBtnOn : ''}`}
                  onClick={() => setPlan('etransfer')}
                >
                  <span className={styles.tierLabel}>Pay in full</span>
                  <span className={styles.timeNote}>{money(invoiceTotal)} now, no card fee</span>
                </button>
              </div>
              <div className={styles.payGroupNote}>
                You send it from your bank; the details follow on the next screen and by email. Your booking is
                confirmed as soon as we receive the transfer.
              </div>
            </div>
            {payTerms.taxRatePercent > 0 ? (
              <div className={styles.estimateNote}>
                All amounts include {payTerms.taxLabel} {payTerms.taxRatePercent}%.
              </div>
            ) : null}
          </div>
        ) : null}

        <IncludedModal
          triggerClassName={`btn btn--outline btn--wide ${styles.includedBtn}`}
        />

        <label className={styles.agree}>
          <input
            type="checkbox"
            className={styles.agreeBox}
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (e.target.checked) setFieldErrors((f) => ({ ...f, acceptTerms: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.acceptTerms)}
            required
          />
          <span>
            I have read and agree to the{' '}
            <TermsModal triggerClassName={styles.policyLink} sections={terms} />{' '}
            and the <PolicyModal triggerClassName={styles.policyLink} />.
          </span>
        </label>
        {fieldErrors.acceptTerms ? (
          <div className={styles.formError} style={{ margin: '0 0 14px' }} role="alert">
            {fieldErrors.acceptTerms[0]}
          </div>
        ) : null}

        <button
          type="submit"
          className="btn btn--dark btn--wide"
          disabled={submitting || redirecting}
        >
          {redirecting
            ? 'Opening the secure payment page…'
            : submitting
              ? 'Saving your request…'
              : plan === 'etransfer'
                ? 'Confirm booking'
                : people >= 1
                  ? `Continue to pay ${money(plan === 'deposit' && depositOffered ? depositWithFee : fullWithFee)}`
                  : 'Continue to payment'}
        </button>
        <p className={styles.nextNote}>
          {plan === 'etransfer'
            ? 'Next: the e-transfer details. Your booking is confirmed once we receive the transfer.'
            : 'Next: the secure card payment page (Stripe). Your date is held once the payment is made.'}
        </p>

        {submitError ? (
          <div className={styles.formError} role="alert">
            {submitError}
          </div>
        ) : null}
      </aside>

      {people >= 1 && !asideInView && !redirecting ? (
        <div className={styles.mobileBar}>
          <div className={styles.mobileBarText}>
            <span className={styles.mobileBarLabel}>Total</span>
            <span className={styles.mobileBarValue}>{money(quote.total)}</span>
          </div>
          <button
            type="button"
            className={`btn btn--dark ${styles.mobileBarBtn}`}
            onClick={() => asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Review &amp; pay
          </button>
        </div>
      ) : null}
    </form>
  );
}
