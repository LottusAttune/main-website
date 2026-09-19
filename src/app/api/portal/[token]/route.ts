import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isDatabaseConfigured } from '@/lib/db';
import { addUpsell, requestCancellation, requestReschedule } from '@/lib/portal';

export const runtime = 'nodejs';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('addon'), addon: z.enum(['teamAddon']) }),
  z.object({
    action: z.literal('reschedule'),
    preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    preferredSlot: z.enum(['midday', 'evening']),
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal('cancel'),
    reason: z.string().trim().max(500).optional(),
  }),
]);

/** The portal's self-service actions post here: the add-on buttons, and the
 *  reschedule/cancel requests. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Not available right now.' }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'That request could not be read.' }, { status: 400 });

  try {
    if (parsed.data.action === 'addon') {
      const result = await addUpsell(token, parsed.data.addon);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result);
    }
    if (parsed.data.action === 'reschedule') {
      const result = await requestReschedule(
        token,
        parsed.data.preferredDate,
        parsed.data.preferredSlot,
        parsed.data.note ?? null
      );
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json(result);
    }
    const result = await requestCancellation(token, parsed.data.reason ?? null);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[portal] action failed:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again or email us.' }, { status: 500 });
  }
}
