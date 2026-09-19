import 'server-only';

import { sessionSlotWindow } from '@/lib/calendar';
import { FAQS, VENUE_COPY_BOOKING } from '@/data/content';
import { sql } from '@/lib/db';
import {
  ensureBookingDocument,
  ensurePaymentLinks,
  generatePdf,
  getDocument,
  issueGiftCertificate,
  loadContext,
  logActivity,
  paymentOptionsHtml,
  publicUrl,
  recordPayment,
  type ActionResult,
} from '@/lib/documents';
import {
  sendBalanceRequestEmail,
  sendBookingConfirmationEmail,
  sendOwnerNotification,
  sendReceiptEmail,
  sendReminderEmail,
  type SessionEmailInput,
} from '@/lib/email';
import { buildIcs, googleCalendarUrl } from '@/lib/ics';
import { balanceDue, type DocumentRow } from '@/lib/pipeline';
import { getSettings, type SiteSettings } from '@/lib/settings';
import { chargeSavedCard, isStripeConfigured, StripeError } from '@/lib/stripe';
import { LOUNGE_MAX, money, SITE, splitVenueDetails } from '@/lib/site';

/**
 * Everything that happens to a booking after the client says yes:
 * confirmation, reminders, the deposit-plan balance and the late fee.
 */

type Row = Record<string, unknown>;

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function torontoToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
}

const CONFIRMATION_FAQS = FAQS.filter((f) =>
  ['What should I bring?', 'What should I wear?', 'What to expect?'].includes(f.q)
);

const DEFAULT_CANCELLATION_POLICY =
  FAQS.find((f) => f.q === 'Cancellation Policy')?.a ?? '';

async function invoiceFor(bookingId: string): Promise<DocumentRow | null> {
  const result = await sql`
    SELECT id FROM documents
    WHERE booking_id = ${bookingId} AND kind = 'invoice' AND status != 'void'
    ORDER BY created_at DESC LIMIT 1
  `;
  const id = result.rows[0]?.id;
  return id ? getDocument(String(id)) : null;
}

async function sessionEmailInput(
  row: Row,
  settings: SiteSettings,
  invoice: DocumentRow | null
): Promise<SessionEmailInput | null> {
  const sessionDate = toIso(row.session_date);
  const sessionTime = row.session_time ? String(row.session_time) : null;
  if (!sessionDate || !sessionTime) return null;

  const participants = Number(row.participants);
  const venue = participants <= LOUNGE_MAX ? 'Private Wellness Lounge' : 'Premium Signature Venue';
  const venueDirections =
    participants <= LOUNGE_MAX
      ? settings.business.venueDirectionsLounge
      : settings.business.venueDirectionsSignature;
  const { startISO, endISO } = sessionSlotWindow(sessionDate, sessionTime);
  // Location is for the calendar app's own map/directions lookup - just the
  // address, not the buzzer/arrival text, which reads better as part of the
  // description instead.
  const { location, arrival } = splitVenueDetails(settings.business.venueDetails);
  const description = [
    venue,
    arrival,
    venueDirections,
    'Please arrive 15 minutes prior to the start of your session to settle in. Allow extra time for parking and rush-hour traffic.',
  ]
    .filter(Boolean)
    .join(' ');
  const event = {
    uid: `booking-${String(row.id)}@lotusattune.com`,
    title: 'Lotus Attune — Immersive Soma Sound Experience',
    description,
    location: location || venue,
    startISO,
    endISO,
    attendeeName: String(row.name),
    attendeeEmail: String(row.email),
  };
  const due = invoice ? balanceDue(invoice) : 0;
  return {
    name: String(row.name),
    email: String(row.email),
    participants,
    sessionDate,
    sessionTime,
    sessionDate2: toIso(row.session_date_2),
    sessionTime2: row.session_time_2 ? String(row.session_time_2) : null,
    venue,
    teamAddon: Boolean(row.team_addon),
    venueCopy: VENUE_COPY_BOOKING,
    venueDetails: settings.business.venueDetails,
    venueDirections,
    parking: settings.business.parking,
    cancellationPolicy: settings.business.cancellationPolicy || DEFAULT_CANCELLATION_POLICY,
    faqs: CONFIRMATION_FAQS,
    googleCalendarUrl: googleCalendarUrl(event),
    ics: buildIcs(event),
    amountPaid: invoice?.paidAmount ?? 0,
    balanceDue: due,
    balanceChargeDate:
      due > 0 && row.stripe_payment_method_id
        ? addDays(sessionDate, -settings.business.balanceDaysBefore)
        : null,
    cardFeePercent: settings.business.cardFeePercent,
    portalUrl: row.portal_token ? `${SITE.url}/portal/${String(row.portal_token)}` : null,
  };
}

