import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { Accordion } from '@/components/common/Accordion';
import { ReviewsCarousel } from '@/components/home/ReviewsCarousel';
import { ExpandableNote } from '@/components/chrome/ExpandableNote';
import { InstagramIcon, LinkedInIcon, MailIcon, WhatsAppIcon } from '@/components/chrome/FooterIcons';
import { StickyBookBar } from '@/components/chrome/StickyBookBar';
import { LandingReturnTracker } from '@/components/landing/LandingReturnTracker';
import { GUIDE, REVIEWS, VENUE_COPY } from '@/data/content';
import {
  ASSURANCE_LINE,
  AUDIENCES,
  LANDING_COMPONENTS,
  LANDING_FAQS,
  LANDING_INCLUDED,
  LANDING_OFFERS,
  LANDING_PATHS,
  LANDING_STEPS,
  LANDING_TRUST,
  type AudienceKey,
} from '@/data/landing';
import { asset, assetUrl } from '@/lib/images';
import { getSettings } from '@/lib/settings';
import { SITE, SOCIAL } from '@/lib/site';
import styles from './book-now.module.css';

const SOCIAL_ICONS = {
  LinkedIn: LinkedInIcon,
  Instagram: InstagramIcon,
  WhatsApp: WhatsAppIcon,
  Email: MailIcon,
};

/** Ad traffic only — never index this page or let it compete with `/`. */
export const metadata: Metadata = {
  // Browser tab text (the site adds "— Lotus Attune"). These pages are kept
  // out of Google, so this is for the tab and bookmarks, not search.
  title: 'Two-Hour Sound Bath, Toronto',
  robots: { index: false, follow: false },
};

