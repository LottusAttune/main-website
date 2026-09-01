import { NextResponse } from 'next/server';

import { isDatabaseConfigured, sql } from '@/lib/db';
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
  const { blockedDates, blockedCallTimes } = await getSettings();

  // Reject dates or specific times the owner has closed, even if the client
  // somehow posted one.
  if (blockedDates.includes(input.callDate)) {
    return NextResponse.json(
      { error: 'That date is no longer available.' },
      { status: 409 }
    );
  }
  if (
    blockedCallTimes.some(
      (entry) => entry.date === input.callDate && entry.time === input.callTime
    )
  ) {
    return NextResponse.json(
      { error: 'That time is no longer available.' },
      { status: 409 }
    );
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
      RETURNING id
    `;

    // Best-effort - the row above is already saved regardless of the email.
    await sendDiscoveryCallEmails({
      name: input.name,
      email: input.email,
      callDate: input.callDate,
      callTime: input.callTime,
    });

    return NextResponse.json({ id: result.rows[0]?.id }, { status: 201 });
  } catch (error) {
    console.error('[discovery-calls] insert failed:', error);
    return NextResponse.json(
      { error: 'We could not save your request.' },
      { status: 500 }
    );
  }
}
