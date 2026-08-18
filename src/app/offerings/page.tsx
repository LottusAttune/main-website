import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { SilvanaFooter, SilvanaNav } from '@/components/silvana/Chrome';
import { SILVANA_OFFERINGS } from '@/data/silvana';
import { asset } from '@/lib/images';
import styles from '@/components/silvana/silvana.module.css';

export const metadata: Metadata = {
  title: 'Offerings',
  description: SILVANA_OFFERINGS.intro,
};

function Actions() {
  return (
    <div className={styles.offerActions}>
      <Link href="/included" className={`${styles.btn} ${styles.btnGhost}`}>
        What&apos;s Included
      </Link>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/book" className={styles.btn}>
          BOOK
        </Link>
        <Link href="/gift" className={styles.btn}>
          GIFT
        </Link>
      </div>
    </div>
  );
}

export default function OfferingsPage() {
  const logo = asset('logo-lockup');
  const { group, private: solo } = SILVANA_OFFERINGS;

  return (
    <div className={styles.page}>
      <SilvanaNav />

      <main className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.offerHead}>
            <div className={styles.offerLogo}>
              <Image
                src={logo.src}
                alt="Lotus Attune"
                width={logo.width}
                height={logo.height}
              />
            </div>
            <div>
              <h1 className={styles.offerTitle}>{SILVANA_OFFERINGS.heading}</h1>
              <p className={styles.offerIntro}>{SILVANA_OFFERINGS.intro}</p>
            </div>
          </div>

          {/* Group bookings & corporate wellness */}
          <div className={styles.offerCard}>
            <div className={styles.offerAside}>
              <div className={styles.offerAsideTitle}>
                {group.panelTitle.map((line) => (
                  <span key={line} style={{ display: 'block' }}>
                    {line}
                  </span>
                ))}
              </div>
              <div className={styles.offerAsideNote}>{group.panelNote}</div>
            </div>

            <div className={styles.offerMain}>
              <div>
                {group.blocks.map((block) => (
                  <div key={block.title}>
                    <h2 className={styles.offerBlockTitle}>{block.title}</h2>
                    <p className={styles.offerBlockBody}>{block.body}</p>
                  </div>
                ))}
                <p className={styles.offerAddon}>
                  <strong>{group.addonLabel}</strong> {group.addonBody}
                </p>
                <p className={styles.offerPrice}>{group.price}</p>
              </div>
              <Actions />
            </div>
          </div>

          {/* Private sessions */}
          <div className={styles.offerCard}>
            <div className={styles.offerAside}>
              <div className={styles.offerAsideTitle}>
                {solo.panelTitle.map((line) => (
                  <span key={line} style={{ display: 'block' }}>
                    {line}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.offerMain}>
              <div>
                <h2 className={styles.offerBlockTitle} style={{ fontWeight: 400, fontSize: 19 }}>
                  {solo.title}
                </h2>
                {solo.lines.map((line) => (
                  <p key={line} className={styles.offerBlockBody} style={{ marginBottom: 4 }}>
                    {line}
                  </p>
                ))}
                <p className={styles.offerPrice}>{solo.price}</p>
                <p className={styles.offerPackage}>{solo.packageLine}</p>
              </div>
              <Actions />
            </div>
          </div>
        </div>
      </main>

      <SilvanaFooter />
    </div>
  );
}
