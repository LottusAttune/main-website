import { NextResponse } from 'next/server';

import { isDatabaseConfigured, sql } from '@/lib/db';
import { quoteFor } from '@/lib/quote';
import { getSettings } from '@/lib/settings';
import { bookingSchema } from '@/lib/validation';

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

  const eligibleDiscount = discount && input.participants >= 2 ? discount : undefined;

  const { total } = quoteFor(
    {
      participants: input.participants,
      teamAddon: input.teamAddon,
      refreshments: input.refreshments,
      percentOff: eligibleDiscount?.percentOff,
      discountLabel: eligibleDiscount?.code,
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
        name, email, phone, message, participants,
        session_date, session_time, session_date_2, session_time_2,
        team_addon, refreshments, discount_code, estimated_total
      ) VALUES (
        ${input.name}, ${input.email}, ${input.phone ?? null}, ${input.message ?? null},
        ${input.participants},
        ${input.sessionDate}, ${input.sessionTime},
        ${input.sessionDate2 ?? null}, ${input.sessionTime2 ?? null},
        ${input.teamAddon}, ${input.refreshments},
        ${eligibleDiscount?.code ?? null}, ${total}
      )
      RETURNING id
    `;

    return NextResponse.json(
      { id: result.rows[0]?.id, total },
      { status: 201 }
    );
  } catch (error) {
    console.error('[bookings] insert failed:', error);
    return NextResponse.json(
      { error: 'We could not save your request.' },
      { status: 500 }
    );
  }
}
