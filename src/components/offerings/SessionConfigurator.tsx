'use client';

import Link from 'next/link';
import { useId, useState } from 'react';

import { quoteFor } from '@/lib/quote';
import type { Pricing } from '@/lib/settings';
import {
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  money,
  venueNoteFor,
} from '@/lib/site';
import styles from './SessionConfigurator.module.css';

type Format = 'private' | 'group';

type Props = {
  pricing: Pricing;
};

export function SessionConfigurator({ pricing }: Props) {
  const [format, setFormat] = useState<Format>('private');
  const [isPackage, setIsPackage] = useState(false);
  const [participants, setParticipants] = useState(8);
  const [teamAddon, setTeamAddon] = useState(false);
  const [refreshments, setRefreshments] = useState(false);
  const selectId = useId();

  const isPrivate = format === 'private';

  const quote = quoteFor(
    {
      participants: isPrivate ? 1 : participants,
      isPackage: isPrivate && isPackage,
      teamAddon: !isPrivate && teamAddon,
      refreshments: !isPrivate && refreshments,
    },
    pricing
  );

  const participantOptions = Array.from(
    { length: MAX_PARTICIPANTS - MIN_PARTICIPANTS + 1 },
    (_, i) => {
      const n = i + MIN_PARTICIPANTS;
      return {
        value: n,
        label: `${n} participants — ${money(n * pricing.perParticipant)}`,
      };
    }
  );

  return (
    <div className={styles.layout}>
      <div className={styles.panel}>
        <div className={styles.legend}>Format</div>
        <div className={`${styles.choices} ${styles.fieldBlock}`}>
          <button
            type="button"
            className="choice"
            aria-pressed={isPrivate}
            onClick={() => setFormat('private')}
          >
            <span className="choice__title">Private Sessions</span>
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
            <span className="choice__title">Group &amp; Corporate</span>
            <span className="choice__note">
              2–24 participants — gatherings, celebrations, teams
            </span>
          </button>
        </div>

        {isPrivate ? (
          <div className={styles.fieldBlock}>
            <div className={styles.legend}>Private sessions</div>
            <div className={styles.choices}>
              <button
                type="button"
                className="choice"
                aria-pressed={!isPackage}
                onClick={() => setIsPackage(false)}
              >
                <span className="choice__title">Single session</span>
                <span className="choice__note">
                  {money(pricing.privateSession)} per session
                </span>
              </button>
              <button
                type="button"
                className="choice"
                aria-pressed={isPackage}
                onClick={() => setIsPackage(true)}
              >
                <span className="choice__title">Package of four</span>
                <span className="choice__note">
                  {money(pricing.privatePackage)} – save{' '}
                  {money(pricing.privateSession * 4 - pricing.privatePackage)}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.fieldBlock}>
              <div className={styles.participantsHead}>
                <label htmlFor={selectId} className={styles.legend}>
                  Participants
                </label>
                <div className={styles.participantsCount}>{participants}</div>
              </div>
              <select
                id={selectId}
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

            <div>
              <div className={styles.legend}>Optional corporate add-on</div>
              <div className={styles.addons}>
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
                    <span style={{ minWidth: 0 }}>
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
                        30-minute extension focused on recognition, values
                        alignment, mindful communication, and team connection
                      </span>
                    </span>
                  </span>
                  <span className="toggle-row__price">
                    {money(pricing.teamAddon)}
                  </span>
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
                    <span style={{ minWidth: 0 }}>
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
                    {money(pricing.refreshments * participants)}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <aside className={styles.summary} aria-live="polite">
        <div className={styles.summaryTitle}>Your Estimate</div>
        <div className={styles.summaryLines}>
          {quote.lines.map((line) => (
            <div
              key={line.label}
              className="summary-line summary-line--dark"
            >
              <span className="summary-line__label">{line.label}</span>
              <span className="summary-line__value">{line.value}</span>
            </div>
          ))}
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Total</span>
            <span className={styles.totalValue}>{money(quote.total)}</span>
          </div>
        </div>
        <div className={styles.totalNote}>
          {isPrivate
            ? 'Two-hour session. All comfort items, materials and refreshments included.'
            : `Two-hour session for ${participants} participants. All comfort items, materials and refreshments included.`}
        </div>
        <div className={styles.summaryActions}>
          <Link href="/book" className="btn btn--cream btn--wide">
            Book this session
          </Link>
          <Link href="/gift" className="btn btn--outline-dark btn--wide">
            Gift it
          </Link>
        </div>
      </aside>
    </div>
  );
}
