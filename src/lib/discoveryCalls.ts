import 'server-only';

import { isDatabaseConfigured, sql } from '@/lib/db';
import type { SiteSettings } from '@/lib/settings';

export type DiscoveryCallByToken = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  callDate: string;
  callTime: string;
} | null;

function toIsoDay(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/** Looks up a discovery call by its reschedule token - the token itself is
 *  the credential, so a malformed or unknown one simply finds nothing. */
export async function getDiscoveryCallByToken(
  token: string
): Promise<DiscoveryCallByToken> {
  if (!isDatabaseConfigured()) return null;

  const result = await sql`
    SELECT id, name, email, company, call_date, call_time
    FROM discovery_calls
    WHERE reschedule_token = ${token}
  `.catch(() => null);

  const row = result?.rows[0];
  if (!row) return null;

  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    company: row.company ? String(row.company) : null,
    callDate: toIsoDay(row.call_date),
    callTime: String(row.call_time),
  };
}

/**
 * Shared between the initial booking and a reschedule - same rules either
 * way. Returns a user-facing error, or null when the slot is open.
 *
 * `excludeCallId` is the row being rescheduled, if any - it holds its own
 * current slot, which must not count as "already taken" against itself.
 */
export function findDiscoveryCallSlotError(
  callDate: string,
  callTime: string,
  settings: Pick<
    SiteSettings,
    'blockedDates' | 'blockedCallTimes' | 'bookedEventDates' | 'bookedCallSlots'
  >,
  excludeCallId?: string
): string | null {
  const [year, month, day] = callDate.split('-').map(Number);
  const isSunday = new Date(year, month - 1, day).getDay() === 0;

  if (
    isSunday ||
    settings.blockedDates.includes(callDate) ||
    settings.bookedEventDates.includes(callDate)
  ) {
    return 'That date is no longer available.';
  }

  if (
    settings.blockedCallTimes.some(
      (entry) => entry.date === callDate && entry.time === callTime
    )
  ) {
    return 'That time is no longer available.';
  }

  if (
    settings.bookedCallSlots.some(
      (slot) =>
        slot.date === callDate &&
        slot.time === callTime &&
        slot.id !== excludeCallId
    )
  ) {
    return 'That time is already booked - please choose another.';
  }

  return null;
}
