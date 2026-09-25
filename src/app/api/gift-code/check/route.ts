import { NextResponse } from 'next/server';

import { isDatabaseConfigured, sql } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * Live-checks a gift certificate code from the booking form, before the
 * booking itself is submitted - the same instant feedback a discount code
 * already gets. The actual redemption (applying the credit to an invoice)
 * happens server-side again once the booking is created; this is purely to
 * show the client what they have to spend before they commit to a date.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const code = typeof (payload as { code?: unknown })?.code === 'string' ? (payload as { code: string }).code : '';
  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return NextResponse.json({ ok: false, error: 'Enter a code.' }, { status: 400 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Codes cannot be checked right now.' }, { status: 503 });
  }

  const rows = await sql`SELECT total, redeemed_amount, status FROM gift_requests WHERE code = ${normalized}`;
  const row = rows.rows[0];
  if (!row || row.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'That code is not recognised.' }, { status: 404 });
  }
  const remaining = Number(row.total) - Number(row.redeemed_amount ?? 0);
  if (remaining <= 0) {
    return NextResponse.json({ ok: false, error: 'This gift certificate has already been fully used.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, remaining });
}
