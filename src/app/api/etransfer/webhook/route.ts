import { NextResponse } from 'next/server';
import { z } from 'zod';

import { afterPayment } from '@/lib/bookings';
import { isDatabaseConfigured, sql, sqlRaw } from '@/lib/db';
import { depositDue, getDocument, logActivity, recordPayment } from '@/lib/documents';
import { sendOwnerNotification } from '@/lib/email';
import { balanceDue } from '@/lib/pipeline';
import { getSettings } from '@/lib/settings';
import { money } from '@/lib/site';

export const runtime = 'nodejs';

/**
 * Interac has no webhook of its own, so the bank's "money transfer from X
 * has been deposited" email is the signal: a small script in the inbox
 * (docs/etransfer-webhook.md) posts each one here. The payment is matched
 * to an invoice by the invoice number in the transfer's message, or failing
 * that by an exact amount on a single open invoice whose client name
 * matches the sender. Anything else is reported to Silvana to record by
 * hand, never guessed.
 */
const schema = z.object({
  /** Whole dollars or cents are both fine; rounded to whole dollars. */
  amount: z.coerce.number().positive(),
  sender: z.string().trim().max(200).default(''),
  message: z.string().trim().max(2000).default(''),
  subject: z.string().trim().max(500).default(''),
  /** Something unique per notice, e.g. the Gmail message id. */
  externalRef: z.string().trim().min(3).max(200),
  receivedAt: z.string().trim().max(60).optional(),
});

const NUMBER_RE = /\b([A-Z]{1,6}-(?:P-|GC-)?\d{4}-\d{4})\b/i;

function nameMatches(sender: string, client: string): boolean {
  const a = sender.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const b = client.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (!a.length || !b.length) return false;
  // Every word of the shorter name appears in the longer one.
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.every((w) => long.includes(w));
}

export async function POST(request: Request) {
  const secret = process.env.ETRANSFER_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'ETRANSFER_WEBHOOK_SECRET is not set on the server.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not authorised.' }, { status: 401 });
  }
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'No database.' }, { status: 503 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Bad payload.', issues: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const amount = Math.round(input.amount);

  // Already seen this notice: say so and stop.
  const seen = await sql`SELECT id FROM payments WHERE external_ref = ${input.externalRef}`;
  if (seen.rows[0]) return NextResponse.json({ matched: true, duplicate: true });

  const settings = await getSettings();
  const text = `${input.subject}\n${input.message}`;
  const byNumber = NUMBER_RE.exec(text)?.[1]?.toUpperCase() ?? null;

  let documentId: string | null = null;
  let how = '';
  if (byNumber) {
    const found = await sql`
      SELECT id FROM documents WHERE upper(number) = ${byNumber} AND kind = 'invoice' AND status NOT IN ('void', 'paid') LIMIT 1
    `;
    if (found.rows[0]) {
      documentId = String(found.rows[0].id);
      how = `invoice number ${byNumber} in the message`;
    }
  }
  if (!documentId) {
    // Open invoices where this exact amount is the balance or the deposit,
    // and the sender's name matches the client's. One hit only.
    const open = await sqlRaw(
      `SELECT id, client_name, total, paid_amount, booking_id FROM documents
       WHERE kind = 'invoice' AND status IN ('draft', 'sent') ORDER BY created_at DESC LIMIT 200`,
      []
    );
    const hits: string[] = [];
    for (const row of open.rows) {
      const doc = await getDocument(String(row.id));
      if (!doc) continue;
      const due = balanceDue(doc);
      const deposit = depositDue(doc, settings.business);
      const amountFits = amount === due || (deposit !== null && amount === deposit);
      if (amountFits && nameMatches(input.sender, doc.clientName)) hits.push(doc.id);
    }
    if (hits.length === 1) {
      documentId = hits[0];
      how = `amount ${money(amount)} and sender name`;
    }
  }

  if (!documentId) {
    await sendOwnerNotification({
      subject: `E-transfer to record by hand: ${money(amount)} from ${input.sender || 'unknown'}`,
      html: `<p style="margin:0 0 8px;">An Interac e-transfer of <strong>${money(amount)}</strong> arrived from ${input.sender || 'an unknown sender'} but no single open invoice matched it.</p>
             <p style="margin:0 0 8px;">Message on the transfer: ${input.message ? `"${input.message}"` : 'none'}.</p>
             <p style="margin:0;">Open the invoice in the studio and press Record payment.</p>`,
    });
    return NextResponse.json({ matched: false });
  }

  const { doc, alreadyRecorded } = await recordPayment({
    documentId,
    amount,
    method: 'e-transfer',
    externalRef: input.externalRef,
    note: `Interac e-transfer from ${input.sender || 'unknown sender'}${input.message ? ` · "${input.message}"` : ''} (matched by ${how})`,
  });
  if (!alreadyRecorded) {
    await logActivity({
      bookingId: doc.bookingId,
      giftId: doc.giftId,
      documentId: doc.id,
      kind: doc.status === 'paid' ? 'invoice_paid' : 'deposit_paid',
      body: `${money(amount)} by e-transfer recorded automatically (matched by ${how})`,
    });
    await afterPayment(doc, amount, 'e-transfer', balanceDue(doc) <= 0 ? 'payment' : 'deposit');
  }
  return NextResponse.json({ matched: true, number: doc.number, remaining: balanceDue(doc) });
}
