import 'server-only';

import { CORPORATE_ADDON_COPY, FAQS, VENUE_COPY_BOOKING } from '@/data/content';
import { sessionSlotWindow } from '@/lib/calendar';
import { sql } from '@/lib/db';
import {
  balanceDueOn,
  bookingLines,
  ensurePaymentLinks,
  getDocument,
  logActivity,
  publicUrl,
  updateDocument,
  type BookingCtx,
} from '@/lib/documents';
import { sendOwnerNotification } from '@/lib/email';
import { buildIcs, googleCalendarUrl, zonedTimeToUtc, type CalendarEvent } from '@/lib/ics';
import { balanceDue, formatStudioDate, type DocumentRow } from '@/lib/pipeline';
import { MIN_GROUP_SIZE, quoteFor } from '@/lib/quote';
import { getSettings, type SiteSettings } from '@/lib/settings';
import { LOUNGE_MAX, money, SITE, splitVenueDetails, TEAM_ADDON_MIN_PARTICIPANTS, TIME_SLOTS, type SlotKey } from '@/lib/site';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * The client portal: one private link per booking (the token is the
 * credential, like the invoice link) showing the session, a countdown, the
 * money side, and the add-ons they can still put on the booking themselves.
 */

export type UpsellKey = 'teamAddon';

export type Upsell = {
  key: UpsellKey;
  title: string;
  blurb: string;
  price: number;
  priceNote: string;
};

export type PortalData = {
  token: string;
  booking: BookingCtx & { cardOnFile: boolean; confirmed: boolean };
  invoice: DocumentRow | null;
  settings: SiteSettings;
  venue: string;
  venueCopy: readonly string[];
  /** How to find this specific venue once inside the building. */
  venueDirections: string;
  faqs: ReadonlyArray<{ q: string; a: string }>;
  cancellationPolicy: string;
  /** Absolute start/end of the (first) session, for the countdown. */
  startsAt: string | null;
  endsAt: string | null;
  googleCalendarUrl: string | null;
  upsells: Upsell[];
  paid: number;
  balance: number;
  balanceDay: string | null;
  invoiceUrl: string | null;
  payUrl: string | null;
};

export function portalUrl(token: string): string {
  return `${SITE.url}/portal/${token}`;
}

/** The booking page for a booking id, for pages that only know the invoice. */
export async function portalUrlForBooking(bookingId: string | null): Promise<string | null> {
  if (!bookingId) return null;
  const result = await sql`SELECT portal_token FROM bookings WHERE id = ${bookingId}`;
  const token = result.rows[0]?.portal_token;
  return token ? portalUrl(String(token)) : null;
}

function ctxFromRow(row: Record<string, unknown>): BookingCtx {
  const toIso = (v: unknown) =>
    !v ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null,
    company: row.company ? String(row.company) : null,
    message: row.message ? String(row.message) : null,
    participants: Number(row.participants),
    sessionDate: toIso(row.session_date),
    sessionTime: row.session_time ? String(row.session_time) : null,
    sessionDate2: toIso(row.session_date_2),
    sessionTime2: row.session_time_2 ? String(row.session_time_2) : null,
    teamAddon: Boolean(row.team_addon),
    isPackage: Boolean(row.is_package),
    isCorporateIntro: Boolean(row.is_corporate_intro),
    discountCode: row.discount_code ? String(row.discount_code) : null,
    gratuity: Number(row.gratuity ?? 0),
    total: Number(row.estimated_total ?? 0),
    status: String(row.status),
  };
}

async function liveInvoice(bookingId: string): Promise<DocumentRow | null> {
  const result = await sql`
    SELECT id FROM documents
    WHERE booking_id = ${bookingId} AND kind = 'invoice' AND status != 'void'
    ORDER BY created_at DESC LIMIT 1
  `;
  const id = result.rows[0]?.id;
  return id ? getDocument(String(id)) : null;
}

export function upsellsFor(booking: BookingCtx, settings: SiteSettings): Upsell[] {
  const list: Upsell[] = [];
  const people = booking.participants;
  if (booking.status === 'cancelled' || booking.status === 'complete') return list;
  if (people >= TEAM_ADDON_MIN_PARTICIPANTS && !booking.teamAddon) {
    list.push({
      key: 'teamAddon',
      title: 'Team-building add-on',
      blurb: CORPORATE_ADDON_COPY,
      price: settings.pricing.teamAddon,
      priceNote: 'per event',
    });
  }
  return list;
}

