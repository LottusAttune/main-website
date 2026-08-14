'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

import { HERO } from '@/data/content';
import { asset } from '@/lib/images';
import { SITE } from '@/lib/site';
import styles from './HomeHero.module.css';

export function HomeHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const bleedRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  // The photo drifts slower than the page; the copy lifts and fades out.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const section = sectionRef.current;
    const bleed = bleedRef.current;
    const copy = copyRef.current;
    if (!section || !bleed) return;

    let frame: number | null = null;

    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const y = window.scrollY;
        const height = section.offsetHeight || 1;
        // Stop calculating once the hero is well out of view.
        if (y > height * 1.2) return;

        const progress = Math.min(1, y / height);
        bleed.style.transform = `scale(1.14) translate3d(0, ${(progress * 16).toFixed(2)}%, 0)`;
        if (copy) {
          copy.style.transform = `translate3d(0, ${(progress * -38).toFixed(1)}px, 0)`;
          copy.style.opacity = String(Math.max(0, 1 - progress * 1.25));
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  const bleedImage = asset('somatic-main');
  const mark = asset('logo-circle');

  return (
    <section ref={sectionRef} className={styles.hero} aria-labelledby="hero-heading">
      <div ref={bleedRef} className={styles.bleed}>
        <Image
          src={bleedImage.src}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={90}
        />
      </div>
      <div className={styles.scrim} />
      <div className={styles.vignette} />

      <div ref={copyRef} className={styles.copy}>
        <Image
          src={mark.src}
          alt=""
          width={104}
          height={104}
          className={styles.mark}
          priority
        />
        <div className={styles.eyebrow}>{HERO.eyebrow}</div>
        <h1 id="hero-heading" className={styles.headline}>
          {HERO.headline}
        </h1>
        <div className={styles.rule} />
        <p className={styles.positioning}>{HERO.positioning}</p>

        <div className={`btn-row btn-row--center ${styles.actions}`}>
          <Link
            href="/book"
            className={`btn ${styles.heroBtn} ${styles.heroBtnSolid}`}
          >
            Book a session
          </Link>
          <a href="#paths" className={`btn ${styles.heroBtn} ${styles.heroBtnGhost}`}>
            See the options
          </a>
        </div>

        <div className={styles.motto}>{SITE.motto}</div>
      </div>
    </section>
  );
}
