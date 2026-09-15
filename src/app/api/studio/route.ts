import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { isSignedIn } from '@/lib/auth';
import {
  chargeBalance,
  chargeCancellationFee,
  afterPayment,
  sendBookingConfirmation,
  sendBookingReminder,
} from '@/lib/bookings';
import {
  deleteCalendarEvent,
  discoveryCallWindow,
  sessionSlotWindow,
  updateCalendarEventTime,
} from '@/lib/calendar';
import { isDatabaseConfigured, sql } from '@/lib/db';
import {
  ensureBookingDocument,
  ensureGiftDocument,
  generatePdf,
  getDocument,
  logActivity,
  markDocument,
  recordPayment,
  sendDocument,
  updateDocument,
} from '@/lib/documents';
import { balanceDue, STAGE_KEYS, STAGES } from '@/lib/pipeline';

export const runtime = 'nodejs';

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Every studio mutation goes through here, so authentication is enforced in
 * exactly one place and fails closed.
 */
const action = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('moveLead'),
    id: z.string().uuid(),
    status: z.enum(STAGE_KEYS as [string, ...string[]]),
  }),
  z.object({
    action: z.literal('publishSettings'),
    pricing: z.object({
      privateSession: z.coerce.number().int().min(0).max(100_000),
      privatePackage: z.coerce.number().int().min(0).max(100_000),
      perParticipant: z.coerce.number().int().min(0).max(100_000),
      teamAddon: z.coerce.number().int().min(0).max(100_000),
      refreshments: z.coerce.number().int().min(0).max(100_000),
      deposit: z.coerce.number().int().min(0).max(100_000),
    }),
    slots: z.object({
      midday: z.boolean(),
      evening: z.boolean(),
    }),
    leadTimeDays: z.coerce.number().int().min(0).max(365),
  }),
  z.object({
    action: z.literal('toggleBlockedDate'),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    blocked: z.boolean(),
  }),
  z.object({ action: z.literal('clearBlockedDates') }),
  z.object({
    action: z.literal('toggleBlockedCallTime'),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().max(40),
    blocked: z.boolean(),
  }),
  z.object({
    action: z.literal('toggleCode'),
    code: z.string().max(40),
    isActive: z.boolean(),
  }),
  z.object({
    action: z.literal('setGiftStatus'),
    id: z.string().uuid(),
    status: z.enum(['requested', 'active', 'redeemed', 'archived']),
  }),
  z.object({
    action: z.literal('setReviewPublished'),
    id: z.string().uuid(),
    isPublished: z.boolean(),
  }),
  z.object({ action: z.literal('removeReview'), id: z.string().uuid() }),
  z.object({
    action: z.literal('cancelDiscoveryCall'),
    id: z.string().uuid(),
    cancelled: z.boolean(),
  }),
  z.object({ action: z.literal('deleteDiscoveryCall'), id: z.string().uuid() }),
  z.object({
    action: z.literal('editDiscoveryCall'),
    id: z.string().uuid(),
    callDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    callTime: z.string().max(40),
  }),
  z.object({
    action: z.literal('cancelBooking'),
    id: z.string().uuid(),
    cancelled: z.boolean(),
    /** Also charge the late-cancellation fee to the card on file. */
    chargeFee: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('editLead'),
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(60).nullable(),
    company: z.string().trim().max(160).nullable(),
  }),
  z.object({
    action: z.literal('addNote'),
    bookingId: z.string().uuid().optional(),
    giftId: z.string().uuid().optional(),
    body: z.string().trim().min(1).max(4000),
  }),
  z.object({
    action: z.literal('createDocument'),
    bookingId: z.string().uuid(),
    kind: z.enum(['proposal', 'invoice']),
  }),
  z.object({
    action: z.literal('createGiftDocument'),
    giftId: z.string().uuid(),
    kind: z.enum(['invoice', 'certificate']),
  }),
  z.object({ action: z.literal('sendDocument'), id: z.string().uuid() }),
  z.object({ action: z.literal('regeneratePdf'), id: z.string().uuid() }),
  z.object({
    action: z.literal('updateDocument'),
    id: z.string().uuid(),
    lines: z
      .array(z.object({ label: z.string().trim().min(1).max(200), amount: z.coerce.number().int().min(-100_000).max(100_000) }))
      .min(1)
      .max(30),
    notes: z.string().trim().max(2000).nullable(),
    dueOn: isoDay.nullable(),
  }),
  z.object({
    action: z.literal('markDocument'),
    id: z.string().uuid(),
    status: z.enum(['void', 'accepted', 'declined']),
  }),
  z.object({
    action: z.literal('recordPayment'),
    id: z.string().uuid(),
    /** Omit to settle the outstanding balance. */
    amount: z.coerce.number().int().min(1).max(100_000).optional(),
    method: z.enum(['e-transfer', 'cash', 'card', 'other']),
    note: z.string().trim().max(400).nullable().optional(),
  }),
  z.object({ action: z.literal('sendConfirmation'), bookingId: z.string().uuid() }),
  z.object({ action: z.literal('sendReminder'), bookingId: z.string().uuid() }),
  z.object({ action: z.literal('chargeBalance'), bookingId: z.string().uuid() }),
  z.object({ action: z.literal('chargeCancellationFee'), bookingId: z.string().uuid() }),
  z.object({ action: z.literal('deleteGift'), id: z.string().uuid() }),
  z.object({
    action: z.literal('updateBusiness'),
    businessName: z.string().trim().min(1).max(160),
    businessAddress: z.string().trim().max(400),
    businessEmail: z.string().trim().email().max(200),
    businessPhone: z.string().trim().max(60),
    taxLabel: z.string().trim().max(20),
    taxNumber: z.string().trim().max(60),
    taxRatePercent: z.coerce.number().min(0).max(50),
    paymentInstructions: z.string().trim().max(2000),
    invoiceDueDays: z.coerce.number().int().min(0).max(120),
    invoicePrefix: z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9]+$/),
    invoiceFooter: z.string().trim().max(2000),
    proposalIntro: z.string().trim().max(3000),
    proposalValidDays: z.coerce.number().int().min(1).max(120),
    autoSendProposals: z.boolean(),
    autoSendInvoices: z.boolean(),
    cardFeePercent: z.coerce.number().min(0).max(20),
    depositPercent: z.coerce.number().int().min(0).max(100),
    balanceDaysBefore: z.coerce.number().int().min(0).max(60),
    cancellationFee: z.coerce.number().int().min(0).max(10_000),
    cancellationHours: z.coerce.number().int().min(0).max(720),
    cancellationPolicy: z.string().trim().max(3000),
    venueDetails: z.string().trim().max(3000),
    reminderDaysBefore: z.coerce.number().int().min(0).max(30),
  }),
  z.object({ action: z.literal('deleteBooking'), id: z.string().uuid() }),
  z.object({
    action: z.literal('editBooking'),
    id: z.string().uuid(),
    sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sessionTime: z.string().max(40),
    sessionDate2: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    sessionTime2: z.string().max(40).nullable(),
  }),
]);

