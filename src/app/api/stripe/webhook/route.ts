import { NextResponse } from 'next/server';

import { afterPayment } from '@/lib/bookings';
import { isDatabaseConfigured } from '@/lib/db';
import { depositAmount, getDocument, recordPayment } from '@/lib/documents';
import { getSettings } from '@/lib/settings';
import { getPaymentIntent, verifyWebhook } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Stripe → us. Only `checkout.session.completed` matters: a client paid a
 * Payment Link (full or deposit). Off-session charges we make ourselves are
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
  const plan = metadata.plan === 'deposit' ? 'deposit' : 'full';
  if (!documentId || session.payment_status !== 'paid') {
    return NextResponse.json({ received: true });
  }

  try {
    const doc = await getDocument(documentId);
    if (!doc) return NextResponse.json({ received: true });

    const settings = await getSettings();
    // What the client paid includes the card fee; the invoice is credited
    // with the service amount the link was minted for.
    const amount = plan === 'deposit' ? depositAmount(doc, settings.business.depositPercent) : doc.total - doc.paidAmount;

    const intentId = session.payment_intent ? String(session.payment_intent) : null;
    let paymentMethodId: string | null = null;
    if (intentId) {
      const intent = await getPaymentIntent(intentId).catch(() => null);
      paymentMethodId = intent?.payment_method ? String(intent.payment_method) : null;
    }

    const { doc: updated, alreadyRecorded } = await recordPayment({
      documentId,
      amount,
      method: 'card',
      kind: plan === 'deposit' ? 'deposit' : 'payment',
      stripePaymentIntent: intentId,
      stripeCheckoutSession: session.id ? String(session.id) : null,
      stripeCustomerId: session.customer ? String(session.customer) : null,
      stripePaymentMethodId: paymentMethodId,
      note: `Stripe ${plan}`,
    });
    if (!alreadyRecorded) {
      await afterPayment(updated, amount, 'card', plan === 'deposit' ? 'deposit' : 'payment');
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[stripe] webhook failed:', error);
    // 500 makes Stripe retry, which is what we want for a transient failure.
    return NextResponse.json({ error: 'Webhook handling failed.' }, { status: 500 });
  }
}
