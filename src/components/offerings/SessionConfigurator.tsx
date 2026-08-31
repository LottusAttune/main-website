'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

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
  TEAM_ADDON_MIN_PARTICIPANTS,
  VENUE_NOTE,
  venueNoteFor,
} from '@/lib/site';
import styles from './SessionConfigurator.module.css';

type Format = 'private' | 'group' | 'corporateIntro';

type Props = {
  pricing: Pricing;
  footnote?: ReactNode;
};

export function SessionConfigurator({ pricing, footnote }: Props) {
  const [format, setFormat] = useState<Format>('group');
  const [isPackage, setIsPackage] = useState(false);
  const [participants, setParticipants] = useState(MIN_PARTICIPANTS);
  const [teamAddon, setTeamAddon] = useState(false);
  const selectId = useId();

  const panelRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const footnoteRef = useRef<HTMLDivElement>(null);
  const photoBleedRef = useRef<HTMLDivElement>(null);
  const flameRef = useRef<HTMLDivElement>(null);
  const glassGlowRef = useRef<HTMLDivElement>(null);

  const isPrivate = format === 'private';
  const isCorporateIntro = format === 'corporateIntro';

  // Drop the selection once the group is too small for it to apply, rather
  // than leaving a checked-but-disabled toggle sitting there.
  useEffect(() => {
    if (teamAddon && participants < TEAM_ADDON_MIN_PARTICIPANTS) {
      setTeamAddon(false);
    }
  }, [participants, teamAddon]);

  // Match the estimate box's bottom to the panel's own bottom (under the
  // add-ons) when a participant count is in play. Only applies once the
  // layout is side-by-side (matches the .layout breakpoint) — below that,
  // the panel stacks into one long column and forcing the same height onto
  // the summary box stretches its photo absurdly tall.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    const summary = summaryRef.current;
    const footnote = footnoteRef.current;
    if (!summary) return;

    if (isPrivate || !panel) {
      summary.style.height = '';
      if (footnote) footnote.style.marginTop = '';
      return;
    }

    const query = window.matchMedia('(min-width: 861px)');

    const sync = () => {
      if (!query.matches) {
        summary.style.height = '';
        if (footnote) footnote.style.marginTop = '';
        return;
      }
      // The photo keeps a fixed aspect ratio (see .photoBleed) and nothing
      // else in the box can stretch to absorb extra height, so forcing this
      // box to match a taller panel just opens a blank gap below the photo
      // instead of filling it - leave the box at its own natural height and
      // let the footnote (below) handle closing the two off visually.
      const panelBottom = panel.getBoundingClientRect().bottom;
      summary.style.height = '';

      // Push the footnote down to line its own bottom up with the (now
      // resized) summary box's bottom, whenever summary is taller at all -
      // that's the rule: brown longer than beige means the footnote lives
      // in beige's own gap. Only when they're the same height (or beige
      // is taller, which the other effect above tries never to let happen)
      // does tucking it under just the panel's column stop making sense -
      // then it centers under the whole layout instead.
      if (footnote) {
        footnote.style.marginTop = '';
        footnote.style.gridColumn = '';
        const summaryBottom = summary.getBoundingClientRect().bottom;
        const footnoteHeight = footnote.getBoundingClientRect().height;
        const extra = summaryBottom - footnoteHeight - panelBottom - 24;
        const boxDiff = summaryBottom - panelBottom;

        if (boxDiff > 0) {
          footnote.style.marginTop = `${Math.max(0, extra)}px`;
        } else {
          footnote.style.gridColumn = '1 / -1';
          const naturalTop = footnote.getBoundingClientRect().top;
          const targetTop = Math.max(panelBottom, summaryBottom) + 24;
          footnote.style.marginTop = `${Math.max(24, targetTop - naturalTop)}px`;
        }
      }
    };

    sync();
    window.addEventListener('resize', sync);
    query.addEventListener('change', sync);
    return () => {
      window.removeEventListener('resize', sync);
      query.removeEventListener('change', sync);
    };
  }, [isPrivate, participants, format]);

  // .photoBleed's aspect-ratio (720/700) is narrower than the source photo's
  // own (720/918), so the browser always scales it to the container's width
  // and crops only the bottom, top-aligned - never the sides. That makes the
  // flame's position a simple function of the container's width alone.
  useLayoutEffect(() => {
    const container = photoBleedRef.current;
    const flame = flameRef.current;
    const glow = glassGlowRef.current;
    if (!container || !flame || !glow || isPrivate) return;

    const FLAME_X_FRAC = 0.4;
    // Deep enough that the flame reads as sitting inside the jar, not
    // hovering above it.
    const FLAME_Y_FRAC = 0.195;
    // The front rim's own highlight line - the glass wall in front of the
    // wick from the camera's angle. The flame has to be clipped off right
    // here, hard, or it paints over that line and looks like it's floating
    // in front of the glass instead of burning behind it.
    const RIM_Y_FRAC = 0.155;
    const FLAME_BOX_HEIGHT = 50;
    // The frosted jar itself shows a soft bloom of light where the real
    // flame's glow bleeds through the glass - sits lower and a bit wider
    // than the flame overlay, animated on the same cycle so it reads as the
    // flame's own light moving behind the glass, not a separate light.
    const GLOW_X_FRAC = 0.4;
    const GLOW_Y_FRAC = 0.267;

    const sync = () => {
      const { width: cw } = container.getBoundingClientRect();
      const scale = cw / 720;
      const displayH = 918 * scale;

      flame.style.left = `${FLAME_X_FRAC * cw}px`;
      flame.style.top = `${FLAME_Y_FRAC * displayH}px`;

      // The flame's own box is a fixed CSS size while the photo scales
      // continuously, so the rim line lands at a different fraction of the
      // box on every screen width - has to be recomputed here rather than
      // baked into a static CSS mask.
      const boxTopScreenY = FLAME_Y_FRAC * displayH - 0.97 * FLAME_BOX_HEIGHT;
      const rimScreenY = RIM_Y_FRAC * displayH;
      const visiblePx = Math.max(0, Math.min(FLAME_BOX_HEIGHT, rimScreenY - boxTopScreenY));
      flame.style.clipPath = `inset(0 0 ${FLAME_BOX_HEIGHT - visiblePx}px 0)`;

      glow.style.left = `${GLOW_X_FRAC * cw}px`;
      glow.style.top = `${GLOW_Y_FRAC * displayH}px`;
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
            <span className="choice__title">Corporate Introductory</span>
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

            {(() => {
              const addonAvailable = participants >= TEAM_ADDON_MIN_PARTICIPANTS;
              return (
                <div className={styles.addonBlock}>
                  <div className={styles.legend}>Optional add-on</div>
                  <div className={styles.addons}>
                    <button
                      type="button"
                      className="toggle-row"
                      aria-pressed={addonAvailable && teamAddon}
                      aria-disabled={!addonAvailable}
                      disabled={!addonAvailable}
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
                              fontSize: 13,
                              lineHeight: 1.5,
                              color: 'var(--color-muted)',
                            }}
                          >
                            {addonAvailable
                              ? '30-minute extension, featuring a facilitated activity focused on recognition, values alignment, mindful communication, and team connection — customized to your team objectives'
                              : `Available for ${TEAM_ADDON_MIN_PARTICIPANTS}+ participants`}
                          </span>
                        </span>
                      </span>
                      <span className="toggle-row__price">
                        {addonAvailable ? money(pricing.teamAddon) : ''}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })()}
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
            <div className={styles.glassGlow} ref={glassGlowRef} aria-hidden="true" />
            <div className={styles.flameAnchor} ref={flameRef}>
              <div className={styles.flameFlicker}>
                <svg
                  className={styles.flameSvg}
                  viewBox="0 0 40 70"
                  aria-hidden="true"
                >
                  <defs>
                  <radialGradient
                    id="flameOuterGrad"
                    cx="50%"
                    cy="78%"
                    r="65%"
                    fx="50%"
                    fy="82%"
                  >
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="40%" stopColor="#fffaee" stopOpacity="1" />
                    <stop offset="70%" stopColor="#fff2d4" stopOpacity="0.92" />
                    <stop offset="90%" stopColor="#ffecc0" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#ffecc0" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient
                    id="flameCoreGrad"
                    cx="50%"
                    cy="82%"
                    r="45%"
                    fx="50%"
                    fy="86%"
                  >
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                    <stop offset="60%" stopColor="#fffdf5" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#fff8e6" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <path
                  className={styles.flameOuterPath}
                  d="M20 4C14.5 12.5 7 32 8.5 44C9.5 53 14 60.5 20 63C26 60.5 30.5 53 31.5 44C33 32 25.5 12.5 20 4Z"
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
          </div>
        )}
      </aside>
      {footnote && (
        <div className={styles.layoutFootnote} ref={footnoteRef}>
          {footnote}
        </div>
      )}
    </div>
  );
}
