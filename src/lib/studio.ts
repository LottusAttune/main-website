import 'server-only';

import { isDatabaseConfigured, sql } from '@/lib/db';
import { documentFromRow } from '@/lib/documents';
import { isEmailConfigured } from '@/lib/email';
import { paymentLinkFromRow } from '@/lib/paymentLinks';
import { isPdfConfigured } from '@/lib/pdfshift';
import {
  STAGE_KEYS,
  type ActivityEntry,
  type BookingRow,
  buildContacts,
  type Client,
  type GiftCard,
  type Lead,
  type PaymentRow,
  type StageKey,
  type StudioData,
} from '@/lib/pipeline';
import { LOUNGE_MAX, SITE } from '@/lib/site';
import { isStripeConfigured } from '@/lib/stripe';

function typeFor(participants: number): string {
  if (participants === 1) return '1 : 1';
  if (participants > 12) return 'Corporate';
  return 'Private Group';
}

function venueFor(participants: number): string {
  return participants <= LOUNGE_MAX ? 'Private Wellness Lounge' : 'Premium Signature Venue';
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toStamp(value: unknown): string | null {
  if (!value) return null;
  return new Date(String(value)).toISOString();
}

function integrations() {
  return {
    database: isDatabaseConfigured(),
    email: isEmailConfigured(),
    pdf: isPdfConfigured(),
    calendar: Boolean(
      process.env.GOOGLE_CALENDAR_CLIENT_ID &&
        process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
        process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
    ),
    stripe: isStripeConfigured(),
  };
}

const EMPTY = (): StudioData => ({
  leads: [],
  bookings: [],
  giftCards: [],
  reviews: [],
  clients: [],
  discoveryCalls: [],
  documents: [],
  payments: [],
  paymentLinks: [],
  activity: [],
  integrations: integrations(),
});

/**
 * Everything the dashboard renders, in one round trip.
 *
 * Returns empty collections when no database is linked, so the studio still
 * loads and shows its real (empty) state rather than erroring.
 */
export async function getStudioData(): Promise<StudioData> {
  if (!isDatabaseConfigured()) return EMPTY();

  const [bookingRows, giftRows, reviewRows, discoveryCallRows, documentRows, paymentRows, activityRows, linkRows] =
    await Promise.all([
      sql`SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500`,
      sql`SELECT * FROM gift_requests ORDER BY created_at DESC LIMIT 200`,
      sql`SELECT * FROM reviews ORDER BY sort_order, created_at LIMIT 200`,
      sql`SELECT * FROM discovery_calls ORDER BY call_date, call_time LIMIT 200`,
      sql`
        SELECT id, kind, number, booking_id, gift_id, client_name, client_email,
               client_company, status, lines, subtotal, tax_rate, tax, total, issued_on,
               due_on, notes, token, (pdf IS NOT NULL) AS has_pdf, pdf_generated_at,
               paid_amount, payment_plan, stripe_link_full, stripe_link_deposit,
               stripe_link_amount, signer_name, sent_at, sent_to, viewed_at, accepted_at, paid_at, paid_method, voided_at,
               created_at
        FROM documents ORDER BY created_at DESC LIMIT 1000
      `,
      sql`SELECT * FROM payments ORDER BY created_at DESC LIMIT 1000`,
      sql`SELECT * FROM activity ORDER BY created_at DESC LIMIT 1000`,
      sql`SELECT * FROM payment_links ORDER BY created_at DESC LIMIT 300`,
    ]);

  const leads: Lead[] = bookingRows.rows.map((row) => {
    const participants = Number(row.participants);
    return {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      phone: row.phone ? String(row.phone) : null,
      company: row.company ? String(row.company) : null,
      message: row.message ? String(row.message) : null,
      participants,
      sessionDate: toIso(row.session_date),
      sessionTime: row.session_time ? String(row.session_time) : null,
      sessionDate2: toIso(row.session_date_2),
      sessionTime2: row.session_time_2 ? String(row.session_time_2) : null,
      teamAddon: Boolean(row.team_addon),
      isPackage: Boolean(row.is_package),
      isCorporateIntro: Boolean(row.is_corporate_intro),
      discountCode: row.discount_code ? String(row.discount_code) : null,
      gratuity: Number(row.gratuity ?? 0),
      total: Number(row.estimated_total),
      status:
        String(row.status) === 'cancelled'
          ? 'cancelled'
          : (STAGE_KEYS as string[]).includes(String(row.status))
            ? (String(row.status) as StageKey)
            : 'new_enquiry',
      createdAt: new Date(String(row.created_at)).toISOString(),
      type: typeFor(participants),
      venue: venueFor(participants),
      calendarEventId: row.calendar_event_id ? String(row.calendar_event_id) : null,
      calendarEventId2: row.calendar_event_id_2 ? String(row.calendar_event_id_2) : null,
      cardOnFile: Boolean(row.stripe_payment_method_id),
      confirmationSentAt: toStamp(row.confirmation_sent_at),
      reminderSentAt: toStamp(row.reminder_sent_at),
      balanceChargedAt: toStamp(row.balance_charged_at),
      balanceRequestedAt: toStamp(row.balance_requested_at),
      termsAcceptedAt: toStamp(row.terms_accepted_at),
      portalUrl: row.portal_token ? `${SITE.url}/portal/${String(row.portal_token)}` : null,
      cancellationFeeChargedAt: toStamp(row.cancellation_fee_charged_at),
      paymentMethod: row.payment_method ? String(row.payment_method) : null,
    };
  });

  const bookings: BookingRow[] = leads
    .filter(
      (lead) =>
        lead.status === 'booked' ||
        lead.status === 'complete' ||
        lead.status === 'cancelled'
    )
    .sort((a, b) => (a.sessionDate ?? '').localeCompare(b.sessionDate ?? ''));

  const documents = documentRows.rows.map(documentFromRow);

  const payments: PaymentRow[] = paymentRows.rows.map((row) => ({
    id: String(row.id),
    documentId: row.document_id ? String(row.document_id) : null,
    bookingId: row.booking_id ? String(row.booking_id) : null,
    giftId: row.gift_id ? String(row.gift_id) : null,
    amount: Number(row.amount),
    method: String(row.method),
    kind: String(row.kind),
    note: row.note ? String(row.note) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));

  const giftCards: GiftCard[] = giftRows.rows.map((row) => ({
    id: String(row.id),
    recipientName: String(row.recipient_name),
    recipientEmail: row.recipient_email ? String(row.recipient_email) : null,
    buyerName: row.buyer_name ? String(row.buyer_name) : null,
    buyerEmail: String(row.buyer_email),
    format: String(row.format),
    sessions: row.sessions == null ? null : Number(row.sessions),
    participants: row.participants == null ? null : Number(row.participants),
    teamAddon: Boolean((row.addons as Record<string, boolean> | null)?.team),
    code: row.code ? String(row.code) : null,
    total: Number(row.total),
    gratuity: Number(row.gratuity ?? 0),
    status: String(row.status),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));

  const activity: ActivityEntry[] = activityRows.rows.map((row) => ({
    id: String(row.id),
    bookingId: row.booking_id ? String(row.booking_id) : null,
    giftId: row.gift_id ? String(row.gift_id) : null,
    documentId: row.document_id ? String(row.document_id) : null,
    clientEmail: row.client_email ? String(row.client_email) : null,
    kind: String(row.kind),
    body: row.body ? String(row.body) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));

  const discoveryCalls = discoveryCallRows.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null,
    company: row.company ? String(row.company) : null,
    callDate: toIso(row.call_date) ?? '',
    callTime: String(row.call_time),
    message: row.message ? String(row.message) : null,
    status: String(row.status),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));

  return {
    leads,
    bookings,
    giftCards,
    reviews: reviewRows.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      meta: String(row.meta),
      body: String(row.body),
      isPublished: Boolean(row.is_published),
    })),
    clients: buildContacts({ leads, documents, payments, giftCards, discoveryCalls }),
    discoveryCalls,
    documents,
    payments,
    paymentLinks: linkRows.rows.map(paymentLinkFromRow),
    activity,
    integrations: integrations(),
  };
}