export async function POST(request: Request) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'No Postgres store is linked.' },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = action.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Unrecognised action.', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  try {
    switch (input.action) {
      case 'moveLead': {
        await sql`UPDATE bookings SET status = ${input.status} WHERE id = ${input.id}`;
        const label = STAGES.find((s) => s.key === input.status)?.label ?? input.status;
        await logActivity({ bookingId: input.id, kind: 'stage', body: `Moved to ${label}` });
        break;
      }

      case 'editLead':
        await sql`
          UPDATE bookings SET name = ${input.name}, email = ${input.email},
            phone = ${input.phone}, company = ${input.company}
          WHERE id = ${input.id}
        `;
        // Paperwork not yet sent follows the corrected details.
        await sql`
          UPDATE documents SET client_name = ${input.name}, client_email = ${input.email},
            client_company = ${input.company}, pdf = NULL, pdf_generated_at = NULL
          WHERE booking_id = ${input.id} AND status = 'draft'
        `;
        break;

      case 'addNote':
        if (!input.bookingId && !input.giftId) {
          return NextResponse.json({ error: 'A note needs a lead or gift.' }, { status: 400 });
        }
        await logActivity({
          bookingId: input.bookingId ?? null,
          giftId: input.giftId ?? null,
          kind: 'note',
          body: input.body,
        });
        break;

      case 'createDocument': {
        const doc = await ensureBookingDocument(input.bookingId, input.kind);
        revalidatePath('/studio');
        return NextResponse.json({ ok: true, id: doc.id });
      }

      case 'createGiftDocument': {
        const doc = await ensureGiftDocument(input.giftId, input.kind);
        revalidatePath('/studio');
        return NextResponse.json({ ok: true, id: doc.id });
      }

      case 'sendDocument': {
        const result = await sendDocument(input.id);
        revalidatePath('/studio');
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
        break;
      }

      case 'regeneratePdf': {
        const doc = await getDocument(input.id);
        if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
        const pdf = await generatePdf(doc);
        if (!pdf) {
          return NextResponse.json(
            { error: 'PDF could not be generated - check PDFSHIFT_API_KEY.' },
            { status: 502 }
          );
        }
        break;
      }

      case 'updateDocument':
        await updateDocument(input.id, {
          lines: input.lines,
          notes: input.notes,
          dueOn: input.dueOn,
        });
        break;

      case 'markDocument': {
        const result = await markDocument(input.id, input.status);
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
        break;
      }

      case 'recordPayment': {
        const doc = await getDocument(input.id);
        if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
        const amount = input.amount ?? balanceDue(doc);
        if (amount <= 0) return NextResponse.json({ error: 'Nothing is outstanding.' }, { status: 400 });
        const { doc: updated } = await recordPayment({
          documentId: doc.id,
          amount,
          method: input.method,
          note: input.note ?? null,
        });
        const kind = updated.status === 'paid' && doc.paidAmount > 0 ? 'balance' : updated.status === 'paid' ? 'payment' : 'deposit';
        await afterPayment(updated, amount, input.method, kind);
        break;
      }

      case 'sendConfirmation': {
        const result = await sendBookingConfirmation(input.bookingId);
        revalidatePath('/studio');
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
        break;
      }

      case 'sendReminder': {
        const result = await sendBookingReminder(input.bookingId);
        revalidatePath('/studio');
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
        break;
      }

      case 'chargeBalance': {
        const result = await chargeBalance(input.bookingId);
        revalidatePath('/studio');
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
        break;
      }

      case 'chargeCancellationFee': {
        const result = await chargeCancellationFee(input.bookingId);
        revalidatePath('/studio');
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
        break;
      }

      case 'deleteGift':
        await sql`DELETE FROM gift_requests WHERE id = ${input.id}`;
        break;

      case 'updateBusiness':
        await sql`
          UPDATE settings SET
            business_name = ${input.businessName},
            business_address = ${input.businessAddress},
            business_email = ${input.businessEmail},
            business_phone = ${input.businessPhone},
            tax_label = ${input.taxLabel},
            tax_number = ${input.taxNumber},
            tax_rate_percent = ${input.taxRatePercent},
            payment_instructions = ${input.paymentInstructions},
            invoice_due_days = ${input.invoiceDueDays},
            invoice_prefix = ${input.invoicePrefix.toUpperCase()},
            invoice_footer = ${input.invoiceFooter},
            proposal_intro = ${input.proposalIntro},
            proposal_valid_days = ${input.proposalValidDays},
            auto_send_proposals = ${input.autoSendProposals},
            auto_send_invoices = ${input.autoSendInvoices},
            card_fee_percent = ${input.cardFeePercent},
            deposit_percent = ${input.depositPercent},
            balance_days_before = ${input.balanceDaysBefore},
            cancellation_fee = ${input.cancellationFee},
            cancellation_hours = ${input.cancellationHours},
            cancellation_policy = ${input.cancellationPolicy},
            venue_details = ${input.venueDetails},
            reminder_days_before = ${input.reminderDaysBefore},
            updated_at = NOW()
          WHERE id = TRUE
        `;
        break;

      case 'publishSettings':
        await sql`
          UPDATE settings SET
            private_session = ${input.pricing.privateSession},
            private_package = ${input.pricing.privatePackage},
            per_participant = ${input.pricing.perParticipant},
            team_addon      = ${input.pricing.teamAddon},
            refreshments    = ${input.pricing.refreshments},
            deposit         = ${input.pricing.deposit},
            slot_midday     = ${input.slots.midday},
            slot_evening    = ${input.slots.evening},
            lead_time_days  = ${input.leadTimeDays},
            updated_at      = NOW()
          WHERE id = TRUE
        `;
        // Published pricing shows on the public pages immediately.
        revalidatePath('/offerings');
        revalidatePath('/gift');
        revalidatePath('/book');
        break;

      case 'toggleBlockedDate':
        if (input.blocked) {
          await sql`INSERT INTO blocked_dates (day) VALUES (${input.day}) ON CONFLICT DO NOTHING`;
        } else {
          await sql`DELETE FROM blocked_dates WHERE day = ${input.day}`;
        }
        revalidatePath('/book');
        break;

      case 'clearBlockedDates':
        await sql`DELETE FROM blocked_dates`;
        revalidatePath('/book');
        break;

      case 'toggleBlockedCallTime':
        if (input.blocked) {
          await sql`INSERT INTO blocked_call_times (call_date, call_time) VALUES (${input.day}, ${input.time}) ON CONFLICT DO NOTHING`;
        } else {
          await sql`DELETE FROM blocked_call_times WHERE call_date = ${input.day} AND call_time = ${input.time}`;
        }
        revalidatePath('/discovery-call');
        break;

      case 'toggleCode':
        await sql`UPDATE discount_codes SET is_active = ${input.isActive} WHERE code = ${input.code}`;
        revalidatePath('/book');
        break;

      case 'setGiftStatus':
        await sql`UPDATE gift_requests SET status = ${input.status} WHERE id = ${input.id}`;
        break;

      case 'setReviewPublished':
        await sql`UPDATE reviews SET is_published = ${input.isPublished} WHERE id = ${input.id}`;
        revalidatePath('/');
        break;

      case 'removeReview':
        await sql`DELETE FROM reviews WHERE id = ${input.id}`;
        revalidatePath('/');
        break;

      case 'cancelDiscoveryCall':
        if (input.cancelled) {
          const existing = await sql`
            SELECT calendar_event_id FROM discovery_calls WHERE id = ${input.id}
          `;
          const eventId = existing.rows[0]?.calendar_event_id;
          if (eventId) await deleteCalendarEvent(String(eventId));
          await sql`
            UPDATE discovery_calls
            SET status = 'cancelled', calendar_event_id = NULL
            WHERE id = ${input.id}
          `;
        } else {
          await sql`UPDATE discovery_calls SET status = 'scheduled' WHERE id = ${input.id}`;
        }
        revalidatePath('/discovery-call');
        break;

      case 'deleteDiscoveryCall': {
        const existing = await sql`
          SELECT calendar_event_id FROM discovery_calls WHERE id = ${input.id}
        `;
        const eventId = existing.rows[0]?.calendar_event_id;
        if (eventId) await deleteCalendarEvent(String(eventId));
        await sql`DELETE FROM discovery_calls WHERE id = ${input.id}`;
        revalidatePath('/discovery-call');
        break;
      }

      case 'editDiscoveryCall':
        try {
          const existing = await sql`
            SELECT calendar_event_id FROM discovery_calls WHERE id = ${input.id}
          `;
          await sql`
            UPDATE discovery_calls
            SET call_date = ${input.callDate}, call_time = ${input.callTime}
            WHERE id = ${input.id}
          `;
          const eventId = existing.rows[0]?.calendar_event_id;
          if (eventId) {
            const { startISO, endISO } = discoveryCallWindow(
              input.callDate,
              input.callTime
            );
            await updateCalendarEventTime(String(eventId), startISO, endISO);
          }
        } catch (error) {
          if (
            error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === '23505'
          ) {
            return NextResponse.json(
              { error: 'That time is already booked.' },
              { status: 409 }
            );
          }
          throw error;
        }
        revalidatePath('/discovery-call');
        break;

      case 'cancelBooking':
        if (input.cancelled) {
          const existing = await sql`
            SELECT calendar_event_id, calendar_event_id_2
            FROM bookings WHERE id = ${input.id}
          `;
          const row = existing.rows[0];
          if (row?.calendar_event_id) {
            await deleteCalendarEvent(String(row.calendar_event_id));
          }
          if (row?.calendar_event_id_2) {
            await deleteCalendarEvent(String(row.calendar_event_id_2));
          }
          await sql`
            UPDATE bookings
            SET status = 'cancelled', calendar_event_id = NULL, calendar_event_id_2 = NULL
            WHERE id = ${input.id}
          `;
          await logActivity({ bookingId: input.id, kind: 'cancelled', body: 'Booking cancelled' });
          if (input.chargeFee) {
            const fee = await chargeCancellationFee(input.id);
            if (!fee.ok) {
              revalidatePath('/studio');
              return NextResponse.json(
                { error: `Cancelled, but the fee was not charged: ${fee.error}` },
                { status: 502 }
              );
            }
          }
        } else {
          await sql`UPDATE bookings SET status = 'booked' WHERE id = ${input.id}`;
          await logActivity({ bookingId: input.id, kind: 'stage', body: 'Booking restored' });
        }
        break;

      case 'deleteBooking': {
        const existing = await sql`
          SELECT calendar_event_id, calendar_event_id_2
          FROM bookings WHERE id = ${input.id}
        `;
        const row = existing.rows[0];
        if (row?.calendar_event_id) {
          await deleteCalendarEvent(String(row.calendar_event_id));
        }
        if (row?.calendar_event_id_2) {
          await deleteCalendarEvent(String(row.calendar_event_id_2));
        }
        await sql`DELETE FROM bookings WHERE id = ${input.id}`;
        break;
      }

      case 'editBooking': {
        const existing = await sql`
          SELECT calendar_event_id, calendar_event_id_2
          FROM bookings WHERE id = ${input.id}
        `;
        await sql`
          UPDATE bookings
          SET session_date = ${input.sessionDate}, session_time = ${input.sessionTime},
              session_date_2 = ${input.sessionDate2}, session_time_2 = ${input.sessionTime2}
          WHERE id = ${input.id}
        `;
        const row = existing.rows[0];
        if (row?.calendar_event_id) {
          const { startISO, endISO } = sessionSlotWindow(
            input.sessionDate,
            input.sessionTime
          );
          await updateCalendarEventTime(String(row.calendar_event_id), startISO, endISO);
        }
        if (row?.calendar_event_id_2 && input.sessionDate2 && input.sessionTime2) {
          const { startISO, endISO } = sessionSlotWindow(
            input.sessionDate2,
            input.sessionTime2
          );
          await updateCalendarEventTime(String(row.calendar_event_id_2), startISO, endISO);
        }
        break;
      }
    }

    revalidatePath('/studio');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[studio] ${input.action} failed:`, error);
    return NextResponse.json({ error: 'That change did not save.' }, { status: 500 });
  }
}
