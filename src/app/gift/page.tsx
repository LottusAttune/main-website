import type { Metadata } from 'next';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { GiftCalculator } from '@/components/gift/GiftCalculator';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Gift',
  description:
    'Give a two-hour immersive Lotus Attune experience — for one person or a whole gathering, in downtown Toronto.',
};

/** Pricing reads from the database; never let that block the build. */
export const dynamic = 'force-dynamic';

export default async function GiftPage() {
  const { pricing } = await getSettings();

  return (
    <>
      <SiteNav />
      <Reveal />

      <main>
        <section
          style={{
            padding: 'clamp(20px, 3vw, 28px) var(--space-gutter) 16px',
            maxWidth: 'var(--width-content)',
            margin: '0 auto',
          }}
          aria-labelledby="gift-heading"
        >
          <div className="eyebrow" style={{ fontSize: 15, marginBottom: 12 }}>
            Gift
          </div>
          <h1
            id="gift-heading"
            className="display"
            style={{
              fontSize: 'clamp(26px, 3.4vw, 44px)',
              lineHeight: 1.14,
              margin: '0 0 10px',
              maxWidth: 900,
            }}
          >
            Give the gift of a full reset
          </h1>
          <p
            className="lede"
            style={{ maxWidth: 740, fontSize: 15.5, lineHeight: 1.65 }}
          >
            A two-hour immersive experience for one person or a whole gathering.
            Choose the details below and the value updates as you go.
          </p>
        </section>

        <section
          style={{
            padding: '0 var(--space-gutter) clamp(20px, 3vw, 32px)',
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
