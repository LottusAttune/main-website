import 'server-only';

import { isDatabaseConfigured, sql } from '@/lib/db';
import { DEFAULT_LEAD_TIME, DEFAULT_PRICING, DEFAULT_SLOTS, SITE, type SlotKey } from '@/lib/site';

export type Pricing = {
  privateSession: number;
  privatePackage: number;
  perParticipant: number;
  teamAddon: number;
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

/** What prints on proposals and invoices, and the automation switches. */
export type BusinessSettings = {
  businessName: string;
  businessAddress: string;
  businessEmail: string;
  businessPhone: string;
  taxLabel: string;
  taxNumber: string;
  /** Percent, e.g. 13 for Ontario HST. 0 means no tax line. */
  taxRatePercent: number;
  paymentInstructions: string;
  invoiceDueDays: number;
  invoicePrefix: string;
  invoiceFooter: string;
  proposalIntro: string;
  proposalValidDays: number;
  autoSendProposals: boolean;
  autoSendInvoices: boolean;
  /** Card payments: surcharge percent added on top when paying by card. */
  cardFeePercent: number;
  /** Deposit plan: percent charged at booking, balance charged later. */
  depositPercent: number;
  /** Days before the session the remaining balance is charged. */
  balanceDaysBefore: number;
  cancellationFee: number;
  /** Cancelling inside this many hours (or a no-show) incurs the fee. */
  cancellationHours: number;
  /** Printed in the confirmation email; defaults to the website FAQ text. */
  cancellationPolicy: string;
  /** Building address, buzzer, parking - shared by both venues, printed in
   *  the confirmation email and the client portal. */
  venueDetails: string;
  /** Once inside the building: how to find the Private Wellness Lounge. */
  venueDirectionsLounge: string;
  /** Once inside the building: how to find the Premium Signature Venue. */
  venueDirectionsSignature: string;
  reminderDaysBefore: number;
};

export const DEFAULT_BUSINESS: BusinessSettings = {
  businessName: 'Lotus Attune',
  businessAddress: '',
  businessEmail: 'info@lotusattune.com',
  businessPhone: '416-871-5610',
  taxLabel: 'HST',
  taxNumber: '',
  taxRatePercent: 0,
  paymentInstructions: `Send an Interac e-transfer to ${SITE.email}. Auto-deposit is on, so no security question is needed. Please put your invoice number in the message.`,
  invoiceDueDays: 7,
  invoicePrefix: 'LA',
  invoiceFooter: '',
  proposalIntro: '',
  proposalValidDays: 14,
  autoSendProposals: true,
  autoSendInvoices: true,
  cardFeePercent: 3,
  depositPercent: 50,
  balanceDaysBefore: 4,
  cancellationFee: 100,
  cancellationHours: 72,
  cancellationPolicy: '',
  venueDetails: '',
  venueDirectionsLounge: '',
  venueDirectionsSignature: '',
  reminderDaysBefore: 2,
};

export type SiteSettings = {
  pricing: Pricing;
  slots: Slots;
  leadTimeDays: number;
  business: BusinessSettings;
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
  business: { ...DEFAULT_BUSINESS },
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

/** Tolerates a database that predates the business columns. */
export function businessFromRow(row: Record<string, unknown>): BusinessSettings {
  const text = (key: string, fallback: string) =>
    row[key] == null ? fallback : String(row[key]);
  const num = (key: string, fallback: number) =>
    row[key] == null ? fallback : Number(row[key]);
  const bool = (key: string, fallback: boolean) =>
    row[key] == null ? fallback : Boolean(row[key]);
  const d = DEFAULT_BUSINESS;
  return {
    businessName: text('business_name', d.businessName),
    businessAddress: text('business_address', d.businessAddress),
    businessEmail: text('business_email', d.businessEmail),
    businessPhone: text('business_phone', d.businessPhone),
    taxLabel: text('tax_label', d.taxLabel),
    taxNumber: text('tax_number', d.taxNumber),
    taxRatePercent: num('tax_rate_percent', d.taxRatePercent),
    paymentInstructions: text('payment_instructions', d.paymentInstructions),
    invoiceDueDays: num('invoice_due_days', d.invoiceDueDays),
    invoicePrefix: text('invoice_prefix', d.invoicePrefix),
    invoiceFooter: text('invoice_footer', d.invoiceFooter),
    proposalIntro: text('proposal_intro', d.proposalIntro),
    proposalValidDays: num('proposal_valid_days', d.proposalValidDays),
    autoSendProposals: bool('auto_send_proposals', d.autoSendProposals),
    autoSendInvoices: bool('auto_send_invoices', d.autoSendInvoices),
    cardFeePercent: num('card_fee_percent', d.cardFeePercent),
    depositPercent: num('deposit_percent', d.depositPercent),
    balanceDaysBefore: num('balance_days_before', d.balanceDaysBefore),
    cancellationFee: num('cancellation_fee', d.cancellationFee),
    cancellationHours: num('cancellation_hours', d.cancellationHours),
    cancellationPolicy: text('cancellation_policy', d.cancellationPolicy),
    venueDetails: text('venue_details', d.venueDetails),
    venueDirectionsLounge: text('venue_directions_lounge', d.venueDirectionsLounge),
    venueDirectionsSignature: text('venue_directions_signature', d.venueDirectionsSignature),
    reminderDaysBefore: num('reminder_days_before', d.reminderDaysBefore),
  };
}

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
        deposit: Number(row.deposit),
      },
      slots: {
        midday: Boolean(row.slot_midday),
        evening: Boolean(row.slot_evening),
      },
      leadTimeDays: Number(row.lead_time_days),
      business: businessFromRow(row),
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
