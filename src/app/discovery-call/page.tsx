import type { Metadata } from 'next';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { DiscoveryCallForm } from '@/components/discovery/DiscoveryCallForm';
import { callClosedDates, callClosedTimes, DISCOVERY_CALL_LEAD_DAYS } from '@/lib/site';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Discovery Call',
  description:
    'Book a short video call with Lotus Attune to ask questions before you book a session.',
};

/** Availability changes from the dashboard, so this must never be cached. */
export const dynamic = 'force-dynamic';

/**
 * The intro mentions a team's year-end reset during the holiday season, then
 * switches back to the timeless wording on its own on January 1 (Toronto time).
 * The page is rendered per request (force-dynamic), so no redeploy is needed.
 */
const YEAR_END_LAST_DAY = '2026-12-31';

function introLine(): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date());
  const ending = today <= YEAR_END_LAST_DAY ? 'a group or your team\u2019s year-end reset' : 'a group or your team';
  return `A video call to answer all your questions and find the right fit, whether it\u2019s for yourself, ${ending}.`;
}

export default async function DiscoveryCallPage() {
  const { blockedDates, blockedCallTimes, callOpenTimes, bookedEventDates, bookedCallSlots } =
    await getSettings();
  // A day blocked for events, or with a session booked, is closed for calls
  // unless Silvana opened specific call times on it.
  const eventDays = [...new Set([...blockedDates, ...bookedEventDates])];
  const closedDates = callClosedDates(eventDays, callOpenTimes);
  const closedTimes = [
    ...callClosedTimes(eventDays, blockedCallTimes, callOpenTimes),
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
                <p
                  className="lede"
                  style={{ maxWidth: 640, fontSize: 15.5, lineHeight: 1.65, marginTop: 12 }}
                >
                  {introLine()}
                </p>
              </section>
            }
          />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
