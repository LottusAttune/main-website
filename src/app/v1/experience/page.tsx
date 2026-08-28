import type { Metadata } from 'next';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { StickyBookBar } from '@/components/chrome/StickyBookBar';
import { BenefitsSplit } from '@/components/experience/BenefitsSplit';
import { ExperienceComponentsGrid } from '@/components/experience/ExperienceComponentsGrid';
import { Gallery } from '@/components/experience/Gallery';
import {
  BENEFITS_INDIVIDUAL,
  BENEFITS_TEAMS,
  COMPONENTS,
  GALLERY,
  INCLUDED_FULL,
  JOURNEY_INTRO,
} from '@/data/content';
import { asset } from '@/lib/images';
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
  '05': { name: 'photo-reintegration-alt2', position: 'center 45%', mirror: true },
} as const;

export default function ExperiencePage() {

  return (
    <>
      <SiteNav basePath="/v1" />
      <Reveal />

      <main>
        {/* ---------- Intro ---------- */}
        <section className={styles.intro} aria-labelledby="experience-heading">
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
          <ExperienceComponentsGrid
            cards={COMPONENTS.map((step) => {
              const stepPhoto = STEP_PHOTOS[step.n];
              const photo = asset(stepPhoto.name);
              return {
                n: step.n,
                title: step.title,
                body: step.body,
                photoSrc: photo.src,
                photoWidth: photo.width,
                photoHeight: photo.height,
                photoPosition: stepPhoto.position,
                mirror: 'mirror' in stepPhoto,
              };
            })}
          />
        </section>

        {/* ---------- Benefits ---------- */}
        <section
          className={`section--soft ${styles.benefitsSection}`}
          aria-label="Benefits"
        >
          <div className={`shell ${styles.benefitsShell}`}>
            <h2 className={`display ${styles.benefitsHeading}`}>Benefits</h2>
          </div>

          <div className="shell">
            <BenefitsSplit teams={BENEFITS_TEAMS} individual={BENEFITS_INDIVIDUAL} />
          </div>
        </section>

        {/* ---------- Gallery ---------- */}
        <section
          id="included"
          className={styles.galleryBlock}
          aria-labelledby="gallery-heading"
        >
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
      </main>

      <SiteFooter />
      <StickyBookBar basePath="/v1" />
    </>
  );
}
