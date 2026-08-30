'use client';

import { useEffect, useRef, useState } from 'react';

import styles from '@/app/v1/founder/founder.module.css';

/** Minimal shape of the Vimeo Player SDK bits used here - see
    src/types/vimeo-player.d.ts for the shared Window.Vimeo declaration. */
type VimeoPlayer = {
  on: (event: string, handler: () => void) => void;
  play: () => Promise<void>;
};

type Props = {
  id: string;
  title: string;
};

/**
 * A plain Vimeo embed shows its own dark cover + play button before the
 * first play, but goes straight to the plain, full-colour paused frame
 * after that - there's no embed parameter to bring the cover back. This
 * draws its own neutral cover (dark scrim + play icon, matching the look
 * of Vimeo's own) and keeps it in sync with play/pause/ended via the
 * Player SDK, so every non-playing moment - not just the very first -
 * looks the same quiet, neutral way instead of showing raw thumbnail
 * colour.
 */
export function HandpanVideo({ id, title }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<VimeoPlayer | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let retry: number | undefined;

    const attach = () => {
      if (playerRef.current || !frameRef.current || !window.Vimeo) return;
      const player = new window.Vimeo.Player(frameRef.current);
      playerRef.current = player;
      player.on('play', () => setPlaying(true));
      player.on('pause', () => setPlaying(false));
      player.on('ended', () => setPlaying(false));
      if (retry) window.clearInterval(retry);
    };

    attach();
    // The player.js script tag (loaded once, in the page) may still be
    // loading when this mounts - retry until it attaches, then stop.
    if (!playerRef.current) retry = window.setInterval(attach, 200);
    return () => {
      if (retry) window.clearInterval(retry);
    };
  }, []);

  return (
    <div className={styles.videoFrame}>
      <iframe
        ref={frameRef}
        src={`https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
      />
      {!playing ? (
        <button
          type="button"
          className={styles.videoCover}
          onClick={() => playerRef.current?.play()}
          aria-label={`Play ${title}`}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="10" stroke="white" strokeWidth="1.4" />
            <path d="M9 7.5L15 11L9 14.5V7.5Z" fill="white" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