/**
 * Confirmation email with venue, FAQs, policy and calendar file. When
 * `payment` is given, this is also the receipt for the payment that
 * triggered it, folded into one message instead of two.
 */
export async function sendBookingConfirmation(
  bookingId: string,
  payment?: { amount: number; method: string; kind: string; pdf: Buffer | null } | null
): Promise<ActionResult> {
  const result = await sql`SELECT * FROM bookings WHERE id = ${bookingId}`;
  const row = result.rows[0];
  if (!row) return { ok: false, error: 'Booking not found.' };

  const settings = await getSettings();
  const invoice = await invoiceFor(bookingId);
  const input = await sessionEmailInput(row, settings, invoice);
  if (!input) return { ok: false, error: 'This booking has no session date yet.' };
  if (payment) {
    input.paymentJustReceived = { amount: payment.amount, method: payment.method, kind: payment.kind };
    input.invoiceNumber = invoice?.number ?? null;
    input.invoicePdf = payment.pdf;
  }

  const sent = await sendBookingConfirmationEmail(input);
  if (!sent.ok) {
    await logActivity({ bookingId, kind: 'email_failed', body: `Confirmation: ${sent.error}` });
    return sent;
  }
  await sql`UPDATE bookings SET confirmation_sent_at = NOW() WHERE id = ${bookingId}`;
  await logActivity({ bookingId, kind: 'confirmation_sent', body: `Confirmation sent to ${input.email}` });
  return { ok: true };
}

export async function sendBookingReminder(bookingId: string): Promise<ActionResult> {
  const result = await sql`SELECT * FROM bookings WHERE id = ${bookingId}`;
  const row = result.rows[0];
  if (!row) return { ok: false, error: 'Booking not found.' };

  const settings = await getSettings();
  const invoice = await invoiceFor(bookingId);
  const input = await sessionEmailInput(row, settings, invoice);
  if (!input) return { ok: false, error: 'This booking has no session date yet.' };

  const sent = await sendReminderEmail(input);
  if (!sent.ok) {
    await logActivity({ bookingId, kind: 'email_failed', body: `Reminder: ${sent.error}` });
    return sent;
  }
  await sql`UPDATE bookings SET reminder_sent_at = NOW() WHERE id = ${bookingId}`;
  await logActivity({ bookingId, kind: 'reminder_sent', body: `Reminder sent to ${input.email}` });
  return { ok: true };
}

/** After any card payment lands: the client gets exactly one email — the
 *  full booking confirmation the first time money arrives (folding in the
 *  receipt), or a plain receipt for any payment after that — plus a
 *  heads-up to Silvana either way. */
export async function afterPayment(
  doc: DocumentRow,
  amount: number,
  method: string,
  kind: string
): Promise<void> {
  // The invoice goes out again with the receipt, now showing the payment.
  let pdf: Buffer | null = null;
  try {
    pdf = await generatePdf(doc, await loadContext(doc));
  } catch (error) {
    console.error('[bookings] receipt PDF failed:', error);
  }

  const alreadyConfirmed = doc.bookingId
    ? Boolean((await sql`SELECT confirmation_sent_at FROM bookings WHERE id = ${doc.bookingId}`).rows[0]?.confirmation_sent_at)
    : true;

  if (doc.bookingId && kind !== 'cancellation_fee' && !alreadyConfirmed) {
    await sendBookingConfirmation(doc.bookingId, { amount, method, kind, pdf });
  } else {
    await sendReceiptEmail({
      name: doc.clientName,
      email: doc.clientEmail,
      number: doc.number,
      amount,
      method,
      kind,
      balanceDue: balanceDue(doc),
      viewUrl: publicUrl(doc),
      pdf,
    });
  }
  await sendOwnerNotification({
    subject: `Payment received: ${money(amount)} from ${doc.clientName} — ${doc.number}`,
    html: `<p style="margin:0;">${doc.clientName} paid ${money(amount)} by ${method} (${kind}) on ${doc.number}.${balanceDue(doc) > 0 ? ` ${money(balanceDue(doc))} remains.` : ' Paid in full.'}</p>`,
  });
  // A paid gift invoice turns into the certificate itself.
  if (doc.giftId && balanceDue(doc) <= 0 && kind !== 'cancellation_fee' && kind !== 'refund') {
    const issued = await issueGiftCertificate(doc.giftId);
    if (!issued.ok) {
      await logActivity({ giftId: doc.giftId, documentId: doc.id, kind: 'email_failed', body: `Certificate: ${issued.error}` });
    }
  }
}

/** Charges the deposit plan's remaining balance to the saved card. */
/**
 * Asks for the rest of the invoice by email, with fresh card links for
 * exactly the balance and the e-transfer details. The daily job sends it
 * N days before the session to anyone whose card is not on file.
 */
