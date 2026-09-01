import { NextResponse } from 'next/server';

import { discoveryCallWindow, updateCalendarEventTime } from '@/lib/calendar';
import { isDatabaseConfigured, sql } from '@/lib/db';
import {
  findDiscoveryCallSlotError,
  getDiscoveryCallByToken,
} from '@/lib/discoveryCalls';
import { sendDiscoveryCallEmails } from '@/lib/email';
import { getSettings } from '@/lib/settings';
import { rescheduleCallSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = rescheduleCallSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please choose a date and a time.' },
      { status: 400 }
    );
  }

  const input = parsed.data;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Rescheduling is not connected yet. Please email us.' },
      { status: 503 }
    );
  }

  const existing = await getDiscoveryCallByToken(input.token);
  if (!existing) {
    return NextResponse.json(
      { error: 'This reschedule link is invalid or has expired.' },
      { status: 404 }
    );
  }

  const settings = await getSettings();
  const slotError = findDiscoveryCallSlotError(
    input.callDate,
    input.callTime,
    settings,
    existing.id
  );
  if (slotError) {
    return NextResponse.json({ error: slotError }, { status: 409 });
  }

  try {
    await sql`
      UPDATE discovery_calls
      SET call_date = ${input.callDate}, call_time = ${input.callTime}
      WHERE reschedule_token = ${input.token}
    `;

    // Best-effort - the row above is already saved regardless of the email.
    await sendDiscoveryCallEmails({
      name: existing.name,
      email: existing.email,
      company: existing.company,
      callDate: input.callDate,
      callTime: input.callTime,
      rescheduleToken: input.token,
      rescheduled: true,
    });

    // Best-effort - same reasoning as the email above.
    if (existing.calendarEventId) {
      const { startISO, endISO } = discoveryCallWindow(input.callDate, input.callTime);
      await updateCalendarEventTime(existing.calendarEventId, startISO, endISO);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // 23505: unique_violation - someone else booked this exact slot a
    // moment ago, after the check above but before this update.
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === '23505'
    ) {
      return NextResponse.json(
        { error: 'That time is already booked - please choose another.' },
        { status: 409 }
      );
    }
    console.error('[discovery-calls] reschedule failed:', error);
    return NextResponse.json(
      { error: 'We could not save your new time.' },
      { status: 500 }
    );
  }
}
