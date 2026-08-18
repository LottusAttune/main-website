'use client';

import Image from 'next/image';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

import { FILM, FILM_POSTER } from '@/data/content';
import { asset } from '@/lib/images';
import styles from './FilmFrame.module.css';

/** Minimal shape of the bits of the Vimeo Player SDK we use. */
type VimeoPlayer = {
  setMuted: (muted: boolean) => Promise<boolean>;
  setVolume: (volume: number) => Promise<number>;
};

declare global {
  interface Window {
    Vimeo?: { Player: new (el: HTMLIFrameElement) => VimeoPlayer };
  }
}

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
  const frameRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<VimeoPlayer | null>(null);

  // The film swaps orientation at 820px — portrait crop for phones.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 819px)');
    const fit = () => setPortrait(media.matches);
    fit();
    media.addEventListener('change', fit);
    return () => media.removeEventListener('change', fit);
  }, []);

  const attachPlayer = () => {
    if (playerRef.current || !frameRef.current || !window.Vimeo) return;
    playerRef.current = new window.Vimeo.Player(frameRef.current);
  };

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

  const videoId = portrait ? FILM.portrait : FILM.landscape;

  // No film configured — show one of her photographs rather than embedding a
  // dead id, which renders a browser "broken file" icon to every visitor.
  if (!videoId) {
    const poster = asset(FILM_POSTER);
    return (
      <div className={`${styles.frame} ${portrait ? styles.framePortrait : ''}`}>
        <Image
          src={poster.src}
          alt="A Lotus Attune session in progress"
          fill
          sizes="(max-width: 900px) 100vw, 1180px"
          quality={90}
          style={{ objectFit: 'cover' }}
        />
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://player.vimeo.com/api/player.js"
        strategy="lazyOnload"
        onLoad={attachPlayer}
      />
      <div
        className={`${styles.frame} ${portrait ? styles.framePortrait : ''}`}
      >
        <iframe
          ref={frameRef}
          key={portrait ? 'portrait' : 'landscape'}
          src={embedUrl(videoId)}
          title="The Lotus Attune Experience"
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
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