export async function loadPortal(token: string): Promise<PortalData | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const result = await sql`SELECT * FROM bookings WHERE portal_token = ${token}`;
  const row = result.rows[0];
  if (!row) return null;

  const settings = await getSettings();
  const booking = ctxFromRow(row);
  let invoice = await liveInvoice(booking.id);
  if (invoice && invoice.status !== 'paid' && balanceDue(invoice) > 0) {
    invoice = await ensurePaymentLinks(invoice, settings.business);
  }
  const paid = invoice?.paidAmount ?? 0;
  const balance = invoice ? balanceDue(invoice) : 0;
  const venue = booking.participants <= LOUNGE_MAX ? 'Private Wellness Lounge' : 'Premium Signature Venue';

  let startsAt: string | null = null;
  let endsAt: string | null = null;
  let calendar: string | null = null;
  if (booking.sessionDate && booking.sessionTime) {
    try {
      const { startISO, endISO } = sessionSlotWindow(booking.sessionDate, booking.sessionTime);
      startsAt = zonedTimeToUtc(startISO, 'America/Toronto').toISOString();
      endsAt = zonedTimeToUtc(endISO, 'America/Toronto').toISOString();
      calendar = googleCalendarUrl(calendarEvent(booking, settings, venue));
    } catch {
      // An unrecognised slot label: no countdown, the rest still works.
    }
  }

  return {
    token,
    booking: { ...booking, cardOnFile: Boolean(row.stripe_payment_method_id), confirmed: paid > 0 },
    invoice,
    settings,
    venue,
    venueCopy: VENUE_COPY_BOOKING,
    venueDirections:
      venue === 'Private Wellness Lounge'
        ? settings.business.venueDirectionsLounge
        : settings.business.venueDirectionsSignature,
    faqs: FAQS.filter((f) => f.q !== 'Cancellation & Rescheduling Policy'),
    cancellationPolicy:
      settings.business.cancellationPolicy || (FAQS.find((f) => f.q === 'Cancellation & Rescheduling Policy')?.a ?? ''),
    startsAt,
    endsAt,
    googleCalendarUrl: calendar,
    upsells: upsellsFor(booking, settings),
    paid,
    balance,
    balanceDay: invoice && paid > 0 ? invoice.dueOn : balanceDueOn(booking.sessionDate, settings.business),
    invoiceUrl: invoice ? publicUrl(invoice) : null,
    payUrl: invoice ? (paid === 0 ? invoice.payDepositUrl ?? invoice.payFullUrl : invoice.payFullUrl) : null,
  };
}

export function calendarEvent(booking: BookingCtx, settings: SiteSettings, venue: string): CalendarEvent {
  const { startISO, endISO } = sessionSlotWindow(booking.sessionDate!, booking.sessionTime!);
  // Location is for the calendar app's own map/directions lookup - just the
  // address, not the buzzer/arrival text, which reads better as part of the
  // description instead.
  const { location, arrival } = splitVenueDetails(settings.business.venueDetails);
  const venueDirections =
    venue === 'Private Wellness Lounge'
      ? settings.business.venueDirectionsLounge
      : settings.business.venueDirectionsSignature;
  const description = [
    venue,
    arrival,
    venueDirections,
    'Please arrive 15 minutes prior to the start of your session to settle in. Allow extra time for parking and rush-hour traffic.',
  ]
    .filter(Boolean)
    .join(' ');
  return {
    uid: `booking-${booking.id}@lotusattune.com`,
    title: 'Lotus Attune, Immersive Soma Sound Experience',
    description,
    location: location || venue,
    startISO,
    endISO,
    attendeeName: booking.name,
    attendeeEmail: booking.email,
  };
}

export async function portalIcs(token: string): Promise<string | null> {
  const data = await loadPortal(token);
  if (!data || !data.booking.sessionDate || !data.booking.sessionTime) return null;
  return buildIcs(calendarEvent(data.booking, data.settings, data.venue));
}

/**
 * Puts an add-on on the booking and on its invoice. The extra joins the
 * balance: charged with it to the card on file, or paid from the invoice.
 */