export async function sendBalanceRequest(bookingId: string): Promise<ActionResult> {
  const result = await sql`SELECT * FROM bookings WHERE id = ${bookingId}`;
  const row = result.rows[0];
  if (!row) return { ok: false, error: 'Booking not found.' };
  const invoice = await invoiceFor(bookingId);
  if (!invoice) return { ok: false, error: 'No invoice for this booking.' };
  const due = balanceDue(invoice);
  if (due <= 0) return { ok: false, error: 'Nothing outstanding on this invoice.' };
  const sessionDate = toIso(row.session_date);
  if (!sessionDate) return { ok: false, error: 'This booking has no session date yet.' };

  const settings = await getSettings();
  const ready = await ensurePaymentLinks(invoice, settings.business);
  const sent = await sendBalanceRequestEmail({
    name: String(row.name),
    email: String(row.email),
    number: ready.number,
    balance: due,
    sessionDate,
    sessionTime: row.session_time ? String(row.session_time) : null,
    dueOn: ready.dueOn,
    paymentHtml: paymentOptionsHtml(ready, settings.business, { sessionDate }, false),
    viewUrl: publicUrl(ready),
  });
  if (!sent.ok) {
    await logActivity({ bookingId, documentId: invoice.id, kind: 'email_failed', body: `Balance request: ${sent.error}` });
    return sent;
  }
  await sql`UPDATE bookings SET balance_requested_at = NOW() WHERE id = ${bookingId}`;
  await logActivity({
    bookingId,
    documentId: invoice.id,
    kind: 'balance_requested',
    body: `Balance of ${money(due)} requested from ${String(row.email)}`,
  });
  return { ok: true };
}

export async function chargeBalance(bookingId: string): Promise<ActionResult> {
  if (!isStripeConfigured()) return { ok: false, error: 'Stripe is not connected.' };
  const result = await sql`SELECT * FROM bookings WHERE id = ${bookingId}`;
  const row = result.rows[0];
  if (!row) return { ok: false, error: 'Booking not found.' };
  if (!row.stripe_customer_id || !row.stripe_payment_method_id) {
    return { ok: false, error: 'No card on file for this booking.' };
  }
  const invoice = await invoiceFor(bookingId);
  if (!invoice) return { ok: false, error: 'No invoice for this booking.' };
  const due = balanceDue(invoice);
  if (due <= 0) return { ok: false, error: 'Nothing outstanding on this invoice.' };

  const settings = await getSettings();
  const fee = Math.round((due * settings.business.cardFeePercent) / 100);

  let intent: string;
  try {
    intent = await chargeSavedCard({
      customerId: String(row.stripe_customer_id),
      paymentMethodId: String(row.stripe_payment_method_id),
      amount: due + fee,
      description: `${settings.business.businessName} — ${invoice.number} balance`,
      metadata: { documentId: invoice.id, plan: 'balance' },
      idempotencyKey: `balance-${invoice.id}`,
    });
  } catch (error) {
    const message = error instanceof StripeError ? error.message : 'The card could not be charged.';
    await logActivity({ bookingId, documentId: invoice.id, kind: 'charge_failed', body: `Balance: ${message}` });
    await sendOwnerNotification({
      subject: `Balance charge failed: ${String(row.name)} — ${invoice.number}`,
      html: `<p style="margin:0;">Stripe could not charge the remaining ${money(due)} for ${String(row.name)}: ${message}</p>`,
    });
    return { ok: false, error: message };
  }

  // The card has been charged. Mark that first, so a hiccup while recording
  // it can never lead to a second charge tomorrow; the intent id in the
  // history makes the money traceable in Stripe if the record fails.
  await sql`UPDATE bookings SET balance_charged_at = NOW() WHERE id = ${bookingId}`;
  try {
    const { doc } = await recordPayment({
      documentId: invoice.id,
      amount: due,
      method: 'card',
      kind: 'balance',
      stripePaymentIntent: intent,
      note: fee > 0 ? `Card fee ${money(fee)} charged on top` : null,
    });
    await afterPayment(doc, due, 'card', 'balance');
    return { ok: true };
  } catch (error) {
    console.error('[bookings] balance charged but not recorded:', error);
    await logActivity({
      bookingId,
      documentId: invoice.id,
      kind: 'record_failed',
      body: `Balance of ${money(due)} WAS charged (Stripe ${intent}) but could not be recorded - record it by hand`,
    });
    return { ok: false, error: `The card was charged (Stripe ${intent}) but the payment could not be recorded. Record it manually.` };
  }
}

