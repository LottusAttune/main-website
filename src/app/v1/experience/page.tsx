import type { Metadata } from 'next';
import Image from 'next/image';

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
              const stepPhoto = STEP_PHOTOS[step.n];
              const photo = asset(stepPhoto.name);
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
                      style={{
                        objectPosition: stepPhoto.position,
                        transform: 'mirror' in stepPhoto ? 'scaleX(-1)' : undefined,
                      }}
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

        {/* ---------- Benefits ---------- */}
        <section
          className={`section section--beige ${styles.benefitsSection}`}
          aria-label="Benefits"
        >
          <div className={`shell ${styles.benefitsShell}`}>
            <h2 className={`display ${styles.benefitsHeading}`}>Benefits</h2>

            <div className={styles.benefitsGroup}>
              <div className={styles.sectionHead}>
                <div style={{ minWidth: 0 }}>
                  <span className={`tag ${styles.benefitTag}`}>
                    1 : 1 &nbsp;·&nbsp; Private Groups
                  </span>
                  <h3
                    id="individuals-heading"
                    className={`display ${styles.sectionHeadTitle}`}
                  >
                    For Individuals
                  </h3>
                </div>
                <p className={styles.sectionHeadNote}>
                  Create space to reset, recharge, and reconnect from within
                </p>
              </div>

              <div className={styles.columns}>
                {BENEFITS_INDIVIDUAL.items.map((item) => (
                  <div key={item.title} className={styles.column} data-reveal="">
                    <h3 className={styles.columnTitle}>{item.title}</h3>
                    <p className={styles.columnBody}>{item.body}</p>
                  </div>
                ))}
              </div>
              <p className={styles.benefitsNote}>{BENEFITS_INDIVIDUAL.note}</p>
            </div>

            <div className={styles.benefitsDivider} />

            <div className={styles.benefitsGroup}>
              <div className={styles.sectionHead}>
                <div style={{ minWidth: 0 }}>
                  <span className={`tag ${styles.benefitTag}`}>
                    Corporate
                  </span>
                  <h3
                    id="teams-heading"
                    className={`display ${styles.sectionHeadTitle}`}
                  >
                    For Teams &amp; Organizations
                  </h3>
                </div>
                <p className={styles.sectionHeadNote}>
                  Elevate your company culture through a new generation of
                  team building where wellness and connection come together
                </p>
              </div>

              <div className={styles.columns}>
                {BENEFITS_TEAMS.items.map((item) => (
                  <div key={item.title} className={styles.column} data-reveal="">
                    <h3 className={styles.columnTitle}>{item.title}</h3>
                    <p className={styles.columnBody}>{item.body}</p>
                  </div>
                ))}
              </div>
              <p className={styles.benefitsNote}>{BENEFITS_TEAMS.note}</p>
            </div>
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
