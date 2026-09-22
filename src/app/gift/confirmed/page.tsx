import type { Metadata } from 'next';

import { Reveal } from '@/components/common/Reveal';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteNav } from '@/components/chrome/SiteNav';
import { settleCheckoutById } from '@/lib/checkout';
import { isDatabaseConfigured } from '@/lib/db';
import { publicUrl } from '@/lib/documents';
import { getSettings } from '@/lib/settings';
import { money, SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Gift certificate paid',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Where Stripe sends the buyer after paying for a gift certificate. */
export default async function GiftConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const settings = await getSettings();
  const settled =
    sessionId && isDatabaseConfigured()
      ? await settleCheckoutById(sessionId, settings.business).catch((error) => {
          console.error('[gift/confirmed] settle failed:', error);
          return null;
        })
      : null;
  const doc = settled?.doc ?? null;
  const paidAmount = settled?.amount ?? 0;

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
          aria-labelledby="gift-confirmed-heading"
        >
          <div className="eyebrow" style={{ fontSize: 15, marginBottom: 12 }}>
            {doc ? 'Thank you' : 'Payment'}
          </div>
          <h1
            id="gift-confirmed-heading"
            className="display"
            style={{ fontSize: 'clamp(26px, 3.4vw, 44px)', lineHeight: 1.14, margin: '0 0 14px' }}
          >
            {doc ? 'Your gift is on its way' : 'We could not find that payment'}
          </h1>
          {doc ? (
            <>
              <p className="lede" style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 12 }}>
                We received <strong>{money(paidAmount)}</strong> against invoice {doc.number}. The gift
                certificate is being emailed now: to {doc.clientEmail}, and to the recipient if you gave their
                email. A receipt follows in the same inbox.
              </p>
              <p className="body" style={{ fontSize: 16, lineHeight: 1.75, marginBottom: 22 }}>
                The certificate carries a redemption code. The recipient books at lotusattune.com/book and
                enters the code.
              </p>
              <a className="btn btn--dark" href={publicUrl(doc)}>
                View your invoice
              </a>
            </>
          ) : (
            <>
              <p className="lede" style={{ fontSize: 16, lineHeight: 1.7, marginBottom: 12 }}>
                If you completed the payment, do not worry: it is recorded as soon as Stripe confirms it, and
                the certificate follows by email. If you left the payment page, your invoice and the payment
                options are in your email.
              </p>
              <p className="body" style={{ fontSize: 16, lineHeight: 1.75 }}>
                Questions? Write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call {SITE.phone}.
              </p>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
