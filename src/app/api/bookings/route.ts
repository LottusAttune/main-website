import { after, NextResponse } from 'next/server';

import { createCalendarEvent, sessionSlotWindow } from '@/lib/calendar';
import { isDatabaseConfigured, sql } from '@/lib/db';
import { FAQS } from '@/data/content';
import { createBookingCheckout } from '@/lib/checkout';
import {
  ensureBookingDocument,
  logActivity,
  markDocumentSent,
  prepareBookingInvoice,
  publicUrl,
  type InvoiceEmailPart,
} from '@/lib/documents';
import { sendBookingRequestEmails } from '@/lib/email';
import { quoteFor } from '@/lib/quote';
import { getSettings } from '@/lib/settings';
import { LOUNGE_MAX, SITE } from '@/lib/site';
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

  const { total, gratuity } = quoteFor(
    {
      participants: input.participants,
      isPackage: input.isPackage,
      isCorporateIntro: input.isCorporateIntro,
      teamAddon: input.teamAddon,
      refreshments: input.refreshments,
      percentOff: eligibleDiscount?.percentOff,
      amountOff: eligibleDiscount?.amountOff,
      discountLabel: eligibleDiscount?.code,
      discountMinParticipants: eligibleDiscount?.minParticipants,
      gratuityPercent: input.gratuityPercent ?? undefined,
      gratuityAmount: input.gratuityAmount ?? undefined,
    },
    settings.pricing
  );

  // Reject dates the owner has closed, even if the client somehow posted one.
  if (settings.blockedDates.includes(input.sessionDate)) {
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
          'Online booking is not connected yet. Please email or call us and we will reserve your session.',
      },
      { status: 503 }
    );
  }

  try {
    const result = await sql`
      INSERT INTO bookings (
        name, email, phone, company, message, participants,
        session_date, session_time, session_date_2, session_time_2,
        team_addon, refreshments, is_package, is_corporate_intro,
        discount_code, gratuity, estimated_total, terms_accepted_at
      ) VALUES (
        ${input.name}, ${input.email}, ${input.phone ?? null}, ${input.company ?? null}, ${input.message ?? null},
        ${input.participants},
        ${input.sessionDate}, ${input.sessionTime},
        ${input.sessionDate2 ?? null}, ${input.sessionTime2 ?? null},
        ${input.teamAddon}, ${input.refreshments}, ${input.isPackage}, ${input.isCorporateIntro},
        ${eligibleDiscount?.code ?? null}, ${gratuity}, ${total}, NOW()
      )
      RETURNING id
    `;

    const bookingId = String(result.rows[0]?.id);

    // The invoice and a checkout page for its deposit are made before
    // answering, so the client goes straight on to pay. One Stripe call and
    // two inserts; if anything fails they still get the invoice by email.
    let payment: {
      invoiceNumber: string;
      invoiceTotal: number;
      deposit: number | null;
      depositPercent: number;
      checkoutUrl: string | null;
      invoiceUrl: string;
    } | null = null;
    if (settings.business.autoSendInvoices) {
      try {
        const doc = await ensureBookingDocument(bookingId, 'invoice', settings, { mintLinks: false });
        const checkout = await createBookingCheckout(doc, settings.business);
        payment = {
          invoiceNumber: doc.number,
          invoiceTotal: doc.total,
          deposit: checkout?.plan === 'deposit' ? checkout.amount : null,
          depositPercent: settings.business.depositPercent,
          checkoutUrl: checkout?.url ?? null,
          invoiceUrl: publicUrl(doc),
        };
      } catch (error) {
        console.error('[bookings] invoice failed:', error);
      }
    }

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

      // The invoice (deposit to confirm the date) travels in the same email
      // as the confirmation, so the client gets exactly one message.
      let invoice: InvoiceEmailPart | null = null;
      if (settings.business.autoSendInvoices) {
        try {
          invoice = await prepareBookingInvoice(bookingId, settings);
        } catch (error) {
          console.error('[bookings] invoice failed:', error);
          await logActivity({ bookingId, kind: 'email_failed', body: `Invoice could not be prepared: ${error instanceof Error ? error.message : 'unknown error'}` });
        }
      }

      const emails = await sendBookingRequestEmails({
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
        studioUrl: `${SITE.url}/studio`,
        cancellationPolicy:
          settings.business.cancellationPolicy || (FAQS.find((f) => f.q === 'Cancellation Policy')?.a ?? ''),
        invoice,
      });
      if (!emails.client.ok) {
        await logActivity({ bookingId, kind: 'email_failed', body: `Request confirmation email: ${emails.client.error}` });
      } else if (invoice) {
        await markDocumentSent(invoice.doc, Boolean(invoice.pdf));
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
