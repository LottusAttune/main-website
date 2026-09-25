import { after, NextResponse } from 'next/server';

import { createCalendarEvent, sessionSlotWindow } from '@/lib/calendar';
import { isDatabaseConfigured, sql } from '@/lib/db';
import { randomUUID } from 'node:crypto';

import { sendBookingConfirmation } from '@/lib/bookings';
import { createBookingCheckout } from '@/lib/checkout';
import {
  bookingLines,
  insertBookingInvoice,
  logActivity,
  nextNumber,
  prepareBookingInvoice,
  recordPayment,
  redeemGiftCredit,
  referenceTail,
  totalsFor,
  type BookingCtx,
} from '@/lib/documents';
import { sendEtransferRequestEmail, sendNewBookingOwnerNotification } from '@/lib/email';
import { balanceDue } from '@/lib/pipeline';
import { quoteFor } from '@/lib/quote';
import { getSettings } from '@/lib/settings';
import { isSlotAvailable, LOUNGE_MAX, SITE } from '@/lib/site';
import { bookingSchema } from '@/lib/validation';

function venueFor(participants: number): string {
  return participants <= LOUNGE_MAX
    ? 'Private Wellness Lounge'
    : 'Premium Signature Venue';
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(payload);
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
  const startedAt = Date.now();
  const settings = await getSettings();

  // Never trust the total the browser calculated — recompute it here, and only
  // honour a discount code that is currently active and group-eligible.
  const discount = input.discountCode
    ? settings.codes.find(
        (c) => c.code === input.discountCode?.toUpperCase() && c.isActive
      )
    : undefined;

  const eligibleDiscount =
    discount && input.participants >= discount.minParticipants ? discount : undefined;

  const giftCode = input.giftCode ? input.giftCode.trim().toUpperCase() : null;

  const { total, gratuity } = quoteFor(
    {
      participants: input.participants,
      isPackage: input.isPackage,
      isCorporateIntro: input.isCorporateIntro,
      teamAddon: input.teamAddon,
      percentOff: eligibleDiscount?.percentOff,
      amountOff: eligibleDiscount?.amountOff,
      discountLabel: eligibleDiscount?.code,
      discountMinParticipants: eligibleDiscount?.minParticipants,
      gratuityPercent: input.gratuityPercent ?? undefined,
      gratuityAmount: input.gratuityAmount ?? undefined,
    },
    settings.pricing
  );

  // Reject a date/time the owner has closed, or that another booking already
  // holds, even if the client somehow posted one (the calendar itself hides
  // these, but never trust the client alone for a double-booking). The
  // Signature Venue can share a day across different time slots; the
  // Wellness Lounge can't share a day with anything - see isSlotAvailable.
  const datesToCheck: Array<{ date: string; time: string }> = [
    { date: input.sessionDate, time: input.sessionTime },
  ];
  if (input.sessionDate2 && input.sessionTime2) {
    datesToCheck.push({ date: input.sessionDate2, time: input.sessionTime2 });
  }
  const dateUnavailable =
    datesToCheck.some(({ date }) => settings.blockedDates.includes(date)) ||
    datesToCheck.some(
      ({ date, time }) => !isSlotAvailable(date, time, input.participants, settings.bookedSessionSlots)
    );
  if (dateUnavailable) {
    return NextResponse.json(
      { error: 'That date is no longer available.' },
      { status: 409 }
    );
  }

  if (!isDatabaseConfigured()) {
    // Fail loudly rather than accepting a request that goes nowhere.
    console.error('[bookings] rejected: no Postgres store is linked');
    return NextResponse.json(
      {
        error:
          'Online booking is not connected yet. Please email or WhatsApp us and we will reserve your session.',
      },
      { status: 503 }
    );
  }

  // A card attempt isn't real until it's paid - no email, no calendar hold,
  // nothing shown in the studio, until the payment actually lands (see
  // afterPayment). E-transfer is shown right away: choosing it is itself
  // the client's commitment to pay.
  const byCard = input.paymentPlan !== 'etransfer';
  const paymentMethod: 'card' | 'etransfer' = byCard ? 'card' : 'etransfer';

  try {
    // The invoice number is claimed while the booking row is being written,
    // so the two round trips overlap instead of queueing.
    const numberPromise = settings.business.autoSendInvoices
      ? nextNumber('invoice', settings.business.invoicePrefix || 'LA').catch((error) => {
          console.error('[bookings] numbering failed:', error);
          return null;
        })
      : Promise.resolve(null);
    const result = await sql`
      INSERT INTO bookings (
        name, email, phone, company, message, participants,
        session_date, session_time, session_date_2, session_time_2,
        team_addon, is_package, is_corporate_intro,
        discount_code, gratuity, estimated_total, terms_accepted_at, payment_method
      ) VALUES (
        ${input.name}, ${input.email}, ${input.phone ?? null}, ${input.company ?? null}, ${input.message ?? null},
        ${input.participants},
        ${input.sessionDate}, ${input.sessionTime},
        ${input.sessionDate2 ?? null}, ${input.sessionTime2 ?? null},
        ${input.teamAddon}, ${input.isPackage}, ${input.isCorporateIntro},
        ${eligibleDiscount?.code ?? null}, ${gratuity}, ${total}, NOW(), ${paymentMethod}
      )
      RETURNING id, portal_token
    `;

    const bookingId = String(result.rows[0]?.id);
    const portalToken = result.rows[0]?.portal_token ? String(result.rows[0].portal_token) : null;
    const savedAt = Date.now();

    // The invoice and a checkout page for its deposit are made before
    // answering, so the client goes straight on to pay. The database is far
    // from the server, so this is kept to two round trips (the number, the
    // insert) with the Stripe call running alongside the insert; if anything
    // fails they still get the invoice by email.
    let payment: {
      method: 'card' | 'etransfer';
      invoiceNumber: string;
      invoiceTotal: number;
      giftApplied: number;
      /** What's left on the certificate after this booking, for a future one. */
      giftRemaining: number;
      deposit: number | null;
      depositPercent: number;
      checkoutUrl: string | null;
      invoiceUrl: string;
      portalUrl: string | null;
      instructions: string;
    } | null = null;
    if (settings.business.autoSendInvoices) {
      try {
        const booking: BookingCtx = {
          id: bookingId,
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          company: input.company ?? null,
          message: input.message ?? null,
          participants: input.participants,
          sessionDate: input.sessionDate,
          sessionTime: input.sessionTime,
          sessionDate2: input.sessionDate2 ?? null,
          sessionTime2: input.sessionTime2 ?? null,
          teamAddon: input.teamAddon,
          isPackage: input.isPackage,
          isCorporateIntro: input.isCorporateIntro,
          discountCode: eligibleDiscount?.code ?? null,
          gratuity,
          total,
          status: 'new_enquiry',
        };
        const number = await numberPromise;
        if (!number) throw new Error('No invoice number.');
        const id = randomUUID();
        const token = randomUUID();
        // The total is known before the insert: the checkout needs it too.
        const { total: invoiceTotal } = totalsFor(bookingLines(booking, settings), settings.business.taxRatePercent);

        // A gift certificate is applied as a payment against the invoice
        // (never a price discount - tax is still charged on the full
        // amount), so it has to land before the checkout is created: the
        // checkout must ask for what is actually still owed, not the full
        // total. That means this can't run in parallel with the insert the
        // way the no-gift-code path does below.
        let checkout: { url: string; amount: number; plan: 'deposit' | 'full' } | null = null;
        let giftApplied = 0;
        let giftRemaining = 0;
        if (giftCode) {
          await insertBookingInvoice({ id, token, number, booking, settings, paymentPlan: input.paymentPlan === 'deposit' ? 'deposit' : 'full' });
          const redeemed = await redeemGiftCredit(giftCode, id);
          giftApplied = redeemed.applied;
          giftRemaining = redeemed.remainingAfter;
          if (giftApplied <= 0) {
            // The client already validated this code before submitting -
            // getting here means it was used up or voided in the meantime.
            // Charge the full amount rather than fail the booking outright,
            // but leave a clear trail so it doesn't just vanish unnoticed.
            await logActivity({
              bookingId,
              kind: 'email_failed',
              body: `Gift certificate ${giftCode} could not be applied: ${redeemed.error ?? 'no credit available'}`,
            });
          }
          const dueNow = invoiceTotal - giftApplied;
          checkout =
            byCard && dueNow > 0
              ? await createBookingCheckout(
                  { id, kind: 'invoice', number, total: invoiceTotal, paidAmount: giftApplied, bookingId, clientEmail: input.email, token },
                  settings.business,
                  input.paymentPlan === 'full' ? 'full' : 'deposit',
                  booking
                )
              : null;
        } else {
          const [, created] = await Promise.all([
            insertBookingInvoice({ id, token, number, booking, settings, paymentPlan: input.paymentPlan === 'deposit' ? 'deposit' : 'full' }),
            byCard
              ? createBookingCheckout(
                  { id, kind: 'invoice', number, total: invoiceTotal, paidAmount: 0, bookingId, clientEmail: input.email, token },
                  settings.business,
                  input.paymentPlan === 'full' ? 'full' : 'deposit',
                  booking
                )
              : Promise.resolve(null),
          ]);
          checkout = created;
        }

        payment = {
          method: byCard ? 'card' : 'etransfer',
          invoiceNumber: number,
          invoiceTotal,
          giftApplied,
          giftRemaining,
          // E-transfer is always the full amount: nothing left to chase later.
          deposit: byCard && checkout?.plan === 'deposit' ? checkout.amount : null,
          depositPercent: settings.business.depositPercent,
          checkoutUrl: checkout?.url ?? null,
          invoiceUrl: `${SITE.url}/d/${token}`,
          portalUrl: portalToken ? `${SITE.url}/portal/${portalToken}` : null,
          instructions: settings.business.paymentInstructions,
        };
      } catch (error) {
        console.error('[bookings] invoice failed:', error);
      }
    }
    console.log(`[bookings] saved in ${savedAt - startedAt}ms, invoice+checkout in ${Date.now() - savedAt}ms`);

    // Everything below is best-effort and slow (calendar, emails, a PDF
    // render): it runs after the response so the form confirms in seconds
    // instead of thirty. The row above is already saved regardless.
    after(async () => {
      const venue = venueFor(input.participants);
      const description = [
        `Email: ${input.email}`,
        input.phone ? `Phone: ${input.phone}` : null,
        input.company ? `Company: ${input.company}` : null,
        `Participants: ${input.participants}`,
        input.isPackage ? 'Package of four sessions' : null,
        input.isCorporateIntro ? 'Corporate introductory session' : null,
        input.teamAddon ? 'Team-building add-on: yes' : null,
        gratuity > 0 ? `Gratuity: $${gratuity}` : null,
        input.message ? `Message: ${input.message}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      await logActivity({ bookingId, kind: 'received', body: 'Booking request received from the website' });
      await logActivity({ bookingId, kind: 'terms_accepted', body: 'Terms & Conditions and cancellation policy accepted on the booking form' });

      // No email goes to the client yet — they only hear from us once
      // payment actually lands (see afterPayment in lib/bookings.ts). This
      // just warms the invoice's payment links and PDF cache so the Stripe
      // receipt and the invoice page are both ready the moment they pay.
      let invoiceSummary: { number: string; total: number; deposit: number | null } | null = null;
      // A card attempt only "activates" (owner notified, calendar held)
      // once it's actually paid - see afterPayment in lib/bookings.ts,
      // which does both the moment the payment lands. Everything else
      // (e-transfer, a comped $0 invoice, or no invoicing at all) is
      // already resolved or was never waiting on Stripe, so it activates
      // immediately, same as before.
      let activateNow = !byCard || !settings.business.autoSendInvoices;
      if (settings.business.autoSendInvoices) {
        try {
          const prepared = await prepareBookingInvoice(bookingId, settings);
          invoiceSummary = { number: prepared.number, total: prepared.total, deposit: prepared.deposit };
          // A discount code can cover the whole invoice, or a gift
          // certificate's credit can cover what's left of it (recorded as a
          // payment already, at creation, in redeemGiftCredit) - either way
          // there is no payment left to wait for, so settle it and confirm
          // right away rather than leaving the booking stuck forever
          // waiting for a Stripe or e-transfer payment that will never come.
          if (balanceDue(prepared.doc) <= 0) {
            if (prepared.doc.paidAmount <= 0) {
              await recordPayment({
                documentId: prepared.doc.id,
                amount: 0,
                method: 'other',
                kind: 'payment',
                note: 'Comped — a discount code covered the full amount; nothing owed.',
              });
            }
            await sendBookingConfirmation(bookingId);
            activateNow = true;
          } else if (payment?.method === 'etransfer') {
            // The only thing an e-transfer client hears before paying: a
            // plain ask, never called an invoice and never carrying a PDF -
            // that's reserved for the one that says "paid". The amount is
            // the invoice's real remaining balance, not the pre-gift-credit
            // total - a certificate may have already covered part of it.
            const sent = await sendEtransferRequestEmail({
              to: input.email,
              name: input.name,
              amount: balanceDue(prepared.doc),
              reference: referenceTail(payment.invoiceNumber),
              sessionDate: input.sessionDate,
              sessionTime: input.sessionTime,
            });
            if (!sent.ok) {
              await logActivity({ bookingId, kind: 'email_failed', body: `E-transfer request: ${sent.error}` });
            }
          }
        } catch (error) {
          console.error('[bookings] invoice failed:', error);
          await logActivity({ bookingId, kind: 'email_failed', body: `Invoice could not be prepared: ${error instanceof Error ? error.message : 'unknown error'}` });
        }
      }

      if (activateNow) {
        const ownerEmail = await sendNewBookingOwnerNotification({
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          company: input.company ?? null,
          message: input.message ?? null,
          participants: input.participants,
          sessionDate: input.sessionDate,
          sessionTime: input.sessionTime,
          sessionDate2: input.sessionDate2 ?? null,
          sessionTime2: input.sessionTime2 ?? null,
          total,
          venue,
          teamAddon: input.teamAddon,
          studioUrl: `${SITE.url}/studio`,
          invoice: invoiceSummary,
        });
        if (!ownerEmail.ok) {
          await logActivity({ bookingId, kind: 'email_failed', body: `Owner notification: ${ownerEmail.error}` });
        }

        try {
          const firstWindow = sessionSlotWindow(input.sessionDate, input.sessionTime);
          const eventId = await createCalendarEvent({
            summary: `Lotus Attune Session — ${input.name}`,
            description,
            location: venue,
            startISO: firstWindow.startISO,
            endISO: firstWindow.endISO,
          });
          let eventId2: string | null = null;
          if (input.sessionDate2 && input.sessionTime2) {
            const secondWindow = sessionSlotWindow(input.sessionDate2, input.sessionTime2);
            eventId2 = await createCalendarEvent({
              summary: `Lotus Attune Session (session 2) — ${input.name}`,
              description,
              location: venue,
              startISO: secondWindow.startISO,
              endISO: secondWindow.endISO,
            });
          }
          if (eventId || eventId2) {
            await sql`
              UPDATE bookings
              SET calendar_event_id = ${eventId}, calendar_event_id_2 = ${eventId2}
              WHERE id = ${bookingId}
            `;
          }
        } catch (error) {
          console.error('[bookings] calendar event failed:', error);
        }
      }
    });

    return NextResponse.json({ id: result.rows[0]?.id, total, payment }, { status: 201 });
  } catch (error) {
    console.error('[bookings] insert failed:', error);
    return NextResponse.json(
      { error: 'We could not save your request.' },
      { status: 500 }
    );
  }
}
