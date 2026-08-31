import type { Metadata } from 'next';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { BookingForm } from '@/components/booking/BookingForm';
import { assetUrl } from '@/lib/images';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = {
  title: 'Book',
  description:
    'Reserve a two-hour Lotus Attune experience in downtown Toronto for 1 to 24 people. Dates open five calendar days ahead.',
};

/** Availability changes from the dashboard, so this must never be cached. */
export const dynamic = 'force-dynamic';

export default async function BookPage() {
  const settings = await getSettings();

  return (
    <>
      <SiteNav />
      <Reveal />

      <main>
        <section
          style={{
            padding:
              'clamp(48px, 7vw, 96px) var(--space-gutter) 56px',
            maxWidth: 'var(--width-content)',
            margin: '0 auto',
          }}
          aria-labelledby="book-heading"
        >
          <div className="eyebrow" style={{ marginBottom: 32 }}>
            Book
          </div>
          <h1
            id="book-heading"
            className="display"
            style={{
              fontSize: 'clamp(38px, 4.6vw, 70px)',
              lineHeight: 1.12,
              margin: '0 0 26px',
              maxWidth: 900,
            }}
          >
            Reserve your Lotus Attune experience
          </h1>
          <p className="lede" style={{ maxWidth: 740 }}>
            All sessions are offered in a two-hour format. Dates open{' '}
            {settings.leadTimeDays} calendar days ahead so each experience can be
            prepared with care.
          </p>
        </section>

        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '0 var(--space-gutter) clamp(28px, 4vw, 48px)',
            maxWidth: 'var(--width-content)',
            margin: '0 auto',
          }}
          aria-label="Booking request"
        >
          <div
            data-bg="1"
            className="photo-wash photo-wash--light"
            style={{
              backgroundImage: assetUrl('intention-card'),
              backgroundPosition: 'center 30%',
            }}
          />
          <BookingForm
            pricing={settings.pricing}
            slots={settings.slots}
            blockedDates={settings.blockedDates}
            codes={settings.codes}
            leadTimeDays={settings.leadTimeDays}
          />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
