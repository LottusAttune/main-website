'use client';

import Image from 'next/image';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

import { FILM, FILM_POSTER } from '@/data/content';
import { asset } from '@/lib/images';
import styles from './FilmFrame.module.css';

declare global {
  interface Window {
    Vimeo?: {
      Player: new (el: HTMLIFrameElement) => VimeoPlayer;
    };
  }
}

/** Minimal shape of the bits of the Vimeo Player SDK we use. */
type VimeoPlayer = {
  setMuted: (muted: boolean) => Promise<boolean>;
  setVolume: (volume: number) => Promise<number>;
  setCurrentTime: (seconds: number) => Promise<number>;
  play: () => Promise<void>;
  on?: (event: string, handler: () => void) => void;
};

/**
 * `background=1` is deliberately absent — it force-mutes the player and makes
 * the sound toggle impossible.
 */
function embedUrl(id: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    muted: '1',
    loop: '1',
    controls: '0',
    title: '0',
    byline: '0',
    portrait: '0',
    badge: '0',
    autopause: '0',
    dnt: '1',
    player_id: '0',
  });
  return `https://player.vimeo.com/video/${id}?${params}`;
}

export function FilmFrame() {
  const [portrait, setPortrait] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<VimeoPlayer | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // The film swaps orientation at 820px — portrait crop for phones.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 819px)');
    const fit = () => setPortrait(media.matches);
    fit();
    media.addEventListener('change', fit);
    return () => media.removeEventListener('change', fit);
  }, []);

  // The iframe (and its autoplay) isn't created until this section is
  // actually scrolled into view, so every visitor's first look at it starts
  // from the beginning rather than joining a loop already in progress.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const attachPlayer = () => {
    if (playerRef.current || !frameRef.current || !window.Vimeo) return;
    const player = new window.Vimeo.Player(frameRef.current);
    playerRef.current = player;
    // Only reveal the iframe once Vimeo confirms playback actually started -
    // if it never fires (blocked network, region outage), the iframe stays
    // invisible and the poster underneath keeps showing instead of the
    // browser's broken-frame page.
    player.on?.('play', () => setReady(true));
  };

  // The iframe remounts (its key changes) when the orientation swap crosses
  // the 820px breakpoint - the old player instance and ready state belong to
  // the iframe that just unmounted. Runs before the reattach effect below so
  // that effect sees a cleared ref, not the stale player.
  useEffect(() => {
    playerRef.current = null;
    setReady(false);
  }, [portrait]);

  // The player.js script tag can finish loading before the iframe exists
  // (it isn't created until scrolled into view) - retry once it mounts.
  useEffect(() => {
    if (started) attachPlayer();
  }, [started, portrait]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);

    // Never rewrite the iframe src to change sound — that restarts playback.
    const player = playerRef.current;
    if (player) {
      void player.setMuted(!next);
      if (next) void player.setVolume(1);
      return;
    }

    // SDK not ready yet: postMessage reaches the same running player.
    try {
      frameRef.current?.contentWindow?.postMessage(
        { method: 'setMuted', value: !next },
        'https://player.vimeo.com'
      );
      if (next) {
        frameRef.current?.contentWindow?.postMessage(
          { method: 'setVolume', value: 1 },
          'https://player.vimeo.com'
        );
      }
    } catch {
      // The player will stay muted; the label reflects the attempt only.
    }
  };

  // Lets a visitor who scrolled away and back (or just wants to rewatch)
  // jump the loop back to 0:00 on demand, rather than waiting for it to
  // come back around.
  const restart = () => {
    const player = playerRef.current;
    if (player) {
      void player.setCurrentTime(0).then(() => player.play());
      return;
    }
    try {
      frameRef.current?.contentWindow?.postMessage(
        { method: 'setCurrentTime', value: 0 },
        'https://player.vimeo.com'
      );
      frameRef.current?.contentWindow?.postMessage(
        { method: 'play' },
        'https://player.vimeo.com'
      );
    } catch {
      // No running player to reach yet - nothing to restart.
    }
  };

  const videoId = portrait ? FILM.portrait : FILM.landscape;
  const poster = asset(FILM_POSTER);

  return (
    <>
      <Script
        src="https://player.vimeo.com/api/player.js"
        strategy="afterInteractive"
        onLoad={attachPlayer}
      />
      <div
        ref={wrapRef}
        className={`${styles.frame} ${portrait ? styles.framePortrait : ''}`}
      >
        {/* Backdrop only, so the frame is never empty while the film loads
            (and before it starts). */}
        <Image
          src={poster.src}
          alt=""
          fill
          sizes="(max-width: 900px) 100vw, 1180px"
          quality={90}
          style={{ objectFit: 'cover' }}
          priority
        />
        {started ? (
          <iframe
            ref={frameRef}
            key={portrait ? 'portrait' : 'landscape'}
            src={embedUrl(videoId)}
            title="The Lotus Attune Experience"
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className={ready ? styles.playerReady : styles.playerHidden}
          />
        ) : null}
        {started ? (
          <button
            type="button"
            className={styles.restart}
            onClick={restart}
            aria-label="Watch from the beginning"
          >
            Watch from start
          </button>
        ) : null}
        <button
          type="button"
          className={`${styles.sound} ${soundOn ? styles.soundOn : ''}`}
          aria-pressed={soundOn}
          onClick={toggleSound}
        >
          {soundOn ? 'Sound on' : 'Tap for sound'}
        </button>
      </div>
    </>
  );
}
