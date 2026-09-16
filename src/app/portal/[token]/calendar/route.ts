import { isDatabaseConfigured } from '@/lib/db';
import { portalIcs } from '@/lib/portal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The session as a calendar file, for Apple Calendar and Outlook. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ics = isDatabaseConfigured() ? await portalIcs(token) : null;
  if (!ics) return new Response('Not found', { status: 404 });
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lotus-attune-session.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
