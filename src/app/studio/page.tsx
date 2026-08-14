import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { StudioShell } from '@/components/studio/StudioShell';
import { isSignedIn } from '@/lib/auth';
import { isDatabaseConfigured } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { getStudioData } from '@/lib/studio';

export const metadata: Metadata = {
  title: 'Studio',
  robots: { index: false, follow: false },
};

/** Owner-only and always live. */
export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  if (!(await isSignedIn())) redirect('/studio/login');

  const [data, settings] = await Promise.all([getStudioData(), getSettings()]);

  return (
    <StudioShell
      data={data}
      settings={settings}
      databaseReady={isDatabaseConfigured()}
    />
  );
}
