import { NextResponse } from 'next/server';

import { isSignedIn } from '@/lib/auth';
import {
  depositDue,
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

  // Silvana previewing from the studio is not the client opening it.
  if (!(await isSignedIn())) await markViewed(token);
  const ctx = await loadContext(doc);
  doc = await ensurePaymentLinks(doc, ctx.business);

  const accepted = url.searchParams.get('accepted') === '1' || doc.status === 'accepted';
  const paid = url.searchParams.get('paid') === '1';
  const canceled = url.searchParams.get('canceled') === '1';

  // A canceled checkout gets nothing else on screen - no invoice, no
  // duplicated payment details - just this, and a single clear way back in.
  if (canceled && doc.kind === 'invoice' && doc.status !== 'paid' && doc.status !== 'void') {
    const resumeUrl = doc.payDepositUrl ?? doc.payFullUrl;
    const html = `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="robots" content="noindex" />
    <title>${escapeHtml(doc.number)} — Lotus Attune</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Jost:wght@400;500&display=swap');
      body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f6efe5; color: #241b14; font-family: 'Jost', Arial, sans-serif; padding: 24px; text-align: center; }
      .wrap { max-width: 420px; }
      .mark { display: block; width: 62px; height: 55px; margin: 0 auto 12px; }
      .wordmark { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 15px; letter-spacing: 0.16em; color: #241b14; margin: 0 0 22px; }
      h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; font-size: 30px; margin: 0 0 12px; }
      p { font-size: 16px; line-height: 1.65; margin: 0 0 28px; color: #3b2e24; }
      .btn { display: inline-block; background: #241b14; color: #f6efe5; padding: 15px 30px; text-decoration: none; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; border-radius: 999px; margin-bottom: 16px; }
    </style></head><body>
      <div class="wrap">
        <img class="mark" src="/assets/logo-mark-transparent.webp" alt="" width="62" height="55" />
        <div class="wordmark">LOTUS ATTUNE</div>
        <h1>Checkout was closed</h1>
        <p>Nothing was charged - no payment went through.</p>
        ${resumeUrl ? `<a class="btn" href="${resumeUrl}">Continue to payment</a>` : ''}
      </div>
    </body></html>`;
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  let banner = '';
  if (doc.kind === 'proposal') {
    if (doc.status === 'void' || doc.status === 'declined') {
      banner = `<div class="bar muted">This proposal is no longer active. Reply to Silvana's email for an updated one.</div>`;
    } else if (accepted) {
      banner = `<div class="bar ok">Thank you - your proposal is accepted. Silvana will be in touch with your invoice and confirmation.</div>`;
    } else {
      const err = url.searchParams.get('error');
      banner = `
        <form class="bar sign" method="post" action="/d/${escapeHtml(token)}/accept" id="signForm">
          <div class="signIntro">Ready to go ahead? Type your name and sign below${doc.dueOn ? ` (valid until ${formatStudioDate(doc.dueOn)})` : ''}.${err === 'name' ? ' <strong>Please type your name.</strong>' : err === 'accept' ? ' <strong>This proposal could not be accepted - please reply to the email.</strong>' : ''}</div>
          <label class="signLabel">Full name<input type="text" name="name" required maxlength="120" autocomplete="name" value="${escapeHtml(doc.clientName)}" /></label>
          <div class="signLabel">Signature <span class="signHint">draw with your finger or mouse</span>
            <canvas id="sigPad" width="600" height="180"></canvas>
            <button type="button" class="signClear" id="sigClear">Clear</button>
          </div>
          <input type="hidden" name="signature" id="sigData" />
          <button type="submit" id="sigSubmit">Accept &amp; sign</button>
        </form>
        <script>
        (function(){
          var c=document.getElementById('sigPad'),x=c.getContext('2d'),d=false,drawn=false;
          x.lineWidth=2.2;x.lineCap='round';x.lineJoin='round';x.strokeStyle='#241b14';
          function p(e){var r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return[(t.clientX-r.left)*c.width/r.width,(t.clientY-r.top)*c.height/r.height];}
          function s(e){d=true;drawn=true;var q=p(e);x.beginPath();x.moveTo(q[0],q[1]);e.preventDefault();}
          function m(e){if(!d)return;var q=p(e);x.lineTo(q[0],q[1]);x.stroke();e.preventDefault();}
          function u(){d=false;}
          c.addEventListener('mousedown',s);c.addEventListener('mousemove',m);window.addEventListener('mouseup',u);
          c.addEventListener('touchstart',s,{passive:false});c.addEventListener('touchmove',m,{passive:false});c.addEventListener('touchend',u);
          document.getElementById('sigClear').onclick=function(){x.clearRect(0,0,c.width,c.height);drawn=false;};
          document.getElementById('signForm').onsubmit=function(){document.getElementById('sigData').value=drawn?c.toDataURL('image/png'):'';};
        })();
        </script>`;
    }
  } else if (doc.kind === 'invoice') {
    if (doc.status === 'paid') {
      banner = `<div class="bar ok">Paid in full - thank you.</div>`;
    } else if (paid) {
      banner = `<div class="bar ok">Thank you - your card payment is being confirmed. A receipt will follow by email.</div>`;
    } else if (doc.status === 'void') {
      banner = `<div class="bar muted">This invoice has been replaced. Please use the newest one from Silvana.</div>`;
    } else {
      const deposit = depositDue(doc, ctx.business);
      banner = `<div class="bar"><div class="pay">${paymentOptionsHtml(doc, ctx.business, ctx.booking).replace(/<a /g, '<a class="btn" ')}</div><span>${deposit !== null ? 'Deposit due' : 'Balance'}: <strong>${money(deposit ?? doc.total - doc.paidAmount)}</strong></span></div>`;
    }
  }

  const rendered = documentHtml(doc, ctx);
  const inner = rendered.replace(/^[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*$/, '');
  const styles = rendered.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';

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
    .bar.sign { display: block; }
    .signIntro { margin-bottom: 12px; } .signIntro strong { color: #f3c9b4; }
    .signLabel { display: block; font-size: 10.5px; letter-spacing: 0.22em; text-transform: uppercase; color: #dcc194; margin: 10px 0 4px; }
    .signHint { text-transform: none; letter-spacing: 0; color: rgba(239,230,218,0.6); margin-left: 6px; }
    .signLabel input { display: block; width: 100%; max-width: 420px; margin-top: 6px; padding: 12px 14px; font: 15px 'Jost', Arial, sans-serif; border: 1px solid rgba(239,230,218,0.35); background: #fffdfa; color: #241b14; }
    #sigPad { display: block; width: 100%; max-width: 600px; height: auto; margin-top: 6px; background: #fffdfa; border: 1px solid rgba(239,230,218,0.35); touch-action: none; cursor: crosshair; }
    .signClear { background: none; border: 1px solid rgba(239,230,218,0.4); color: #f6efe5; padding: 6px 12px; margin: 6px 0 0; font-size: 10.5px; letter-spacing: 0.18em; }
    #sigSubmit { margin-top: 14px; }
    .actions { max-width: 8.5in; margin: 0 auto 14px; display: flex; gap: 10px; justify-content: flex-end; }
    .actions a { font: 500 11px/1 'Jost', Arial, sans-serif; letter-spacing: 0.2em; text-transform: uppercase; color: #7c5b3b; text-decoration: none; border: 1px solid rgba(168,135,90,0.55); border-radius: 999px; padding: 11px 18px; }
    @media print { body { background: #fff; padding: 0; } .bar, .actions { display: none !important; } .page { box-shadow: none; padding: 0.5in 0.6in; } }
    @media (max-width: 640px) { .page { padding: 28px 18px 40px; } .page table td { display: block; width: auto !important; padding-right: 0 !important; } .page .lines td, .page .totals td { display: table-cell; } .page .lines td.amt { width: 30%; } }
  </style></head><body>
    ${banner}
    <div class="actions">
      <a href="#" onclick="window.print();return false;">Print</a>
      <a href="/d/${escapeHtml(token)}/pdf?download=1">Download PDF</a>
      <a href="#" onclick="window.close();return false;">Close</a>
    </div>
    ${inner}
  </body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
