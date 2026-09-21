import { after, NextResponse } from 'next/server';

import { isDatabaseConfigured, sql } from '@/lib/db';
import { generateGiftCode } from '@/lib/gift-code';
import { giftQuoteFor } from '@/lib/quote';
import { createGiftCheckout } from '@/lib/checkout';
import { ensureGiftDocument, issueGiftCertificate, logActivity, recordPayment, referenceTail, sendDocument } from '@/lib/documents';
import { sendEtransferRequestEmail, sendOwnerNotification } from '@/lib/email';
import { getSettings } from '@/lib/settings';
import { money, SITE } from '@/lib/site';
import { giftSchema } from '@/lib/validation';

const MAX_CODE_ATTEMPTS = 5;

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = giftSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Please check the highlighted fields.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const settings = await getSettings();
  const { pricing, codes } = settings;

  // Never trust the discount the browser applied - only honour a code that
  // is currently active and meets its own participant minimum.
  const discount = input.discountCode
    ? codes.find((c) => c.code === input.discountCode?.toUpperCase() && c.isActive)
    : undefined;
  const discountPeople = input.format === 'group' ? input.participants : 1;
  const eligibleDiscount =
    discount && discountPeople >= discount.minParticipants ? discount : undefined;

  // Recomputed server-side; the browser's figure is never trusted.
  const { total, gratuity } = giftQuoteFor(
    {
      ...input,
      percentOff: eligibleDiscount?.percentOff,
      amountOff: eligibleDiscount?.amountOff,
      discountLabel: eligibleDiscount?.code,
      discountMinParticipants: eligibleDiscount?.minParticipants,
      gratuityPercent: input.gratuityPercent ?? undefined,
      gratuityAmount: input.gratuityAmount ?? undefined,
    },
    pricing
  );

  if (!isDatabaseConfigured()) {
    console.error('[gifts] rejected: no Postgres store is linked');
    return NextResponse.json(
      {
        error:
          'Gift requests are not connected yet. Please email us and we will prepare your certificate.',
      },
      { status: 503 }
    );
  }

  // Collisions are astronomically unlikely (32^6 possible codes) but the
  // unique index makes them a hard failure rather than a silent duplicate,
  // so a couple of retries with a freshly generated code is enough.
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateGiftCode();
    try {
      const result = await sql`
        INSERT INTO gift_requests (
          recipient_name, recipient_email, buyer_name, buyer_email, format, sessions, participants, addons,
          discount_code, code, total, gratuity
        ) VALUES (
          ${input.recipientName}, ${input.recipientEmail ?? null}, ${input.buyerName}, ${input.buyerEmail}, ${input.format},
          ${input.format === 'private' ? input.sessions : null},
          ${input.format === 'group' ? input.participants : null},
          ${JSON.stringify(input.addons)}::jsonb,
          ${eligibleDiscount?.code ?? null},
          ${code},
          ${total},
          ${gratuity}
        )
        RETURNING id
      `;

      const giftId = String(result.rows[0]?.id);

      // The invoice and a full-payment checkout are made before answering,
      // so the buyer goes straight on to pay; the certificate follows the
      // payment automatically.
      let payment: {
        method: 'card' | 'etransfer';
        invoiceNumber: string;
        invoiceTotal: number;
        checkoutUrl: string | null;
        invoiceUrl: string;
        instructions: string;
      } | null = null;
      let invoiceId: string | null = null;
      try {
        const doc = await ensureGiftDocument(giftId, 'invoice', settings, { mintLinks: false });
        invoiceId = doc.id;
        const checkout =
          input.paymentPlan === 'etransfer'
            ? null
            : await createGiftCheckout(doc, settings.business, {
                recipientName: input.recipientName,
                buyerEmail: input.buyerEmail,
              });
        payment = {
          method: input.paymentPlan === 'etransfer' ? 'etransfer' : 'card',
          invoiceNumber: doc.number,
          invoiceTotal: doc.total,
          checkoutUrl: checkout?.url ?? null,
          invoiceUrl: `${SITE.url}/d/${doc.token}`,
          instructions: settings.business.paymentInstructions,
        };
      } catch (error) {
        console.error('[gifts] invoice failed:', error);
      }

      after(async () => {
        await logActivity({ giftId, kind: 'received', body: 'Gift certificate requested from the website' });
        if (invoiceId && settings.business.autoSendInvoices && total > 0) {
          // E-transfer gets a plain ask to pay, never called an invoice and
          // never carrying a PDF - that's reserved for the one that says
          // "paid" once the certificate itself goes out. Card already sends
          // the buyer straight to Stripe, so the invoice email there is
          // just their own copy of what they're paying, not an ask.
          const sent =
            payment?.method === 'etransfer'
              ? await sendEtransferRequestEmail({
                  to: input.buyerEmail,
                  name: input.buyerName,
                  amount: total,
                  reference: referenceTail(payment.invoiceNumber),
                  giftRecipient: input.recipientName,
                  instructions: payment.instructions,
                })
              : await sendDocument(invoiceId);
          if (!sent.ok) await logActivity({ giftId, documentId: invoiceId, kind: 'email_failed', body: `Gift invoice: ${sent.error}` });
        }
        // A discount code can cover the whole gift - there is no payment
        // left to wait for, so settle it and issue the certificate right
        // away rather than leaving it stuck waiting for a payment that will
        // never happen.
        if (invoiceId && total <= 0) {
          await recordPayment({
            documentId: invoiceId,
            amount: 0,
            method: 'other',
            kind: 'payment',
            note: 'Comped — a discount code covered the full amount; nothing owed.',
          });
          const issued = await issueGiftCertificate(giftId);
          if (!issued.ok) await logActivity({ giftId, documentId: invoiceId, kind: 'email_failed', body: `Certificate: ${issued.error}` });
        }
        await sendOwnerNotification({
          subject: `New gift certificate request: ${input.buyerName} for ${input.recipientName}, ${money(total)}`,
          html: `<p style="margin:0 0 8px;">${input.buyerName} (${input.buyerEmail}) is buying a ${money(total)} gift certificate for ${input.recipientName}${input.recipientEmail ? ` (${input.recipientEmail})` : ''}.</p><p style="margin:0;">${payment?.checkoutUrl ? 'They were sent to the card checkout; the certificate goes out on its own once paid.' : 'The invoice went to them by email.'}</p>`,
        });
      });

      return NextResponse.json({ id: giftId, code, total, payment }, { status: 201 });
    } catch (error) {
      const isCodeCollision =
        error instanceof Error &&
        'code' in error &&
        (error as { code?: string }).code === '23505';
      if (isCodeCollision && attempt < MAX_CODE_ATTEMPTS) continue;

      console.error('[gifts] insert failed:', error);
      return NextResponse.json(
        { error: 'We could not save your request.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: 'We could not save your request.' },
    { status: 500 }
  );
}
