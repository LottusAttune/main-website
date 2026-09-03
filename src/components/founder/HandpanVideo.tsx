'use client';

import { useEffect, useRef, useState } from 'react';

import styles from './HandpanVideo.module.css';

type Props = {
  vimeoId: string;
};

/** Vimeo's own play button and progress bar default to a bright blue -
 *  off-brand next to the site's gold and cream. `color` retints Vimeo's own
 *  controls to the site's gold. The thumbnail itself stays Vimeo's real one
 *  (nothing custom drawn over it) - a desaturating filter mutes its colors
 *  toward neutral grey until the Player SDK confirms playback has actually
 *  started, then it clears. */
function embedUrl(id: string): string {
  const params = new URLSearchParams({
    title: '0',
    byline: '0',
    portrait: '0',
    color: 'a8875a',
    // Vimeo's logo badge links out to vimeo.com, where the same video
    // starts playing again in a new tab - this asks Vimeo to hide it, but
    // free Vimeo accounts can't actually suppress it this way (that's a
    // paid-plan feature on Vimeo's side, not something this parameter
    // controls for every account). The visibilitychange listener below is
    // the real fix: it can't remove the badge, but it stops this tab's
    // copy from still playing once the new one opens.
    badge: '0',
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

  // Clicking Vimeo's own logo badge opens this same video in a new tab,
  // which starts playing there too - leaving this copy running muted in
  // the background would mean two copies audible at once. Pausing this
  // one the moment the tab is no longer the visible one covers that,
  // along with a visitor just switching away for any other reason.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        void playerRef.current?.pause();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div className={styles.frame}>
      <iframe
        ref={frameRef}
        src={embedUrl(vimeoId)}
        title="Silvana playing the handpan"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        className={playing ? styles.clear : styles.muted}
      />
    </div>
  );
}
