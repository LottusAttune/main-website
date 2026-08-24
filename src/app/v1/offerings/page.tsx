import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { StickyBookBar } from '@/components/chrome/StickyBookBar';
import { SessionConfigurator } from '@/components/offerings/SessionConfigurator';
import { CORPORATE_ADDON_COPY } from '@/data/content';
import { assetUrl } from '@/lib/images';
import { getSettings } from '@/lib/settings';
import { money } from '@/lib/site';
import styles from './offerings.module.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Offerings (v1)',
  description:
    'Private sessions at $340, group and corporate wellness at $280 per participant. Two-hour sessions for 1 to 24 people in downtown Toronto.',
};

/** Pricing reads from the database; never let that block the build. */
export const dynamic = 'force-dynamic';

export default async function OfferingsPage() {
  const { pricing } = await getSettings();
  const packageSaving =
    pricing.privateSession * 4 - pricing.privatePackage;

  return (
    <>
      <SiteNav basePath="/v1" />
      <Reveal />

      <main>
        <section className={styles.intro} aria-labelledby="offerings-heading">
          <div className="eyebrow" style={{ marginBottom: 34 }}>
            Offerings
          </div>
          <h1
            id="offerings-heading"
            className="display h1"
            style={{ marginBottom: 30 }}
          >
            Offerings
          </h1>
          <p className="lede" style={{ maxWidth: 900 }}>
            For individuals, private gatherings, organizations and teams, all
            sessions are offered in a two-hour format
          </p>
        </section>

        {/* ---------- Group bookings & corporate ---------- */}
        <section className={styles.block} aria-labelledby="group-heading">
          <div className={styles.offer} data-reveal="">
            <div className={styles.offerAside}>
              <div className={styles.offerTags}>
                <span
                  className="tag"
                  style={{
                    background: 'rgba(122,150,110,0.28)',
                    color: '#3B4E33',
                  }}
                >
                  Private Group
                </span>
                <span
                  className="tag"
                  style={{
                    background: 'rgba(46,36,28,0.88)',
                    color: 'var(--color-cream-text)',
                  }}
                >
                  Corporate
                </span>
              </div>
              <h2 id="group-heading" className={styles.offerTitle}>
                Group Bookings
                <br />&amp;<br />
                Corporate Wellness
              </h2>
              <div className={styles.offerCapacity}>2–24 Participants</div>
            </div>

            <div className={styles.offerMain}>
              <div style={{ minWidth: 0 }}>
                <h3 className={styles.offerHeading}>
                  For Friends, Families, Couples, and Groups
                </h3>
                <p className={styles.offerText}>
                  Ideal for gatherings, birthdays, celebrations, and other
                  special occasions
                </p>

                <h3 className={styles.offerHeading}>
                  For Organizations and Corporate Teams
                </h3>
                <p className={styles.offerLead}>
                  Optional Corporate Add-on: customized mindful team-building
                  activity
                </p>
                <p className={styles.offerDetail}>{CORPORATE_ADDON_COPY}</p>

                <div className={styles.offerPrice}>
                  {money(pricing.perParticipant)}{' '}
                  <span className={styles.offerPriceUnit}>per participant</span>
                </div>
              </div>

              <div className={styles.offerActions}>
                <Link
                  href="/v1/experience"
                  className={`btn btn--outline ${styles.offerIncluded}`}
                >
                  What&apos;s Included
                </Link>
                <div className={styles.offerPair}>
                  <Link
                    href="/book"
                    className={`btn btn--dark ${styles.offerPairBtn}`}
                  >
                    Book
                  </Link>
                  <Link
                    href="/gift"
                    className={`btn btn--dark ${styles.offerPairBtn}`}
                  >
                    Gift
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Private sessions ---------- */}
        <section className={styles.blockLast} aria-labelledby="private-heading">
          <div className={styles.offer} data-reveal="">
            <div className={styles.offerAside}>
              <div className={styles.offerTags}>
                <span
                  className="tag"
                  style={{
                    background: 'rgba(198,169,122,0.4)',
                    color: '#6E5330',
                  }}
                >
                  1 : 1
                </span>
              </div>
              <h2
                id="private-heading"
                className={`${styles.offerTitle} ${styles.offerTitleTight}`}
              >
                Private Sessions
              </h2>
            </div>

            <div className={styles.offerMain}>
              <div style={{ minWidth: 0 }}>
                <h3 className={styles.offerHeading}>One-on-One</h3>
                <p className={styles.offerText}>
                  Customizable based on individual preferences
                </p>
                <div className={styles.offerPrice}>
                  {money(pricing.privateSession)}{' '}
                  <span className={styles.offerPriceUnit}>per session</span>
                </div>
                <div className={styles.offerPackage}>
                  Package of four sessions: {money(pricing.privatePackage)} – save{' '}
                  {money(packageSaving)}
                </div>
              </div>

              <div className={styles.offerActions}>
                <Link
                  href="/v1/experience"
                  className={`btn btn--outline ${styles.offerIncluded}`}
                >
                  What&apos;s Included
                </Link>
                <div className={styles.offerPair}>
                  <Link
                    href="/book"
                    className={`btn btn--dark ${styles.offerPairBtn}`}
                  >
                    Book
                  </Link>
                  <Link
                    href="/gift"
                    className={`btn btn--dark ${styles.offerPairBtn}`}
                  >
                    Gift
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- Build your session ---------- */}
        <section className={styles.configurator} aria-labelledby="build-heading">
          <div
            data-bg="1"
            className="photo-wash photo-wash--light"
            style={{ backgroundImage: assetUrl('venue-signature') }}
          />
          <div className="shell" style={{ position: 'relative' }}>
            <div className={styles.configuratorHead}>
              <div className="eyebrow" style={{ marginBottom: 22 }}>
                Build Your Session
              </div>
              <h2
                id="build-heading"
                className={`display ${styles.configuratorHeading}`}
              >
                Choose your exact experience
              </h2>
              <p className="body" style={{ maxWidth: 700 }}>
                Select a format and the details below. Your estimate updates as
                you choose.
              </p>
            </div>

            <SessionConfigurator pricing={pricing} />
          </div>
        </section>
      </main>

      <StickyBookBar />
      <SiteFooter />
    </>
  );
}
