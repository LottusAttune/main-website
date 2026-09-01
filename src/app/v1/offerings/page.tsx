import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { StickyBookBar } from '@/components/chrome/StickyBookBar';
import { SessionConfigurator } from '@/components/offerings/SessionConfigurator';
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
          <div className="shell" style={{ position: 'relative' }}>
            <div className={styles.configuratorHead}>
              <div className="eyebrow" style={{ fontSize: '13.5px', marginBottom: 12 }}>
                Choose your experience
              </div>
              <h1 id="offerings-heading" className={`display ${styles.pageTitle}`}>
                Offerings
              </h1>
              <p className={`body ${styles.pageLede}`}>
                For individuals, private gatherings, organizations and teams, in
                two-hour sessions
              </p>
            </div>

            <SessionConfigurator
              pricing={pricing}
              footnote={
                <p className={styles.discoveryNote}>
                  Still have a question?{' '}
                  <Link href="/discovery-call">Book a discovery call</Link>
                </p>
              }
            />
          </div>
        </section>
      </main>

      <SiteFooter />
      <StickyBookBar basePath="/v1" />
    </>
  );
}
