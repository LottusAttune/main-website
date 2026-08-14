import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { isSignedIn } from '@/lib/auth';
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
    }

    revalidatePath('/studio');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[studio] ${input.action} failed:`, error);
    return NextResponse.json({ error: 'That change did not save.' }, { status: 500 });
  }
}
