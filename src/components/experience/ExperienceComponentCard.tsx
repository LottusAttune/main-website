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
  onOpen: () => void;
};

export function ExperienceComponentCard({
  n,
  title,
  photoSrc,
  photoWidth,
  photoHeight,
  photoPosition,
  mirror,
  open,
  onOpen,
}: Props) {
  return (
    <div className={`card ${styles.componentCard}`} data-reveal="">
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
        <button
          type="button"
          className={styles.componentToggle}
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span>Details</span>
          <span className="sign" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