export async function addUpsell(
  token: string,
  key: UpsellKey
): Promise<{ ok: true; total: number; balance: number } | { ok: false; error: string }> {
  const data = await loadPortal(token);
  if (!data) return { ok: false, error: 'Booking not found.' };
  const upsell = data.upsells.find((u) => u.key === key);
  if (!upsell) return { ok: false, error: 'That add-on is not available on this booking.' };

  const { booking, settings } = data;
  const next: BookingCtx = { ...booking, teamAddon: booking.teamAddon || key === 'teamAddon' };
  const code = next.discountCode ? settings.codes.find((c) => c.code === next.discountCode) : undefined;
  const quote = quoteFor(
    {
      participants: next.participants,
      isPackage: next.isPackage,
      isCorporateIntro: next.isCorporateIntro,
      teamAddon: next.teamAddon,
      percentOff: code?.percentOff,
      amountOff: code?.amountOff,
      discountLabel: code?.code,
      discountMinParticipants: code?.minParticipants,
      gratuityAmount: next.gratuity || undefined,
    },
    settings.pricing
  );
  next.total = quote.total;

  await sql`
    UPDATE bookings SET
      team_addon = ${next.teamAddon},
      estimated_total = ${quote.total}
    WHERE id = ${booking.id}
  `;

  let total = quote.total;
  let balance = 0;
  if (data.invoice) {
    const updated = await updateDocument(data.invoice.id, { lines: bookingLines(next, settings) });
    total = updated.total;
    balance = balanceDue(updated);
    // An invoice that was settled has something owing again.
    if (updated.status === 'paid' && balance > 0) {
      await sql`
        UPDATE documents SET status = 'sent', paid_at = NULL,
          due_on = COALESCE(${balanceDueOn(next.sessionDate, settings.business)}::date, due_on)
        WHERE id = ${updated.id}
      `;
    }
  }

  await logActivity({
    bookingId: booking.id,
    documentId: data.invoice?.id ?? null,
    kind: 'addon_added',
    body: `${upsell.title} (${money(upsell.price)}) added from the client portal${data.invoice ? ` · ${data.invoice.number} now ${money(total)}` : ''}`,
  });
  await sendOwnerNotification({
    subject: `${booking.name} added ${upsell.title} (${money(upsell.price)})`,
    html: `<p style="margin:0;">${booking.name} added <strong>${upsell.title}</strong> from their portal.${data.invoice ? ` Invoice ${data.invoice.number} is now ${money(total)}; ${money(balance)} is outstanding${booking.cardOnFile ? ' and will be charged with the balance' : ''}.` : ''}</p>`,
  });
  return { ok: true, total, balance };
}

/**
 * A request, not an automatic change: nothing on the booking moves until
 * Silvana confirms the new date herself in Studio. Keeps a paid deposit,
 * invoice and calendar events from shifting under an unreviewed request.
 */
export async function requestReschedule(
  token: string,
  preferredDate: string,
  preferredSlot: SlotKey,
  note: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const data = await loadPortal(token);
  if (!data) return { ok: false, error: 'Booking not found.' };
  if (data.booking.status === 'cancelled') return { ok: false, error: 'This booking is cancelled.' };
  if (data.booking.status === 'complete') return { ok: false, error: 'This session has already taken place.' };

  const slotLabel = TIME_SLOTS.find((s) => s.key === preferredSlot)?.label ?? preferredSlot;
  const currentWhen = data.booking.sessionDate
    ? `${formatStudioDate(data.booking.sessionDate)}${data.booking.sessionTime ? `, ${data.booking.sessionTime}` : ''}`
    : 'an unscheduled date';
  const requestedWhen = `${formatStudioDate(preferredDate)}, ${slotLabel}`;

  await logActivity({
    bookingId: data.booking.id,
    kind: 'reschedule_requested',
    body: `Requested to move from ${currentWhen} to ${requestedWhen}${note ? ` — "${note}"` : ''}`,
  });
  await sendOwnerNotification({
    subject: `${data.booking.name} asked to reschedule their session`,
    html: `<p style="margin:0;"><strong>${data.booking.name}</strong> asked to move their session from ${currentWhen} to <strong>${requestedWhen}</strong>.${note ? ` Their note: "${escapeHtml(note)}"` : ''} Nothing has changed yet - confirm the new date in Studio if it works for you.</p>`,
  });
  return { ok: true };
}

/** Also a request, not an automatic cancellation - lets Silvana apply the
 *  cancellation policy (the notice window, the fee) herself when she cancels
 *  the booking in Studio, rather than the site deciding that unattended. */
export async function requestCancellation(
  token: string,
  reason: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const data = await loadPortal(token);
  if (!data) return { ok: false, error: 'Booking not found.' };
  if (data.booking.status === 'cancelled') return { ok: false, error: 'This booking is already cancelled.' };

  const when = data.booking.sessionDate
    ? `${formatStudioDate(data.booking.sessionDate)}${data.booking.sessionTime ? `, ${data.booking.sessionTime}` : ''}`
    : 'their session';

  await logActivity({
    bookingId: data.booking.id,
    kind: 'cancellation_requested',
    body: `Requested to cancel ${when}${reason ? ` — "${reason}"` : ''}`,
  });
  await sendOwnerNotification({
    subject: `${data.booking.name} asked to cancel their session`,
    html: `<p style="margin:0;"><strong>${data.booking.name}</strong> asked to cancel their session on ${when}.${reason ? ` Their reason: "${escapeHtml(reason)}"` : ''} Nothing has changed yet - cancel it in Studio once you've checked the cancellation policy for any fee.</p>`,
  });
  return { ok: true };
}
