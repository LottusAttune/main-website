import 'server-only';

import { isDatabaseConfigured, sql } from '@/lib/db';
import {
  DEFAULT_LEAD_TIME,
  DEFAULT_PRICING,
  DEFAULT_SLOTS,
  type SlotKey,
} from '@/lib/site';

export type Pricing = {
  privateSession: number;
  privatePackage: number;
  perParticipant: number;
  teamAddon: number;
  refreshments: number;
  deposit: number;
};

export type Slots = Record<SlotKey, boolean>;

export type DiscountCode = {
  code: string;
  /** Exactly one of percentOff/amountOff is set. */
  percentOff?: number;
  amountOff?: number;
  minParticipants: number;
  isActive: boolean;
};

export type BlockedCallTime = {
  date: string;
  time: string;
};

export type BookedCallSlot = {
  id: string;
  date: string;
  time: string;
};

export type SiteSettings = {
  pricing: Pricing;
  slots: Slots;
  leadTimeDays: number;
  /** ISO `YYYY-MM-DD` strings. */
  blockedDates: string[];
  codes: DiscountCode[];
  /** Specific discovery-call time slots closed for a specific date. */
  blockedCallTimes: BlockedCallTime[];
  /** Dates with a confirmed session booked - closed for discovery calls too. */
  bookedEventDates: string[];
  /** Discovery call slots another client already holds - keeps two people
   *  from booking the exact same date and time. */
  bookedCallSlots: BookedCallSlot[];
};

const FALLBACK: SiteSettings = {
  pricing: { ...DEFAULT_PRICING },
  slots: { ...DEFAULT_SLOTS },
  leadTimeDays: DEFAULT_LEAD_TIME,
  blockedDates: [],
  blockedCallTimes: [],
  bookedEventDates: [],
  bookedCallSlots: [],
  codes: [
    { code: 'WELCOME10', percentOff: 10, minParticipants: 2, isActive: true },
    { code: 'LOTUS10', percentOff: 10, minParticipants: 2, isActive: true },
    { code: 'GROUP4', amountOff: 100, minParticipants: 4, isActive: true },
  ],
};

function toIsoDay(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * What Silvana has published from the studio dashboard.
 *
 * Falls back to the approved defaults when no database is linked yet, so the
 * marketing site is never blocked on infrastructure.
 */
export async function getSettings(): Promise<SiteSettings> {
  if (!isDatabaseConfigured()) return FALLBACK;

  try {
    const [
      settingsResult,
      blockedResult,
      codesResult,
      blockedCallResult,
      eventDatesResult,
      bookedCallResult,
    ] = await Promise.all([
      sql`SELECT * FROM settings WHERE id = TRUE`,
      sql`SELECT day FROM blocked_dates ORDER BY day`,
      sql`SELECT code, percent_off, amount_off, min_participants, is_active FROM discount_codes ORDER BY code`,
      sql`SELECT call_date, call_time FROM blocked_call_times ORDER BY call_date, call_time`,
      sql`
        SELECT DISTINCT session_date AS day FROM bookings
        WHERE status IN ('booked', 'complete') AND session_date IS NOT NULL
        UNION
        SELECT DISTINCT session_date_2 AS day FROM bookings
        WHERE status IN ('booked', 'complete') AND session_date_2 IS NOT NULL
      `,
      sql`
        SELECT id, call_date, call_time FROM discovery_calls
        WHERE status != 'cancelled'
      `,
    ]);

    const row = settingsResult.rows[0];
    if (!row) return FALLBACK;

    return {
      pricing: {
        privateSession: Number(row.private_session),
        privatePackage: Number(row.private_package),
        perParticipant: Number(row.per_participant),
        teamAddon: Number(row.team_addon),
        refreshments: Number(row.refreshments),
        deposit: Number(row.deposit),
      },
      slots: {
        morning: Boolean(row.slot_morning),
        midday: Boolean(row.slot_midday),
        evening: Boolean(row.slot_evening),
      },
      leadTimeDays: Number(row.lead_time_days),
      blockedDates: blockedResult.rows.map((r) => toIsoDay(r.day)),
      codes: codesResult.rows.map((r) => ({
        code: String(r.code),
        percentOff: r.percent_off == null ? undefined : Number(r.percent_off),
        amountOff: r.amount_off == null ? undefined : Number(r.amount_off),
        minParticipants: Number(r.min_participants),
        isActive: Boolean(r.is_active),
      })),
      blockedCallTimes: blockedCallResult.rows.map((r) => ({
        date: toIsoDay(r.call_date),
        time: String(r.call_time),
      })),
      bookedEventDates: eventDatesResult.rows.map((r) => toIsoDay(r.day)),
      bookedCallSlots: bookedCallResult.rows.map((r) => ({
        id: String(r.id),
        date: toIsoDay(r.call_date),
        time: String(r.call_time),
      })),
    };
  } catch (error) {
    // A misconfigured or unreachable database must not take the site down —
    // but it must be visible in the logs, not swallowed.
    console.error('[settings] falling back to defaults:', error);
    return FALLBACK;
  }
}
