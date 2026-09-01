import type { Metadata } from 'next';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { DiscoveryCallForm } from '@/components/discovery/DiscoveryCallForm';
import { DISCOVERY_CALL_LEAD_DAYS } from '@/lib/site';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Discovery Call',
  description:
    'Book a short video call with Lotus Attune to ask questions before you book a session.',
};

/** Availability changes from the dashboard, so this must never be cached. */
export const dynamic = 'force-dynamic';

export default async function DiscoveryCallPage() {
  const { blockedDates, blockedCallTimes, bookedEventDates } =
    await getSettings();
  const closedDates = [...new Set([...blockedDates, ...bookedEventDates])];

  return (
    <>
      <SiteNav />
      <Reveal />

      <main>
        <section
          style={{
            padding: 'clamp(28px, 4vw, 40px) var(--space-gutter) 24px',
            maxWidth: 'var(--width-content)',
            margin: '0 auto',
          }}
          aria-labelledby="discovery-heading"
        >
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Discovery Call
          </div>
          <h1
            id="discovery-heading"
            className="display"
            style={{
              fontSize: 'clamp(26px, 3.4vw, 44px)',
              lineHeight: 1.14,
              margin: '0 0 10px',
              maxWidth: 900,
            }}
          >
            Have a question before you book?
          </h1>
          <p
            className="lede"
            style={{ maxWidth: 740, fontSize: 15.5, lineHeight: 1.65 }}
          >
            The website covers most of what people ask. If there's still
            something you'd like to ask, Silvana welcomes a short call —
            no cost, no obligation.
          </p>
        </section>

        <section
          style={{
            padding: '0 var(--space-gutter) clamp(28px, 4vw, 48px)',
            maxWidth: 'var(--width-content)',
            margin: '0 auto',
          }}
          aria-label="Discovery call request"
        >
          <DiscoveryCallForm
            blockedDates={closedDates}
            blockedCallTimes={blockedCallTimes}
            leadDays={DISCOVERY_CALL_LEAD_DAYS}
          />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
