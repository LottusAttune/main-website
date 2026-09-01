import type { Metadata } from 'next';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { RescheduleForm } from '@/components/discovery/RescheduleForm';
import { getDiscoveryCallByToken } from '@/lib/discoveryCalls';
import { getSettings } from '@/lib/settings';
import { DISCOVERY_CALL_LEAD_DAYS, SITE } from '@/lib/site';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Reschedule Your Call (v1)',
  description: 'Change the date or time of your Lotus Attune discovery call.',
};

/** The booking this token points to can change at any moment. */
export const dynamic = 'force-dynamic';

export default async function ReschedulePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const existing = token ? await getDiscoveryCallByToken(token) : null;

  const { blockedDates, blockedCallTimes, bookedEventDates, bookedCallSlots } =
    existing
      ? await getSettings()
      : {
          blockedDates: [],
          blockedCallTimes: [],
          bookedEventDates: [],
          bookedCallSlots: [],
        };
  const closedDates = [...new Set([...blockedDates, ...bookedEventDates])];
  // Exclude this booking's own current slot - it isn't "someone else's".
  const closedTimes = [
    ...blockedCallTimes,
    ...bookedCallSlots
      .filter((slot) => slot.id !== existing?.id)
      .map(({ date, time }) => ({ date, time })),
  ];

  return (
    <>
      <SiteNav basePath="/v1" />
      <Reveal />

      <main>
        <section
          style={{
            padding: 'clamp(28px, 4vw, 40px) var(--space-gutter) 24px',
            maxWidth: 'var(--width-content)',
            margin: '0 auto',
          }}
          aria-labelledby="reschedule-heading"
        >
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Discovery Call
          </div>
          <h1
            id="reschedule-heading"
            className="display"
            style={{
              fontSize: 'clamp(26px, 3.4vw, 44px)',
              lineHeight: 1.14,
              margin: '0 0 10px',
              maxWidth: 900,
            }}
          >
            {existing ? 'Reschedule your call' : 'Link not found'}
          </h1>
          <p
            className="lede"
            style={{ maxWidth: 740, fontSize: 15.5, lineHeight: 1.65 }}
          >
            {existing
              ? "Pick a new date and time below — we'll update your confirmation right away."
              : `This reschedule link is invalid or has expired. Please email ${SITE.email} or call ${SITE.phone} and we'll sort out a new time.`}
          </p>
        </section>

        {existing ? (
          <section
            style={{
              padding: '0 var(--space-gutter) clamp(28px, 4vw, 48px)',
              maxWidth: 'var(--width-content)',
              margin: '0 auto',
            }}
            aria-label="Reschedule discovery call"
          >
            <RescheduleForm
              token={token as string}
              name={existing.name}
              currentDate={existing.callDate}
              currentTime={existing.callTime}
              blockedDates={closedDates}
              blockedCallTimes={closedTimes}
              leadDays={DISCOVERY_CALL_LEAD_DAYS}
            />
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </>
  );
}
