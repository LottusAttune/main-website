import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { Accordion } from '@/components/common/Accordion';
import { Reveal } from '@/components/common/Reveal';
import { StickyBookBar } from '@/components/chrome/StickyBookBar';
import { GUIDE } from '@/data/content';
import {
  ASSURANCE_LINE,
  AUDIENCES,
  LANDING_COMPONENTS,
  LANDING_FAQS,
  LANDING_INCLUDED,
  LANDING_OFFERS,
  LANDING_REVIEWS,
  LANDING_STEPS,
  type AudienceKey,
} from '@/data/landing';
import { asset, assetUrl } from '@/lib/images';
import { SITE, SOCIAL } from '@/lib/site';
import styles from './lp.module.css';

/** Ad traffic only — never index this page or let it compete with `/`. */
export const metadata: Metadata = {
  title: 'Two hours that give you your calm back',
  robots: { index: false, follow: false },
};

const TAG_CLASS = {
  one: 'tag--one',
  group: 'tag--group',
  corp: 'tag--corp',
} as const;

const TRUST = [
  { figure: '15+', label: 'Years in HR' },
  { figure: '2 hrs', label: 'Fully guided' },
  { figure: '1–24', label: 'Participants' },
  { figure: 'Toronto', label: 'Premium venue' },
];

