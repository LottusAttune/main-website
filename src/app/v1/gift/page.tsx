import type { Metadata } from 'next';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { GiftCalculator } from '@/components/gift/GiftCalculator';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Gift (v1)',
  description:
    'Give a two-hour immersive Lotus Attune experience — for one person or a whole gathering, in downtown Toronto.',
};

/** Pricing reads from the database; never let that block the build. */
export const dynamic = 'force-dynamic';

export default async function GiftPage() {
  const { pricing } = await getSettings();

  return (
    <>
      <SiteNav basePath="/v1" />
      <Reveal />

      <main>
        <section
          style={{
            padding:
              'clamp(48px, 7vw, 96px) var(--space-gutter) clamp(32px, 4vw, 56px)',
            maxWidth: 'var(--width-content)',
            margin: '0 auto',
          }}
          aria-labelledby="gift-heading"
        >
          <div className="eyebrow" style={{ marginBottom: 30 }}>
            Gift
          </div>
          <h1
            id="gift-heading"
            className="display"
            style={{
              fontSize: 'clamp(36px, 4.6vw, 70px)',
              lineHeight: 1.12,
              margin: '0 0 24px',
              maxWidth: 900,
            }}
          >
            Give the gift of a full reset
          </h1>
          <p className="lede" style={{ maxWidth: 740 }}>
            A two-hour immersive experience for one person or a whole gathering.
            Choose the details below and the value updates as you go.
          </p>
        </section>

        <section
          style={{
            padding: '0 var(--space-gutter) var(--space-section)',
            maxWidth: 'var(--width-content)',
            margin: '0 auto',
          }}
          aria-label="Gift certificate"
        >
          <GiftCalculator pricing={pricing} />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
