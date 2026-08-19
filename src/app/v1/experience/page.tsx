import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { StickyBookBar } from '@/components/chrome/StickyBookBar';
import { Gallery } from '@/components/experience/Gallery';
import {
  BENEFITS_INDIVIDUAL,
  BENEFITS_TEAMS,
  COMPONENTS,
  GALLERY,
  INCLUDED_FULL,
  JOURNEY_INTRO,
} from '@/data/content';
import { asset, assetUrl } from '@/lib/images';
import { SITE } from '@/lib/site';
import styles from './experience.module.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'The Experience (v1)',
  description:
    'A two-hour guided journey combining neuroscience education, intention setting, somatic and mindfulness practice, immersive live sound, and reintegration.',
};

const STEP_PHOTOS = {
  '01': { name: 'photo-education', position: 'center 20%' },
  '02': { name: 'photo-intention', position: 'center 55%' },
  '03': { name: 'journey-intention', position: 'center 18%' },
  '04': { name: 'crystal-bowls-sil', position: 'center 74%' },
  '05': { name: 'photo-reintegration-alt2', position: 'center 45%' },
} as const;

export default function ExperiencePage() {

  return (
    <>
      <SiteNav basePath="/v1" />
      <Reveal />

      <main>
        {/* ---------- Intro ---------- */}
        <section className={styles.intro} aria-labelledby="experience-heading">
          <div className={`eyebrow ${styles.introEyebrow}`}>The Experience</div>
          <h1
            id="experience-heading"
            className={`display h1 ${styles.title}`}
          >
            {JOURNEY_INTRO.heading}
          </h1>
          <div className={styles.subtitle}>{JOURNEY_INTRO.subtitle}</div>
          <div className={styles.introGrid}>
            <p className="body">{JOURNEY_INTRO.longIntro}</p>
            <p className="body">{JOURNEY_INTRO.lede}</p>
          </div>
        </section>

        {/* ---------- Five components ---------- */}
        <section className={styles.block} aria-label="The five components">
          <div className={styles.componentGrid}>
            {COMPONENTS.map((step) => {
              const photo = asset(STEP_PHOTOS[step.n].name);
              return (
                <div
                  key={step.n}
                  className={`card card--lift ${styles.componentCard}`}
                  data-reveal=""
                >
                  <div className={styles.componentPhoto}>
                    <Image
                      src={photo.src}
                      alt=""
                      width={photo.width}
                      height={photo.height}
                      sizes="(max-width: 1024px) 33vw, 20vw"
                      style={{ objectPosition: STEP_PHOTOS[step.n].position }}
                    />
                  </div>
                  <div className={styles.componentCardBody}>
                    <span className={styles.componentNumber}>{step.n}</span>
                    <h2 className={styles.componentTitle}>{step.title}</h2>
                    <p className={styles.componentBody}>{step.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- Benefits for individuals ---------- */}
        <section className={styles.block} aria-labelledby="individuals-heading">
          <div className={styles.sectionHead}>
            <div style={{ minWidth: 0 }}>
              <span className={`tag tag--one ${styles.benefitTag}`}>
                1 : 1 &nbsp;·&nbsp; Private Group
              </span>
              <h2
                id="individuals-heading"
                className={`display ${styles.sectionHeadTitle}`}
              >
                Benefits for individuals
              </h2>
            </div>
            <p className={styles.sectionHeadNote}>
              Create space to reset, recharge, and reconnect from within
            </p>
          </div>

          <div className="grid grid--photos">
            {BENEFITS_INDIVIDUAL.map((benefit) => {
              const photo = asset(benefit.img);
              return (
                <figure
                  key={benefit.text}
                  className={`card card--lift ${styles.benefitCard}`}
                  data-reveal=""
                >
                  <div className={styles.benefitPhoto}>
                    <Image
                      src={photo.src}
                      alt=""
                      width={photo.width}
                      height={photo.height}
                      sizes="(max-width: 900px) 100vw, 25vw"
                    />
                  </div>
                  <figcaption className={styles.benefitCaption}>
                    {benefit.text}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>

        {/* ---------- Teams & organizations ---------- */}
        <section
          className="section--short section--dark"
          style={{ padding: 'var(--space-section-short) var(--space-gutter)' }}
          aria-labelledby="teams-heading"
        >
          <div
            data-bg="1"
            className="photo-wash"
            style={{ backgroundImage: assetUrl('venue-bar'), opacity: 0.06 }}
          />
          <div className="shell" style={{ position: 'relative' }}>
            <div className={`${styles.sectionHead} ${styles.sectionHeadDark}`}>
              <div style={{ minWidth: 0 }}>
                <span
                  className={`tag ${styles.benefitTag}`}
                  style={{
                    background: 'rgba(198,169,122,0.3)',
                    color: '#F0E2CA',
                  }}
                >
                  Corporate
                </span>
                <h2
                  id="teams-heading"
                  className={`display ${styles.sectionHeadTitle}`}
                  style={{ color: 'var(--color-cream-text)' }}
                >
                  Teams &amp; Organizations
                </h2>
              </div>
              <p
                className={`${styles.sectionHeadNote} ${styles.sectionHeadNoteDark}`}
              >
                Elevate your company culture through a new generation of team
                building where wellness and connection come together
              </p>
            </div>

            <div className="grid grid--photos">
              {BENEFITS_TEAMS.map((benefit) => {
                const photo = asset(benefit.img);
                return (
                  <figure
                    key={benefit.text}
                    className={`card card--dark card--lift ${styles.benefitCard}`}
                    data-reveal=""
                  >
                    <div className={styles.benefitPhoto}>
                      <Image
                        src={photo.src}
                        alt=""
                        width={photo.width}
                        height={photo.height}
                        sizes="(max-width: 900px) 100vw, 25vw"
                      />
                    </div>
                    <figcaption
                      className={`${styles.benefitCaption} ${styles.benefitCaptionDark}`}
                    >
                      {benefit.text}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- Gallery ---------- */}
        <section className={styles.galleryBlock} aria-labelledby="gallery-heading">
          <div className={styles.galleryHead}>
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow" style={{ marginBottom: 22 }}>
                What is Included
              </div>
              <h2
                id="gallery-heading"
                className={`display ${styles.galleryHeading}`}
              >
                Two-hour transformative journey included in all offerings
              </h2>
            </div>
            <p className={styles.sectionHeadNote} style={{ maxWidth: 380 }}>
              Private sessions, groups and organizations. Venue rental,
              materials and refreshments are part of the package price.
            </p>
          </div>

          <Gallery items={GALLERY} />
        </section>

        {/* ---------- Included list ---------- */}
        <section
          style={{
            padding: '0 var(--space-gutter) var(--space-section)',
            maxWidth: 'var(--width-content)',
            margin: '0 auto',
          }}
          aria-label="Everything included"
        >
          {INCLUDED_FULL.map((text, i) => (
            <div key={text} className="numbered-row">
              <span className="numbered-row__n">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="numbered-row__text">{text}</span>
            </div>
          ))}
          <div className="rule-end" />
        </section>

        {/* ---------- Closer ---------- */}
        <section
          className={`section section--dark ${styles.closer}`}
          aria-labelledby="experience-closer"
        >
          <div className={styles.closerInner}>
            <h2 id="experience-closer" className={styles.closerHeading}>
              {SITE.motto}
            </h2>
            <p className={styles.closerBody}>
              Sessions are offered in a two-hour format for individuals, private
              gatherings, organizations and teams.
            </p>
            <div className="btn-row btn-row--center">
              <Link href="/book" className="btn btn--cream">
                Book a session
              </Link>
              <Link href="/v1/offerings" className="btn btn--outline-dark">
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <StickyBookBar />
      <SiteFooter basePath="/v1" />
    </>
  );
}
