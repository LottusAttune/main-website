import type { Metadata } from 'next';
import Image from 'next/image';
import Script from 'next/script';

import { Accordion } from '@/components/common/Accordion';
import { Reveal } from '@/components/common/Reveal';
import { Wave } from '@/components/common/Wave';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { StickyBookBar } from '@/components/chrome/StickyBookBar';
import { HandpanVideo } from '@/components/founder/HandpanVideo';
import {
  CREDENTIALS,
  FOUNDER_BIO,
  FOUNDER_CLIENTS,
  TRAINING,
} from '@/data/content';
import { asset } from '@/lib/images';
import { vimeoAspectRatio } from '@/lib/vimeo';
import styles from './founder.module.css';

export const metadata: Metadata = {
  title: 'Founder',
  description: FOUNDER_BIO[0],
};

const HANDPAN_VIDEO_IDS = ['1221670118', '1221664378', '1223535077'];

export default async function FounderPage() {
  const portrait = asset('silvana-handpan');
  const handpanAspectRatios = await Promise.all(
    HANDPAN_VIDEO_IDS.map(vimeoAspectRatio)
  );

  return (
    <>
      <SiteNav />
      <Reveal />
      <Script src="https://player.vimeo.com/api/player.js" strategy="afterInteractive" />

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
              <span className={styles.signature}>
                <Wave className={styles.wave} />
                <span className={styles.signatureName}>Silvana</span>
              </span>
            </div>
          </div>
        </section>

        <section
          className={`section--short section--soft ${styles.credSection}`}
          aria-labelledby="credentials-heading"
        >
          <h2 id="credentials-heading" className="visually-hidden">
            Training and education
          </h2>
          <div className={`shell ${styles.credSplit}`}>
            <div className={`${styles.credCol} ${styles.credColDark}`}>
              <div className={`eyebrow eyebrow--dark ${styles.groupTitle}`}>
                Training &amp; Development in Restorative Wellness Practices
              </div>
              <Accordion
                items={TRAINING.map((c) => ({ title: c.title, items: c.items }))}
                tone="dark"
                compact
              />
            </div>

            <div className={`${styles.credCol} ${styles.credColLight}`}>
              <div className={styles.groupTitleLight}>
                Education &amp; Professional Credentials
              </div>
              <p className={styles.credIntro}>{FOUNDER_CLIENTS}</p>
              <Accordion
                items={[{ title: 'Credentials', items: CREDENTIALS[0].items }]}
                tone="light"
                boldHeads
                compact
              />
            </div>
          </div>

          <div className={`shell ${styles.videoShell}`}>
            <div className={styles.videoRow}>
              <div className={`eyebrow ${styles.videoLabel}`}>
                Explore my handpan sounds
              </div>
              <div className={styles.videoGrid}>
                {HANDPAN_VIDEO_IDS.map((id, i) => (
                  <HandpanVideo
                    key={id}
                    vimeoId={id}
                    aspectRatio={handpanAspectRatios[i]}
                  />
                ))}
              </div>
            </div>
            <p className={styles.videoHint}>
              Tap play to listen here, or the Vimeo logo to watch full
              screen on vimeo.com
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
      <StickyBookBar />
    </>
  );
}
