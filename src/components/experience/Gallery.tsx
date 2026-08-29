'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import { asset, type AssetName } from '@/lib/images';
import styles from './Gallery.module.css';

export type GalleryItem = {
  img: string;
  label: string;
};

type Props = {
  items: readonly GalleryItem[];
};

/* The main stage is now a very short, wide box (see .stage) - most source
   photos are much closer to square, so object-fit: cover already shows
   their full width and only trims top/bottom; object-position has no
   horizontal overflow to work with, so it can't crop out unwanted edges (a
   bin, a cart, a dark sliver) or re-center on the more interesting side of
   the room. Scaling the already-cover-fitted image up creates that missing
   overflow, and transformOriginX (0-100, where the zoom "holds still" on
   the way in) then decides which side survives - higher keeps more of the
   right, lower keeps more of the left. Only affects the large stage image,
   not thumbnails. */
const STAGE_CROP: Partial<Record<string, { zoom: number; transformOriginX: number }>> = {
  'venue-signature': { zoom: 1.4, transformOriginX: 75 },
  'venue-bar': { zoom: 1.75, transformOriginX: 25 },
  'lounge-private': { zoom: 1.15, transformOriginX: 50 },
};

export function Gallery({ items }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const current = items[active];
  const currentImage = asset(current.img as AssetName);

  return (
    <>
      <div className={styles.layout}>
        <button
          type="button"
          className={styles.stage}
          aria-label={`Open ${current.label} full size`}
          onClick={() => setLightbox(true)}
        >
          {items.map((item, i) => {
            const image = asset(item.img as AssetName);
            const crop = STAGE_CROP[item.img];
            return (
              <span
                key={item.img}
                className={`${styles.slide} ${i === active ? styles.slideActive : ''}`}
              >
                <Image
                  src={image.src}
                  alt={i === active ? item.label : ''}
                  width={image.width}
                  height={image.height}
                  sizes="(max-width: 900px) 100vw, 70vw"
                  quality={90}
                  style={
                    crop
                      ? {
                          transform: `scale(${crop.zoom})`,
                          transformOrigin: `${crop.transformOriginX}% 50%`,
                        }
                      : undefined
                  }
                />
              </span>
            );
          })}
          <span className={styles.caption}>{current.label}</span>
        </button>

        <div className={styles.rail}>
          {items.map((item, i) => {
            const image = asset(item.img as AssetName);
            return (
              <button
                key={item.img}
                type="button"
                className={`${styles.thumb} ${i === active ? styles.thumbActive : ''}`}
                aria-label={item.label}
                aria-current={i === active}
                onClick={() => setActive(i)}
              >
                <Image
                  src={image.src}
                  alt=""
                  width={image.width}
                  height={image.height}
                  sizes="90px"
                />
              </button>
            );
          })}
        </div>
      </div>

      <p className={styles.hint}>Click a photo to view it full size</p>

      {lightbox ? (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label={current.label}
          onClick={() => setLightbox(false)}
        >
          <div className={styles.lightboxInner}>
            <Image
              src={currentImage.src}
              alt={current.label}
              fill
              sizes="100vw"
              quality={90}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
