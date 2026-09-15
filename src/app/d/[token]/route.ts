import { NextResponse } from 'next/server';

import {
  documentHtml,
  ensurePaymentLinks,
  getDocumentByToken,
  loadContext,
  markViewed,
  paymentOptionsHtml,
} from '@/lib/documents';
import { formatStudioDate } from '@/lib/pipeline';
import { money } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * The client's view of a proposal, invoice or certificate - the link in
 * their email. The token is the credential: unguessable, unique per
 * document, and the only thing that finds it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(request.url);
  let doc = await getDocumentByToken(token);
  if (!doc) return new NextResponse('Not found', { status: 404 });

  await markViewed(token);
  const ctx = await loadContext(doc);
  doc = await ensurePaymentLinks(doc, ctx.business);

  const accepted = url.searchParams.get('accepted') === '1' || doc.status === 'accepted';
  const paid = url.searchParams.get('paid') === '1';

  let banner = '';
  if (doc.kind === 'proposal') {
    if (doc.status === 'void' || doc.status === 'declined') {
      banner = `<div class="bar muted">This proposal is no longer active. Reply to Silvana's email for an updated one.</div>`;
    } else if (accepted) {
      banner = `<div class="bar ok">Thank you - your proposal is accepted. Silvana will be in touch with your invoice and confirmation.</div>`;
    } else {
      banner = `
        <form class="bar" method="post" action="/d/${escapeHtml(token)}/accept">
          <span>Ready to go ahead? Accepting confirms your date${doc.dueOn ? ` (valid until ${formatStudioDate(doc.dueOn)})` : ''}.</span>
          <button type="submit">Accept proposal</button>
        </form>`;
    }
  } else if (doc.kind === 'invoice') {
    if (doc.status === 'paid') {
      banner = `<div class="bar ok">Paid in full - thank you.</div>`;
    } else if (paid) {
      banner = `<div class="bar ok">Thank you - your card payment is being confirmed. A receipt will follow by email.</div>`;
    } else if (doc.status === 'void') {
      banner = `<div class="bar muted">This invoice has been replaced. Please use the newest one from Silvana.</div>`;
    } else {
      banner = `<div class="bar"><div class="pay">${paymentOptionsHtml(doc, ctx.business).replace(/<a /g, '<a class="btn" ')}</div><span>Balance: <strong>${money(doc.total - doc.paidAmount)}</strong></span></div>`;
    }
  }

  const inner = documentHtml(doc, ctx)
    .replace(/^[\s\S]*?<body>/, '')
    .replace(/<\/body>[\s\S]*$/, '');
  const styles = documentHtml(doc, ctx).match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';

  const html = `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" />
  <title>${escapeHtml(doc.number)} — Lotus Attune</title>
  <style>${styles}
    body { padding: 24px 12px 48px; }
    .page { max-width: 8.5in; width: auto; min-height: 0; padding: 40px clamp(20px, 5vw, 0.75in) 60px; box-shadow: 0 30px 60px -40px rgba(59,46,36,0.5); }
    .foot { position: static; margin-top: 30px; }
    .bar { max-width: 8.5in; margin: 0 auto 16px; background: #241b14; color: #f6efe5; padding: 16px 22px; font-size: 14px; line-height: 1.6; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .bar.ok { background: #4a6340; } .bar.muted { background: #7a6a5c; }
    .bar a { color: #dcc194; } .bar strong { color: #fff; }
    .bar button, .bar a.btn { display: inline-block; background: #f6efe5; color: #241b14; border: 0; border-radius: 999px; padding: 12px 24px; font: 500 11.5px/1 'Jost', Arial, sans-serif; letter-spacing: 0.22em; text-transform: uppercase; cursor: pointer; text-decoration: none; margin: 4px 8px 4px 0; }
    .bar .pay p { margin: 0 0 6px; }
    .actions { max-width: 8.5in; margin: 0 auto 14px; display: flex; gap: 10px; justify-content: flex-end; }
    .actions a { font: 500 11px/1 'Jost', Arial, sans-serif; letter-spacing: 0.2em; text-transform: uppercase; color: #7c5b3b; text-decoration: none; border: 1px solid rgba(168,135,90,0.55); border-radius: 999px; padding: 11px 18px; }
    @media (max-width: 640px) { .page { padding: 28px 18px 40px; } .page table td { display: block; width: auto !important; padding-right: 0 !important; } .page .lines td, .page .totals td { display: table-cell; } .page .lines td.amt { width: 30%; } }
  </style></head><body>
    ${banner}
    <div class="actions"><a href="/d/${escapeHtml(token)}/pdf">Download PDF</a></div>
    ${inner}
  </body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
