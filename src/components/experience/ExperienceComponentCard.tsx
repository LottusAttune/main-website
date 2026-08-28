'use client';

import Image from 'next/image';

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
  open: boolean;
  onToggle: () => void;
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
  open,
  onToggle,
}: Props) {
  return (
    <div
      className={`card ${styles.componentCard}`}
      data-reveal=""
      onMouseLeave={() => {
        if (open) onToggle();
      }}
    >
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
        <div className={styles.componentHead}>
          <span className={styles.componentNumber}>{n}</span>
          <h2 className={styles.componentTitle}>{title}</h2>
        </div>
        {/* Fixed-height reserved area (see .componentDetails) - every card
            stays exactly the same size whether its details are open or
            closed, instead of the row growing/shifting per card. */}
        <div className={styles.componentDetails}>
          <button
            type="button"
            className={styles.componentToggle}
            onClick={onToggle}
            aria-expanded={open}
          >
            <span>{open ? 'Less' : 'Details'}</span>
            <span className={`sign ${open ? 'sign--open' : ''}`} aria-hidden="true" />
          </button>
          <p className={`${styles.componentBody} ${open ? styles.componentBodyOpen : ''}`}>
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}
