import 'server-only';

import { sql, sqlRaw } from '@/lib/db';
import {
  emailBodyHtml,
  sendDocumentEmail,
  sendOwnerNotification,
} from '@/lib/email';
import { renderPdf } from '@/lib/pdfshift';
import { createPaymentLink, deactivatePaymentLink, isStripeConfigured } from '@/lib/stripe';
import {
  balanceDue,
  formatStudioDate,
  type DocumentKind,
  type DocumentLine,
  type DocumentRow,
  type DocumentStatus,
} from '@/lib/pipeline';
import { giftQuoteFor, quoteFor } from '@/lib/quote';
import { getSettings, type BusinessSettings, type SiteSettings } from '@/lib/settings';
import { LOUNGE_MAX, money, SITE, toTorontoDateIso, venueNoteFor } from '@/lib/site';

/**
 * Proposals, invoices and gift certificates.
 *
 * A document is a snapshot: its line items and totals are copied in when it
 * is created, so a later price change on the website never rewrites paperwork
 * a client already has. Sending is best-effort on the PDF (the email carries
 * the same content inline) and honest about the email itself - a failed send
 * is reported back, never swallowed.
 */

type Row = Record<string, unknown>;

export type ActionResult = { ok: boolean; error?: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toStamp(value: unknown): string | null {
  if (!value) return null;
  return new Date(String(value)).toISOString();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The digits a client is asked to quote on an e-transfer - just the
 *  sequence at the end (e.g. "0012" of "LA-2026-0012"), never the letters
 *  or the year, since those are what people get wrong when copying it. */
export function referenceTail(number: string): string {
  return number.slice(-4);
}

export function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 10px;">${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date in Toronto, not UTC - `toISOString()` rolls over
 *  to tomorrow as early as 8pm EDT / 7pm EST, which showed up as invoices
 *  issued a day ahead of the actual local date. */
function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date());
}

export function documentFromRow(row: Row): DocumentRow {
  const lines = Array.isArray(row.lines)
    ? (row.lines as DocumentLine[]).map((l) => ({
        label: String(l.label),
        amount: Number(l.amount),
      }))
    : [];
  return {
    id: String(row.id),
    kind: String(row.kind) as DocumentKind,
    number: String(row.number),
    bookingId: row.booking_id ? String(row.booking_id) : null,
    giftId: row.gift_id ? String(row.gift_id) : null,
    clientName: String(row.client_name),
    clientEmail: String(row.client_email),
    clientCompany: row.client_company ? String(row.client_company) : null,
    status: String(row.status) as DocumentStatus,
    lines,
    subtotal: Number(row.subtotal),
    taxRate: Number(row.tax_rate),
    tax: Number(row.tax),
    total: Number(row.total),
    issuedOn: toIso(row.issued_on) ?? todayIso(),
    dueOn: toIso(row.due_on),
    notes: row.notes ? String(row.notes) : null,
    token: String(row.token),
    hasPdf: Boolean(row.has_pdf ?? row.pdf_generated_at),
    paidAmount: Number(row.paid_amount ?? 0),
    paymentPlan: row.payment_plan ? String(row.payment_plan) : null,
    payFullUrl: row.stripe_link_full ? String(row.stripe_link_full) : null,
    payDepositUrl: row.stripe_link_deposit ? String(row.stripe_link_deposit) : null,
    linkAmount: row.stripe_link_amount == null ? null : Number(row.stripe_link_amount),
    signerName: row.signer_name ? String(row.signer_name) : null,
    sentAt: toStamp(row.sent_at),
    sentTo: row.sent_to ? String(row.sent_to) : null,
    viewedAt: toStamp(row.viewed_at),
    acceptedAt: toStamp(row.accepted_at),
    paidAt: toStamp(row.paid_at),
    paidMethod: row.paid_method ? String(row.paid_method) : null,
    voidedAt: toStamp(row.voided_at),
    createdAt: toStamp(row.created_at) ?? new Date().toISOString(),
  };
}

/** Every column except the PDF bytes, which are only read on download. */
export const DOC_COLUMNS = `
  id, kind, number, booking_id, gift_id, client_name, client_email,
  client_company, status, lines, subtotal, tax_rate, tax, total, issued_on,
  due_on, notes, token, (pdf IS NOT NULL) AS has_pdf, pdf_generated_at,
  paid_amount, payment_plan, stripe_link_full, stripe_link_deposit,
  stripe_link_amount, signer_name,
  sent_at, sent_to, viewed_at, accepted_at, paid_at, paid_method, voided_at,
  created_at
`;

async function selectDocuments(where: string, params: unknown[]): Promise<DocumentRow[]> {
  const result = await sqlRaw(`SELECT ${DOC_COLUMNS} FROM documents WHERE ${where}`, params);
  return result.rows.map(documentFromRow);
}

export async function getDocument(id: string): Promise<DocumentRow | null> {
  return (await selectDocuments('id = $1', [id]))[0] ?? null;
}

export async function getDocumentByToken(token: string): Promise<DocumentRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  return (await selectDocuments('token = $1', [token]))[0] ?? null;
}

export async function getDocumentPdf(id: string): Promise<Buffer | null> {
  const result = await sql`SELECT pdf FROM documents WHERE id = ${id}`;
  const pdf = result.rows[0]?.pdf;
  if (!pdf) return null;
  return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf as Uint8Array);
}

export async function logActivity(entry: {
  bookingId?: string | null;
  giftId?: string | null;
  documentId?: string | null;
  clientEmail?: string | null;
  kind: string;
  body?: string | null;
}): Promise<void> {
  await sql`
    INSERT INTO activity (booking_id, gift_id, document_id, client_email, kind, body)
    VALUES (${entry.bookingId ?? null}, ${entry.giftId ?? null}, ${entry.documentId ?? null},
            ${entry.clientEmail?.trim().toLowerCase() ?? null}, ${entry.kind}, ${entry.body ?? null})
  `.catch((error) => console.error('[activity] insert failed:', error));
}

// ---------------------------------------------------------------------------
// Numbering
// ---------------------------------------------------------------------------

export async function nextNumber(kind: DocumentKind, prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const result = await sql`
    INSERT INTO document_counters (kind, year, last) VALUES (${kind}, ${year}, 1)
    ON CONFLICT (kind, year) DO UPDATE SET last = document_counters.last + 1
    RETURNING last
  `;
  const n = String(Number(result.rows[0]?.last ?? 1)).padStart(4, '0');
  const tag = kind === 'proposal' ? 'P-' : kind === 'certificate' ? 'GC-' : '';
  return `${prefix}-${tag}${year}-${n}`;
}

// ---------------------------------------------------------------------------
// Line items from a booking / gift, priced with the shared quote engine.
// ---------------------------------------------------------------------------

export type BookingCtx = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string | null;
  participants: number;
  sessionDate: string | null;
  sessionTime: string | null;
  sessionDate2: string | null;
  sessionTime2: string | null;
  teamAddon: boolean;
  isPackage: boolean;
  isCorporateIntro: boolean;
  discountCode: string | null;
  gratuity: number;
  total: number;
  status: string;
};

