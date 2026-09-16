import { NextResponse } from 'next/server';

import { acceptProposal } from '@/lib/documents';

export const runtime = 'nodejs';

/** The "Accept & sign" form on the proposal page posts here. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const form = await request.formData().catch(() => null);
  const name = String(form?.get('name') ?? '').trim().slice(0, 120);
  const png = String(form?.get('signature') ?? '');
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const base = new URL(request.url);
  const target = new URL(`/d/${token}`, base);
  if (!name) {
    target.searchParams.set('error', 'name');
    return NextResponse.redirect(target, { status: 303 });
  }
  const result = await acceptProposal(token, { name, png: png || null, ip });
  if (result.ok) target.searchParams.set('accepted', '1');
  else target.searchParams.set('error', 'accept');
  return NextResponse.redirect(target, { status: 303 });
}