function resolveAudience(value: string | undefined): AudienceKey {
  const key = value?.toLowerCase();
  if (key === 'individuals' || key === 'corporate') return key;
  return 'everyone';
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ aud?: string }>;
}) {
  const params = await searchParams;
  const audience = AUDIENCES[resolveAudience(params.aud)];

  const hero = asset('somatic-main');
  const portrait = asset('silvana-hero');
  const mark = asset('logo-circle');

  // The offer cards are ordered — and filtered — by who the ad is targeting.
  const offers = audience.order
    .map((tone) => LANDING_OFFERS.find((offer) => offer.tone === tone))
    .filter((offer): offer is (typeof LANDING_OFFERS)[number] => Boolean(offer));

  return (
    <div className={styles.page}>
      <Reveal />

      <header className={styles.bar}>
        <span className={styles.barBrand}>
          <Image
            src={mark.src}
            alt=""
            width={44}
            height={44}
            className={styles.barMark}
            priority
          />
          <span className={styles.barWord}>LOTUS ATTUNE</span>
        </span>
        <Link href="/book" className={`btn btn--dark ${styles.barCta}`}>
          Book
        </Link>
      </header>

      <main>
        {/* ---------- Hero ---------- */}
        <section className={styles.hero} aria-labelledby="lp-heading">
          <div className={styles.heroBleed}>
            <Image
              src={hero.src}
              alt=""
              fill
              priority
              sizes="(max-width: 1100px) 200vw, 120vw"
              quality={90}
            />
          </div>
          <div className={styles.heroScrim} />
          <div className={styles.heroCopy}>
            <div className={styles.heroEyebrow}>{audience.eyebrow}</div>
            <h1 id="lp-heading" className={styles.heroTitle}>
              {audience.title}
            </h1>
            <p className={styles.heroSub}>{audience.sub}</p>
            <div className={styles.heroActions}>
              <Link href="/book" className={`btn btn--cream ${styles.heroBtn}`}>
                Book a session
              </Link>
              <a href="#offers" className={`btn btn--outline-dark ${styles.heroBtn}`}>
                See the options
              </a>
            </div>
            <div className={styles.heroAssurance}>{ASSURANCE_LINE}</div>
          </div>
        </section>

        {/* ---------- Proof strip ---------- */}
        <section className={styles.proof} aria-label="At a glance">
          <div className={styles.proofGrid}>
            {TRUST.map((item) => (
              <div key={item.label} className={styles.proofCell}>
                <div className={styles.proofFigure}>{item.figure}</div>
                <div className={styles.proofLabel}>{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Problem ---------- */}
        <section className={styles.section} aria-labelledby="lp-problem">
          <div className={styles.head} data-reveal="">
            <div className="eyebrow" style={{ marginBottom: 22 }}>
              {audience.problemEyebrow}
            </div>
            <h2 id="lp-problem" className={`display ${styles.heading}`}>
              Rest that never quite arrives
            </h2>
          </div>
          <div className={styles.painGrid}>
            {audience.pains.map((pain) => (
              <div
                key={pain}
                className={`card ${styles.painCard}`}
                data-reveal=""
              >
                {pain}
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Guide ---------- */}
        <section
          className={`${styles.section} section--dark`}
          aria-labelledby="lp-guide"
        >
          <div className={styles.guide}>
            <div className={styles.guidePortrait} data-reveal="">
              <Image
                src={portrait.src}
                alt="Silvana, founder of Lotus Attune"
                width={portrait.width}
                height={portrait.height}
                sizes="(max-width: 900px) 100vw, 45vw"
              />
            </div>
            <div data-reveal="">
              <div className="eyebrow eyebrow--dark" style={{ marginBottom: 24 }}>
                Your Guide
              </div>
              <blockquote id="lp-guide" className={styles.guideQuote}>
                {GUIDE.quote}
              </blockquote>
              <p className="body body--dark">{GUIDE.paragraphs[0]}</p>
            </div>
          </div>
        </section>

        {/* ---------- Three-step plan ---------- */}
        <section className={styles.section} aria-labelledby="lp-plan">
          <div className={styles.head} data-reveal="">
            <div className="eyebrow" style={{ marginBottom: 22 }}>
              How it works
            </div>
            <h2 id="lp-plan" className={`display ${styles.heading}`}>
              Three steps to your reset
            </h2>
          </div>
          <div className={styles.planGrid}>
            {LANDING_STEPS.map((step) => (
              <div
                key={step.n}
                className={`card card--lift ${styles.planCard}`}
                data-reveal=""
              >
                <div className={styles.planN}>{step.n}</div>
                <h3 className={styles.planTitle}>{step.title}</h3>
                <p className={styles.planBody}>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Five components ---------- */}
        <section
          className={`${styles.section} section--beige`}
          aria-labelledby="lp-components"
        >
          <div className={styles.head} data-reveal="">
            <div className="eyebrow" style={{ marginBottom: 22 }}>
              Inside the two hours
            </div>
            <h2 id="lp-components" className={`display ${styles.heading}`}>
              Five components, one seamless journey
            </h2>
          </div>
          {LANDING_COMPONENTS.map((step) => (
            <div key={step.title} className={styles.componentRow} data-reveal="">
              <span
                className={styles.componentIcon}
                style={{ backgroundImage: assetUrl(step.icon) }}
                aria-hidden="true"
              />
              <h3 className={styles.componentTitle}>{step.title}</h3>
              <p className={styles.componentBody}>{step.body}</p>
            </div>
          ))}
        </section>

        {/* ---------- Included ---------- */}
        <section className={styles.section} aria-labelledby="lp-included">
          <div className={styles.head} data-reveal="">
            <div className="eyebrow" style={{ marginBottom: 22 }}>
              What is Included
            </div>
            <h2 id="lp-included" className={`display ${styles.heading}`}>
              Everything is provided
            </h2>
          </div>
          <div className={styles.includedList}>
            {LANDING_INCLUDED.map((text, i) => (
              <div key={text} className="numbered-row">
                <span className="numbered-row__n">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="numbered-row__text">{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Reviews ---------- */}
        <section
          className={`${styles.section} section--beige`}
          aria-labelledby="lp-reviews"
        >
          <div className={styles.head} data-reveal="">
            <div className="eyebrow" style={{ marginBottom: 22 }}>
              Client Reviews
            </div>
            <h2 id="lp-reviews" className={`display ${styles.heading}`}>
              In their words
            </h2>
          </div>
          <div className={styles.reviewGrid}>
            {LANDING_REVIEWS.map((review) => {
              const face = review.face ? asset(review.face) : null;
              return (
                <figure
                  key={review.name}
                  className={`card ${styles.reviewCard}`}
                  data-reveal=""
                >
                  <div className={styles.reviewQuote} aria-hidden="true">
                    ”
                  </div>
                  <blockquote className={styles.reviewText}>
                    {review.text}
                  </blockquote>
                  <figcaption className={styles.reviewCaption}>
                    <span className={styles.avatar}>
                      {face ? (
                        <Image src={face.src} alt="" width={46} height={46} />
                      ) : (
                        review.name.charAt(0)
                      )}
                    </span>
                    <span>
                      <span className={styles.reviewName}>{review.name}</span>
                      <span className={styles.reviewMeta}>{review.meta}</span>
                    </span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>

        {/* ---------- Offers ---------- */}
        <section id="offers" className={styles.section} aria-labelledby="lp-offers">
          <div className={styles.head} data-reveal="">
            <div className="eyebrow" style={{ marginBottom: 22 }}>
              Choose your session
            </div>
            <h2 id="lp-offers" className={`display ${styles.heading}`}>
              {audience.offersTitle}
            </h2>
          </div>
          <div className={styles.offerGrid}>
            {offers.map((offer) => (
              <div
                key={offer.tone}
                className={`card card--lift ${styles.offerCard}`}
                data-reveal=""
              >
                <div>
                  <span className={`tag ${TAG_CLASS[offer.tone]}`}>
                    {offer.tag}
                  </span>
                </div>
                <h3 className={styles.offerTitle}>{offer.title}</h3>
                <p className={styles.offerBody}>{offer.body}</p>
                <div className={styles.offerPrice}>
                  {offer.price}{' '}
                  <span className={styles.offerUnit}>{offer.unit}</span>
                </div>
                <div className={styles.offerNote}>{offer.note}</div>
                <Link href="/book" className={`btn btn--dark ${styles.offerBtn}`}>
                  Book
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section
          className={`${styles.section} section--beige`}
          aria-labelledby="lp-faq"
        >
          <div className={styles.head} data-reveal="">
            <div className="eyebrow" style={{ marginBottom: 22 }}>
              Frequently Asked
            </div>
            <h2 id="lp-faq" className={`display ${styles.heading}`}>
              Before you arrive
            </h2>
          </div>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <Accordion
              items={LANDING_FAQS.map((faq) => ({ title: faq.q, answer: faq.a }))}
            />
          </div>
        </section>

        {/* ---------- Closer ---------- */}
        <section
          className={`${styles.section} section--dark ${styles.closer}`}
          aria-labelledby="lp-closer"
        >
          <div className="eyebrow eyebrow--dark" style={{ marginBottom: 24 }}>
            Ready when you are
          </div>
          <h2
            id="lp-closer"
            className="display"
            style={{
              fontSize: 'clamp(30px, 4vw, 58px)',
              lineHeight: 1.1,
              margin: '0 0 28px',
              color: 'var(--color-cream-text)',
            }}
          >
            {SITE.motto}
          </h2>
          <div className={styles.closerActions}>
            <Link href="/book" className={`btn btn--cream ${styles.closerBtn}`}>
              Book your session
            </Link>
            <a
              href={SITE.phoneHref}
              className={`btn btn--outline-dark ${styles.closerBtn}`}
            >
              Call {SITE.phone}
            </a>
          </div>
        </section>
      </main>

      <StickyBookBar />

      <footer className={styles.footer}>
        <div className={styles.social}>
          {SOCIAL.map((s) => (
            <a
              key={s.label}
              href={s.href}
              className={`btn btn--outline-dark ${styles.socialPill}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              {s.label}
            </a>
          ))}
        </div>
        <div className={styles.copyright}>
          © {new Date().getFullYear()} {SITE.name} · {SITE.tagline} · {SITE.area}
        </div>
      </footer>
    </div>
  );
}