function bookingCtx(row: Row): BookingCtx {
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

export async function loadBooking(id: string): Promise<BookingCtx | null> {
  const result = await sql`SELECT * FROM bookings WHERE id = ${id}`;
  const row = result.rows[0];
  return row ? bookingCtx(row) : null;
}

/**
 * The website's quote labels, spelled out for paperwork: the session line
 * names the experience the client chose, and dashes become plain punctuation.
 */
function invoiceLabel(label: string): string {
  const plain = label.replace(/\s+[\u2014\u2013-]\s+/g, ': ');
  const group = /^(\d+) participants$/.exec(plain);
  if (group) return `Immersive Soma Sound Experience, ${group[1]} participants`;
  if (/^(one|1) private session$/i.test(plain)) return 'Immersive Soma Sound Experience, one private session';
  if (/^package of four sessions$/i.test(plain)) return 'Immersive Soma Sound Experience, package of four private sessions';
  return plain;
}

export function bookingLines(booking: BookingCtx, settings: SiteSettings): DocumentLine[] {
  const code = booking.discountCode
    ? settings.codes.find((c) => c.code === booking.discountCode)
    : undefined;
  const quote = quoteFor(
    {
      participants: booking.participants,
      isPackage: booking.isPackage,
      isCorporateIntro: booking.isCorporateIntro,
      teamAddon: booking.teamAddon,
      percentOff: code?.percentOff,
      amountOff: code?.amountOff,
      discountLabel: code?.code,
      discountMinParticipants: code?.minParticipants,
      gratuityAmount: booking.gratuity || undefined,
    },
    settings.pricing
  );
  const lines: DocumentLine[] = quote.lines.map((line) => ({
    label: invoiceLabel(line.label),
    amount: parseMoney(line.value),
  }));
  // The booking's stored total is what the client saw and agreed to. If the
  // website's prices moved since, keep their figure and show the difference
  // plainly rather than silently re-pricing them.
  const sum = lines.reduce((t, l) => t + l.amount, 0);
  if (sum !== booking.total) {
    lines.push({ label: 'Adjustment to quoted total', amount: booking.total - sum });
  }
  return lines;
}

type GiftCtx = {
  id: string;
  recipientName: string;
  recipientEmail: string | null;
  buyerName: string | null;
  buyerEmail: string;
  format: string;
  sessions: number | null;
  participants: number | null;
  addons: Record<string, boolean>;
  discountCode: string | null;
  code: string | null;
  total: number;
  gratuity: number;
  status: string;
};

function giftCtx(row: Row): GiftCtx {
  return {
    id: String(row.id),
    recipientName: String(row.recipient_name),
    recipientEmail: row.recipient_email ? String(row.recipient_email) : null,
    buyerName: row.buyer_name ? String(row.buyer_name) : null,
    buyerEmail: String(row.buyer_email),
    format: String(row.format),
    sessions: row.sessions == null ? null : Number(row.sessions),
    participants: row.participants == null ? null : Number(row.participants),
    addons: (row.addons as Record<string, boolean>) ?? {},
    discountCode: row.discount_code ? String(row.discount_code) : null,
    code: row.code ? String(row.code) : null,
    total: Number(row.total ?? 0),
    gratuity: Number(row.gratuity ?? 0),
    status: String(row.status),
  };
}

async function loadGift(id: string): Promise<GiftCtx | null> {
  const result = await sql`SELECT * FROM gift_requests WHERE id = ${id}`;
  const row = result.rows[0];
  return row ? giftCtx(row) : null;
}

export function giftLines(gift: GiftCtx, settings: SiteSettings): DocumentLine[] {
  const code = gift.discountCode
    ? settings.codes.find((c) => c.code === gift.discountCode)
    : undefined;
  const quote = giftQuoteFor(
    {
      format: gift.format === 'private' ? 'private' : 'group',
      sessions: gift.sessions ?? 1,
      participants: gift.participants ?? 6,
      addons: gift.addons,
      percentOff: code?.percentOff,
      amountOff: code?.amountOff,
      discountLabel: code?.code,
      discountMinParticipants: code?.minParticipants,
      gratuityAmount: gift.gratuity || undefined,
    },
    settings.pricing
  );
  const lines: DocumentLine[] = quote.lines.map((line) => ({
    label: `Gift certificate — ${line.label}`,
    amount: parseMoney(line.value),
  }));
  const sum = lines.reduce((t, l) => t + l.amount, 0);
  if (sum !== gift.total) {
    lines.push({ label: 'Adjustment to quoted total', amount: gift.total - sum });
  }
  return lines;
}

/** "$1,725" → 1725, "−$100" → -100 (the quote engine formats with U+2212). */
export function parseMoney(value: string): number {
  const digits = Number(value.replace(/[^0-9.]/g, ''));
  return /^[−-]/.test(value.trim()) ? -digits : digits;
}

/** Gratuity is a gift to Silvana, not a taxable service. */
export function totalsFor(lines: DocumentLine[], taxRatePercent: number) {
  const subtotal = lines.reduce((t, l) => t + Math.round(l.amount), 0);
  const taxable = lines
    .filter((l) => !/^Gratuity/.test(l.label))
    .reduce((t, l) => t + Math.round(l.amount), 0);
  const tax = Math.round((taxable * taxRatePercent) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * The live proposal/invoice for a booking, creating one if none exists yet.
 * A voided document does not count, so "Create invoice" after a void starts
 * a fresh, correctly numbered one.
 */
export async function ensureBookingDocument(
  bookingId: string,
  kind: 'proposal' | 'invoice',
  settings?: SiteSettings,
  /** Card links are minted with the invoice unless the caller will do it later. */
  options: { mintLinks?: boolean } = {}
): Promise<DocumentRow> {
  const existing = await selectDocuments(
    `booking_id = $1 AND kind = $2 AND status != 'void' ORDER BY created_at DESC LIMIT 1`,
    [bookingId, kind]
  );
  if (existing[0]) return existing[0];

  const s = settings ?? (await getSettings());
  const booking = await loadBooking(bookingId);
  if (!booking) throw new Error('Booking not found.');

  const lines = bookingLines(booking, s);
  const { subtotal, tax, total: grand } = totalsFor(lines, s.business.taxRatePercent);

  const number = await nextNumber(kind, s.business.invoicePrefix || 'LA');
  const issued = todayIso();
  // The deposit is due within the usual window, or sooner if the session
  // itself is close: the balance date is the latest the deposit makes sense.
  const invoiceDue = addDays(issued, s.business.invoiceDueDays);
  const balanceDay = balanceDueOn(booking.sessionDate, s.business);
  const dueOn =
    kind === 'invoice'
      ? balanceDay && balanceDay < invoiceDue ? balanceDay : invoiceDue
      : addDays(issued, s.business.proposalValidDays);

  const inserted = await sql`
    INSERT INTO documents (
      kind, number, booking_id, client_name, client_email, client_company,
      lines, subtotal, tax_rate, tax, total, issued_on, due_on
    ) VALUES (
      ${kind}, ${number}, ${bookingId}, ${booking.name}, ${booking.email}, ${booking.company},
      ${JSON.stringify(lines)}::jsonb, ${subtotal}, ${s.business.taxRatePercent}, ${tax}, ${grand},
      ${issued}, ${dueOn}
    )
    RETURNING id
  `;
  let doc = (await getDocument(String(inserted.rows[0].id)))!;
  await logActivity({
    bookingId,
    documentId: doc.id,
    kind: `${kind}_created`,
    body: `${doc.number} · ${money(doc.total)}`,
  });
  // The card links are minted as soon as the price exists.
  if (kind === 'invoice' && options.mintLinks !== false) doc = await ensurePaymentLinks(doc, s.business);
  return doc;
}

/**
 * The booking's invoice in a single INSERT, for the request path where every
 * database round trip is felt: the caller already holds the booking, the
 * settings and a fresh number, so nothing is looked up.
 */
export async function insertBookingInvoice(input: {
  id: string;
  token: string;
  number: string;
  booking: BookingCtx;
  settings: SiteSettings;
  /** "full" when the client chose to pay everything now (e-transfer, or full by card). */
  paymentPlan?: 'deposit' | 'full';
}): Promise<{ total: number; dueOn: string }> {
  const { booking, settings: s } = input;
  const lines = bookingLines(booking, s);
  const { subtotal, tax, total } = totalsFor(lines, s.business.taxRatePercent);
  const issued = todayIso();
  const invoiceDue = addDays(issued, s.business.invoiceDueDays);
  const balanceDay = balanceDueOn(booking.sessionDate, s.business);
  const dueOn = balanceDay && balanceDay < invoiceDue ? balanceDay : invoiceDue;
  await sql`
    INSERT INTO documents (
      id, token, kind, number, booking_id, client_name, client_email, client_company,
      lines, subtotal, tax_rate, tax, total, issued_on, due_on, payment_plan
    ) VALUES (
      ${input.id}, ${input.token}, 'invoice', ${input.number}, ${booking.id}, ${booking.name}, ${booking.email}, ${booking.company},
      ${JSON.stringify(lines)}::jsonb, ${subtotal}, ${s.business.taxRatePercent}, ${tax}, ${total},
      ${issued}, ${input.paymentPlan === 'full' ? dueOn : dueOn}, ${input.paymentPlan === 'full' ? 'full' : null}
    )
  `;
  return { total, dueOn };
}

export async function ensureGiftDocument(
  giftId: string,
  kind: 'invoice' | 'certificate',
  settings?: SiteSettings,
  options: { mintLinks?: boolean } = {}
): Promise<DocumentRow> {
  const existing = await selectDocuments(
    `gift_id = $1 AND kind = $2 AND status != 'void' ORDER BY created_at DESC LIMIT 1`,
    [giftId, kind]
  );
  if (existing[0]) return existing[0];

  const s = settings ?? (await getSettings());
  const gift = await loadGift(giftId);
  if (!gift) throw new Error('Gift request not found.');

  const lines = giftLines(gift, s);
  const rate = kind === 'invoice' ? s.business.taxRatePercent : 0;
  const { subtotal, tax, total } = totalsFor(lines, rate);
  const number = await nextNumber(kind, s.business.invoicePrefix || 'LA');
  const issued = todayIso();
  // A gift is paid at the time it's requested, not on credit terms - there
  // is no "due by" date to show anywhere for it.
  const dueOn = null;
  const to = kind === 'certificate' && gift.recipientEmail ? gift.recipientEmail : gift.buyerEmail;
  const toName = kind === 'certificate' ? gift.recipientName : (gift.buyerName ?? gift.buyerEmail);

  const inserted = await sql`
    INSERT INTO documents (
      kind, number, gift_id, client_name, client_email,
      lines, subtotal, tax_rate, tax, total, issued_on, due_on
    ) VALUES (
      ${kind}, ${number}, ${giftId}, ${toName}, ${to},
      ${JSON.stringify(lines)}::jsonb, ${subtotal}, ${rate}, ${tax}, ${total},
      ${issued}, ${dueOn}
    )
    RETURNING id
  `;
  let doc = (await getDocument(String(inserted.rows[0].id)))!;
  await logActivity({
    giftId,
    documentId: doc.id,
    kind: `${kind}_created`,
    body: `${doc.number} · ${money(doc.total)}`,
  });
  if (kind === 'invoice' && options.mintLinks !== false) doc = await ensurePaymentLinks(doc, s.business);
  return doc;
}

/**
 * Once a gift invoice is paid: the certificate is created and emailed to the
 * recipient (when an email was given) and always to the buyer, so they can
 * hand it over themselves. Safe to call twice: an already-sent certificate
 * is left alone.
 */
export async function issueGiftCertificate(giftId: string): Promise<ActionResult> {
  const settings = await getSettings();
  const gift = await loadGift(giftId);
  if (!gift) return { ok: false, error: 'Gift request not found.' };
  const certificate = await ensureGiftDocument(giftId, 'certificate', settings);
  if (certificate.status === 'sent') return { ok: true };

  // Without a recipient email, the certificate can only go to the buyer -
  // say plainly that forwarding it on is now their job, rather than the
  // default wording, which reads as if written to the recipient directly.
  const sent = await sendDocument(
    certificate.id,
    gift.recipientEmail
      ? undefined
      : `Here's the gift certificate for ${escapeHtml(gift.recipientName)}. Pass it along.`
  );
  if (!sent.ok) return sent;

  // The buyer gets their own copy when the certificate went to someone else.
  if (certificate.clientEmail.toLowerCase() !== gift.buyerEmail.toLowerCase()) {
    const ctx = await loadContext(certificate);
    const pdf = (await getDocumentPdf(certificate.id)) ?? (await generatePdf(certificate, ctx));
    await sendDocumentEmail({
      kind: 'certificate',
      to: gift.buyerEmail,
      name: gift.buyerName ?? gift.buyerEmail,
      number: certificate.number,
      total: certificate.total,
      dueOn: null,
      summaryHtml: emailBodyHtml(certificate, ctx.business),
      viewUrl: publicUrl(certificate),
      pdf,
      paymentHtml: '',
      giftCode: gift.code,
      subject: `Your Lotus Attune gift certificate for ${gift.recipientName}`,
      introHtml: `Thank you for your gift. The certificate for ${escapeHtml(gift.recipientName)} is ${pdf ? 'attached' : 'below'} and has also been sent to ${escapeHtml(certificate.clientEmail)}.`,
    });
  }
  return { ok: true };
}

/** Edit a draft's lines, notes and due date before it goes out. */
export async function updateDocument(
  id: string,
  patch: { lines?: DocumentLine[]; notes?: string | null; dueOn?: string | null }
): Promise<DocumentRow> {
  const current = await getDocument(id);
  if (!current) throw new Error('Document not found.');
  const lines = patch.lines ?? current.lines;
  const { subtotal, tax, total } = totalsFor(lines, current.taxRate);
  await sql`
    UPDATE documents SET
      lines = ${JSON.stringify(lines)}::jsonb,
      subtotal = ${subtotal}, tax = ${tax}, total = ${total},
      notes = ${patch.notes === undefined ? current.notes : patch.notes},
      due_on = ${patch.dueOn === undefined ? current.dueOn : patch.dueOn},
      pdf = NULL, pdf_generated_at = NULL,
      updated_at = NOW()
    WHERE id = ${id}
  `;
  if (total !== current.total) await retirePaymentLinks(id);
  return (await getDocument(id))!;
}

// ---------------------------------------------------------------------------
// Card payment links (Stripe). Created the moment an invoice exists, so the
// link is already in the PDF and the email the first time the client sees it.
// ---------------------------------------------------------------------------

/** Rounding a fractional-cent fee down to whole dollars can erase it
 *  entirely on a small amount (3% of $3 is $0.09, which rounds to $0) - a
 *  real fee never disappears, it floors at $1. */
export function cardFee(amount: number, feePercent: number): number {
  if (amount <= 0 || feePercent <= 0) return 0;
  return Math.max(1, Math.round((amount * feePercent) / 100));
}

export function depositAmount(doc: DocumentRow, depositPercent: number): number {
  return Math.round((doc.total * depositPercent) / 100);
}

/**
 * The deposit that confirms a session: what a booking invoice asks for
 * first, until any money has arrived on it. Null for gift and stand-alone
 * invoices, which are paid in full.
 */
export function depositDue(doc: DocumentRow, business: BusinessSettings): number | null {
  if (doc.kind !== 'invoice' || !doc.bookingId || doc.paidAmount > 0) return null;
  // Chosen "pay in full" (e-transfer, or full by card): no deposit plan.
  if (doc.paymentPlan === 'full') return null;
  if (!(business.depositPercent > 0 && business.depositPercent < 100)) return null;
  return depositAmount(doc, business.depositPercent);
}

/** The day the rest of a session invoice is due: N calendar days before the session, never in the past. */
export function balanceDueOn(sessionDate: string | null, business: BusinessSettings): string | null {
  if (!sessionDate) return null;
  const day = addDays(sessionDate, -business.balanceDaysBefore);
  const today = todayIso();
  return day < today ? today : day;
}

/**
 * Switches off both Stripe links (so an old email can no longer charge the
 * client) and forgets them. Called whenever the amount owed changes or the
 * invoice stops being payable; the next view/send mints fresh ones.
 */
export async function retirePaymentLinks(id: string): Promise<void> {
  const result = await sql`
    SELECT stripe_link_full_id, stripe_link_deposit_id FROM documents WHERE id = ${id}
  `;
  const row = result.rows[0];
  if (!row) return;
  for (const linkId of [row.stripe_link_full_id, row.stripe_link_deposit_id]) {
    if (linkId) await deactivatePaymentLink(String(linkId));
  }
  await sql`
    UPDATE documents SET
      stripe_link_full = NULL, stripe_link_full_id = NULL,
      stripe_link_deposit = NULL, stripe_link_deposit_id = NULL,
      stripe_link_amount = NULL, updated_at = NOW()
    WHERE id = ${id}
  `;
}

/**
 * The card links for what is *currently* owed: a "pay in full" link for the
 * outstanding balance and, before any money has arrived on a session
 * invoice, a deposit link. Links minted for a different balance are retired
 * first, so the amount printed and the amount Stripe charges always agree.
 */
export async function ensurePaymentLinks(
  doc: DocumentRow,
  business: BusinessSettings
): Promise<DocumentRow> {
  if (doc.kind !== 'invoice' || doc.status === 'void' || doc.status === 'paid') return doc;
  if (!isStripeConfigured()) return doc;

  const due = doc.total - doc.paidAmount;
  if (due <= 0) return doc;
  const depositWanted =
    Boolean(doc.bookingId) &&
    doc.paidAmount === 0 &&
    doc.paymentPlan !== 'full' &&
    business.depositPercent > 0 &&
    business.depositPercent < 100;

  const fullOk = Boolean(doc.payFullUrl) && doc.linkAmount === due;
  const depositOk = depositWanted ? Boolean(doc.payDepositUrl) : !doc.payDepositUrl;
  if (fullOk && depositOk) return doc;

  const redirectUrl = `${publicUrl(doc)}?paid=1`;
  const feeLabel = `Card processing fee (${business.cardFeePercent}%)`;
  const metadata = { documentId: doc.id, number: doc.number };

  try {
    if (doc.payFullUrl || doc.payDepositUrl) await retirePaymentLinks(doc.id);

    const full = await createPaymentLink({
      description: `${business.businessName} — ${doc.number}${doc.paidAmount > 0 ? ' (balance)' : ''}`,
      amount: due,
      feeAmount: cardFee(due, business.cardFeePercent),
      feeLabel,
      metadata: { ...metadata, plan: 'full', amount: String(due) },
      redirectUrl,
      saveCard: Boolean(doc.bookingId),
    });
    // The deposit plan only makes sense for a session with a date to charge
    // the balance before - gift certificates are paid in full.
    let deposit: { id: string; url: string } | null = null;
    if (depositWanted) {
      const amount = depositAmount(doc, business.depositPercent);
      deposit = await createPaymentLink({
        description: `${business.businessName} — ${doc.number} (${business.depositPercent}% deposit)`,
        amount,
        feeAmount: cardFee(amount, business.cardFeePercent),
        feeLabel,
        metadata: { ...metadata, plan: 'deposit', amount: String(amount) },
        redirectUrl,
        saveCard: true,
      });
    }
    await sql`
      UPDATE documents SET
        stripe_link_full = ${full.url}, stripe_link_full_id = ${full.id},
        stripe_link_deposit = ${deposit?.url ?? null}, stripe_link_deposit_id = ${deposit?.id ?? null},
        stripe_link_amount = ${due}, updated_at = NOW()
      WHERE id = ${doc.id}
    `;
    return (await getDocument(doc.id)) ?? doc;
  } catch (error) {
    console.error('[documents] payment link failed:', error);
    return doc;
  }
}

// ---------------------------------------------------------------------------
// Recording money
// ---------------------------------------------------------------------------

export async function recordPayment(input: {
  documentId: string;
  amount: number;
  method: 'card' | 'e-transfer' | 'cash' | 'other';
  kind?: 'payment' | 'deposit' | 'balance' | 'cancellation_fee' | 'refund';
  stripePaymentIntent?: string | null;
  stripeCheckoutSession?: string | null;
  stripeCustomerId?: string | null;
  stripePaymentMethodId?: string | null;
  /** Outside id of the notice this came from (an Interac email), for de-duplication. */
  externalRef?: string | null;
  note?: string | null;
}): Promise<{ doc: DocumentRow; alreadyRecorded: boolean }> {
  const doc = await getDocument(input.documentId);
  if (!doc) throw new Error('Document not found.');

  if (input.stripePaymentIntent) {
    const dup = await sql`
      SELECT id FROM payments WHERE stripe_payment_intent = ${input.stripePaymentIntent}
    `;
    if (dup.rows[0]) return { doc, alreadyRecorded: true };
  }
  if (input.externalRef) {
    const dup = await sql`SELECT id FROM payments WHERE external_ref = ${input.externalRef}`;
    if (dup.rows[0]) return { doc, alreadyRecorded: true };
  }

  const kind = input.kind ?? (input.amount >= doc.total - doc.paidAmount ? 'payment' : 'deposit');
  await sql`
    INSERT INTO payments (document_id, booking_id, gift_id, amount, method, kind, stripe_payment_intent, stripe_checkout_session, external_ref, note)
    VALUES (${doc.id}, ${doc.bookingId}, ${doc.giftId}, ${input.amount}, ${input.method}, ${kind},
            ${input.stripePaymentIntent ?? null}, ${input.stripeCheckoutSession ?? null}, ${input.externalRef ?? null}, ${input.note ?? null})
  `;

  // Money against a voided invoice is real money - keep the record and shout,
  // but never resurrect the void document or move the booking on its account.
  if (doc.status === 'void') {
    await logActivity({
      bookingId: doc.bookingId,
      giftId: doc.giftId,
      documentId: doc.id,
      kind: 'payment_on_void',
      body: `${money(input.amount)} by ${input.method} arrived against voided ${doc.number} - apply it to the replacement invoice or refund it`,
    });
    await sendOwnerNotification({
      subject: `Payment received on a VOID invoice — ${doc.number}`,
      html: `<p style="margin:0;">${escapeHtml(doc.clientName)} paid ${money(input.amount)} by ${input.method} against ${escapeHtml(doc.number)}, which is void. Record it on the replacement invoice or refund it.</p>`,
    });
    return { doc, alreadyRecorded: false };
  }

  const paid = doc.paidAmount + input.amount;
  const settled = paid >= doc.total;
  const plan = doc.paymentPlan ?? (settled ? 'full' : 'deposit');
  // Once the deposit is in, the invoice's due date becomes the balance date.
  let nextDue: string | null = null;
  if (!settled && doc.bookingId) {
    const b = await sql`SELECT session_date FROM bookings WHERE id = ${doc.bookingId}`;
    const s = await getSettings();
    nextDue = balanceDueOn(toIso(b.rows[0]?.session_date), s.business);
  }
  // The PDF is re-rendered on the next send or download so it shows what
  // was paid, not the pre-payment ask.
  await sql`
    UPDATE documents SET
      paid_amount = ${paid},
      payment_plan = ${plan},
      pdf = NULL, pdf_generated_at = NULL,
      due_on = COALESCE(${nextDue}::date, due_on),
      status = ${settled ? 'paid' : doc.status === 'draft' ? 'sent' : doc.status},
      paid_at = ${settled ? new Date() : null},
      paid_method = ${settled ? input.method : doc.paidMethod},
      updated_at = NOW()
    WHERE id = ${doc.id}
  `;

  if (doc.bookingId) {
    await sql`
      UPDATE bookings SET
        status = CASE WHEN status IN ('new_enquiry','contacted','proposal_sent') THEN 'booked' ELSE status END,
        stripe_customer_id = COALESCE(${input.stripeCustomerId ?? null}, stripe_customer_id),
        stripe_payment_method_id = COALESCE(${input.stripePaymentMethodId ?? null}, stripe_payment_method_id)
      WHERE id = ${doc.bookingId}
    `;
  }
  if (doc.giftId && settled) {
    await sql`UPDATE gift_requests SET status = 'active' WHERE id = ${doc.giftId} AND status = 'requested'`;
  }

  await logActivity({
    bookingId: doc.bookingId,
    giftId: doc.giftId,
    documentId: doc.id,
    kind: settled ? 'invoice_paid' : 'deposit_paid',
    body: `${money(input.amount)} by ${input.method} on ${doc.number}${settled ? '' : ` · ${money(doc.total - paid)} remaining`}`,
  });

  // The old links charged the old balance; they are re-minted for what is
  // left the next time the invoice is viewed or sent.
  await retirePaymentLinks(doc.id).catch((error) =>
    console.error('[documents] retiring links failed:', error)
  );

  return { doc: (await getDocument(doc.id))!, alreadyRecorded: false };
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,500&family=Jost:wght@400;500;600&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; background: #fbf7f1; color: #3b2e24; font-family: 'Jost', Arial, Helvetica, sans-serif; font-size: 12.5px; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 8.5in; min-height: 11in; margin: 0 auto; background: #fffdfa; padding: 0.55in 0.75in 0.45in; position: relative; }
  .display { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; }
  .eyebrow { font-size: 9.5px; letter-spacing: 0.32em; text-transform: uppercase; color: #7c5b3b; }
  .muted { color: #6f5f52; }
  .rule { height: 1px; background: rgba(59,46,36,0.14); margin: 14px 0; }
  table { border-collapse: collapse; width: 100%; }
  .lines th { text-align: left; font-weight: 500; font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; color: #7c5b3b; padding: 0 0 6px; border-bottom: 1px solid rgba(59,46,36,0.2); }
  .lines td { padding: 6px 0; border-bottom: 1px solid rgba(59,46,36,0.1); vertical-align: top; }
  .lines td.amt, .lines th.amt { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals td { padding: 4px 0; }
  .totals .grand td { padding-top: 8px; border-top: 1px solid rgba(59,46,36,0.2); font-family: 'Cormorant Garamond', Georgia, serif; font-size: 20px; font-weight: 400; }
  .box { background: #241b14; color: #f6efe5; padding: 14px 20px; margin: 12px 0; }
  .box .eyebrow { color: #c6a97a; }
  .box .k { font-size: 9.5px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(239,230,218,0.6); padding: 4px 0 1px; }
  .box .v { font-size: 13.5px; color: #f6efe5; text-align: right; padding: 4px 0 1px; }
  .foot { margin-top: 20px; font-size: 10.5px; color: #6f5f52; border-top: 1px solid rgba(59,46,36,0.14); padding-top: 8px; display: flex; justify-content: space-between; }
  a { color: #7c5b3b; }
`;

const LOGO_URL = `${SITE.url}/assets/email-logo.png?v=2`;

function header(kind: DocumentKind, doc: DocumentRow, business: BusinessSettings): string {
  const title = kind === 'proposal' ? 'Proposal' : kind === 'invoice' ? 'Invoice' : 'Gift certificate';
  return `
    <table><tr>
      <td style="vertical-align:top;width:55%;">
        <img src="${LOGO_URL}" width="150" alt="${escapeHtml(business.businessName)}" style="display:block;margin:-14px 0 6px -6px;" />
        <div class="eyebrow">Immersive Soma Sound Experience</div>
      </td>
      <td style="vertical-align:top;text-align:right;">
        <div class="display" style="font-size:34px;line-height:1;margin-bottom:8px;">${title}</div>
        <div style="font-size:13px;letter-spacing:0.08em;">${escapeHtml(doc.number)}</div>
        <div class="muted" style="margin-top:6px;">Issued ${formatStudioDate(doc.issuedOn)}</div>
        ${doc.dueOn && kind === 'invoice' && balanceDue(doc) > 0 ? `<div class="muted">Due ${formatStudioDate(doc.dueOn)}</div>` : ''}
        ${kind === 'invoice' && balanceDue(doc) <= 0 ? `<div class="muted">Paid in full</div>` : ''}
        ${doc.dueOn && kind === 'proposal' ? `<div class="muted">Valid until ${formatStudioDate(doc.dueOn)}</div>` : ''}
      </td>
    </tr></table>
    <div class="rule"></div>
    <table><tr>
      <td style="vertical-align:top;width:50%;padding-right:20px;">
        <div class="eyebrow" style="margin-bottom:6px;">From</div>
        <div style="font-weight:500;margin-bottom:4px;">${escapeHtml(business.businessName)}</div>
        ${business.businessAddress ? `<div class="muted">${escapeHtml(business.businessAddress).replace(/\n/g, '<br />')}</div>` : ''}
        <div class="muted">${escapeHtml(business.businessEmail)}</div>
        <div class="muted">${escapeHtml(business.businessPhone)}</div>
        <div class="muted"><a href="https://www.lotusattune.com">www.lotusattune.com</a></div>
        ${business.taxNumber ? `<div class="muted">${escapeHtml(business.taxLabel)} № ${escapeHtml(business.taxNumber)}</div>` : ''}
      </td>
      <td style="vertical-align:top;width:50%;">
        <div class="eyebrow" style="margin-bottom:6px;">${kind === 'proposal' ? 'Prepared for' : 'Bill to'}</div>
        <div style="font-weight:500;margin-bottom:4px;">${escapeHtml(doc.clientName)}</div>
        ${doc.clientCompany ? `<div class="muted">${escapeHtml(doc.clientCompany)}</div>` : ''}
        <div class="muted">${escapeHtml(doc.clientEmail)}</div>
      </td>
    </tr></table>
  `;
}

function sessionBox(booking: BookingCtx): string {
  const venue = booking.participants <= LOUNGE_MAX ? 'Private Wellness Lounge' : 'Premium Signature Venue';
  const format =
    booking.participants === 1
      ? booking.isPackage ? 'Private — package of four sessions' : 'Private session'
      : booking.isCorporateIntro
        ? `Corporate introductory experience — ${booking.participants} participants`
        : `${booking.participants} participants`;
  const rows: Array<[string, string]> = [
    ['Experience', 'Immersive Soma Sound Experience, two hours'],
    ['Format', format],
    ['Date', formatStudioDate(booking.sessionDate)],
    ['Time', booking.sessionTime ?? '—'],
  ];
  if (booking.sessionDate2) {
    rows.push([
      'Second session',
      booking.sessionDate2 === booking.sessionDate
        ? booking.sessionTime2 ?? ''
        : `${formatStudioDate(booking.sessionDate2)} · ${booking.sessionTime2 ?? ''}`,
    ]);
  }
  rows.push(['Venue', venue]);
  if (booking.teamAddon) rows.push(['Add-on', 'Team-building activity']);
  return `
    <div class="box">
      <div class="eyebrow" style="margin-bottom:6px;">The experience</div>
      <table>${rows
        .map(([k, v]) => `<tr><td class="k">${escapeHtml(k)}</td><td class="v">${escapeHtml(v)}</td></tr>`)
        .join('')}</table>
      <div style="font-size:11.5px;color:rgba(239,230,218,0.75);margin-top:10px;line-height:1.55;">${escapeHtml(venueNoteFor(booking.participants))}</div>
    </div>
  `;
}

function linesTable(doc: DocumentRow, business: BusinessSettings): string {
  // Paid by card: the fee was actually charged, so it belongs in the
  // record itself, ahead of the total it changes - not hidden, and not a
  // footnote below a total that would then be wrong.
  const paidByCard = doc.kind === 'invoice' && doc.status === 'paid' && doc.paidMethod === 'card';
  // Not yet paid: the fee is only a preview of what card would cost, shown
  // as a secondary line under the (unaffected) total.
  const previewCardFee = doc.kind === 'invoice' && business.cardFeePercent > 0 && doc.status !== 'paid' && doc.status !== 'void';
  const fee = paidByCard || previewCardFee ? cardFee(doc.total, business.cardFeePercent) : 0;
  const grandTotal = paidByCard ? doc.total + fee : doc.total;
  return `
    <table class="lines">
      <thead><tr><th>Description</th><th class="amt">Amount</th></tr></thead>
      <tbody>${doc.lines
        .map(
          (l) => `<tr><td>${escapeHtml(l.label)}</td><td class="amt">${l.amount < 0 ? '−' : ''}${money(Math.abs(l.amount))}</td></tr>`
        )
        .join('')}</tbody>
    </table>
    <table class="totals" style="margin-top:8px;">
      <tr><td></td><td style="width:230px;"><table class="totals">
        <tr><td class="muted">Subtotal</td><td class="amt" style="text-align:right;">${money(doc.subtotal)}</td></tr>
        ${doc.taxRate > 0 ? `<tr><td class="muted">${escapeHtml(business.taxLabel)} ${doc.taxRate}%</td><td style="text-align:right;">${money(doc.tax)}</td></tr>` : ''}
        ${paidByCard ? `<tr><td class="muted">Card processing fee (${business.cardFeePercent}%)</td><td class="amt" style="text-align:right;">${money(fee)}</td></tr>` : ''}
        <tr class="grand"><td>Total</td><td style="text-align:right;">${money(grandTotal)} <span style="font-size:11px;font-family:Jost,Arial,sans-serif;color:#6f5f52;">CAD</span></td></tr>
        ${previewCardFee ? `<tr><td class="muted" style="font-size:10.5px;padding-top:6px;">+ ${money(fee)} card fee (${business.cardFeePercent}%)</td><td class="amt" style="text-align:right;font-size:10.5px;padding-top:6px;">${money(doc.total + fee)} by card</td></tr>` : ''}
      </table></td></tr>
    </table>
  `;
}

function footer(business: BusinessSettings, doc: DocumentRow): string {
  return `<div class="foot"><span>${escapeHtml(business.businessName)} · ${escapeHtml(business.businessEmail)} · ${escapeHtml(business.businessPhone)}</span><span>${escapeHtml(doc.number)}</span></div>`;
}

/**
 * How to pay, in the client's terms. On a session invoice before any money
 * has arrived, the ask is the deposit that confirms the date, with the
 * balance date spelled out; afterwards (and on gift or stand-alone
 * invoices) it is whatever is still owed. E-transfer first (no fees), card
 * second; the card lines only appear once Stripe is connected and the links
 * exist.
 */
export function paymentOptionsHtml(
  doc: DocumentRow,
  business: BusinessSettings,
  booking?: { sessionDate: string | null } | null,
  /** The opening "what is due and when" paragraph; off where the email already said it. */
  withIntro = true
): string {
  const deposit = depositDue(doc, business);
  const outstanding = doc.total - doc.paidAmount;
  const balanceDay = balanceDueOn(booking?.sessionDate ?? null, business);

  // A discount code that covers the full amount (or any other reason the
  // invoice already nets to zero) leaves nothing to pay - never show a due
  // date or payment methods for money that isn't owed.
  if (outstanding <= 0) {
    return withIntro ? '<p style="margin:0;">Nothing further is due - this invoice is paid in full.</p>' : '';
  }

  const parts: string[] = [];

  if (!withIntro) {
    // no intro
  } else if (deposit !== null) {
    parts.push(
      `<p style="margin:0 0 10px;">A ${business.depositPercent}% deposit of <strong>${money(deposit)}</strong> confirms your date. ` +
        `The remaining ${money(doc.total - deposit)} is due ${business.balanceDaysBefore} calendar days before the session${balanceDay ? `, on ${formatStudioDate(balanceDay)}` : ''}.</p>`
    );
  } else if (doc.bookingId && doc.paidAmount === 0 && doc.paymentPlan === 'full') {
    parts.push(
      `<p style="margin:0 0 10px;">The full amount of <strong>${money(outstanding)}</strong> is due${doc.dueOn ? ` by ${formatStudioDate(doc.dueOn)}` : ''}. Your booking is confirmed as soon as it is received.</p>`
    );
  } else if (doc.paidAmount > 0 && outstanding > 0) {
    parts.push(
      `<p style="margin:0 0 10px;">${money(doc.paidAmount)} received. The remaining <strong>${money(outstanding)}</strong> is due${doc.dueOn ? ` by ${formatStudioDate(doc.dueOn)}` : ''}.</p>`
    );
  }

  parts.push(
    `<p style="margin:0 0 8px;"><strong>Interac e-transfer</strong>: ${money(outstanding)}${deposit !== null ? ' in full (no deposit plan by e-transfer)' : ''}, no fee.</p>` +
      `<p style="margin:0 0 8px;">Please include <strong>${referenceTail(doc.number)}</strong> in your transfer's message - the last part of your reference number. It's how we match your payment automatically.</p>` +
      (business.paymentInstructions
        ? paragraphs(business.paymentInstructions)
        : `<p class="muted" style="margin:0 0 8px;">Reply to this email for e-transfer details.</p>`)
  );

  if (doc.payFullUrl) {
    const hasFee = business.cardFeePercent > 0;
    parts.push(
      `<p style="margin:10px 0 4px;"><strong>Credit card</strong>${hasFee ? `: a ${business.cardFeePercent}% processing fee applies` : ''}.</p>`
    );
    if (deposit !== null && doc.payDepositUrl) {
      const depositFee = cardFee(deposit, business.cardFeePercent);
      const remaining = doc.total - deposit;
      const remainingFee = cardFee(remaining, business.cardFeePercent);
      parts.push(
        `<p style="margin:0 0 4px;"><a href="${doc.payDepositUrl}">Pay the ${money(deposit + depositFee)} deposit by card</a>${hasFee ? ` (${money(deposit)} + ${money(depositFee)} card fee)` : ''}</p>` +
          `<p class="muted" style="margin:0 0 6px;">The remaining ${money(remaining)}${hasFee ? ` plus a ${money(remainingFee)} card fee - ${money(remaining + remainingFee)} total` : ''} is charged to the same card ${business.balanceDaysBefore} calendar days before the session.</p>`
      );
    }
    const fee = cardFee(outstanding, business.cardFeePercent);
    parts.push(
      `<p style="margin:0;"><a href="${doc.payFullUrl}">${deposit !== null ? 'Or pay' : 'Pay'} ${money(outstanding + fee)} ${doc.paidAmount > 0 ? 'balance' : 'in full'} by card</a>${hasFee ? ` (${money(outstanding)} + ${money(fee)} card fee)` : ''}</p>`
    );
  }
  return parts.join('');
}

/**
 * The invoice document's own "what's happening with this payment" block -
 * one plain-language summary instead of a separate "How to pay" and
 * "Status" column that ended up repeating the same due date twice. Once
 * any money has arrived, only the method actually used is shown (a card
 * deposit auto-charges the balance later; e-transfer is always paid in
 * full up front, so there is never a balance left to explain there).
 */
const PAYMENT_KIND_LABEL: Record<string, string> = {
  deposit: 'Deposit',
  balance: 'Balance',
  cancellation_fee: 'Cancellation fee',
};

/** One line per payment actually recorded, oldest first - "Deposit $1 paid
 *  Sept 12, 2026" rather than making the reader infer it from the total. */
function paymentHistoryHtml(payments: { amount: number; method: string; kind: string; createdAt: string }[]): string {
  if (!payments.length) return '';
  return payments
    .map((p) => {
      const label = PAYMENT_KIND_LABEL[p.kind] ?? 'Payment';
      const when = p.createdAt ? ` paid ${formatStudioDate(toTorontoDateIso(p.createdAt))}` : ' paid';
      return `${label} <strong>${money(p.amount)}</strong>${when}`;
    })
    .join('<br />');
}

function paymentSummaryHtml(
  doc: DocumentRow,
  business: BusinessSettings,
  booking?: { sessionDate: string | null } | null,
  payments: { amount: number; method: string; kind: string; createdAt: string }[] = []
): string {
  const history = paymentHistoryHtml(payments);
  const outstanding = doc.total - doc.paidAmount;

  if (doc.status === 'void') {
    return '<p style="margin:0;">This invoice has been voided.</p>';
  }
  // A discount code that covers the full amount leaves nothing outstanding
  // even before the status column catches up - never show a "$0 due by..."
  // line for that.
  if (doc.status === 'paid' || outstanding <= 0) {
    return `<p style="margin:0;">${history || `Paid in full${doc.paidAt ? ` ${formatStudioDate(toTorontoDateIso(doc.paidAt))}` : ''}${doc.paidMethod ? ` by ${escapeHtml(doc.paidMethod)}` : ''}`}.</p>`;
  }

  if (doc.paidAmount > 0) {
    const balanceDay = doc.dueOn ? formatStudioDate(doc.dueOn) : `${business.balanceDaysBefore} days before the session`;
    const fee = cardFee(outstanding, business.cardFeePercent);
    const chargeLine =
      business.cardFeePercent > 0
        ? `Balance <strong>${money(outstanding)}</strong> plus a ${money(fee)} (${business.cardFeePercent}%) card fee - <strong>${money(outstanding + fee)}</strong> total - will be automatically charged to your card on file ${balanceDay}.`
        : `Balance <strong>${money(outstanding)}</strong> due ${balanceDay} will be automatically charged to your card on file.`;
    const parts = [`<p style="margin:0 0 10px;">${history || `Deposit of <strong>${money(doc.paidAmount)}</strong> received`}. ${chargeLine}</p>`];
    if (doc.payFullUrl) {
      parts.push(
        `<p style="margin:0;"><a href="${doc.payFullUrl}">Pay the ${money(outstanding + fee)} balance now instead</a></p>`
      );
    }
    return parts.join('');
  }

  // Nothing paid yet - the client hasn't chosen a method, so both stay visible.
  return paymentOptionsHtml(doc, business, booking);
}

const DEFAULT_PROPOSAL_INTRO =
  'Thank you for your interest in Lotus Attune. Below is everything we discussed, prepared for your review. The experience runs two hours and is prepared with care for your group - accept below and an invoice will follow to confirm your date.';

export type DocumentContext = {
  business: BusinessSettings;
  booking: BookingCtx | null;
  gift: GiftCtx | null;
  /** PNG data URL of the drawn signature, once a proposal is accepted. */
  signaturePng?: string | null;
  acceptance?: Acceptance | null;
  /** Every payment recorded against this document, oldest first - the
   *  invoice's own "what's been paid, and when" breakdown. */
  payments?: { amount: number; method: string; kind: string; createdAt: string }[];
};

type Acceptance = { signerName: string; acceptedAt: string; signaturePng: string | null; number: string };

/** The signed acceptance behind a document: the proposal itself, or for an
 *  invoice, the accepted proposal it came from (same booking, or same
 *  client and lines for studio-written ones). */
async function loadAcceptance(doc: DocumentRow): Promise<Acceptance | null> {
  let row: Record<string, unknown> | undefined;
  if (doc.kind === 'proposal' && doc.acceptedAt) {
    row = (await sql`SELECT number, signer_name, signature_png, accepted_at, client_name FROM documents WHERE id = ${doc.id}`).rows[0];
  } else if (doc.kind === 'invoice') {
    row = doc.bookingId
      ? (await sql`
          SELECT number, signer_name, signature_png, accepted_at, client_name FROM documents
          WHERE booking_id = ${doc.bookingId} AND kind = 'proposal' AND status = 'accepted'
          ORDER BY accepted_at DESC LIMIT 1`).rows[0]
      : (await sql`
          SELECT number, signer_name, signature_png, accepted_at, client_name FROM documents
          WHERE kind = 'proposal' AND status = 'accepted' AND client_email = ${doc.clientEmail}
            AND lines::text = ${JSON.stringify(doc.lines)}
          ORDER BY accepted_at DESC LIMIT 1`).rows[0];
  }
  if (!row?.accepted_at) return null;
  return {
    number: String(row.number),
    signerName: String(row.signer_name ?? row.client_name),
    acceptedAt: new Date(String(row.accepted_at)).toISOString(),
    signaturePng: row.signature_png ? String(row.signature_png) : null,
  };
}

export async function loadContext(doc: DocumentRow): Promise<DocumentContext> {
  const settings = await getSettings();
  const acceptance = await loadAcceptance(doc);
  const paymentRows = await sql`
    SELECT amount, method, kind, created_at FROM payments
    WHERE document_id = ${doc.id} AND kind != 'refund'
    ORDER BY created_at ASC
  `;
  return {
    business: settings.business,
    booking: doc.bookingId ? await loadBooking(doc.bookingId) : null,
    gift: doc.giftId ? await loadGift(doc.giftId) : null,
    signaturePng: acceptance?.signaturePng ?? null,
    acceptance,
    payments: paymentRows.rows.map((r) => ({
      amount: Number(r.amount),
      method: String(r.method),
      kind: String(r.kind),
      createdAt: toStamp(r.created_at) ?? '',
    })),
  };
}

function acceptanceHtml(doc: DocumentRow, ctx: DocumentContext): string {
  const a = ctx.acceptance;
  if (!a) return '';
  const when = formatStudioDate(toTorontoDateIso(a.acceptedAt));
  const sig = a.signaturePng && a.signaturePng.startsWith('data:image/png;base64,')
    ? `<img src="${a.signaturePng}" alt="Signature" style="display:block;height:64px;margin:6px 0 4px;" />`
    : '';
  const heading = doc.kind === 'invoice' ? `Accepted · proposal ${escapeHtml(a.number)}` : 'Accepted';
  return `
    <div class="rule"></div>
    <table><tr>
      <td style="vertical-align:bottom;width:55%;padding-right:20px;">
        <div class="eyebrow" style="margin-bottom:6px;">${heading}</div>
        ${sig}
        <div style="font-size:13px;border-top:1px solid rgba(59,46,36,0.35);padding-top:6px;max-width:300px;">${escapeHtml(a.signerName)}</div>
        <div class="muted" style="font-size:11.5px;">Signed electronically on ${when}</div>
      </td>
      <td style="vertical-align:bottom;">
        <div class="eyebrow" style="margin-bottom:6px;">On behalf of ${escapeHtml(ctx.business.businessName)}</div>
        <div style="font-size:13px;border-top:1px solid rgba(59,46,36,0.35);padding-top:6px;max-width:300px;">Silvana Rotti</div>
      </td>
    </tr></table>`;
}

export function publicUrl(doc: DocumentRow): string {
  return `${SITE.url}/d/${doc.token}`;
}

/** Full standalone HTML - what PDFShift renders and what the client link shows. */
export function documentHtml(doc: DocumentRow, ctx: DocumentContext): string {
  if (doc.kind === 'certificate') return certificateHtml(doc, ctx);
  const { business } = ctx;

  let body = '';
  if (doc.kind === 'proposal') {
    body += `<div style="font-size:13.5px;line-height:1.7;margin:22px 0 6px;">${paragraphs(business.proposalIntro || DEFAULT_PROPOSAL_INTRO)}</div>`;
    if (ctx.booking) body += sessionBox(ctx.booking);
    body += linesTable(doc, business);
    body += ctx.acceptance
      ? acceptanceHtml(doc, ctx)
      : `
      <div class="rule"></div>
      <div style="font-size:12.5px;">
        <div class="eyebrow" style="margin-bottom:6px;">Next step</div>
        <p style="margin:0 0 8px;">To go ahead, accept and sign this proposal online: <a href="${publicUrl(doc)}">${publicUrl(doc)}</a></p>
        ${business.paymentInstructions ? `<p class="muted" style="margin:0;">Payment: ${escapeHtml(business.paymentInstructions)}</p>` : ''}
      </div>`;
  } else {
    if (ctx.booking) body += `<div style="height:6px"></div>` + sessionBox(ctx.booking);
    else body += `<div style="height:22px"></div>`;
    body += linesTable(doc, business);
    body += `
      <div class="rule"></div>
      <div class="eyebrow" style="margin-bottom:6px;">Payment</div>
      <div style="font-size:12.5px;">${paymentSummaryHtml(doc, business, ctx.booking, ctx.payments ?? [])}</div>`;
  }

  if (doc.kind === 'invoice' && ctx.acceptance) body += acceptanceHtml(doc, ctx);
  if (doc.notes) {
    body += `<div class="rule"></div><div class="eyebrow" style="margin-bottom:6px;">Notes</div><div style="font-size:12.5px;">${paragraphs(doc.notes)}</div>`;
  }
  if (business.invoiceFooter && doc.kind === 'invoice') {
    body += `<div style="font-size:11px;color:#6f5f52;margin-top:22px;">${paragraphs(business.invoiceFooter)}</div>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(doc.number)}</title><style>${PAGE_CSS}</style></head>
  <body><div class="page">${header(doc.kind, doc, business)}${body}${footer(business, doc)}</div></body></html>`;
}

function certificateHtml(doc: DocumentRow, ctx: DocumentContext): string {
  const gift = ctx.gift;
  const description =
    gift?.format === 'private'
      ? 'Redeemable for a two-hour immersive Lotus Attune experience — private session, downtown Toronto.'
      : 'Redeemable for a two-hour immersive Lotus Attune experience, downtown Toronto.';
  const from = gift?.buyerName?.trim();
  const code = gift?.code ?? '';
  const logo = `${SITE.url}/assets/logo-circle.webp`;
  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(doc.number)}</title><style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,500&family=Jost:wght@400;500;600&display=swap');
    * { box-sizing: border-box; } body { margin: 0; background: #fff; font-family: 'Jost', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cert { width: 7in; height: 4.5in; margin: 0 auto; padding: 5px; background: linear-gradient(135deg, #f0e2c4 0%, #a8875a 22%, #6b4f30 45%, #a8875a 68%, #ddc79a 86%, #f0e2c4 100%); display: flex; }
    .inner { flex: 1; position: relative; display: flex; flex-direction: column; background: radial-gradient(120% 90% at 50% 0%, rgba(198,169,122,0.16), transparent 62%), linear-gradient(170deg, #fffdfa 0%, #f5ede1 100%); }
    .inner::before { content: ''; position: absolute; inset: 8px; border: 1px solid rgba(139,106,69,0.55); pointer-events: none; }
    .content { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 14px 44px; }
    .seal { width: 72px; height: 72px; border-radius: 50%; margin-bottom: 10px; }
    .eyebrow { font-size: 12px; letter-spacing: 0.38em; text-transform: uppercase; color: #7c5b3b; margin-bottom: 10px; }
    .for { font-size: 11.5px; letter-spacing: 0.12em; text-transform: uppercase; color: #5c4c40; margin-bottom: 4px; }
    .name { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; font-style: italic; font-size: 44px; line-height: 1.05; color: #241b14; margin-bottom: 10px; }
    .from { font-size: 12.5px; color: #5c4c40; margin-bottom: 10px; } .from strong { color: #241b14; font-weight: 500; }
    .rule { width: 56px; height: 2px; background: linear-gradient(90deg, transparent, #6b4f30, #a8875a, #6b4f30, transparent); margin-bottom: 10px; }
    .desc { font-size: 14.5px; line-height: 1.5; color: #5c4c40; max-width: 440px; margin: 0 0 6px; }
    .value { font-weight: 600; font-size: 25px; color: #7c5b3b; letter-spacing: 0.02em; }
    .redeem { background: linear-gradient(165deg, #3c2f24 0%, #241b14 100%); padding: 14px 36px; color: #efe6da; font-size: 13.5px; line-height: 1.6; }
    .redeem .label { display: block; font-size: 11px; letter-spacing: 0.24em; text-transform: uppercase; color: #dcc194; margin-bottom: 6px; }
    .redeem .code { display: block; margin-top: 6px; font-weight: 600; font-size: 15px; letter-spacing: 0.12em; color: #dcc194; }
  </style></head><body>
  <div class="cert"><div class="inner">
    <div class="content">
      <img class="seal" src="${logo}" alt="" />
      <div class="eyebrow">Gift Certificate</div>
      <div class="for">For</div>
      <div class="name">${escapeHtml(gift?.recipientName ?? doc.clientName)}</div>
      ${from ? `<div class="from">From <strong>${escapeHtml(from)}</strong></div>` : ''}
      <div class="rule"></div>
      <p class="desc">${escapeHtml(description)}</p>
      <div class="value">${money(doc.total)} value</div>
    </div>
    <div class="redeem">
      <span class="label">How to redeem</span>
      Book at lotusattune.com/book and enter your code at checkout.
      <span class="code">${escapeHtml(code)}</span>
      <span style="display:block;margin-top:4px;">Questions? ${SITE.email} · WhatsApp ${SITE.phone}</span>
    </div>
  </div></div></body></html>`;
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export async function generatePdf(doc: DocumentRow, ctx?: DocumentContext): Promise<Buffer | null> {
  const context = ctx ?? (await loadContext(doc));
  const html = documentHtml(doc, context);
  const pdf =
    doc.kind === 'certificate'
      ? await renderPdf(html, { format: 'Letter', landscape: true, margin: '0.4in' })
      : await renderPdf(html, { format: 'Letter', margin: '0' });
  if (!pdf) return null;
  await sql`
    UPDATE documents SET pdf = ${pdf}, pdf_generated_at = NOW(), updated_at = NOW()
    WHERE id = ${doc.id}
  `;
  return pdf;
}

// ---------------------------------------------------------------------------
// Send / accept / pay / void
// ---------------------------------------------------------------------------

export async function sendDocument(id: string, introHtmlOverride?: string): Promise<ActionResult> {
  const doc = await getDocument(id);
  if (!doc) return { ok: false, error: 'Document not found.' };
  if (doc.status === 'void') return { ok: false, error: 'This document is void - create a new one.' };

  const ctx = await loadContext(doc);
  const ready = await ensurePaymentLinks(doc, ctx.business);
  // A freshly minted card link must make it into the PDF too.
  if (ready.payFullUrl !== doc.payFullUrl) {
    await sql`UPDATE documents SET pdf = NULL, pdf_generated_at = NULL WHERE id = ${id}`;
  }
  const pdf = (await getDocumentPdf(id)) ?? (await generatePdf(ready, ctx));

  // A session invoice opens with the deposit that confirms the date.
  const deposit = ready.kind === 'invoice' ? depositDue(ready, ctx.business) : null;
  const balanceDay = balanceDueOn(ctx.booking?.sessionDate ?? null, ctx.business);
  const depositIntro =
    deposit !== null
      ? `Thank you for your booking request. Your invoice is below${pdf ? ' and attached as a PDF' : ''}. ` +
        `A ${ctx.business.depositPercent}% deposit of <strong>${money(deposit)}</strong> confirms your date${ready.dueOn ? `, due by <strong>${formatStudioDate(ready.dueOn)}</strong>` : ''}. ` +
        `The remaining ${money(ready.total - deposit)} is due ${ctx.business.balanceDaysBefore} calendar days before your session${balanceDay ? `, on ${formatStudioDate(balanceDay)}` : ''}.`
      : undefined;

  const result = await sendDocumentEmail({
    kind: ready.kind,
    to: ready.clientEmail,
    name: ready.clientName,
    number: ready.number,
    total: ready.total,
    dueOn: ready.dueOn,
    summaryHtml: emailBodyHtml(ready, ctx.business),
    viewUrl: publicUrl(ready),
    pdf,
    paymentHtml: ready.kind === 'invoice' ? paymentOptionsHtml(ready, ctx.business, ctx.booking) : '',
    giftCode: ctx.gift?.code ?? null,
    subject: deposit !== null ? `Invoice ${ready.number} from Lotus Attune: ${money(deposit)} deposit to confirm your date` : undefined,
    introHtml: introHtmlOverride ?? depositIntro,
  });

  if (!result.ok) {
    await logActivity({
      bookingId: doc.bookingId,
      giftId: doc.giftId,
      documentId: doc.id,
      kind: 'email_failed',
      body: `${doc.number}: ${result.error}`,
    });
    return result;
  }

  await markDocumentSent(doc, Boolean(pdf));
  return { ok: true };
}

/** Records that a document went out and moves the lead or gift along with it. */
export async function markDocumentSent(doc: DocumentRow, withPdf: boolean): Promise<void> {
  const nextStatus: DocumentStatus = doc.status === 'draft' ? 'sent' : doc.status;
  await sql`
    UPDATE documents SET status = ${nextStatus}, sent_at = NOW(), sent_to = ${doc.clientEmail}, updated_at = NOW()
    WHERE id = ${doc.id}
  `;
  await logActivity({
    bookingId: doc.bookingId,
    giftId: doc.giftId,
    documentId: doc.id,
    kind: `${doc.kind}_sent`,
    body: `${doc.number} sent to ${doc.clientEmail}${withPdf ? '' : ' (no PDF - PDFShift not configured)'}`,
  });

  // Sending paperwork moves the lead along without a second click.
  if (doc.bookingId && (doc.kind === 'proposal' || doc.kind === 'invoice')) {
    await sql`
      UPDATE bookings SET status = 'proposal_sent'
      WHERE id = ${doc.bookingId} AND status IN ('new_enquiry', 'contacted')
    `;
  }
  if (doc.giftId && doc.kind === 'certificate') {
    await sql`UPDATE gift_requests SET status = 'active' WHERE id = ${doc.giftId} AND status = 'requested'`;
  }
}

/** What the booking confirmation email needs to carry the invoice itself. */
export type InvoiceEmailPart = {
  doc: DocumentRow;
  number: string;
  total: number;
  deposit: number | null;
  depositPercent: number;
  dueOn: string | null;
  balanceDay: string | null;
  balanceDaysBefore: number;
  paymentHtml: string;
  viewUrl: string;
  pdf: Buffer | null;
};

/**
 * The session invoice, ready to ride along in the booking confirmation:
 * card links minted, PDF rendered, the deposit worked out.
 */
export async function prepareBookingInvoice(bookingId: string, settings: SiteSettings): Promise<InvoiceEmailPart> {
  const doc = await ensureBookingDocument(bookingId, 'invoice', settings);
  const ctx = await loadContext(doc);
  const ready = await ensurePaymentLinks(doc, ctx.business);
  if (ready.payFullUrl !== doc.payFullUrl) {
    await sql`UPDATE documents SET pdf = NULL, pdf_generated_at = NULL WHERE id = ${doc.id}`;
  }
  const pdf = (await getDocumentPdf(doc.id)) ?? (await generatePdf(ready, ctx));
  return {
    doc: ready,
    number: ready.number,
    total: ready.total,
    deposit: depositDue(ready, ctx.business),
    depositPercent: ctx.business.depositPercent,
    dueOn: ready.dueOn,
    balanceDay: balanceDueOn(ctx.booking?.sessionDate ?? null, ctx.business),
    balanceDaysBefore: ctx.business.balanceDaysBefore,
    paymentHtml: paymentOptionsHtml(ready, ctx.business, ctx.booking, false),
    viewUrl: publicUrl(ready),
    pdf,
  };
}

export async function markViewed(token: string): Promise<void> {
  await sql`
    UPDATE documents SET viewed_at = COALESCE(viewed_at, NOW()) WHERE token = ${token}
  `.catch(() => {});
}

/** The client clicked "Accept" on their proposal. */
/**
 * A proposal or invoice written from scratch in the studio - someone met at
 * a café, a workshop, a custom package - with no website booking behind it.
 * Numbered like the rest, and an invoice gets its card links straight away.
 */
export async function createStandaloneDocument(input: {
  kind: 'proposal' | 'invoice';
  clientName: string;
  clientEmail: string;
  clientCompany?: string | null;
  lines: DocumentLine[];
  notes?: string | null;
}): Promise<DocumentRow> {
  const s = await getSettings();
  const rate = s.business.taxRatePercent;
  const { subtotal, tax, total } = totalsFor(input.lines, rate);
  const number = await nextNumber(input.kind, s.business.invoicePrefix || 'LA');
  const issued = todayIso();
  const dueOn = addDays(
    issued,
    input.kind === 'invoice' ? s.business.invoiceDueDays : s.business.proposalValidDays
  );
  const inserted = await sql`
    INSERT INTO documents (
      kind, number, client_name, client_email, client_company,
      lines, subtotal, tax_rate, tax, total, issued_on, due_on, notes
    ) VALUES (
      ${input.kind}, ${number}, ${input.clientName}, ${input.clientEmail}, ${input.clientCompany ?? null},
      ${JSON.stringify(input.lines)}::jsonb, ${subtotal}, ${rate}, ${tax}, ${total},
      ${issued}, ${dueOn}, ${input.notes ?? null}
    )
    RETURNING id
  `;
  let doc = (await getDocument(String(inserted.rows[0].id)))!;
  await logActivity({
    documentId: doc.id,
    kind: `${input.kind}_created`,
    body: `${doc.number} · ${money(doc.total)} · ${doc.clientName} (created in the studio)`,
  });
  if (input.kind === 'invoice') doc = await ensurePaymentLinks(doc, s.business);
  return doc;
}

/** The invoice that follows an accepted proposal: same client, same lines. */
async function invoiceFromProposal(proposal: DocumentRow, settings: SiteSettings): Promise<DocumentRow> {
  if (proposal.bookingId) return ensureBookingDocument(proposal.bookingId, 'invoice', settings);
  const existing = await selectDocuments(
    `kind = 'invoice' AND status != 'void' AND client_email = $1 AND notes IS NOT DISTINCT FROM $2
       AND lines::text = $3 ORDER BY created_at DESC LIMIT 1`,
    [proposal.clientEmail, proposal.notes, JSON.stringify(proposal.lines)]
  );
  if (existing[0]) return existing[0];
  return createStandaloneDocument({
    kind: 'invoice',
    clientName: proposal.clientName,
    clientEmail: proposal.clientEmail,
    clientCompany: proposal.clientCompany,
    lines: proposal.lines,
    notes: proposal.notes,
  });
}

export async function acceptProposal(
  token: string,
  signature?: { name: string; png: string | null; ip: string | null }
): Promise<ActionResult & { followUp?: () => Promise<void> }> {
  const doc = await getDocumentByToken(token);
  if (!doc || doc.kind !== 'proposal') return { ok: false, error: 'Proposal not found.' };
  if (doc.status === 'void' || doc.status === 'declined') {
    return { ok: false, error: 'This proposal is no longer valid.' };
  }
  if (doc.status === 'accepted') return { ok: true };
  if (doc.dueOn && doc.dueOn < todayIso()) {
    return { ok: false, error: 'This proposal has expired - reply to the email for a fresh one.' };
  }

  const png =
    signature?.png && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signature.png) && signature.png.length < 400_000
      ? signature.png
      : null;
  await sql`
    UPDATE documents SET
      status = 'accepted', accepted_at = NOW(), updated_at = NOW(),
      signer_name = ${signature?.name ?? null}, signature_png = ${png}, accepted_ip = ${signature?.ip ?? null},
      pdf = NULL, pdf_generated_at = NULL
    WHERE id = ${doc.id}
  `;
  await logActivity({
    bookingId: doc.bookingId,
    documentId: doc.id,
    kind: 'proposal_accepted',
    body: `${doc.number} accepted${signature?.name ? ` and signed by ${signature.name}` : ` by ${doc.clientName}`}`,
  });

  if (doc.bookingId) {
    await sql`
      UPDATE bookings SET status = 'booked'
      WHERE id = ${doc.bookingId} AND status IN ('new_enquiry', 'contacted', 'proposal_sent')
    `;
  }

  // The invoice (with its PDF render and email) is slow; callers run this
  // after replying to the client so the "accepted" page appears at once.
  const followUp = async () => {
    const settings = await getSettings();
    const invoice = await invoiceFromProposal(doc, settings);
    if (settings.business.autoSendInvoices) {
      await sendDocument(invoice.id);
    }
    await sendOwnerNotification({
      subject: `Proposal accepted: ${doc.clientName} — ${doc.number}`,
      html: `<p style="margin:0 0 10px;">${escapeHtml(signature?.name ?? doc.clientName)} accepted proposal ${escapeHtml(doc.number)} (${money(doc.total)}).</p>
             <p style="margin:0;">Invoice ${escapeHtml(invoice.number)} is ${settings.business.autoSendInvoices ? 'on its way to them' : 'ready to send from the studio'}.</p>`,
    });
  };
  return { ok: true, followUp };
}

export async function markDocument(
  id: string,
  status: 'paid' | 'void' | 'accepted' | 'declined',
  method?: string | null
): Promise<ActionResult> {
  const doc = await getDocument(id);
  if (!doc) return { ok: false, error: 'Document not found.' };

  if (status === 'paid') {
    await sql`
      UPDATE documents SET status = 'paid', paid_at = NOW(), paid_method = ${method ?? null}, updated_at = NOW()
      WHERE id = ${id}
    `;
    await retirePaymentLinks(id);
    if (doc.bookingId) {
      await sql`UPDATE bookings SET status = 'booked' WHERE id = ${doc.bookingId} AND status IN ('new_enquiry','contacted','proposal_sent')`;
    }
  } else if (status === 'void') {
    await sql`UPDATE documents SET status = 'void', voided_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
    await retirePaymentLinks(id);
  } else if (status === 'accepted') {
    await sql`UPDATE documents SET status = 'accepted', accepted_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
    if (doc.bookingId) {
      await sql`UPDATE bookings SET status = 'booked' WHERE id = ${doc.bookingId} AND status IN ('new_enquiry','contacted','proposal_sent')`;
    }
  } else {
    await sql`UPDATE documents SET status = 'declined', updated_at = NOW() WHERE id = ${id}`;
  }

  await logActivity({
    bookingId: doc.bookingId,
    giftId: doc.giftId,
    documentId: doc.id,
    kind: `${doc.kind}_${status}`,
    body: `${doc.number}${method ? ` · ${method}` : ''}`,
  });
  return { ok: true };
}