const TAG_CLASS = {
  one: 'tag--one',
  group: 'tag--group',
  corp: 'tag--corp',
} as const;

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
  const audienceKey = resolveAudience(params.aud);
  const audience = AUDIENCES[audienceKey];
  // Every link to the booking pages carries the version it came from, so
  // those pages can show a "Back" link to this exact page.
  const from = `?from=${audienceKey}`;
  // LinkedIn ads lead with LinkedIn under "Get social"; Instagram ads with Instagram.
  const socialOrder =
    audienceKey === 'corporate' ? ['LinkedIn', 'Instagram'] : ['Instagram', 'LinkedIn'];
  const { leadTimeDays } = await getSettings();

  const hero = asset('somatic-main');
  const portrait = asset('silvana-hero');
  const mark = asset('logo-circle');

  // The offer cards are ordered — and filtered — by who the ad is targeting.
  const offers = audience.order
    .map((tone) => LANDING_OFFERS.find((offer) => offer.tone === tone))
    .filter((offer): offer is (typeof LANDING_OFFERS)[number] => Boolean(offer));

  return (
    <div className={styles.page}>

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
        <Link href={`/book${from}`} className={`btn btn--dark ${styles.barCta}`}>
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
            {/* "Downtown Toronto · 1 to 25 people": one line on wider screens;
                on phones the two halves sit on their own lines instead of
                wrapping mid-phrase. */}
            <div className={styles.heroEyebrow}>
              {audience.eyebrow.split(' · ').map((part, i) => (
                <span key={part} className={styles.heroEyebrowPart}>
                  {i > 0 && <span className={styles.heroEyebrowDot}> · </span>}
                  {part}
                </span>
              ))}
            </div>
            <h1 id="lp-heading" className={styles.heroTitle}>
              {audience.title}
            </h1>
            <p className={styles.heroSub}>{audience.sub}</p>
            <div className={styles.heroActions}>
              <Link href={`/book${from}`} className={`btn btn--cream ${styles.heroBtn}`}>
                Book a session
              </Link>
              <a href="#offers" className={`btn btn--outline-dark ${styles.heroBtn}`}>
                See the options
              </a>
            </div>
            {/* Each phrase stays whole, so a narrow screen breaks the line
                between phrases ("Fully guided" never splits in two). */}
            <div className={styles.heroAssurance}>
              {ASSURANCE_LINE.split(' · ').map((part, i, all) => (
                <span key={part}>
                  <span className={styles.nowrap}>
                    {part}
                    {i < all.length - 1 && ' ·'}
                  </span>
                  {i < all.length - 1 && ' '}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Proof strip ---------- */}
        <section className={styles.proof} aria-label="At a glance">
          <div className={styles.proofGrid}>
            {LANDING_TRUST.map((item) => (
              <div key={item.label} className={styles.proofCell}>
                <div className={styles.proofFigure}>{item.figure}</div>
                <div className={styles.proofLabel}>{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Problem ---------- */}
        <section className={styles.section} aria-labelledby="lp-problem">
          <div className={styles.head}>
            <div className="eyebrow" style={{ marginBottom: 22 }}>
              {audience.problemEyebrow}
            </div>
            <h2 id="lp-problem" className={`display ${styles.heading}`}>
              {audience.problemTitle}
            </h2>
          </div>
          <div className={`${styles.painGrid} ${audience.pains.length === 4 ? styles.painGridFour : ''}`}>
            {audience.pains.map((pain, i) => (
              <div
                key={pain}
                className={`card ${styles.painCard}`}
                style={{ ['--pain-i' as string]: i }}
              >
                <span className={styles.painGlow} aria-hidden="true" />
                <span className={styles.painText}>{pain}</span>
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
            <div className={styles.guidePortrait}>
              <Image
                src={portrait.src}
                alt="Silvana, founder of Lotus Attune"
                width={portrait.width}
                height={portrait.height}
                sizes="(max-width: 900px) 100vw, 45vw"
              />
            </div>
            <div>
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
          <div className={styles.head}>
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
              >
                <div className={styles.planN}>{step.n}</div>
                <h3 className={styles.planTitle}>{step.title}</h3>
                <p className={styles.planBody}>{step.body
                    .replace('{stepOne}', audience.stepOne)
                    .replace('{lead}', String(leadTimeDays))}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Five components ---------- */}
        <section
          className={`${styles.section} section--beige`}
          aria-labelledby="lp-components"
        >
          <div className={styles.head}>
            <div className="eyebrow" style={{ marginBottom: 22 }}>
              Inside the two hours
            </div>
            <h2 id="lp-components" className={`display ${styles.heading}`}>
              Five components, one seamless journey
            </h2>
          </div>
          {LANDING_COMPONENTS.map((step) => (
            <div key={step.title} className={styles.componentRow}>
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
        <section className={`${styles.section} ${styles.washSection}`} aria-labelledby="lp-included">
          {/* A barely-there photo of the comfort items behind the list,
              drifting very slowly - the same ghost-photo treatment the
              main website uses. */}
          <div
            className={`photo-wash photo-wash--light ${styles.includedWash}`}
            style={{ backgroundImage: assetUrl('comfort-items') }}
            aria-hidden="true"
          />
          <div className={styles.head}>
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
          <div className={styles.head}>
            <div className="eyebrow" style={{ marginBottom: 22 }}>
              Client Reviews
            </div>
            <h2 id="lp-reviews" className={`display ${styles.heading}`}>
              In their words
            </h2>
          </div>
          {/* The website's own review carousel - same reviews, sliding,
              autoplay, arrows and "Read full review" as the home page. */}
          <div className="shell">
            <ReviewsCarousel reviews={REVIEWS} />
          </div>
        </section>

        {/* ---------- Offers ---------- */}
        <section id="offers" className={styles.section} aria-labelledby="lp-offers">
          <div className={styles.head}>
            <div className="eyebrow" style={{ marginBottom: 22 }}>
              Choose your session
            </div>
            <h2 id="lp-offers" className={`display ${styles.heading}`}>
              {audience.offersTitle}
            </h2>
            <p className={styles.headNote}>
              Two-hour sessions · Premium venue rental included in the price
            </p>
          </div>
          <div className={`${styles.offerGrid} ${offers.length === 1 ? styles.offerGridOne : ''}`}>
            {offers.map((offer) => (
              <div
                key={offer.tone}
                className={`card card--lift ${styles.offerCard}`}
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
                <Link href={`/book${from}`} className={`btn btn--dark ${styles.offerBtn}`}>
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
          <div className={styles.head}>
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
          id="lp-closer-section"
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
              fontSize: 'clamp(26px, 3.4vw, 46px)',
              lineHeight: 1.1,
              margin: '0 0 28px',
              color: 'var(--color-cream-text)',
            }}
          >
            {SITE.motto}
          </h2>
          <div className={styles.closerActions}>
            <Link href={`/book${from}`} className={`btn btn--cream ${styles.closerBtn}`}>
              Book your session
            </Link>
            <Link
              href={`/discovery-call${from}`}
              className={`btn btn--outline-dark ${styles.closerBtn}`}
            >
              Book a discovery call
            </Link>
          </div>
        </section>
      </main>

      <StickyBookBar twoButtons hideFromId="lp-closer-section" linkQuery={from} />
      <LandingReturnTracker href={LANDING_PATHS[audienceKey]} />

      <footer className={styles.footer}>
        <div className={styles.contactGroups}>
          {[
            {
              title: 'Get in touch',
              rows: [
                { label: 'WhatsApp', href: SITE.whatsappHref, detail: SITE.phone },
                { label: 'Email', href: `mailto:${SITE.email}`, detail: SITE.email.toLowerCase() },
              ],
            },
            {
              title: 'Get social',
              rows: socialOrder.flatMap((name) =>
                SOCIAL.filter((s) => s.confirmed && s.label === name).map((s) => ({
                  label: s.label,
                  href: s.href,
                  // Full address, e.g. instagram.com/lotusattune
                  detail: s.href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''),
                })),
              ),
            },
          ].map((group) => (
            <div key={group.title} className={styles.contactGroup}>
              <div className={styles.footerTitle}>{group.title}</div>
              <div className={styles.contactList}>
                {group.rows.map((c) => {
                  const Icon = SOCIAL_ICONS[c.label as keyof typeof SOCIAL_ICONS];
                  return (
                    <a
                      key={c.label}
                      href={c.href}
                      className={styles.contactRow}
                      {...(c.label === 'Email'
                        ? {}
                        : { rel: 'noopener noreferrer', target: '_blank' })}
                    >
                      <Icon className={styles.contactIcon} />
                      <span>
                        <span className={styles.contactName}>{c.label}</span> {c.detail}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
          <div className={`${styles.contactGroup} ${styles.locationGroup}`}>
            <div className={styles.footerTitle}>Location</div>
            {/* Wider screens show the venue text in full; phones fold it
                into two tap-to-open lines, like the main site's footer. */}
            <div className={styles.locationFull}>
              <div className={styles.locationLead}>Bloor–Yonge, Toronto</div>
              <p className={styles.locationBody}>{VENUE_COPY[0]}</p>
              <ExpandableNote label="Parking" labelClassName={styles.locationLead}>
                <p className={styles.locationBody}>{VENUE_COPY[1]}</p>
              </ExpandableNote>
            </div>
            <div className={styles.locationCompact}>
              <ExpandableNote label="Bloor–Yonge, Toronto" labelClassName={styles.locationLead}>
                <p className={styles.locationBody}>{VENUE_COPY[0]}</p>
              </ExpandableNote>
              <ExpandableNote label="Parking" labelClassName={styles.locationLead}>
                <p className={styles.locationBody}>{VENUE_COPY[1]}</p>
              </ExpandableNote>
            </div>
          </div>
        </div>
        {/* Opens in a new tab, so the ad page stays open where they left it. */}
        <a href="/#watch" className={styles.siteLink} target="_blank" rel="noopener">
          <span className={styles.siteLinkText}>Discover more at lotusattune.com</span>
          <span aria-hidden="true">→</span>
        </a>
        <div className={styles.copyright}>
          © {new Date().getFullYear()} {SITE.name} · {SITE.tagline} · Toronto{'\u00a0'}– Yonge and Bloor
        </div>
      </footer>
    </div>
  );
}
