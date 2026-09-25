import type { Metadata } from 'next';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { settleCheckoutById } from '@/lib/checkout';
import { isDatabaseConfigured } from '@/lib/db';
import { publicUrl } from '@/lib/documents';
import { portalUrlForBooking } from '@/lib/portal';
import { balanceDue, formatPlainDate } from '@/lib/pipeline';
import { getSettings } from '@/lib/settings';
import { money, SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Date confirmed',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Where Stripe sends the client after the booking checkout. The payment is
 * recorded here as well as by the webhook (whichever lands first), so the
 * page can say what was paid without waiting.
 */
export default async function BookingConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const settings = await getSettings();
  const settled =
    sessionId && isDatabaseConfigured()
      ? await settleCheckoutById(sessionId, settings.business).catch((error) => {
          console.error('[book/confirmed] settle failed:', error);
          return null;
        })
      : null;

  const paid = settled !== null;
  const doc = settled?.doc ?? null;
  const remaining = doc ? balanceDue(doc) : 0;
  const portal = doc ? await portalUrlForBooking(doc.bookingId) : null;

  return (
    <>
      <SiteNav />
      <Reveal />
      <main>
        <section
          style={{
            padding: 'clamp(28px, 4vw, 48px) var(--space-gutter) clamp(48px, 6vw, 80px)',
            maxWidth: 'var(--width-prose-narrow)',
            margin: '0 auto',
          }}
          aria-labelledby="confirmed-heading"
        >
          <div className="eyebrow" style={{ fontSize: 15, marginBottom: 12 }}>
            {paid ? 'Thank you' : 'Payment'}
          </div>
          <h1
            id="confirmed-heading"
            className="display"
            style={{ fontSize: 'clamp(26px, 3.4vw, 44px)', lineHeight: 1.14, margin: '0 0 14px' }}
          >
            {paid ? 'Your date is confirmed' : 'We could not find that payment'}
          </h1>

          {paid && doc ? (
            <>
              <p className="lede" style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 12 }}>
                We received {settled.plan === 'deposit' ? 'your deposit of' : 'your payment of'}{' '}
                <strong>{money(settled.amount)}</strong> against invoice {doc.number}.
                {remaining > 0
                  ? ` The remaining ${money(remaining)} is charged to the same card ${settings.business.balanceDaysBefore} calendar days before your session${doc.dueOn ? `, on ${formatPlainDate(doc.dueOn)}` : ''}.`
                  : ' Your invoice is paid in full.'}
              </p>
              <p className="body" style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 6 }}>
                A receipt, the updated invoice and your booking confirmation with venue details are on
                their way to {doc.clientEmail}, together with the link to your booking page.
              </p>
              <p className="body" style={{ fontSize: 14.5, lineHeight: 1.7, marginBottom: 22, color: 'var(--color-muted)' }}>
                If you don&rsquo;t see it soon, check your spam or junk folder.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {portal ? (
                  <a className="btn btn--dark" href={portal} target="_blank" rel="noreferrer">
                    Open your booking page
                  </a>
                ) : null}
                <a
                  className={portal ? 'btn btn--outline' : 'btn btn--dark'}
                  href={publicUrl(doc)}
                  target="_blank"
                >
                  View your invoice
                </a>
              </div>
              <p className="body" style={{ fontSize: 14.5, lineHeight: 1.7, marginTop: 16, color: 'var(--color-muted)' }}>
                Your booking page has a countdown to the day, your details, calendar links, and extras you can add any time.
              </p>
            </>
          ) : (
            <>
              <p className="lede" style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 12 }}>
                If you completed the payment, do not worry: it is recorded as soon as Stripe confirms it,
                and your receipt follows by email. If you left the payment page, your invoice and the
                payment options are in your confirmation email.
              </p>
              <p className="body" style={{ fontSize: 16, lineHeight: 1.75 }}>
                Questions? Write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or WhatsApp {SITE.phone}.
              </p>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
