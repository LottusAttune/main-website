import { NextResponse } from 'next/server';

import { isDatabaseConfigured, sql } from '@/lib/db';
import { findDiscoveryCallSlotError } from '@/lib/discoveryCalls';
import { sendDiscoveryCallEmails } from '@/lib/email';
import { getSettings } from '@/lib/settings';
import { discoveryCallSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = discoveryCallSchema.safeParse(payload);
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

  // Reject a date or time the owner has closed, even if the client somehow
  // posted one.
  const slotError = findDiscoveryCallSlotError(
    input.callDate,
    input.callTime,
    settings
  );
  if (slotError) {
    return NextResponse.json({ error: slotError }, { status: 409 });
  }

  if (!isDatabaseConfigured()) {
    console.error('[discovery-calls] rejected: no Postgres store is linked');
    return NextResponse.json(
      {
        error:
          'Call booking is not connected yet. Please email us and we will set up a time.',
      },
      { status: 503 }
    );
  }

  try {
    const result = await sql`
      INSERT INTO discovery_calls (
        name, email, phone, company, call_date, call_time, message
      ) VALUES (
        ${input.name}, ${input.email}, ${input.phone ?? null}, ${input.company ?? null},
        ${input.callDate}, ${input.callTime}, ${input.message ?? null}
      )
      RETURNING id, reschedule_token
    `;

    // Best-effort - the row above is already saved regardless of the email.
    await sendDiscoveryCallEmails({
      name: input.name,
      email: input.email,
      company: input.company,
      callDate: input.callDate,
      callTime: input.callTime,
      rescheduleToken: String(result.rows[0]?.reschedule_token),
    });

    return NextResponse.json({ id: result.rows[0]?.id }, { status: 201 });
  } catch (error) {
    // 23505: unique_violation - someone else booked this exact slot a
    // moment ago, after the check above but before this insert.
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
    console.error('[discovery-calls] insert failed:', error);
    return NextResponse.json(
      { error: 'We could not save your request.' },
      { status: 500 }
    );
  }
}
