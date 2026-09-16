import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stripe over its plain REST API - no SDK, same as the Google Calendar
 * integration. Everything here is optional: without STRIPE_SECRET_KEY the
 * invoices simply carry e-transfer instructions and no card buttons.
 *
 * Keys: Stripe dashboard → Developers → API keys (STRIPE_SECRET_KEY) and
 * Developers → Webhooks → endpoint /api/stripe/webhook (STRIPE_WEBHOOK_SECRET).
 */

const API = 'https://api.stripe.com/v1';

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

type Json = Record<string, unknown>;

/** Flattens nested objects/arrays into Stripe's form encoding (a[b][0][c]=v). */
function encode(params: Record<string, unknown>, prefix = ''): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          parts.push(...encode(item as Record<string, unknown>, `${name}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === 'object') {
      parts.push(...encode(value as Record<string, unknown>, name));
    } else {
      parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

export class StripeError extends Error {}

async function stripe(
  method: 'GET' | 'POST',
  path: string,
  params?: Record<string, unknown>,
  idempotencyKey?: string
): Promise<Json> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError('Stripe is not connected - STRIPE_SECRET_KEY is not set.');

  const body = params ? encode(params).join('&') : undefined;
  const response = await fetch(`${API}${path}${method === 'GET' && body ? `?${body}` : ''}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: method === 'POST' ? body : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await response.json()) as Json & { error?: { message?: string } };
  if (!response.ok) {
    throw new StripeError(data.error?.message ?? `Stripe returned ${response.status}`);
  }
  return data;
}

export type PaymentLinkInput = {
  /** Shown on the Stripe page and the client's statement. */
  description: string;
  /** Whole dollars. */
  amount: number;
  /** Whole dollars, shown as its own line. 0 to omit. */
  feeAmount: number;
  feeLabel: string;
  currency?: string;
  metadata: Record<string, string>;
  /** Where Stripe sends the client after paying. */
  redirectUrl: string;
  /** Keep the card for the balance / cancellation fee. */
  saveCard: boolean;
};

/**
 * A permanent Stripe Payment Link for one document. Payment Links never
 * expire, so the same link can sit in the PDF, the email and the online
 * view for weeks.
 */
export async function createPaymentLink(input: PaymentLinkInput): Promise<{ id: string; url: string }> {
  const currency = (input.currency ?? 'cad').toLowerCase();
  const lineItems: Array<Record<string, unknown>> = [
    {
      price_data: {
        currency,
        unit_amount: Math.round(input.amount * 100),
        product_data: { name: input.description },
      },
      quantity: 1,
    },
  ];
  if (input.feeAmount > 0) {
    lineItems.push({
      price_data: {
        currency,
        unit_amount: Math.round(input.feeAmount * 100),
        product_data: { name: input.feeLabel },
      },
      quantity: 1,
    });
  }

  // Payment Links need Price objects; create them inline first.
  const prices = await Promise.all(
    lineItems.map((item) =>
      stripe('POST', '/prices', item.price_data as Record<string, unknown>)
    )
  );

  const link = await stripe('POST', '/payment_links', {
    line_items: prices.map((price) => ({ price: price.id, quantity: 1 })),
    metadata: input.metadata,
    payment_intent_data: {
      metadata: input.metadata,
      ...(input.saveCard ? { setup_future_usage: 'off_session' } : {}),
      description: input.description,
    },
    after_completion: { type: 'redirect', redirect: { url: input.redirectUrl } },
    customer_creation: 'always',
    billing_address_collection: 'auto',
  });
  return { id: String(link.id), url: String(link.url) };
}

export type CheckoutInput = {
  description: string;
  /** Whole dollars. */
  amount: number;
  feeAmount: number;
  feeLabel: string;
  currency?: string;
  customerEmail: string;
  metadata: Record<string, string>;
  /** May contain the literal {CHECKOUT_SESSION_ID}, which Stripe fills in. */
  successUrl: string;
  cancelUrl: string;
  saveCard: boolean;
};

/**
 * A one-off hosted checkout page for a single payment: the client lands
 * on it straight from the booking form, with their email filled in, and
 * comes back to the site when done. Expires on its own after 24 hours.
 */
export async function createCheckoutSession(input: CheckoutInput): Promise<{ id: string; url: string }> {
  const currency = (input.currency ?? 'cad').toLowerCase();
  const lineItems: Array<Record<string, unknown>> = [
    {
      price_data: { currency, unit_amount: Math.round(input.amount * 100), product_data: { name: input.description } },
      quantity: 1,
    },
  ];
  if (input.feeAmount > 0) {
    lineItems.push({
      price_data: { currency, unit_amount: Math.round(input.feeAmount * 100), product_data: { name: input.feeLabel } },
      quantity: 1,
    });
  }
  const session = await stripe('POST', '/checkout/sessions', {
    mode: 'payment',
    line_items: lineItems,
    customer_email: input.customerEmail,
    customer_creation: 'always',
    billing_address_collection: 'auto',
    metadata: input.metadata,
    payment_intent_data: {
      metadata: input.metadata,
      description: input.description,
      ...(input.saveCard ? { setup_future_usage: 'off_session' } : {}),
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
  return { id: String(session.id), url: String(session.url) };
}

export async function deactivatePaymentLink(id: string): Promise<void> {
  await stripe('POST', `/payment_links/${id}`, { active: false }).catch(() => {});
}

/**
 * Charges a saved card without the client present - the deposit-plan balance
 * before the session, or the late-cancellation fee. Returns the PaymentIntent
 * id on success; throws a StripeError with Stripe's own message otherwise
 * (declined, authentication required, card removed...).
 */
export async function chargeSavedCard(input: {
  customerId: string;
  paymentMethodId: string;
  amount: number;
  description: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
  currency?: string;
}): Promise<string> {
  const intent = await stripe(
    'POST',
    '/payment_intents',
    {
      amount: Math.round(input.amount * 100),
      currency: (input.currency ?? 'cad').toLowerCase(),
      customer: input.customerId,
      payment_method: input.paymentMethodId,
      off_session: true,
      confirm: true,
      description: input.description,
      metadata: input.metadata,
    },
    input.idempotencyKey
  );
  if (intent.status !== 'succeeded') {
    throw new StripeError(`Payment ${String(intent.status)} - Stripe did not complete the charge.`);
  }
  return String(intent.id);
}

export async function getPaymentIntent(id: string): Promise<Json> {
  return stripe('GET', `/payment_intents/${id}`);
}

export async function getCheckoutSession(id: string): Promise<Json> {
  return stripe('GET', `/checkout/sessions/${id}`);
}

/**
 * Verifies a webhook the way Stripe's SDK does: HMAC-SHA256 of
 * "<timestamp>.<raw body>" with the endpoint secret, compared in constant
 * time, and rejected if older than five minutes.
 */
export function verifyWebhook(rawBody: string, signatureHeader: string | null): Json | null {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return null;

  const pairs = signatureHeader.split(',').map((part) => part.split('=') as [string, string]);
  const timestamp = pairs.find(([k]) => k === 't')?.[1];
  // Several v1 signatures are present while a secret is being rotated.
  const signatures = pairs.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return null;

  const expected = Buffer.from(
    createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  );
  const valid = signatures.some((signature) => {
    const given = Buffer.from(signature);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!valid) return null;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return null;

  try {
    return JSON.parse(rawBody) as Json;
  } catch {
    return null;
  }
}
