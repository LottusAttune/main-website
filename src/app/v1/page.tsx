import Image from 'next/image';
import Link from 'next/link';

import { Accordion } from '@/components/common/Accordion';
import { LocalBusinessSchema } from '@/components/common/LocalBusinessSchema';
import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { StickyBookBar } from '@/components/chrome/StickyBookBar';
import { FilmFrame } from '@/components/home/FilmFrame';
import { HomeHero } from '@/components/home/HomeHero';
import { ReviewsCarousel } from '@/components/home/ReviewsCarousel';
import { FAQS, GUIDE, PATHS, PROBLEM, REVIEWS, TRUST } from '@/data/content';
import { asset } from '@/lib/images';
import { SITE } from '@/lib/site';
import styles from './home.module.css';

const TAG_CLASS = {
  one: 'tag--one',
  group: 'tag--group',
  corp: 'tag--corp',
} as const;

const PATH_PHOTO_POSITION: Record<string, string> = {
  'for-individuals-dof': 'center center',
  'somatic-main': 'center 35%',
  'for-teams-cropped': 'center 30%',
};

export default function HomePage() {
  const portrait = asset('silvana-hero');

  return (
    <>
      <LocalBusinessSchema />
      <SiteNav basePath="/v1" />
      <Reveal />

      <main>
        <HomeHero />

        {/* ---------- Trust bar ---------- */}
        <section className={styles.trust} aria-label="At a glance">
          <div className={styles.trustGrid}>
            {TRUST.map((item) => (
              <div key={item.label} className={styles.trustCell}>
                <div className={styles.trustFigure}>{item.figure}</div>
                <div className={styles.trustLabel}>{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Problem ---------- */}
        <section className={styles.problemSection} aria-labelledby="problem-heading">
          <div className={styles.problem} data-reveal="">
            <div className="eyebrow" style={{ fontSize: '13.5px', marginBottom: 18 }}>
              Why This Exists
            </div>
            <p id="problem-heading" className={styles.problemStatement}>
              {PROBLEM.statement}
            </p>
            <p className={`body ${styles.problemSupport}`}>{PROBLEM.support}</p>
          </div>
        </section>

        {/* ---------- Guide ---------- */}
        <section className={`${styles.guideSection} section--dark`} aria-labelledby="guide-heading">
          <div className={styles.guideGrid}>
            <div className={styles.guidePortrait} data-reveal="">
              <Image
                src={portrait.src}
                alt="Silvana, founder of Lotus Attune, with her handpan"
                fill
                sizes="(max-width: 900px) 100vw, 460px"
              />
            </div>
            <div className={styles.guideText} data-reveal="">
              <div className="eyebrow eyebrow--dark" style={{ fontSize: '13.5px', marginBottom: 18 }}>
                Your Guide
              </div>
              {/* Same words as GUIDE.quote, verbatim - broken onto 2 fixed
                  lines rather than left to wrap differently at each screen
                  width. Each pairing (performance/restoration,
                  productivity/well-being, excellence/human connection) stays
                  whole on one line. */}
              <blockquote id="guide-heading" className={styles.guideQuote}>
                ”I bridge the gap between performance and restoration,
                <br />
                productivity and well-being, and excellence and human connection”
              </blockquote>
              {GUIDE.paragraphs.map((paragraph) => (
                <p key={paragraph} className={`body body--dark ${styles.guideBody}`}>
                  {paragraph}
                </p>
              ))}
              <Link href="/v1/founder" className={`btn btn--outline-dark ${styles.guideBtn}`}>
                Meet Silvana
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- Video ---------- */}
        <section className="section" aria-labelledby="watch-heading">
          <div className="shell--prose">
            <div className={styles.centered} data-reveal="">
              <div className="eyebrow">Watch</div>
              <h2 id="watch-heading" className="display h2">
                A glimpse inside the experience
              </h2>
            </div>
            <div data-reveal="">
              <FilmFrame />
            </div>
          </div>
        </section>

        {/* ---------- Choose your path ---------- */}
        <section id="paths" className="section" aria-labelledby="paths-heading">
          <div className="shell">
            <div className={styles.centered} data-reveal="">
              <h2
                id="paths-heading"
                className={`display h2 ${styles.centeredHeading}`}
              >
                For organizations and teams, private gatherings, and individuals
              </h2>
              <p className={`body ${styles.centeredLede}`}>
                All sessions are offered in a two-hour format
              </p>
            </div>

            <div className="grid grid--cards">
              {PATHS.map((path) => {
                const photo = asset(path.img);
                return (
                  <div
                    key={path.title}
                    className={`card card--lift ${styles.pathCard}`}
                    data-reveal=""
                  >
                    <div className={styles.pathPhoto}>
                      <Image
                        src={photo.src}
                        alt=""
                        width={photo.width}
                        height={photo.height}
                        sizes="(max-width: 900px) 100vw, 33vw"
                        style={{ objectPosition: PATH_PHOTO_POSITION[path.img] }}
                      />
                    </div>
                    <div className={styles.pathBody}>
                      <div className={styles.pathTags}>
                        <span className={`tag ${TAG_CLASS[path.tone]}`}>
                          {path.tag}
                        </span>
                        <span className={styles.pathEyebrow}>{path.eyebrow}</span>
                      </div>
                      <h3 className={styles.pathTitle}>{path.title}</h3>
                      <p className={styles.pathText}>{path.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- Reviews ---------- */}
        <section className="section" aria-labelledby="reviews-heading">
          <div className="shell">
            <div className={styles.centered} data-reveal="">
              <div className="eyebrow">Client Reviews</div>
              <h2
                id="reviews-heading"
                className="display"
                style={{ fontSize: 'var(--text-h2)', lineHeight: 1.1 }}
              >
                In their words
              </h2>
            </div>
            <ReviewsCarousel reviews={REVIEWS} />
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section className="section" aria-labelledby="faq-heading">
          <div className={styles.faqGrid}>
            <div className="sticky-col" data-reveal="">
              <div className="eyebrow">Frequently Asked</div>
              <h2 id="faq-heading" className={`display ${styles.faqHeading}`}>
                Before you arrive
              </h2>
              <p className={`body ${styles.faqLede}`}>
                Everything you need is provided, and every session is fully guided
                from start to finish.
              </p>
              <div className={`card ${styles.faqCard}`}>
                <div className={styles.faqCardTitle}>Still have a question?</div>
                <p className={styles.faqCardBody}>
                  Write or call and Silvana will answer personally.
                </p>
                <div className={styles.faqCardActions}>
                  <a
                    href={`mailto:${SITE.email}`}
                    className={`btn btn--dark ${styles.faqCardBtn}`}
                  >
                    Email us
                  </a>
                  <a
                    href={SITE.phoneHref}
                    className={`btn btn--outline ${styles.faqCardBtn}`}
                  >
                    {SITE.phone}
                  </a>
                </div>
              </div>
            </div>

            <div data-reveal="">
              <Accordion
                items={FAQS.map((faq) => ({ title: faq.q, answer: faq.a }))}
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
      <StickyBookBar basePath="/v1" />
    </>
  );
}
