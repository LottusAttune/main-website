'use client';

import Image from 'next/image';
import { useState } from 'react';

import styles from '@/app/v1/experience/experience.module.css';

type Props = {
  n: string;
  title: string;
  body: string;
  photoSrc: string;
  photoWidth: number;
  photoHeight: number;
  photoPosition: string;
  mirror?: boolean;
};

export function ExperienceComponentCard({
  n,
  title,
  body,
  photoSrc,
  photoWidth,
  photoHeight,
  photoPosition,
  mirror,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`card card--lift ${styles.componentCard}`} data-reveal="">
      <div className={styles.componentPhoto}>
        <Image
          src={photoSrc}
          alt=""
          width={photoWidth}
          height={photoHeight}
          sizes="(max-width: 1024px) 33vw, 20vw"
          style={{
            objectPosition: photoPosition,
            transform: mirror ? 'scaleX(-1)' : undefined,
          }}
        />
      </div>
      <div className={styles.componentCardBody}>
        <span className={styles.componentNumber}>{n}</span>
        <h2 className={styles.componentTitle}>{title}</h2>
        <button
          type="button"
          className={styles.componentToggle}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span>{open ? 'Less' : 'Details'}</span>
          <span className={`sign ${open ? 'sign--open' : ''}`} aria-hidden="true" />
        </button>
        {open ? <p className={styles.componentBody}>{body}</p> : null}
      </div>
    </div>
  );
}
