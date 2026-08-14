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
  percentOff: number;
  isActive: boolean;
};

export type SiteSettings = {
  pricing: Pricing;
  slots: Slots;
  leadTimeDays: number;
  /** ISO `YYYY-MM-DD` strings. */
  blockedDates: string[];
  codes: DiscountCode[];
};

const FALLBACK: SiteSettings = {
  pricing: { ...DEFAULT_PRICING },
  slots: { ...DEFAULT_SLOTS },
  leadTimeDays: DEFAULT_LEAD_TIME,
  blockedDates: [],
  codes: [
    { code: 'WELCOME20', percentOff: 20, isActive: true },
    { code: 'WELCOME30', percentOff: 30, isActive: true },
    { code: 'LOTUS20', percentOff: 20, isActive: true },
    { code: 'LOTUS30', percentOff: 30, isActive: true },
  ],
};

function toIsoDay(value: string | Date): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
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
    const [settingsResult, blockedResult, codesResult] = await Promise.all([
      sql`SELECT * FROM settings WHERE id = TRUE`,
      sql`SELECT day FROM blocked_dates ORDER BY day`,
      sql`SELECT code, percent_off, is_active FROM discount_codes ORDER BY code`,
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
        percentOff: Number(r.percent_off),
        isActive: Boolean(r.is_active),
      })),
    };
  } catch (error) {
    // A misconfigured or unreachable database must not take the site down —
    // but it must be visible in the logs, not swallowed.
    console.error('[settings] falling back to defaults:', error);
    return FALLBACK;
  }
}
