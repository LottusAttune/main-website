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
  VENUE_NOTE,
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
  const photoBleedRef = useRef<HTMLDivElement>(null);
  const flameRef = useRef<HTMLDivElement>(null);

  const isPrivate = format === 'private';
  const isCorporateIntro = format === 'corporateIntro';

  // Match the estimate box's bottom to the panel's own bottom (under the
  // add-ons) when a participant count is in play. Only applies once the
  // layout is side-by-side (matches the .layout breakpoint) — below that,
  // the panel stacks into one long column and forcing the same height onto
  // the summary box stretches its photo absurdly tall.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const summary = summaryRef.current;
    if (!summary) return;

    if (isPrivate || !panel) {
      summary.style.height = '';
      return;
    }

    const query = window.matchMedia('(min-width: 861px)');

    // The panel's own height leaves too little room for the photo to show
    // more than a sliver of the candle, so give the box some extra height
    // here rather than cropping the photo tighter.
    const EXTRA_FOR_PHOTO = 100;

    const sync = () => {
      if (!query.matches) {
        summary.style.height = '';
        return;
      }
      const height = panel.getBoundingClientRect().bottom - panel.getBoundingClientRect().top;
      summary.style.height = `${height + EXTRA_FOR_PHOTO}px`;
    };

    sync();
    window.addEventListener('resize', sync);
    query.addEventListener('change', sync);
    return () => {
      window.removeEventListener('resize', sync);
      query.removeEventListener('change', sync);
    };
  }, [isPrivate, participants, format]);

  // The photo scales with object-fit: cover (top-anchored), so depending on
  // the container's aspect ratio it may bleed past the sides or crop the
  // bottom. Position the flame overlay against the photo's actual displayed
  // rect (not the container's) so it stays on the candle at every size.
  useLayoutEffect(() => {
    const container = photoBleedRef.current;
    const flame = flameRef.current;
    if (!container || !flame || isPrivate) return;

    const FLAME_X_FRAC = 0.5;
    const FLAME_Y_FRAC = 0.537;

    const sync = () => {
      const { width: cw, height: ch } = container.getBoundingClientRect();
      const scale = Math.max(cw / 720, ch / 940);
      const displayW = 720 * scale;
      const displayH = 940 * scale;
      const offsetX = (cw - displayW) / 2;
      const offsetY = 0; // object-position: center top

      flame.style.left = `${offsetX + FLAME_X_FRAC * displayW}px`;
      flame.style.top = `${offsetY + FLAME_Y_FRAC * displayH}px`;
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
            <span className="choice__title">Groups &amp; Corporate</span>
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
          {isPrivate && (
            <div className={styles.venueNote}>{VENUE_NOTE.lounge}</div>
          )}
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
                        30-minute extension, featuring a facilitated activity
                        focused on recognition, values alignment, mindful
                        communication, and team connection — customized to
                        your team objectives
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
          <div className={styles.photoBleed} ref={photoBleedRef}>
            <Image
              src={asset('offerings-box-photo').src}
              alt=""
              fill
              className={styles.boxPhoto}
              unoptimized
            />
            <div className={styles.flameFlicker} ref={flameRef}>
              <svg
                className={styles.flameSvg}
                viewBox="0 0 40 70"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="flameOuterGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#ff5a1a" stopOpacity="0.85" />
                    <stop offset="42%" stopColor="#ffa93f" stopOpacity="0.92" />
                    <stop offset="75%" stopColor="#ffd873" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#ffedb0" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="flameCoreGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#fff3d6" stopOpacity="0.9" />
                    <stop offset="55%" stopColor="#ffe08a" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#ffedb0" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  className={styles.flameOuterPath}
                  d="M20 4C11 18 7 32 8.5 44C9.5 53 14 60.5 20 63C26 60.5 30.5 53 31.5 44C33 32 29 18 20 4Z"
                  fill="url(#flameOuterGrad)"
                />
                <path
                  className={styles.flameCorePath}
                  d="M20 24C14.5 33 12.5 41 13.5 48C14.3 54 17 58.5 20 60C23 58.5 25.7 54 26.5 48C27.5 41 25.5 33 20 24Z"
                  fill="url(#flameCoreGrad)"
                />
              </svg>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
