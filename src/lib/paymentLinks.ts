import 'server-only';

import { sql } from '@/lib/db';
import type { PaymentLinkRow } from '@/lib/pipeline';
import { getSettings } from '@/lib/settings';
import { money, SITE } from '@/lib/site';
import { createPaymentLink, deactivatePaymentLink } from '@/lib/stripe';

/**
 * Stand-alone Stripe links Silvana makes herself - a deposit agreed on the
 * phone, a workshop, a custom package. Not tied to an invoice; the webhook
 * marks them paid by the id carried in the link's metadata.
 */

type Row = Record<string, unknown>;

export function paymentLinkFromRow(row: Row): PaymentLinkRow {
  return {
    id: String(row.id),
    description: String(row.description),
    amount: Number(row.amount),
    clientName: row.client_name ? String(row.client_name) : null,
    clientEmail: row.client_email ? String(row.client_email) : null,
    url: String(row.url),
    isActive: Boolean(row.is_active),
    paidAt: row.paid_at ? new Date(String(row.paid_at)).toISOString() : null,
    paidCount: Number(row.paid_count ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function createAdhocPaymentLink(input: {
  description: string;
  amount: number;
  clientName?: string | null;
  clientEmail?: string | null;
  addCardFee: boolean;
}): Promise<PaymentLinkRow> {
  const { business } = await getSettings();
  const inserted = await sql`
    INSERT INTO payment_links (description, amount, client_name, client_email, stripe_link_id, url)
    VALUES (${input.description}, ${input.amount}, ${input.clientName ?? null}, ${input.clientEmail ?? null}, 'pending', 'pending')
    RETURNING id
  `;
  const id = String(inserted.rows[0].id);
  try {
    const fee = input.addCardFee ? Math.round((input.amount * business.cardFeePercent) / 100) : 0;
    const link = await createPaymentLink({
      description: `${business.businessName} — ${input.description}`,
      amount: input.amount,
      feeAmount: fee,
      feeLabel: `Card processing fee (${business.cardFeePercent}%)`,
      metadata: { paymentLinkId: id, amount: String(input.amount) },
      redirectUrl: `${SITE.url}/?paid=1`,
      saveCard: false,
    });
    await sql`UPDATE payment_links SET stripe_link_id = ${link.id}, url = ${link.url} WHERE id = ${id}`;
  } catch (error) {
    await sql`DELETE FROM payment_links WHERE id = ${id}`;
    throw error;
  }
  const row = await sql`SELECT * FROM payment_links WHERE id = ${id}`;
  return paymentLinkFromRow(row.rows[0]);
}

export async function deactivateAdhocPaymentLink(id: string): Promise<void> {
  const row = await sql`SELECT stripe_link_id FROM payment_links WHERE id = ${id}`;
  const stripeId = row.rows[0]?.stripe_link_id;
  if (stripeId && stripeId !== 'pending') await deactivatePaymentLink(String(stripeId));
  await sql`UPDATE payment_links SET is_active = FALSE WHERE id = ${id}`;
}

/** Called by the Stripe webhook when a checkout for one of these completes. */
export async function recordAdhocPayment(id: string, sessionId: string | null): Promise<PaymentLinkRow | null> {
  const row = await sql`SELECT * FROM payment_links WHERE id = ${id}`;
  if (!row.rows[0]) return null;
  const link = paymentLinkFromRow(row.rows[0]);
  await sql`
    INSERT INTO payments (amount, method, kind, stripe_checkout_session, note)
    VALUES (${link.amount}, 'card', 'payment', ${sessionId}, ${`Payment link: ${link.description}${link.clientName ? ` (${link.clientName})` : ''}`})
  `;
  await sql`
    UPDATE payment_links SET paid_at = COALESCE(paid_at, NOW()), paid_count = paid_count + 1 WHERE id = ${id}
  `;
  return { ...link, paidAt: link.paidAt ?? new Date().toISOString(), paidCount: link.paidCount + 1 };
}

export function describeAmount(link: PaymentLinkRow): string {
  return `${money(link.amount)} · ${link.description}`;
}
