import type { Metadata } from 'next';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { StickyBookBar } from '@/components/chrome/StickyBookBar';
import { SessionConfigurator } from '@/components/offerings/SessionConfigurator';
import { assetUrl } from '@/lib/images';
import { getSettings } from '@/lib/settings';
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

  return (
    <>
      <SiteNav basePath="/v1" />
      <Reveal />

      <main>
        <section className={styles.configurator} aria-labelledby="offerings-heading">
          <div
            data-bg="1"
            className="photo-wash photo-wash--light"
            style={{ backgroundImage: assetUrl('venue-signature') }}
          />
          <div className="shell" style={{ position: 'relative' }}>
            <div className={styles.configuratorHead}>
              <h1
                id="offerings-heading"
                className="display h1"
                style={{ marginBottom: 8 }}
              >
                Offerings
              </h1>
              <p className="lede" style={{ maxWidth: 900, marginBottom: 16 }}>
                For individuals, private gatherings, organizations and teams, all
                sessions are offered in a two-hour format
              </p>
              <div className={styles.chooseHeading}>Choose your experience</div>
            </div>

            <SessionConfigurator
              pricing={pricing}
              includedHref="/v1/experience#included"
            />
          </div>
        </section>
      </main>

      <SiteFooter />
      <StickyBookBar />
    </>
  );
}
