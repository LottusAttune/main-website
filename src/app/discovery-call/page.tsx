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
  const { blockedDates, blockedCallTimes, bookedEventDates, bookedCallSlots } =
    await getSettings();
  const closedDates = [...new Set([...blockedDates, ...bookedEventDates])];
  const closedTimes = [
    ...blockedCallTimes,
    ...bookedCallSlots.map(({ date, time }) => ({ date, time })),
  ];

  return (
    <>
      <SiteNav />
      <Reveal />

      <main>
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
            blockedCallTimes={closedTimes}
            leadDays={DISCOVERY_CALL_LEAD_DAYS}
            header={
              <section
                style={{
                  position: 'relative',
                  padding: 'clamp(28px, 4vw, 40px) 0 24px',
                  maxWidth: 'var(--width-content)',
                  margin: '0 auto',
                }}
                aria-label="Discovery Call"
              >
                <div className="eyebrow" style={{ fontSize: 15 }}>
                  Discovery Call
                </div>
              </section>
            }
          />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
