'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import styles from './ArtisticRecognition.module.css';

type Props = {
  event: string;
  quote: string;
  attribution: string;
  /** The certificate photo, once it has been through the image pipeline. */
  image?: { src: string; width: number; height: number; alt: string };
};

/**
 * Body of the Founder page's "Artistic Recognition" section: the event, the
 * quote and who said it, and a small thumbnail of the certificate that opens
 * full size when clicked (Esc or a click outside closes it).
 */
export function ArtisticRecognition({ event, quote, attribution, image }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={styles.wrap}>
      <div className={styles.text}>
        <p className={styles.event}>{event}</p>
        <blockquote className={styles.quote}>“{quote}”</blockquote>
        <p className={styles.attribution}>— {attribution}</p>
      </div>

      {image ? (
        <button
          type="button"
          className={styles.thumb}
          onClick={() => setOpen(true)}
          aria-label={`${image.alt} (open larger)`}
        >
          <Image src={image.src} alt={image.alt} width={image.width} height={image.height} sizes="160px" />
        </button>
      ) : null}

      {image && open ? (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label={image.alt}
          onClick={() => setOpen(false)}
        >
          <div className={styles.full} onClick={(e) => e.stopPropagation()}>
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(max-width: 900px) 94vw, 860px"
            />
            <p className={styles.hint}>Click outside or press Esc to close</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
