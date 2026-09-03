'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './HandpanVideo.module.css';

type Props = {
  vimeoId: string;
};

/** Vimeo's own play button and progress bar default to a bright blue -
 *  off-brand next to the site's gold and cream. `color` retints Vimeo's own
 *  controls to the site's gold. The thumbnail itself stays Vimeo's real one
 *  (nothing custom drawn over it) - a light blur mutes its colors until the
 *  Player SDK confirms playback has actually started, then it clears. */
function embedUrl(id: string): string {
  const params = new URLSearchParams({
    title: '0',
    byline: '0',
    portrait: '0',
    color: 'a8875a',
  });
  return `https://player.vimeo.com/video/${id}?${params}`;
}

export function HandpanVideo({ vimeoId }: Props) {
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<VimeoPlayer | null>(null);

  useEffect(() => {
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;

    const attach = () => {
      if (cancelled || playerRef.current || !frameRef.current || !window.Vimeo) {
        return false;
      }
      const player = new window.Vimeo.Player(frameRef.current);
      playerRef.current = player;
      player.on?.('play', () => setPlaying(true));
      player.on?.('pause', () => setPlaying(false));
      player.on?.('ended', () => setPlaying(false));
      return true;
    };

    // The shared player.js script (loaded once, on the page) can finish
    // loading before or after this iframe mounts - poll briefly either way.
    if (!attach()) {
      poll = setInterval(() => {
        if (attach() && poll) clearInterval(poll);
      }, 200);
    }

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
    };
  }, []);

  return (
    <div className={styles.frame}>
      <iframe
        ref={frameRef}
        src={embedUrl(vimeoId)}
        title="Silvana playing the handpan"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        className={playing ? styles.clear : styles.blurred}
      />
    </div>
  );
}
