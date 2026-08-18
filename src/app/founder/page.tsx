import type { Metadata } from 'next';
import Image from 'next/image';

import { BookGift, SilvanaFooter, SilvanaNav } from '@/components/silvana/Chrome';
import { CredAccordion } from '@/components/silvana/CredAccordion';
import { SILVANA_FOUNDER } from '@/data/silvana';
import { asset } from '@/lib/images';
import styles from '@/components/silvana/silvana.module.css';

export const metadata: Metadata = {
  title: 'Founder',
  description: SILVANA_FOUNDER.paragraphs[0],
};

export default function FounderPage() {
  const portrait = asset('silvana-handpan');
  const second = asset('handpan-forest');

  return (
    <div className={styles.page}>
      <SilvanaNav />

      <main>
        <section className={styles.section}>
          <div className={styles.shell}>
            <div className={styles.founderGrid}>
              <div className={styles.founderPhoto}>
                <Image
                  src={portrait.src}
                  alt="Silvana with her handpan"
                  width={portrait.width}
                  height={portrait.height}
                  sizes="(max-width: 760px) 100vw, 300px"
                  priority
                />
              </div>

              <div>
                <h1 className={styles.founderHeading}>{SILVANA_FOUNDER.heading}</h1>
                {SILVANA_FOUNDER.paragraphs.map((paragraph) => (
                  <p key={paragraph} className={styles.founderBody}>
                    {paragraph}
                  </p>
                ))}
                <p className={styles.founderQuote}>
                  {SILVANA_FOUNDER.quote.map((line) => (
                    <span key={line} style={{ display: 'block' }}>
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.credBand}>
          <div className={styles.shell}>
            <div className={styles.credGrid}>
              <div>
                <div className={styles.founderPhoto}>
                  <Image
                    src={second.src}
                    alt=""
                    width={second.width}
                    height={second.height}
                    sizes="(max-width: 760px) 100vw, 280px"
                  />
                </div>
                <BookGift />
              </div>

              <div>
                <CredAccordion />

                <div className={styles.credPanel}>
                  <div className={styles.credPanelHead}>
                    {SILVANA_FOUNDER.credentialsHeading}
                  </div>
                  <p className={styles.credText}>{SILVANA_FOUNDER.credentialsBody}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SilvanaFooter />
    </div>
  );
}
