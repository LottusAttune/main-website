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
            padding: 'clamp(20px, 3vw, 28px) var(--space-gutter) 16px',
            maxWidth: 'var(--width-content)',
            margin: '0 auto',
          }}
          aria-labelledby="book-heading"
        >
          <div className="eyebrow" style={{ fontSize: 15, marginBottom: 12 }}>
            Book
          </div>
          <h1
            id="book-heading"
            className="display"
            style={{
              fontSize: 'clamp(26px, 3.4vw, 44px)',
              lineHeight: 1.14,
              margin: '0 0 10px',
              maxWidth: 900,
            }}
          >
            Reserve your Lotus Attune experience
          </h1>
          <p
            className="lede"
            style={{ maxWidth: 740, fontSize: 15.5, lineHeight: 1.65 }}
          >
            Dates open {settings.leadTimeDays} calendar days ahead so each
            experience can be prepared with care.
          </p>
        </section>

        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '0 var(--space-gutter) clamp(20px, 3vw, 32px)',
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
          {/* Same photo, same zoom level as the base wash above - just a
              small clipped window onto it, repositioned into the empty
              gap beside step 04 instead of where the base wash naturally
              places the card (which cannot be moved: with `cover` sizing
              on this tall section, the image's height is the binding
              dimension, so background-position-y has no effect on it). */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '56%',
              right: '6%',
              width: '440px',
              height: '440px',
              overflow: 'hidden',
              opacity: 0.09,
              mixBlendMode: 'multiply',
              pointerEvents: 'none',
              WebkitMaskImage:
                'radial-gradient(closest-side, #000 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
              maskImage:
                'radial-gradient(closest-side, #000 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '-1342px',
                top: '-670px',
                width: '3309px',
                height: '1861px',
                backgroundImage: assetUrl('intention-card'),
                backgroundSize: '3309px 1861px',
                backgroundPosition: '0 0',
              }}
            />
          </div>
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
