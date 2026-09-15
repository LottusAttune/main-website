import { NextResponse } from 'next/server';

import { acceptProposal } from '@/lib/documents';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await acceptProposal(token);
  const base = new URL(request.url);
  const target = new URL(`/d/${token}`, base);
  if (result.ok) target.searchParams.set('accepted', '1');
  return NextResponse.redirect(target, { status: 303 });
}
