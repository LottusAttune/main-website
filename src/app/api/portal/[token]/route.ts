import { NextResponse } from 'next/server';
import { z } from 'zod';

import { isDatabaseConfigured } from '@/lib/db';
import { addUpsell } from '@/lib/portal';

export const runtime = 'nodejs';

const schema = z.object({ addon: z.enum(['teamAddon']) });

/** The portal's "add to your experience" buttons post here. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Not available right now.' }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Unknown add-on.' }, { status: 400 });
  try {
    const result = await addUpsell(token, parsed.data.addon);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[portal] add-on failed:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again or email us.' }, { status: 500 });
  }
}
