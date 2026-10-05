import 'server-only';

import { renderPdf } from '@/lib/pdfshift';
import type { BusinessSettings } from '@/lib/settings';
import { SITE } from '@/lib/site';
import { termsSections } from '@/lib/terms';

export const TERMS_PDF_FILENAME = 'Lotus-Attune-Terms-and-Conditions.pdf';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The same wording as /terms and the booking pop-up (one source:
 *  termsSections), as a standalone printable page. */
export function termsHtml(business: BusinessSettings): string {
  const sections = termsSections(business)
    .map(
      (s) => `
      ${s.title === 'Bookings' ? '' : `<h2>${escapeHtml(s.title)}</h2>`}
      ${s.paragraphs
        .filter(Boolean)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
        .join('')}`
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>Terms &amp; Conditions - ${escapeHtml(SITE.name)}</title>
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #3b2e24; font-size: 12.5px; line-height: 1.7; margin: 0; padding: 48px 56px; }
  .eyebrow { font-size: 10.5px; letter-spacing: 0.28em; text-transform: uppercase; color: #7c5b3b; }
  h1 { font-family: Georgia, serif; font-weight: 400; font-size: 28px; margin: 8px 0 6px; }
  h2 { font-family: Georgia, serif; font-weight: 400; font-size: 17px; margin: 22px 0 6px; }
  p { margin: 0 0 8px; color: #5c4c40; }
  .foot { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e6dccd; font-size: 11px; color: #5c4c40; }
</style></head>
<body>
  <div class="eyebrow">${escapeHtml(SITE.name)}</div>
  <h1>Terms &amp; Conditions</h1>
  ${sections}
  <div class="foot">The current version is always on our <a href="${escapeHtml(SITE.url)}/terms" style="color:#7c5b3b;">Terms &amp; Conditions page</a>.</div>
</body></html>`;
}

/** Null when PDFShift is not configured or fails - callers fall back to a link. */
export async function renderTermsPdf(business: BusinessSettings): Promise<Buffer | null> {
  return renderPdf(termsHtml(business), { format: 'Letter', margin: '0' });
}
