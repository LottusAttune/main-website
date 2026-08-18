import type { Metadata } from 'next';
import Link from 'next/link';

import { LocalBusinessSchema } from '@/components/common/LocalBusinessSchema';
import { SilvanaFooter, SilvanaNav } from '@/components/silvana/Chrome';
import { HomeFaq, HomeFilm, HomeReviews } from '@/components/silvana/HomeSections';
import { SILVANA_HOME } from '@/data/silvana';
import styles from '@/components/silvana/silvana.module.css';

export const metadata: Metadata = {
  title: 'Lotus Attune — Reset. Align. Thrive',
  description:
    'An immersive wellness experience designed to support relaxation, nervous system regulation and deep inner connection.',
};

export default function HomePage() {
  return (
    <div className={styles.page}>
      <LocalBusinessSchema />
      <SilvanaNav />

      <main>
        <section className={styles.hero}>
          <div className={styles.shell}>
            <h1 className={styles.heroTitle}>{SILVANA_HOME.headline}</h1>
            <p className={styles.heroSub}>{SILVANA_HOME.sub}</p>

            <div className={styles.heroStage}>
              <HomeFilm />
              <div className={styles.heroActions}>
                <Link href="/book" className={styles.btn}>
                  BOOK
                </Link>
                <Link href="/gift" className={styles.btn}>
                  GIFT
                </Link>
              </div>
            </div>

            <p className={styles.heroCaption}>
              {SILVANA_HOME.videoCaption}
              <span>{SILVANA_HOME.videoSub}</span>
            </p>
          </div>
        </section>

        <HomeReviews />
        <HomeFaq />
      </main>

      <SilvanaFooter />
    </div>
  );
}
