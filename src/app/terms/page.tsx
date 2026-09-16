import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal/LegalPage';
import { getSettings } from '@/lib/settings';
import { termsSections } from '@/lib/terms';

// Draft wording awaiting Silvana's sign-off - kept out of search until then.
export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Booking, payment and cancellation terms for Lotus Attune experiences.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function TermsPage() {
  const { business } = await getSettings();
  const sections = termsSections(business);

  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms & Conditions"
      intro="The plain-language terms for booking, paying for and attending a Lotus Attune experience."
      updated="September 2026"
      sections={sections}
    />
  );
}
