import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isDatabaseConfigured } from '@/lib/db';
import { loadPortal } from '@/lib/portal';
import { PortalView } from './PortalView';

export const metadata: Metadata = {
  title: 'Your booking',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = isDatabaseConfigured() ? await loadPortal(token) : null;
  if (!data) notFound();
  return <PortalView data={data} />;
}
