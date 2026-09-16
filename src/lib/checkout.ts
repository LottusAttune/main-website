import 'server-only';

import { afterPayment } from '@/lib/bookings';
import {
  balanceDueOn,
  cardFee,
  depositAmount,
  depositDue,
  getDocument,
  loadBooking,
  recordPayment,
  type BookingCtx,
} from '@/lib/documents';
import { formatStudioDate, type DocumentRow } from '@/lib/pipeline';
import type { BusinessSettings } from '@/lib/settings';
import { LOUNGE_MAX, money, SITE } from '@/lib/site';
import { createCheckoutSession, getCheckoutSession, getPaymentIntent, isStripeConfigured } from '@/lib/stripe';

/**
 * The checkout the booking form sends a client to the moment they confirm:
 * the deposit (or the whole invoice when no deposit applies), the card
 * kept for the balance, and a thank-you page on the site afterwards.
 */
/** The few invoice fields the checkout needs, so a just-inserted row qualifies. */
export type CheckoutDoc = Pick<DocumentRow, 'id' | 'kind' | 'number' | 'total' | 'paidAmount' | 'bookingId' | 'clientEmail' | 'token'>;

export async function createBookingCheckout(
  doc: CheckoutDoc,
  business: BusinessSettings,
  /** What the client chose on the form: the deposit, or everything now. */
  wanted: 'deposit' | 'full' = 'deposit',
  /** The booking, when the caller already has it; otherwise it is loaded. */
  known?: BookingCtx | null
): Promise<{ url: string; amount: number; plan: 'deposit' | 'full' } | null> {
  if (!isStripeConfigured() || doc.kind !== 'invoice') return null;
  const deposit = wanted === 'deposit' ? depositDue(doc as DocumentRow, business) : null;
  const amount = deposit ?? doc.total - doc.paidAmount;
  if (amount <= 0) return null;
  const plan = deposit !== null ? 'deposit' : 'full';
  const feeLabel = `Card processing fee (${business.cardFeePercent}%)`;

  // Spell out on Stripe's page what the money is for: the session, the
  // invoice and what happens with the rest.
  const booking = known !== undefined ? known : doc.bookingId ? await loadBooking(doc.bookingId) : null;
  const when = booking?.sessionDate
    ? `${formatStudioDate(booking.sessionDate)}${booking.sessionTime ? `, ${booking.sessionTime}` : ''}`
    : null;
  const who = booking
    ? booking.participants === 1
      ? 'private session'
      : `${booking.participants} participants`
    : null;
  const venue = booking ? (booking.participants <= LOUNGE_MAX ? 'Private Wellness Lounge' : 'Premium Signature Venue') : null;
  const balanceDay = balanceDueOn(booking?.sessionDate ?? null, business);
  const remaining = doc.total - amount;
  const details = [
    `Immersive Soma Sound Experience${who ? `, ${who}` : ''}${when ? `. ${when}` : ''}${venue ? `, ${venue}` : ''}.`,
    `Invoice ${doc.number}.`,
    plan === 'deposit'
      ? `Paying this ${business.depositPercent}% deposit confirms your date. The remaining ${money(remaining)} is charged to this card ${business.balanceDaysBefore} days before the session${balanceDay ? `, on ${formatStudioDate(balanceDay)}` : ''}.`
      : 'Nothing more to pay after this.',
  ]
    .filter(Boolean)
    .join(' ');

  try {
    const session = await createCheckoutSession({
      description:
        plan === 'deposit'
          ? `${business.depositPercent}% deposit: ${money(amount)} of ${money(doc.total)} total`
          : `Your Lotus Attune experience: ${money(amount)} in full`,
      details,
      imageUrl: `${SITE.url}/assets/logo-circle.webp`,
      submitType: 'book',
      submitMessage:
        plan === 'deposit'
          ? `Paying this ${business.depositPercent}% deposit confirms your date. The remaining ${money(remaining)} is charged to the same card ${business.balanceDaysBefore} days before your session. A receipt and your booking confirmation follow by email.`
          : 'A receipt and your booking confirmation follow by email.',
      amount,
      feeAmount: cardFee(amount, business.cardFeePercent),
      feeLabel,
      customerEmail: doc.clientEmail,
      metadata: { documentId: doc.id, number: doc.number, plan, amount: String(amount) },
      successUrl: `${SITE.url}/book/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${SITE.url}/d/${doc.token}`,
      saveCard: Boolean(doc.bookingId),
    });
    return { url: session.url, amount, plan };
  } catch (error) {
    console.error('[checkout] session failed:', error);
    return null;
  }
}

export type SettledCheckout = {
  doc: DocumentRow;
  amount: number;
  plan: 'deposit' | 'full';
  alreadyRecorded: boolean;
};

/**
 * Records a paid Checkout Session against its invoice. Safe to call from
 * both the webhook and the thank-you page: the payment intent id makes it
 * idempotent, so whichever arrives first does the work and the other is a
 * no-op.
 */
export async function settleCheckoutSession(
  session: Record<string, unknown>,
  depositPercent: number
): Promise<SettledCheckout | null> {
  const metadata = (session.metadata ?? {}) as Record<string, string>;
  const documentId = metadata.documentId;
  if (!documentId || session.payment_status !== 'paid') return null;
  const doc = await getDocument(documentId);
  if (!doc) return null;

  const plan = metadata.plan === 'deposit' ? 'deposit' : 'full';
  // What the client paid includes the card fee; the invoice is credited
  // with the service amount the session was minted for (carried in its
  // metadata, with a computed fallback for links minted before that field
  // existed).
  const minted = Number(metadata.amount);
  const amount =
    Number.isFinite(minted) && minted > 0
      ? minted
      : plan === 'deposit'
        ? depositAmount(doc, depositPercent)
        : doc.total - doc.paidAmount;

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
  return { doc: updated, amount, plan, alreadyRecorded };
}

/** Looks a session up by id (the thank-you page's query string) and settles it if paid. */
export async function settleCheckoutById(sessionId: string, depositPercent: number): Promise<SettledCheckout | null> {
  if (!isStripeConfigured()) return null;
  const session = await getCheckoutSession(sessionId).catch(() => null);
  if (!session) return null;
  return settleCheckoutSession(session, depositPercent);
}
