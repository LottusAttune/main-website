import { NextResponse } from 'next/server';

import { settleCheckoutSession } from '@/lib/checkout';
import { isDatabaseConfigured } from '@/lib/db';
import { sendOwnerNotification } from '@/lib/email';
import { recordAdhocPayment } from '@/lib/paymentLinks';
import { getSettings } from '@/lib/settings';
import { money } from '@/lib/site';
import { verifyWebhook } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Stripe → us. Only `checkout.session.completed` matters: a client paid the
 * booking checkout or a Payment Link (full or deposit). Off-session charges we make ourselves are
 * recorded at the point of charging, not here.
 *
 * Stripe dashboard → Developers → Webhooks → add endpoint
 * https://lotusattune.com/api/stripe/webhook, event checkout.session.completed,
 * and set the signing secret as STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const event = verifyWebhook(raw, request.headers.get('stripe-signature'));
  if (!event) return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'No database.' }, { status: 503 });

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = (event.data as { object: Record<string, unknown> }).object;
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const documentId = metadata.documentId;
  if (session.payment_status !== 'paid') return NextResponse.json({ received: true });

  if (!documentId && metadata.paymentLinkId) {
    try {
      const link = await recordAdhocPayment(metadata.paymentLinkId, session.id ? String(session.id) : null);
      if (link) {
        await sendOwnerNotification({
          subject: `Payment link paid: ${money(link.amount)} — ${link.description}`,
          html: `<p style="margin:0;">${link.clientName ?? 'A client'} paid ${money(link.amount)} by card via your payment link "${link.description}".</p>`,
        });
      }
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error('[stripe] payment link webhook failed:', error);
      return NextResponse.json({ error: 'Webhook handling failed.' }, { status: 500 });
    }
  }
  if (!documentId) return NextResponse.json({ received: true });

  try {
    const settings = await getSettings();
    await settleCheckoutSession(session, settings.business);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[stripe] webhook failed:', error);
    // 500 makes Stripe retry, which is what we want for a transient failure.
    return NextResponse.json({ error: 'Webhook handling failed.' }, { status: 500 });
  }
}
