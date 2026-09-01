import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { isSignedIn } from '@/lib/auth';
import {
  deleteCalendarEvent,
  discoveryCallWindow,
  sessionSlotWindow,
  updateCalendarEventTime,
} from '@/lib/calendar';
import { isDatabaseConfigured, sql } from '@/lib/db';
import { STAGE_KEYS } from '@/lib/pipeline';

export const runtime = 'nodejs';

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
      morning: z.boolean(),
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
      case 'moveLead':
        await sql`UPDATE bookings SET status = ${input.status} WHERE id = ${input.id}`;
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
            slot_morning    = ${input.slots.morning},
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
        } else {
          await sql`UPDATE bookings SET status = 'booked' WHERE id = ${input.id}`;
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
