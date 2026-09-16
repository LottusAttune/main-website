import { NextResponse } from 'next/server';

import { generatePdf, getDocumentByToken, getDocumentPdf } from '@/lib/documents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await getDocumentByToken(token);
  if (!doc) return new NextResponse('Not found', { status: 404 });

  const download = new URL(request.url).searchParams.get('download') === '1';
  const pdf = (await getDocumentPdf(doc.id)) ?? (await generatePdf(doc));
  if (!pdf) {
    // No PDF service yet - the online view is the document.
    return NextResponse.redirect(new URL(`/d/${token}`, process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lotusattune.com'));
  }
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${doc.number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
