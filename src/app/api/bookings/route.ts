import { NextResponse } from 'next/server';

import { createCalendarEvent, sessionSlotWindow } from '@/lib/calendar';
import { isDatabaseConfigured, sql } from '@/lib/db';
import { quoteFor } from '@/lib/quote';
import { getSettings } from '@/lib/settings';
import { LOUNGE_MAX } from '@/lib/site';
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
        error: 'Please fill the highlighted fields.',
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

  const { total, gratuity } = quoteFor(
    {
      participants: input.participants,
      isPackage: input.isPackage,
      isCorporateIntro: input.isCorporateIntro,
      teamAddon: input.teamAddon,
      refreshments: input.refreshments,
      percentOff: eligibleDiscount?.percentOff,
      discountLabel: eligibleDiscount?.code,
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
        discount_code, gratuity, estimated_total
      ) VALUES (
        ${input.name}, ${input.email}, ${input.phone ?? null}, ${input.company ?? null}, ${input.message ?? null},
        ${input.participants},
        ${input.sessionDate}, ${input.sessionTime},
        ${input.sessionDate2 ?? null}, ${input.sessionTime2 ?? null},
        ${input.teamAddon}, ${input.refreshments}, ${input.isPackage}, ${input.isCorporateIntro},
        ${eligibleDiscount?.code ?? null}, ${gratuity}, ${total}
      )
      RETURNING id
    `;

    // Best-effort - the row above is already saved regardless of this.
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
        WHERE id = ${result.rows[0]?.id}
      `;
    }

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
