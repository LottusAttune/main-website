import { NextResponse } from 'next/server';

import { isDatabaseConfigured, sql } from '@/lib/db';
import { generateGiftCode } from '@/lib/gift-code';
import { giftQuoteFor } from '@/lib/quote';
import { getSettings } from '@/lib/settings';
import { giftSchema } from '@/lib/validation';

const MAX_CODE_ATTEMPTS = 5;

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
        error: 'Please check the highlighted fields.',
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const { pricing, codes } = await getSettings();

  // Never trust the discount the browser applied - only honour a code that
  // is currently active and meets its own participant minimum.
  const discount = input.discountCode
    ? codes.find((c) => c.code === input.discountCode?.toUpperCase() && c.isActive)
    : undefined;
  const discountPeople = input.format === 'group' ? input.participants : 1;
  const eligibleDiscount =
    discount && discountPeople >= discount.minParticipants ? discount : undefined;

  // Recomputed server-side; the browser's figure is never trusted.
  const { total, gratuity } = giftQuoteFor(
    {
      ...input,
      percentOff: eligibleDiscount?.percentOff,
      amountOff: eligibleDiscount?.amountOff,
      discountLabel: eligibleDiscount?.code,
      discountMinParticipants: eligibleDiscount?.minParticipants,
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

  // Collisions are astronomically unlikely (32^6 possible codes) but the
  // unique index makes them a hard failure rather than a silent duplicate,
  // so a couple of retries with a freshly generated code is enough.
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateGiftCode();
    try {
      const result = await sql`
        INSERT INTO gift_requests (
          recipient_name, recipient_email, buyer_name, buyer_email, format, sessions, participants, addons,
          discount_code, code, total, gratuity
        ) VALUES (
          ${input.recipientName}, ${input.recipientEmail ?? null}, ${input.buyerName}, ${input.buyerEmail}, ${input.format},
          ${input.format === 'private' ? input.sessions : null},
          ${input.format === 'group' ? input.participants : null},
          ${JSON.stringify(input.addons)}::jsonb,
          ${eligibleDiscount?.code ?? null},
          ${code},
          ${total},
          ${gratuity}
        )
        RETURNING id
      `;

      return NextResponse.json(
        { id: result.rows[0]?.id, code, total },
        { status: 201 }
      );
    } catch (error) {
      const isCodeCollision =
        error instanceof Error &&
        'code' in error &&
        (error as { code?: string }).code === '23505';
      if (isCodeCollision && attempt < MAX_CODE_ATTEMPTS) continue;

      console.error('[gifts] insert failed:', error);
      return NextResponse.json(
        { error: 'We could not save your request.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: 'We could not save your request.' },
    { status: 500 }
  );
}
