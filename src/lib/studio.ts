import 'server-only';

import { isDatabaseConfigured, sql } from '@/lib/db';
import {
  STAGE_KEYS,
  type BookingRow,
  type Client,
  type Lead,
  type StageKey,
  type StudioData,
} from '@/lib/pipeline';

const EMPTY: StudioData = {
  leads: [],
  bookings: [],
  giftCards: [],
  reviews: [],
  clients: [],
};

function typeFor(participants: number): string {
  if (participants === 1) return '1 : 1';
  if (participants > 12) return 'Corporate';
  return 'Private Group';
}

function venueFor(participants: number): string {
  return participants <= 6 ? 'Private Wellness Lounge' : 'Premium Signature Venue';
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * Everything the dashboard renders, in one round trip.
 *
 * Returns empty collections when no database is linked, so the studio still
 * loads and shows its real (empty) state rather than erroring.
 */
export async function getStudioData(): Promise<StudioData> {
  if (!isDatabaseConfigured()) return EMPTY;

  const [bookingRows, giftRows, reviewRows] = await Promise.all([
    sql`SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500`,
    sql`SELECT * FROM gift_requests ORDER BY created_at DESC LIMIT 200`,
    sql`SELECT * FROM reviews ORDER BY sort_order, created_at LIMIT 200`,
  ]);

  const leads: Lead[] = bookingRows.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null,
    company: row.company ? String(row.company) : null,
    participants: Number(row.participants),
    sessionDate: toIso(row.session_date),
    sessionTime: row.session_time ? String(row.session_time) : null,
    total: Number(row.estimated_total),
    status: (STAGE_KEYS as string[]).includes(String(row.status))
      ? (String(row.status) as StageKey)
      : 'new_enquiry',
    createdAt: new Date(String(row.created_at)).toISOString(),
    type: typeFor(Number(row.participants)),
  }));

  const bookings: BookingRow[] = leads
    .filter((lead) => lead.status === 'booked' || lead.status === 'complete')
    .map((lead) => ({ ...lead, venue: venueFor(lead.participants) }))
    .sort((a, b) => (a.sessionDate ?? '').localeCompare(b.sessionDate ?? ''));

  // Clients are derived, not stored — one row per email that has ever booked.
  const byEmail = new Map<string, Client>();
  for (const lead of leads) {
    if (lead.status !== 'booked' && lead.status !== 'complete') continue;
    const existing = byEmail.get(lead.email);
    if (existing) {
      existing.sessions += 1;
      existing.lifetimeValue += lead.total;
      if (
        lead.sessionDate &&
        (!existing.lastSession || lead.sessionDate > existing.lastSession)
      ) {
        existing.lastSession = lead.sessionDate;
      }
    } else {
      byEmail.set(lead.email, {
        name: lead.name,
        email: lead.email,
        sessions: 1,
        lifetimeValue: lead.total,
        lastSession: lead.sessionDate,
      });
    }
  }

  return {
    leads,
    bookings,
    giftCards: giftRows.rows.map((row) => ({
      id: String(row.id),
      recipientName: String(row.recipient_name),
      buyerEmail: String(row.buyer_email),
      format: String(row.format),
      total: Number(row.total),
      status: String(row.status),
      createdAt: new Date(String(row.created_at)).toISOString(),
    })),
    reviews: reviewRows.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      meta: String(row.meta),
      body: String(row.body),
      isPublished: Boolean(row.is_published),
    })),
    clients: [...byEmail.values()].sort(
      (a, b) => b.lifetimeValue - a.lifetimeValue
    ),
  };
}
