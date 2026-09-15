import 'server-only';

import { sql, sqlRaw } from '@/lib/db';
import {
  emailBodyHtml,
  sendDocumentEmail,
  sendOwnerNotification,
} from '@/lib/email';
import { renderPdf } from '@/lib/pdfshift';
import { createPaymentLink, isStripeConfigured } from '@/lib/stripe';
import {
  formatStudioDate,
  type DocumentKind,
  type DocumentLine,
  type DocumentRow,
  type DocumentStatus,
} from '@/lib/pipeline';
import { giftQuoteFor, quoteFor } from '@/lib/quote';
import { getSettings, type BusinessSettings, type SiteSettings } from '@/lib/settings';
import { LOUNGE_MAX, money, SITE, venueNoteFor } from '@/lib/site';

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

function paragraphs(text: string): string {
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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
  kind: string;
  body?: string | null;
}): Promise<void> {
  await sql`
    INSERT INTO activity (booking_id, gift_id, document_id, kind, body)
    VALUES (${entry.bookingId ?? null}, ${entry.giftId ?? null}, ${entry.documentId ?? null}, ${entry.kind}, ${entry.body ?? null})
  `.catch((error) => console.error('[activity] insert failed:', error));
}

// ---------------------------------------------------------------------------
// Numbering
// ---------------------------------------------------------------------------

async function nextNumber(kind: DocumentKind, prefix: string): Promise<string> {
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

type BookingCtx = {
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
  refreshments: boolean;
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
    refreshments: Boolean(row.refreshments),
    isPackage: Boolean(row.is_package),
    isCorporateIntro: Boolean(row.is_corporate_intro),
    discountCode: row.discount_code ? String(row.discount_code) : null,
    gratuity: Number(row.gratuity ?? 0),
    total: Number(row.estimated_total ?? 0),
    status: String(row.status),
  };
}

async function loadBooking(id: string): Promise<BookingCtx | null> {
  const result = await sql`SELECT * FROM bookings WHERE id = ${id}`;
  const row = result.rows[0];
  return row ? bookingCtx(row) : null;
}

