import { NextResponse } from 'next/server';

import { isDatabaseConfigured, sql } from '@/lib/db';
import { giftQuoteFor } from '@/lib/quote';
import { getSettings } from '@/lib/settings';
import { giftSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = giftSchema.safeParse(payload);
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
  const { pricing } = await getSettings();

  // Recomputed server-side; the browser's figure is never trusted.
  const { total, gratuity } = giftQuoteFor(
    {
      ...input,
      gratuityPercent: input.gratuityPercent ?? undefined,
      gratuityAmount: input.gratuityAmount ?? undefined,
    },
    pricing
  );

  if (!isDatabaseConfigured()) {
    console.error('[gifts] rejected: no Postgres store is linked');
    return NextResponse.json(
      {
        error:
          'Gift requests are not connected yet. Please email us and we will prepare your certificate.',
      },
      { status: 503 }
    );
  }

  try {
    const result = await sql`
      INSERT INTO gift_requests (
        recipient_name, recipient_email, buyer_email, format, sessions, participants, addons, total, gratuity
      ) VALUES (
        ${input.recipientName}, ${input.recipientEmail ?? null}, ${input.buyerEmail}, ${input.format},
        ${input.format === 'private' ? input.sessions : null},
        ${input.format === 'group' ? input.participants : null},
        ${JSON.stringify(input.addons)}::jsonb,
        ${total},
        ${gratuity}
      )
      RETURNING id
    `;

    return NextResponse.json({ id: result.rows[0]?.id, total }, { status: 201 });
  } catch (error) {
    console.error('[gifts] insert failed:', error);
    return NextResponse.json(
      { error: 'We could not save your request.' },
      { status: 500 }
    );
  }
}
