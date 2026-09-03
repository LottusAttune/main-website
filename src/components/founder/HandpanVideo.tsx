'use client';

import { useState } from 'react';

import styles from './HandpanVideo.module.css';

type Props = {
  vimeoId: string;
};

/** Vimeo's own play button and progress bar default to a bright blue -
 *  off-brand next to the site's gold and cream. `color` retints Vimeo's own
 *  controls to the site's gold once playing; the cover button below hides
 *  Vimeo's thumbnail and controls entirely until then, so nothing blue or
 *  red ever shows unprompted. */
function embedUrl(id: string): string {
  const params = new URLSearchParams({
    title: '0',
    byline: '0',
    portrait: '0',
    color: 'a8875a',
    autoplay: '1',
  });
  return `https://player.vimeo.com/video/${id}?${params}`;
}

export function HandpanVideo({ vimeoId }: Props) {
  const [started, setStarted] = useState(false);

  return (
    <div className={styles.frame}>
      {started ? (
        <iframe
          src={embedUrl(vimeoId)}
          title="Silvana playing the handpan"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className={styles.cover}
          onClick={() => setStarted(true)}
          aria-label="Play video of Silvana playing the handpan"
        >
          <span className={styles.playButton}>
            <span className={styles.playIcon} />
          </span>
        </button>
      )}
    </div>
  );
}
