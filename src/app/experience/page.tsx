import type { Metadata } from 'next';

import { BookGift } from '@/components/silvana/Chrome';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { StickyBookBar } from '@/components/chrome/StickyBookBar';
import { SILVANA_EXPERIENCE } from '@/data/silvana';
import { assetUrl } from '@/lib/images';
import styles from '@/components/silvana/silvana.module.css';

export const metadata: Metadata = {
  title: 'The Experience',
  description: SILVANA_EXPERIENCE.intro,
};

export default function ExperiencePage() {
  return (
    <div className={styles.page}>
      <SiteNav />
      <main className={styles.section}>
        <div className={styles.shell}>
          <h1 className={styles.pageTitle}>{SILVANA_EXPERIENCE.heading}</h1>
          <p className={styles.pageIntro}>{SILVANA_EXPERIENCE.intro}</p>

          <div style={{ marginTop: 'clamp(30px, 4vw, 50px)' }}>
            {SILVANA_EXPERIENCE.components.map((component) => (
              <div key={component.title} className={styles.componentRow}>
                <span
                  className={styles.componentIcon}
                  style={{ backgroundImage: assetUrl(component.icon) }}
                  aria-hidden="true"
                />
                <p className={styles.componentBody}>
                  <strong>{component.title}:</strong> {component.body}
                </p>
              </div>
            ))}
          </div>

          <div className={styles.sandPanel}>
            <p className={styles.sandPanelTitle}>{SILVANA_EXPERIENCE.panelTitle}</p>
            <p className={styles.sandPanelBody}>{SILVANA_EXPERIENCE.panelBody}</p>
          </div>

          <BookGift />
        </div>
      </main>
      <SiteFooter />
      <StickyBookBar />
    </div>
  );
}
