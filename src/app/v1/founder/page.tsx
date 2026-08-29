import type { Metadata } from 'next';
import Image from 'next/image';

import { Accordion } from '@/components/common/Accordion';
import accordionStyles from '@/components/common/Accordion.module.css';
import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { StickyBookBar } from '@/components/chrome/StickyBookBar';
import {
  CREDENTIALS,
  FOUNDER_BIO,
  FOUNDER_CLIENTS,
  TRAINING,
} from '@/data/content';
import { asset } from '@/lib/images';
import styles from './founder.module.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Founder (v1)',
  description:
    'Silvana bridges 15+ years in Human Resources with sound, somatic and mindfulness practice to help people and teams across Toronto and the GTA reset.',
};

export default function FounderPage() {
  const portrait = asset('silvana-handpan');

  return (
    <>
      <SiteNav basePath="/v1" />
      <Reveal />

      <main>
        <section className={styles.intro} aria-labelledby="founder-heading">
          <h1 id="founder-heading" className={`display h1 ${styles.title}`}>
            About the Founder
          </h1>

          <div className={styles.grid}>
            <div className="sticky-col">
              <div className={styles.portrait}>
                <Image
                  src={portrait.src}
                  alt="Silvana, founder of Lotus Attune, playing the handpan"
                  width={portrait.width}
                  height={portrait.height}
                  sizes="(max-width: 900px) 100vw, 45vw"
                  quality={90}
                  priority
                />
              </div>
              <div className={`eyebrow ${styles.portraitName}`}>Silvana</div>
            </div>
            <div className={styles.bio}>
              {FOUNDER_BIO.map((paragraph) => (
                <p key={paragraph} style={{ margin: 0 }}>
                  {paragraph}
                </p>
              ))}
              <p className={styles.closingQuote}>
                ”I bridge the gap between performance and restoration,
                <br />
                productivity and well-being, and excellence and human connection.”
              </p>
            </div>
          </div>
        </section>

        <section
          className="section--short section--dark"
          style={{ padding: 'var(--space-section-short) var(--space-gutter)' }}
          aria-labelledby="credentials-heading"
        >
          <div className="shell">
            <div
              id="credentials-heading"
              className={`eyebrow eyebrow--dark ${styles.groupTitle}`}
            >
              Education &amp; Professional Credentials
            </div>
            <div className={styles.group}>
              <div className={accordionStyles.bullets}>
                {CREDENTIALS[0].items.map((entry) => (
                  <div key={entry} className={accordionStyles.bullet}>
                    <span>{entry}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`eyebrow eyebrow--dark ${styles.groupTitle}`}>
              Training &amp; Development in Restorative Wellness Practices
            </div>
            <p className={styles.groupNote}>
              Six areas of study, practice and performance.
            </p>
            <div className={styles.groupLast}>
              <Accordion
                items={TRAINING.map((c) => ({ title: c.title, items: c.items }))}
                tone="dark"
                defaultOpen={0}
                showCounts
              />
            </div>

            <p className={styles.clients}>{FOUNDER_CLIENTS}</p>
          </div>
        </section>
      </main>

      <SiteFooter />
      <StickyBookBar basePath="/v1" />
    </>
  );
}