/** The late-cancellation / no-show fee, to the card on file. */
export async function chargeCancellationFee(bookingId: string): Promise<ActionResult> {
  if (!isStripeConfigured()) return { ok: false, error: 'Stripe is not connected.' };
  const result = await sql`SELECT * FROM bookings WHERE id = ${bookingId}`;
  const row = result.rows[0];
  if (!row) return { ok: false, error: 'Booking not found.' };
  if (!row.stripe_customer_id || !row.stripe_payment_method_id) {
    return { ok: false, error: 'No card on file for this booking.' };
  }
  if (row.cancellation_fee_charged_at) return { ok: false, error: 'The fee was already charged.' };

  const settings = await getSettings();
  const fee = settings.business.cancellationFee;
  if (fee <= 0) return { ok: false, error: 'No cancellation fee is set.' };
  const invoice = (await invoiceFor(bookingId)) ?? (await ensureBookingDocument(bookingId, 'invoice', settings));

  try {
    const intent = await chargeSavedCard({
      customerId: String(row.stripe_customer_id),
      paymentMethodId: String(row.stripe_payment_method_id),
      amount: fee,
      description: `${settings.business.businessName} — cancellation fee (${invoice.number})`,
      metadata: { documentId: invoice.id, plan: 'cancellation_fee' },
      idempotencyKey: `cancel-fee-${bookingId}`,
    });
    await sql`
      INSERT INTO payments (document_id, booking_id, amount, method, kind, stripe_payment_intent, note)
      VALUES (${invoice.id}, ${bookingId}, ${fee}, 'card', 'cancellation_fee', ${intent}, 'Late cancellation / no-show')
    `;
    await sql`UPDATE bookings SET cancellation_fee_charged_at = NOW() WHERE id = ${bookingId}`;
    await logActivity({ bookingId, documentId: invoice.id, kind: 'cancellation_fee_charged', body: money(fee) });
    await sendReceiptEmail({
      name: String(row.name),
      email: String(row.email),
      number: invoice.number,
      amount: fee,
      method: 'card',
      kind: 'cancellation_fee',
      balanceDue: 0,
      viewUrl: publicUrl(invoice),
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof StripeError ? error.message : 'The card could not be charged.';
    await logActivity({ bookingId, kind: 'charge_failed', body: `Cancellation fee: ${message}` });
    return { ok: false, error: message };
  }
}

/**
 * Once a day (Vercel Cron → /api/cron/daily): reminders N days out, deposit
 * balances M days out. Each is idempotent via the *_at stamps.
 */
export async function runDailyJobs(): Promise<{
  reminders: number;
  balances: number;
  balanceRequests: number;
  databasePingedAt: string;
  errors: string[];
}> {
  // A daily round trip is also what keeps the database awake: a hosted
  // Postgres that sees no traffic for a week is paused by its provider.
  const ping = await sql`SELECT NOW() AS now`;
  const databasePingedAt = new Date(String(ping.rows[0]?.now ?? Date.now())).toISOString();

  const settings = await getSettings();
  const today = torontoToday();
  const errors: string[] = [];

  const reminderDay = addDays(today, settings.business.reminderDaysBefore);
  const remind = await sql`
    SELECT id FROM bookings
    WHERE status = 'booked' AND session_date = ${reminderDay} AND reminder_sent_at IS NULL
  `;
  let reminders = 0;
  for (const row of remind.rows) {
    const r = await sendBookingReminder(String(row.id));
    if (r.ok) reminders += 1;
    else errors.push(`reminder ${String(row.id)}: ${r.error}`);
  }

  const balanceDay = addDays(today, settings.business.balanceDaysBefore);
  const charge = await sql`
    SELECT b.id FROM bookings b
    JOIN documents d ON d.booking_id = b.id AND d.kind = 'invoice' AND d.status NOT IN ('void', 'paid')
    WHERE b.status = 'booked' AND b.session_date <= ${balanceDay}
      AND b.stripe_payment_method_id IS NOT NULL AND b.balance_charged_at IS NULL
      AND d.paid_amount > 0 AND d.paid_amount < d.total
  `;
  let balances = 0;
  for (const row of charge.rows) {
    const r = await chargeBalance(String(row.id));
    if (r.ok) balances += 1;
    else errors.push(`balance ${String(row.id)}: ${r.error}`);
  }

  // Everyone else with a balance still owed gets asked for it by email:
  // no card on file, or a card that could not be charged just now.
  const ask = await sql`
    SELECT b.id FROM bookings b
    JOIN documents d ON d.booking_id = b.id AND d.kind = 'invoice' AND d.status NOT IN ('void', 'paid')
    WHERE b.status = 'booked' AND b.session_date <= ${balanceDay} AND b.session_date >= ${today}
      AND b.balance_requested_at IS NULL AND b.balance_charged_at IS NULL
      AND d.paid_amount > 0 AND d.paid_amount < d.total
  `;
  let balanceRequests = 0;
  for (const row of ask.rows) {
    const r = await sendBalanceRequest(String(row.id));
    if (r.ok) balanceRequests += 1;
    else errors.push(`balance request ${String(row.id)}: ${r.error}`);
  }

  return { reminders, balances, balanceRequests, databasePingedAt, errors };
}
