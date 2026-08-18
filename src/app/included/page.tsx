import type { Metadata } from 'next';
import Image from 'next/image';

import { BookGift, SilvanaFooter, SilvanaNav } from '@/components/silvana/Chrome';
import { SILVANA_INCLUDED } from '@/data/silvana';
import { asset, type AssetName } from '@/lib/images';
import styles from '@/components/silvana/silvana.module.css';

export const metadata: Metadata = {
  title: 'What is Included',
  description: SILVANA_INCLUDED.intro,
};

export default function IncludedPage() {
  return (
    <div className={styles.page}>
      <SilvanaNav />
      <main className={styles.section}>
        <div className={styles.shell}>
          <h1 className={styles.pageTitle}>{SILVANA_INCLUDED.heading}</h1>
          <p className={styles.pageIntro}>{SILVANA_INCLUDED.intro}</p>

          <div className={styles.includedGrid}>
            {SILVANA_INCLUDED.items.map((item) => {
              const photo = asset(item.image as AssetName);
              return (
                <div key={item.body} className={styles.includedItem}>
                  <div className={styles.includedPhoto}>
                    <Image
                      src={photo.src}
                      alt=""
                      width={photo.width}
                      height={photo.height}
                      sizes="(max-width: 760px) 100vw, 33vw"
                    />
                  </div>
                  <p className={styles.includedBody}>{item.body}</p>
                </div>
              );
            })}
          </div>

          <BookGift />
        </div>
      </main>
      <SilvanaFooter />
    </div>
  );
}
