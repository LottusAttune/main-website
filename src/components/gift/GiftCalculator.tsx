'use client';

import { useId, useState } from 'react';

import { giftQuoteFor } from '@/lib/quote';
import type { Pricing } from '@/lib/settings';
import {
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  SITE,
  TEAM_ADDON_MIN_PARTICIPANTS,
  groupPriceFor,
  money,
  venueNoteFor,
} from '@/lib/site';
import styles from './GiftCalculator.module.css';

type Format = 'private' | 'group';

type AddonDef = {
  key: string;
  title: string;
  note: string;
  amount: number;
};

type Props = {
  pricing: Pricing;
};

export function GiftCalculator({ pricing }: Props) {
  const [format, setFormat] = useState<Format>('private');
  const [sessions, setSessions] = useState(1);
  const [participants, setParticipants] = useState(6);
  const [addons, setAddons] = useState<Record<string, boolean>>({});
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const sessionsId = useId();
  const participantsId = useId();

  const isPrivate = format === 'private';

  const addonDefs: AddonDef[] =
    !isPrivate && participants >= TEAM_ADDON_MIN_PARTICIPANTS
      ? [
          {
            key: 'team',
            title: 'Mindful team-building activity',
            note: '30-minute extension, featuring a facilitated activity focused on recognition, values alignment, mindful communication, and team connection — customized to your team objectives',
            amount: pricing.teamAddon,
          },
        ]
      : [];

  const quote = giftQuoteFor(
    { format, sessions, participants, addons },
    pricing
  );

  const submit = async () => {
    setError('');
    if (!recipientName.trim() || !buyerEmail.trim()) {
      setError('Please add the recipient name and your email.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName,
          recipientEmail: recipientEmail.trim() || null,
          buyerEmail,
          format,
          sessions,
          participants,
          addons,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? 'We could not send your request.');
      }
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} Please email ${SITE.email}.`
          : 'Something went wrong.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const participantOptions = Array.from(
    { length: MAX_PARTICIPANTS - MIN_PARTICIPANTS + 1 },
    (_, i) => {
      const n = i + MIN_PARTICIPANTS;
      return {
        value: n,
        label: `${n} participants — ${money(groupPriceFor(n))}`,
      };
    }
  );

  return (
    <div className={styles.layout}>
      <div className={`card ${styles.panel}`}>
        <div className={styles.legend}>Experience</div>
        <div className={styles.formats}>
          <button
            type="button"
            className="choice"
            aria-pressed={isPrivate}
            onClick={() => setFormat('private')}
          >
            <span className={`choice__title ${styles.formatTitle}`}>
              Private Sessions
            </span>
            <span className="choice__note">
              One-on-one, customizable based on individual preferences
            </span>
          </button>
          <button
            type="button"
            className="choice"
            aria-pressed={!isPrivate}
            onClick={() => setFormat('group')}
          >
            <span className={`choice__title ${styles.formatTitle}`}>
              Group &amp; Corporate
            </span>
            <span className="choice__note">
              2–24 participants — gatherings, celebrations, teams
            </span>
          </button>
        </div>

        {isPrivate ? (
          <div className={styles.field}>
            <label className={styles.legend} htmlFor={sessionsId}>
              Number of sessions
            </label>
            <select
              id={sessionsId}
              className="select"
              value={sessions}
              onChange={(e) => setSessions(Number(e.target.value))}
            >
              <option value={1}>
                1 session — {money(pricing.privateSession)}
              </option>
              <option value={4}>
                Package of four — {money(pricing.privatePackage)} (save{' '}
                {money(pricing.privateSession * 4 - pricing.privatePackage)})
              </option>
            </select>
          </div>
        ) : (
          <div className={styles.field}>
            <label className={styles.legend} htmlFor={participantsId}>
              Number of participants
            </label>
            <select
              id={participantsId}
              className="select"
              value={participants}
              onChange={(e) => setParticipants(Number(e.target.value))}
            >
              {participantOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className={styles.venueNote}>{venueNoteFor(participants)}</div>
          </div>
        )}

        {addonDefs.length > 0 ? (
          <>
        <div className={styles.legend}>Add-ons</div>
        <div className={styles.addons}>
          {addonDefs.map((addon) => (
            <button
              key={addon.key}
              type="button"
              className="toggle-row"
              aria-pressed={Boolean(addons[addon.key])}
              onClick={() =>
                setAddons((current) => ({
                  ...current,
                  [addon.key]: !current[addon.key],
                }))
              }
            >
              <span
                style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}
              >
                <span className="toggle-row__dot" />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 16.5, marginBottom: 4 }}>
                    {addon.title}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13.5,
                      lineHeight: 1.6,
                      color: 'var(--color-muted)',
                    }}
                  >
                    {addon.note}
                  </span>
                </span>
              </span>
              <span className="toggle-row__price">{money(addon.amount)}</span>
            </button>
          ))}
        </div>
          </>
        ) : null}
      </div>

      <aside className={styles.aside}>
        <div className={styles.asideTitle}>Gift Certificate</div>

        {sent ? (
          <p className={styles.success} role="status">
            {recipientEmail.trim()
              ? `Your gift certificate is on its way to ${recipientName} at ${recipientEmail}. A confirmation has also been sent to ${buyerEmail}.`
              : `Your gift certificate has been sent to ${buyerEmail} — forward it to ${recipientName} whenever you're ready.`}
          </p>
        ) : (
          <>
            <div className={styles.lines}>
              {quote.lines.map((line) => (
                <div key={line.label} className="summary-line summary-line--dark">
                  <span className="summary-line__label">{line.label}</span>
                  <span
                    className="summary-line__value"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {line.value}
                  </span>
                </div>
              ))}
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Total</span>
                <span className={styles.totalValue}>{money(quote.total)}</span>
              </div>
            </div>

            <div className={styles.fields}>
              <input
                className="field field--dark"
                type="text"
                placeholder="Recipient name"
                aria-label="Recipient name"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
              <input
                className="field field--dark"
                type="email"
                placeholder="Recipient's email (optional)"
                aria-label="Recipient's email (optional)"
                autoComplete="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              <input
                className="field field--dark"
                type="email"
                placeholder="Your email"
                aria-label="Your email"
                autoComplete="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn--cream btn--wide"
              disabled={submitting}
              onClick={submit}
            >
              {submitting ? 'Sending…' : 'Request gift certificate'}
            </button>

            {error ? (
              <div className={styles.error} role="alert">
                {error}
              </div>
            ) : null}

            <p className={styles.note}>
              Questions? <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
