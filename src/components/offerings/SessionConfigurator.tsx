'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useId, useLayoutEffect, useRef, useState } from 'react';

import { asset } from '@/lib/images';
import { quoteFor } from '@/lib/quote';
import type { Pricing } from '@/lib/settings';
import {
  CORPORATE_INTRO_BASE_PRICE,
  CORPORATE_INTRO_MIN_PARTICIPANTS,
  CORPORATE_INTRO_PER_PARTICIPANT,
  groupPriceFor,
  MAX_PARTICIPANTS,
  MIN_PARTICIPANTS,
  money,
  venueNoteFor,
} from '@/lib/site';
import styles from './SessionConfigurator.module.css';

type Format = 'private' | 'group' | 'corporateIntro';

type Props = {
  pricing: Pricing;
};

export function SessionConfigurator({ pricing }: Props) {
  const [format, setFormat] = useState<Format>('group');
  const [isPackage, setIsPackage] = useState(false);
  const [participants, setParticipants] = useState(MIN_PARTICIPANTS);
  const [teamAddon, setTeamAddon] = useState(false);
  const selectId = useId();

  const panelRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  const isPrivate = format === 'private';
  const isCorporateIntro = format === 'corporateIntro';

  // Match the estimate box's bottom to the panel's own bottom (under the
  // add-ons) when a participant count is in play.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const summary = summaryRef.current;
    if (!summary) return;

    if (isPrivate || !panel) {
      summary.style.height = '';
      return;
    }

    const sync = () => {
      const height = panel.getBoundingClientRect().bottom - panel.getBoundingClientRect().top;
      summary.style.height = `${height}px`;
    };

    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [isPrivate, participants, format]);

  const quote = quoteFor(
    {
      participants: isPrivate ? 1 : participants,
      isPackage: isPrivate && isPackage,
      isCorporateIntro,
      teamAddon: !isPrivate && teamAddon,
    },
    pricing
  );

  const participantsMin = isCorporateIntro
    ? CORPORATE_INTRO_MIN_PARTICIPANTS
    : MIN_PARTICIPANTS;

  const participantOptions = Array.from(
    { length: MAX_PARTICIPANTS - participantsMin + 1 },
    (_, i) => {
      const n = i + participantsMin;
      const price = isCorporateIntro
        ? CORPORATE_INTRO_BASE_PRICE +
          (n - CORPORATE_INTRO_MIN_PARTICIPANTS) * CORPORATE_INTRO_PER_PARTICIPANT
        : groupPriceFor(n);
      return {
        value: n,
        label: `${n} participants — ${money(price)}`,
      };
    }
  );

  return (
    <div className={styles.layout}>
      <div className={styles.panel} ref={panelRef}>
        <div className={`${styles.choices} ${styles.fieldBlock}`}>
          <button
            type="button"
            className={`choice ${styles.choicePrimary}`}
            aria-pressed={format === 'group'}
            onClick={() => setFormat('group')}
          >
            <span className="choice__title">Group &amp; Corporate</span>
            <span className="choice__note">
              2–24 participants — gatherings, celebrations, teams
            </span>
          </button>
          <button
            type="button"
            className={`choice ${styles.choiceKeepWhite}`}
            aria-pressed={isCorporateIntro}
            onClick={() => {
              setFormat('corporateIntro');
              setParticipants((p) =>
                Math.max(p, CORPORATE_INTRO_MIN_PARTICIPANTS)
              );
            }}
          >
            <span className="choice__title">Corporate Introductory Experience</span>
            <span className="choice__note">
              Available for first-time organizational clients (minimum 7
              participants)
            </span>
            <span className="choice__note">
              Starting at {money(CORPORATE_INTRO_BASE_PRICE)}
            </span>
          </button>
        </div>

        <div className={styles.fieldBlock}>
          <div className={styles.choices}>
            <button
              type="button"
              className={`choice ${styles.choicePrimary}`}
              aria-pressed={isPrivate && !isPackage}
              onClick={() => {
                setFormat('private');
                setIsPackage(false);
              }}
            >
              <span className="choice__title">Private Sessions</span>
              <span className="choice__note">
                One-on-one, customizable based on individual preferences
              </span>
              <span className="choice__note">
                {money(pricing.privateSession)} per session
              </span>
            </button>
            <button
              type="button"
              className={`choice ${styles.choiceKeepWhite}`}
              aria-pressed={isPrivate && isPackage}
              onClick={() => {
                setFormat('private');
                setIsPackage(true);
              }}
            >
              <span className="choice__title">Package of four</span>
              <span className="choice__note">
                {money(pricing.privatePackage)} – save{' '}
                {money(pricing.privateSession * 4 - pricing.privatePackage)}
              </span>
            </button>
          </div>
        </div>

        {!isPrivate && (
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
                    style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
                  >
                    <span className="toggle-row__dot" />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14.5, marginBottom: 2 }}>
                        Customized mindful team-building activity
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 12,
                          lineHeight: 1.5,
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
              </div>
            </div>
          </>
        )}
      </div>

      <aside className={styles.summary} aria-live="polite" ref={summaryRef}>
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
        <div className={styles.summaryActions}>
          <Link
            href="/v1/experience#included"
            className={`btn btn--sm btn--outline-dark btn--wide ${styles.includedBtn}`}
          >
            See What&apos;s Included
          </Link>
          <div className={styles.summaryActionsRow}>
            <Link href="/v1/book" className="btn btn--sm btn--cream btn--wide">
              Book this session
            </Link>
            <Link href="/v1/gift" className={`btn btn--sm btn--wide ${styles.giftBtn}`}>
              Gift it
            </Link>
          </div>
        </div>

        {!isPrivate && (
          <div className={styles.photoBleed}>
            <Image
              src={asset('offerings-box-photo').src}
              alt=""
              fill
              className={styles.boxPhoto}
              unoptimized
            />
          </div>
        )}
      </aside>
    </div>
  );
}
