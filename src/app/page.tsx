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
import {
  COMPONENTS,
  FAQS,
  GUIDE,
  INCLUDED_SHORT,
  JOURNEY_INTRO,
  PATHS,
  PROBLEM,
  REVIEWS,
  TRUST,
} from '@/data/content';
import { asset, assetUrl } from '@/lib/images';
import { SITE } from '@/lib/site';
import styles from './home.module.css';

const TAG_CLASS = {
  one: 'tag--one',
  group: 'tag--group',
  corp: 'tag--corp',
} as const;

export default function HomePage() {
  const portrait = asset('silvana-hero');
  const comfort = asset('comfort-items');

  return (
    <>
      <LocalBusinessSchema />
      <SiteNav />
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
        <section className="section" aria-labelledby="problem-heading">
          <div className={styles.problem} data-reveal="">
            <div className="eyebrow">Why This Exists</div>
            <p id="problem-heading" className={styles.problemStatement}>
              {PROBLEM.statement}
            </p>
            <p className={`body ${styles.problemSupport}`}>{PROBLEM.support}</p>
          </div>
        </section>

        {/* ---------- Guide ---------- */}
        <section className="section section--dark" aria-labelledby="guide-heading">
          <div className={`shell ${styles.guideGrid}`}>
            <div className={styles.guidePortrait} data-reveal="">
              <Image
                src={portrait.src}
                alt="Silvana, founder of Lotus Attune, with her handpan"
                width={portrait.width}
                height={portrait.height}
                sizes="(max-width: 900px) 100vw, 46vw"
              />
            </div>
            <div data-reveal="">
              <div className="eyebrow eyebrow--dark">Your Guide</div>
              <blockquote id="guide-heading" className={styles.guideQuote}>
                {GUIDE.quote}
              </blockquote>
              {GUIDE.paragraphs.map((paragraph) => (
                <p key={paragraph} className={`body body--dark ${styles.guideBody}`}>
                  {paragraph}
                </p>
              ))}
              <Link href="/founder" className="btn btn--outline-dark">
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

        {/* ---------- The plan ---------- */}
        <section
          className="section section--beige"
          aria-labelledby="journey-heading"
        >
          <div className="shell">
            <div className={styles.centered} data-reveal="">
              <div className="eyebrow">The Experience</div>
              <h2
                id="journey-heading"
                className={`display h2 ${styles.centeredHeading}`}
              >
                {JOURNEY_INTRO.heading}
              </h2>
              <p className={`body ${styles.centeredLede}`}>{JOURNEY_INTRO.lede}</p>
            </div>

            <div className="grid grid--tiles">
              {COMPONENTS.map((step) => (
                <div
                  key={step.n}
                  className={`card card--lift ${styles.planCard}`}
                  data-reveal=""
                >
                  <div className={styles.planTop}>
                    <span
                      className={styles.planIcon}
                      style={{ backgroundImage: assetUrl(step.icon) }}
                      aria-hidden="true"
                    />
                    <span className={styles.planNumber}>{step.n}</span>
                  </div>
                  <div className={styles.planTitle}>{step.title}</div>
                  <p className={styles.planBody}>{step.body}</p>
                </div>
              ))}
            </div>

            <div className={styles.planFooter}>
              <Link href="/experience" className="btn btn--outline">
                Read the full experience
              </Link>
            </div>
          </div>
        </section>

        {/* ---------- Choose your path ---------- */}
        <section id="paths" className="section" aria-labelledby="paths-heading">
          <div className="shell">
            <div className={styles.centered} data-reveal="">
              <div className="eyebrow">Choose Your Path</div>
              <h2
                id="paths-heading"
                className={`display h2 ${styles.centeredHeading}`}
              >
                For individuals, private gatherings, organizations and teams
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
                      <div className={styles.pathFooter}>
                        <div className={styles.pathPrice}>{path.price}</div>
                        <div className={styles.pathSubline}>{path.subline}</div>
                        <div className={styles.pathActions}>
                          <Link
                            href="/book"
                            className={`btn btn--dark ${styles.pathBook}`}
                          >
                            Book
                          </Link>
                          <Link
                            href="/offerings"
                            className={`btn btn--outline ${styles.pathDetails}`}
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- What's included ---------- */}
        <section
          className="section--tall section--beige"
          style={{ padding: 'var(--space-section-tall) var(--space-gutter)' }}
          aria-labelledby="included-heading"
        >
          <div className="shell grid grid--split">
            <div className="sticky-col" data-reveal="">
              <div className="eyebrow">What is Included</div>
              <h2
                id="included-heading"
                className={`display ${styles.includedIntro}`}
                style={{ fontSize: 'var(--text-h2-sub)', lineHeight: 1.16 }}
              >
                Two-hour transformative journey included in all offerings
              </h2>
              <p className={`body ${styles.includedLede}`}>
                Private sessions, groups and organizations. Venue rental, materials
                and refreshments are part of the package price.
              </p>
              <div className={styles.includedPhoto}>
                <Image
                  src={comfort.src}
                  alt="Branded wellness mats, pillows, blankets and eye masks"
                  width={comfort.width}
                  height={comfort.height}
                  sizes="(max-width: 900px) 100vw, 40vw"
                />
              </div>
              <Link href="/experience" className="btn btn--outline">
                See everything included
              </Link>
            </div>

            <div data-reveal="">
              {INCLUDED_SHORT.map((text, i) => (
                <div key={text} className="numbered-row">
                  <span className="numbered-row__n">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="numbered-row__text">{text}</span>
                </div>
              ))}
              <div className="rule-end" />
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

        {/* ---------- The call ---------- */}
        <section
          className="section--dark"
          style={{ padding: 'var(--space-section-tall) var(--space-gutter)' }}
          aria-labelledby="call-heading"
        >
          <div
            data-bg="1"
            className="photo-wash"
            style={{ backgroundImage: assetUrl('silvana-hero') }}
          />
          <div className={styles.call} data-reveal="">
            <div className="eyebrow eyebrow--dark">Ready When You Are</div>
            <h2 id="call-heading" className={styles.callHeading}>
              {SITE.motto}
            </h2>
            <p className={styles.callBody}>
              Create space to reset, recharge, and reconnect from within. Choose
              your date and we will confirm every detail with you personally.
            </p>
            <div className="btn-row btn-row--center">
              <Link href="/book" className="btn btn--cream btn--lg">
                Book your session
              </Link>
              <a
                href={`mailto:${SITE.email}`}
                className="btn btn--outline-dark btn--lg"
              >
                Request a call
              </a>
            </div>
            <div className={styles.callRisk}>
              <span>No obligation — we confirm every detail with you</span>
              <span className={styles.callDot}>·</span>
              <span>Free rescheduling 48 hours ahead</span>
            </div>
            <div className={styles.callContact}>
              {SITE.email} · {SITE.phone}
            </div>
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

      <StickyBookBar />
      <SiteFooter />
    </>
  );
}
