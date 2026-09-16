import { NextResponse } from 'next/server';

import { runDailyJobs } from '@/lib/bookings';
import { isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vercel Cron hits this every morning (see vercel.json). Vercel signs the
 * request with CRON_SECRET; the same secret lets it be triggered by hand
 * with `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/daily`.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Says so plainly rather than looking like a bad password: without the
    // secret, Vercel's scheduled call can never get through either.
    return NextResponse.json({ error: 'CRON_SECRET is not set on the server.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'No database.' }, { status: 503 });
  }
  const result = await runDailyJobs();
  return NextResponse.json(result);
}
