import 'server-only';

/**
 * PDFShift: HTML in, PDF out. Used for proposals, invoices and gift
 * certificates. Best-effort by design - every caller must cope with `null`,
 * since a missing key or an outage must never block a proposal from being
 * sent (the email carries the same content inline, the PDF is the polished
 * attachment on top).
 *
 * Key: PDFShift dashboard → API keys. Set as PDFSHIFT_API_KEY on Vercel.
 */

const ENDPOINT = 'https://api.pdfshift.io/v3/convert/pdf';

export function isPdfConfigured(): boolean {
  return Boolean(process.env.PDFSHIFT_API_KEY);
}

export type PdfOptions = {
  /** "Letter" (default, North America) or "A4". */
  format?: 'Letter' | 'A4';
  landscape?: boolean;
  /** CSS-style margin, e.g. "18mm". */
  margin?: string;
};

export async function renderPdf(
  html: string,
  options: PdfOptions = {}
): Promise<Buffer | null> {
  const key = process.env.PDFSHIFT_API_KEY;
  if (!key) {
    console.error('[pdf] PDFSHIFT_API_KEY is not set - skipping PDF');
    return null;
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': key,
      },
      body: JSON.stringify({
        source: html,
        format: options.format ?? 'Letter',
        landscape: options.landscape ?? false,
        margin: options.margin ?? '0',
        use_print: false,
        // PDFShift's sandbox mode renders a watermarked PDF without spending
        // credits - handy while the account is being set up.
        sandbox: process.env.PDFSHIFT_SANDBOX === '1',
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      console.error('[pdf] PDFShift returned', response.status, await response.text());
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error('[pdf] PDFShift request failed:', error);
    return null;
  }
}
