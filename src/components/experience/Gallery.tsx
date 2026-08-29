'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

import { ChevronIcon } from '@/components/common/ChevronIcon';
import { asset, type AssetName } from '@/lib/images';
import styles from './Gallery.module.css';

export type GalleryItem = {
  img: string;
  label: string;
};

type Props = {
  items: readonly GalleryItem[];
};

const SWIPE_THRESHOLD = 50;
const DRAG_TOLERANCE = 10;

export function Gallery({ items }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const drag = useRef({ startX: 0, dragging: false, moved: false, suppressClick: false });

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

  const goPrev = () => setActive((i) => (i - 1 + items.length) % items.length);
  const goNext = () => setActive((i) => (i + 1) % items.length);

  const onStagePointerDown = (e: React.PointerEvent) => {
    drag.current = { startX: e.clientX, dragging: true, moved: false, suppressClick: false };
  };
  const onStagePointerMove = (e: React.PointerEvent) => {
    if (!drag.current.dragging) return;
    if (Math.abs(e.clientX - drag.current.startX) > DRAG_TOLERANCE) {
      drag.current.moved = true;
    }
  };
  const onStagePointerUp = (e: React.PointerEvent) => {
    if (!drag.current.dragging) return;
    const dx = e.clientX - drag.current.startX;
    drag.current.dragging = false;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      drag.current.suppressClick = true;
      if (dx < 0) goNext();
      else goPrev();
    }
  };
  const onStageClick = () => {
    if (drag.current.suppressClick) {
      drag.current.suppressClick = false;
      return;
    }
    setLightbox(true);
  };
  const onStageKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setLightbox(true);
    } else if (e.key === 'ArrowLeft') {
      goPrev();
    } else if (e.key === 'ArrowRight') {
      goNext();
    }
  };

  return (
    <>
      <div className={styles.layout}>
        <div className={styles.stageCol}>
        <div
          className={styles.stage}
          role="button"
          tabIndex={0}
          aria-label={`Open ${current.label} full size`}
          onClick={onStageClick}
          onKeyDown={onStageKeyDown}
          onPointerDown={onStagePointerDown}
          onPointerMove={onStagePointerMove}
          onPointerUp={onStagePointerUp}
        >
          {items.map((item, i) => {
            const image = asset(item.img as AssetName);
            return (
              <span
                key={item.img}
                className={`${styles.slide} ${i === active ? styles.slideActive : ''}`}
              >
                <span
                  className={styles.frame}
                  style={{ aspectRatio: `${image.width} / ${image.height}` }}
                >
                  <Image
                    src={image.src}
                    alt={i === active ? item.label : ''}
                    fill
                    sizes="(max-width: 900px) 100vw, 70vw"
                    quality={90}
                    className={styles.photo}
                    draggable={false}
                  />
                  <span className={styles.caption}>{item.label}</span>
                </span>
              </span>
            );
          })}

          <button
            type="button"
            className={`${styles.navArrow} ${styles.navPrev}`}
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <ChevronIcon className={styles.navIconLeft} />
          </button>
          <button
            type="button"
            className={`${styles.navArrow} ${styles.navNext}`}
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <ChevronIcon className={styles.navIconRight} />
          </button>
        </div>

        <p className={styles.hint}>Click to view full size</p>
        </div>

        <div className={styles.railCol}>
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
      </div>

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