function bookingLines(booking: BookingCtx, settings: SiteSettings): DocumentLine[] {
  const code = booking.discountCode
    ? settings.codes.find((c) => c.code === booking.discountCode)
    : undefined;
  const quote = quoteFor(
    {
      participants: booking.participants,
      isPackage: booking.isPackage,
      isCorporateIntro: booking.isCorporateIntro,
      teamAddon: booking.teamAddon,
      refreshments: booking.refreshments,
      percentOff: code?.percentOff,
      amountOff: code?.amountOff,
      discountLabel: code?.code,
      discountMinParticipants: code?.minParticipants,
      gratuityAmount: booking.gratuity || undefined,
    },
    settings.pricing
  );
  const lines: DocumentLine[] = quote.lines.map((line) => ({
    label: line.label,
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

function giftLines(gift: GiftCtx, settings: SiteSettings): DocumentLine[] {
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
function parseMoney(value: string): number {
  const digits = Number(value.replace(/[^0-9.]/g, ''));
  return /^[−-]/.test(value.trim()) ? -digits : digits;
}

/** Gratuity is a gift to Silvana, not a taxable service. */
function totalsFor(lines: DocumentLine[], taxRatePercent: number) {
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
  settings?: SiteSettings
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
  const dueOn =
    kind === 'invoice'
      ? addDays(issued, s.business.invoiceDueDays)
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
  if (kind === 'invoice') doc = await ensurePaymentLinks(doc, s.business);
  return doc;
}

export async function ensureGiftDocument(
  giftId: string,
  kind: 'invoice' | 'certificate',
  settings?: SiteSettings
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
  const dueOn = kind === 'invoice' ? addDays(issued, s.business.invoiceDueDays) : null;
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
  if (kind === 'invoice') doc = await ensurePaymentLinks(doc, s.business);
  return doc;
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
  return (await getDocument(id))!;
}

// ---------------------------------------------------------------------------
// Card payment links (Stripe). Created the moment an invoice exists, so the
// link is already in the PDF and the email the first time the client sees it.
// ---------------------------------------------------------------------------

export function cardFee(amount: number, feePercent: number): number {
  return Math.round((amount * feePercent) / 100);
}

export function depositAmount(doc: DocumentRow, depositPercent: number): number {
  return Math.round((doc.total * depositPercent) / 100);
}

export async function ensurePaymentLinks(
  doc: DocumentRow,
  business: BusinessSettings
): Promise<DocumentRow> {
  if (doc.kind !== 'invoice' || doc.status === 'void' || doc.status === 'paid') return doc;
  if (!isStripeConfigured()) return doc;
  if (doc.payFullUrl && (doc.payDepositUrl || !doc.bookingId)) return doc;

  const metadata = { documentId: doc.id, number: doc.number };
  const redirectUrl = `${publicUrl(doc)}?paid=1`;
  const feeLabel = `Card processing fee (${business.cardFeePercent}%)`;

  try {
    const full = doc.payFullUrl ? null : await createPaymentLink({
      description: `${business.businessName} — ${doc.number}`,
      amount: doc.total,
      feeAmount: cardFee(doc.total, business.cardFeePercent),
      feeLabel,
      metadata: { ...metadata, plan: 'full' },
      redirectUrl,
      saveCard: Boolean(doc.bookingId),
    });
    // The deposit plan only makes sense for a session with a date to charge
    // the balance before - gift certificates are paid in full.
    let deposit: { id: string; url: string } | null = null;
    if (doc.bookingId && !doc.payDepositUrl && business.depositPercent > 0 && business.depositPercent < 100) {
      const amount = depositAmount(doc, business.depositPercent);
      deposit = await createPaymentLink({
        description: `${business.businessName} — ${doc.number} (${business.depositPercent}% deposit)`,
        amount,
        feeAmount: cardFee(amount, business.cardFeePercent),
        feeLabel,
        metadata: { ...metadata, plan: 'deposit' },
        redirectUrl,
        saveCard: true,
      });
    }
    await sql`
      UPDATE documents SET
        stripe_link_full = COALESCE(${full?.url ?? null}, stripe_link_full),
        stripe_link_full_id = COALESCE(${full?.id ?? null}, stripe_link_full_id),
        stripe_link_deposit = COALESCE(${deposit?.url ?? null}, stripe_link_deposit),
        stripe_link_deposit_id = COALESCE(${deposit?.id ?? null}, stripe_link_deposit_id),
        updated_at = NOW()
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

  const kind = input.kind ?? (input.amount >= doc.total - doc.paidAmount ? 'payment' : 'deposit');
  await sql`
    INSERT INTO payments (document_id, booking_id, gift_id, amount, method, kind, stripe_payment_intent, stripe_checkout_session, note)
    VALUES (${doc.id}, ${doc.bookingId}, ${doc.giftId}, ${input.amount}, ${input.method}, ${kind},
            ${input.stripePaymentIntent ?? null}, ${input.stripeCheckoutSession ?? null}, ${input.note ?? null})
  `;

  const paid = doc.paidAmount + input.amount;
  const settled = paid >= doc.total;
  const plan = doc.paymentPlan ?? (settled ? 'full' : 'deposit');
  await sql`
    UPDATE documents SET
      paid_amount = ${paid},
      payment_plan = ${plan},
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

  return { doc: (await getDocument(doc.id))!, alreadyRecorded: false };
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,500&family=Jost:wght@400;500;600&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; background: #fbf7f1; color: #3b2e24; font-family: 'Jost', Arial, Helvetica, sans-serif; font-size: 12.5px; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 8.5in; min-height: 11in; margin: 0 auto; background: #fffdfa; padding: 0.7in 0.75in 0.6in; position: relative; }
  .display { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; }
  .eyebrow { font-size: 9.5px; letter-spacing: 0.32em; text-transform: uppercase; color: #7c5b3b; }
  .muted { color: #6f5f52; }
  .rule { height: 1px; background: rgba(59,46,36,0.14); margin: 22px 0; }
  table { border-collapse: collapse; width: 100%; }
  .lines th { text-align: left; font-weight: 500; font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; color: #7c5b3b; padding: 0 0 8px; border-bottom: 1px solid rgba(59,46,36,0.2); }
  .lines td { padding: 9px 0; border-bottom: 1px solid rgba(59,46,36,0.1); vertical-align: top; }
  .lines td.amt, .lines th.amt { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals td { padding: 5px 0; }
  .totals .grand td { padding-top: 10px; border-top: 1px solid rgba(59,46,36,0.2); font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px; font-weight: 400; }
  .box { background: #241b14; color: #f6efe5; padding: 18px 22px; margin: 18px 0; }
  .box .eyebrow { color: #c6a97a; }
  .box .k { font-size: 9.5px; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(239,230,218,0.6); padding: 6px 0 2px; }
  .box .v { font-size: 13.5px; color: #f6efe5; text-align: right; padding: 6px 0 2px; }
  .foot { position: absolute; left: 0.75in; right: 0.75in; bottom: 0.45in; font-size: 10.5px; color: #6f5f52; border-top: 1px solid rgba(59,46,36,0.14); padding-top: 10px; display: flex; justify-content: space-between; }
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
        ${doc.dueOn && kind === 'invoice' ? `<div class="muted">Due ${formatStudioDate(doc.dueOn)}</div>` : ''}
        ${doc.dueOn && kind === 'proposal' ? `<div class="muted">Valid until ${formatStudioDate(doc.dueOn)}</div>` : ''}
      </td>
    </tr></table>
    <div class="rule"></div>
    <table><tr>
      <td style="vertical-align:top;width:50%;padding-right:20px;">
        <div class="eyebrow" style="margin-bottom:6px;">From</div>
        <div style="font-weight:500;">${escapeHtml(business.businessName)}</div>
        ${business.businessAddress ? `<div class="muted">${escapeHtml(business.businessAddress).replace(/\n/g, '<br />')}</div>` : ''}
        <div class="muted">${escapeHtml(business.businessEmail)} · ${escapeHtml(business.businessPhone)}</div>
        ${business.taxNumber ? `<div class="muted">${escapeHtml(business.taxLabel)} № ${escapeHtml(business.taxNumber)}</div>` : ''}
      </td>
      <td style="vertical-align:top;width:50%;">
        <div class="eyebrow" style="margin-bottom:6px;">${kind === 'proposal' ? 'Prepared for' : 'Bill to'}</div>
        <div style="font-weight:500;">${escapeHtml(doc.clientName)}</div>
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
    ['Format', format],
    ['Date', formatStudioDate(booking.sessionDate)],
    ['Time', booking.sessionTime ?? '—'],
  ];
  if (booking.sessionDate2) {
    rows.push(['Second session', `${formatStudioDate(booking.sessionDate2)} · ${booking.sessionTime2 ?? ''}`]);
  }
  rows.push(['Venue', venue]);
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
        <tr class="grand"><td>Total</td><td style="text-align:right;">${money(doc.total)} <span style="font-size:11px;font-family:Jost,Arial,sans-serif;color:#6f5f52;">CAD</span></td></tr>
      </table></td></tr>
    </table>
  `;
}

function footer(business: BusinessSettings, doc: DocumentRow): string {
  return `<div class="foot"><span>${escapeHtml(business.businessName)} · ${escapeHtml(business.businessEmail)} · ${escapeHtml(business.businessPhone)}</span><span>${escapeHtml(doc.number)}</span></div>`;
}

/**
 * E-transfer first (no fees), card second. The card lines only appear once
 * Stripe is connected and the links exist.
 */
export function paymentOptionsHtml(doc: DocumentRow, business: BusinessSettings): string {
  const parts: string[] = [];
  parts.push(
    `<p style="margin:0 0 8px;"><strong>E-transfer</strong> — full payment, no processing fee.</p>` +
      (business.paymentInstructions
        ? paragraphs(business.paymentInstructions)
        : `<p class="muted" style="margin:0 0 8px;">Reply to this email for e-transfer details.</p>`)
  );
  if (doc.payFullUrl) {
    const fee = cardFee(doc.total, business.cardFeePercent);
    parts.push(
      `<p style="margin:10px 0 4px;"><strong>Credit card</strong> — a ${business.cardFeePercent}% processing fee applies.</p>` +
        `<p style="margin:0 0 4px;"><a href="${doc.payFullUrl}">Pay ${money(doc.total + fee)} in full by card</a></p>`
    );
    if (doc.payDepositUrl) {
      const deposit = depositAmount(doc, business.depositPercent);
      const depositFee = cardFee(deposit, business.cardFeePercent);
      parts.push(
        `<p style="margin:0;"><a href="${doc.payDepositUrl}">Pay a ${business.depositPercent}% deposit (${money(deposit + depositFee)}) by card</a> — the remaining ${money(doc.total - deposit)} plus fee is charged to the same card ${business.balanceDaysBefore} calendar days before the session.</p>`
      );
    }
  }
  return parts.join('');
}

function paymentStatusHtml(doc: DocumentRow): string {
  if (doc.status === 'paid') {
    return `Paid ${doc.paidAt ? formatStudioDate(doc.paidAt.slice(0, 10)) : ''}${doc.paidMethod ? ` · ${escapeHtml(doc.paidMethod)}` : ''}`;
  }
  if (doc.status === 'void') return 'Void';
  if (doc.paidAmount > 0) {
    return `Deposit of ${money(doc.paidAmount)} received<br />Balance ${money(doc.total - doc.paidAmount)} outstanding`;
  }
  return `Due ${formatStudioDate(doc.dueOn)}`;
}

const DEFAULT_PROPOSAL_INTRO =
  'Thank you for your interest in Lotus Attune. Below is everything we discussed, prepared for your review. The experience runs two hours and is prepared with care for your group - accept below and an invoice will follow to confirm your date.';

export type DocumentContext = {
  business: BusinessSettings;
  booking: BookingCtx | null;
  gift: GiftCtx | null;
};

export async function loadContext(doc: DocumentRow): Promise<DocumentContext> {
  const settings = await getSettings();
  return {
    business: settings.business,
    booking: doc.bookingId ? await loadBooking(doc.bookingId) : null,
    gift: doc.giftId ? await loadGift(doc.giftId) : null,
  };
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
    body += `
      <div class="rule"></div>
      <div style="font-size:12.5px;">
        <div class="eyebrow" style="margin-bottom:6px;">Next step</div>
        <p style="margin:0 0 8px;">To go ahead, accept this proposal online: <a href="${publicUrl(doc)}">${publicUrl(doc)}</a></p>
        ${business.paymentInstructions ? `<p class="muted" style="margin:0;">Payment: ${escapeHtml(business.paymentInstructions)}</p>` : ''}
      </div>`;
  } else {
    if (ctx.booking) body += `<div style="height:14px"></div>` + sessionBox(ctx.booking);
    else body += `<div style="height:22px"></div>`;
    body += linesTable(doc, business);
    body += `
      <div class="rule"></div>
      <table><tr>
        <td style="vertical-align:top;width:55%;padding-right:20px;">
          <div class="eyebrow" style="margin-bottom:6px;">How to pay</div>
          <div style="font-size:12.5px;">${paymentOptionsHtml(doc, business)}</div>
        </td>
        <td style="vertical-align:top;">
          <div class="eyebrow" style="margin-bottom:6px;">Status</div>
          <div style="font-size:12.5px;">${paymentStatusHtml(doc)}</div>
        </td>
      </tr></table>`;
  }

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
    .cert { width: 7in; height: 4.5in; padding: 5px; background: linear-gradient(135deg, #f0e2c4 0%, #a8875a 22%, #6b4f30 45%, #a8875a 68%, #ddc79a 86%, #f0e2c4 100%); display: flex; }
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

export async function sendDocument(id: string): Promise<ActionResult> {
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
    paymentHtml: ready.kind === 'invoice' ? paymentOptionsHtml(ready, ctx.business) : '',
    giftCode: ctx.gift?.code ?? null,
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

  const nextStatus: DocumentStatus =
    doc.status === 'draft' ? 'sent' : doc.status;
  await sql`
    UPDATE documents SET status = ${nextStatus}, sent_at = NOW(), sent_to = ${doc.clientEmail}, updated_at = NOW()
    WHERE id = ${id}
  `;
  await logActivity({
    bookingId: doc.bookingId,
    giftId: doc.giftId,
    documentId: doc.id,
    kind: `${doc.kind}_sent`,
    body: `${doc.number} sent to ${doc.clientEmail}${pdf ? '' : ' (no PDF - PDFShift not configured)'}`,
  });

  // Sending paperwork moves the lead along without a second click.
  if (doc.bookingId && doc.kind === 'proposal') {
    await sql`
      UPDATE bookings SET status = 'proposal_sent'
      WHERE id = ${doc.bookingId} AND status IN ('new_enquiry', 'contacted')
    `;
  }
  if (doc.giftId && doc.kind === 'certificate') {
    await sql`UPDATE gift_requests SET status = 'active' WHERE id = ${doc.giftId} AND status = 'requested'`;
  }
  return { ok: true };
}

export async function markViewed(token: string): Promise<void> {
  await sql`
    UPDATE documents SET viewed_at = COALESCE(viewed_at, NOW()) WHERE token = ${token}
  `.catch(() => {});
}

/** The client clicked "Accept" on their proposal. */
export async function acceptProposal(token: string): Promise<ActionResult> {
  const doc = await getDocumentByToken(token);
  if (!doc || doc.kind !== 'proposal') return { ok: false, error: 'Proposal not found.' };
  if (doc.status === 'void') return { ok: false, error: 'This proposal is no longer valid.' };
  if (doc.status === 'accepted') return { ok: true };

  await sql`
    UPDATE documents SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
    WHERE id = ${doc.id}
  `;
  await logActivity({
    bookingId: doc.bookingId,
    documentId: doc.id,
    kind: 'proposal_accepted',
    body: `${doc.number} accepted by ${doc.clientName}`,
  });

  if (doc.bookingId) {
    await sql`
      UPDATE bookings SET status = 'booked'
      WHERE id = ${doc.bookingId} AND status IN ('new_enquiry', 'contacted', 'proposal_sent')
    `;
    const settings = await getSettings();
    const invoice = await ensureBookingDocument(doc.bookingId, 'invoice', settings);
    if (settings.business.autoSendInvoices) {
      await sendDocument(invoice.id);
    }
    await sendOwnerNotification({
      subject: `Proposal accepted: ${doc.clientName} — ${doc.number}`,
      html: `<p style="margin:0 0 10px;">${escapeHtml(doc.clientName)} accepted proposal ${escapeHtml(doc.number)} (${money(doc.total)}).</p>
             <p style="margin:0;">Invoice ${escapeHtml(invoice.number)} is ${settings.business.autoSendInvoices ? 'on its way to them' : 'ready to send from the studio'}.</p>`,
    });
  }
  return { ok: true };
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
    if (doc.bookingId) {
      await sql`UPDATE bookings SET status = 'booked' WHERE id = ${doc.bookingId} AND status IN ('new_enquiry','contacted','proposal_sent')`;
    }
  } else if (status === 'void') {
    await sql`UPDATE documents SET status = 'void', voided_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
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
