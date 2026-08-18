import type { Metadata } from 'next';
import Image from 'next/image';

import { BookGift, SilvanaFooter, SilvanaNav } from '@/components/silvana/Chrome';
import { SILVANA_BENEFITS } from '@/data/silvana';
import { asset, type AssetName } from '@/lib/images';
import styles from '@/components/silvana/silvana.module.css';

export const metadata: Metadata = {
  title: 'Benefits',
  description: SILVANA_BENEFITS.intro,
};

type Group = typeof SILVANA_BENEFITS.individuals | typeof SILVANA_BENEFITS.teams;

function BenefitBlock({ group }: { group: Group }) {
  const photo = asset(group.image as AssetName);
  return (
    <div className={styles.benefitRow}>
      <div className={styles.benefitPhoto}>
        <Image
          src={photo.src}
          alt=""
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 760px) 100vw, 240px"
        />
      </div>
      <div className={styles.benefitBody}>
        <h2 className={styles.benefitTitle}>{group.title}</h2>
        <p className={styles.benefitLede}>{group.lede}</p>

        {group.points.map((point) => (
          <div key={point.title} className={styles.benefitPoint}>
            <p className={styles.benefitPointTitle}>{point.title}</p>
            <p className={styles.benefitPointBody}>{point.body}</p>
          </div>
        ))}

        <p className={styles.benefitCloser}>{group.closer}</p>
      </div>
    </div>
  );
}

export default function BenefitsPage() {
  return (
    <div className={styles.page}>
      <SilvanaNav />
      <main className={styles.section}>
        <div className={styles.shell}>
          <h1 className={styles.pageTitle}>{SILVANA_BENEFITS.heading}</h1>
          <p className={styles.pageIntro}>{SILVANA_BENEFITS.intro}</p>

          <div style={{ marginTop: 'clamp(30px, 4vw, 52px)' }}>
            <BenefitBlock group={SILVANA_BENEFITS.individuals} />
            <BenefitBlock group={SILVANA_BENEFITS.teams} />
          </div>

          <BookGift />
        </div>
      </main>
      <SilvanaFooter />
    </div>
  );
}
