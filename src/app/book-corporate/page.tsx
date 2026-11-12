import type { Metadata } from 'next';

import LandingPage, { metadata as landingMetadata } from '../book-now/page';

/** The LinkedIn version of the ad page at a clean address - the same page as
 *  /book-now?aud=corporate. Ad traffic only, never indexed. */
export const metadata: Metadata = {
  ...landingMetadata,
  title: 'Corporate Team Wellness, Toronto',
};

/** The booking lead time comes from the studio settings, so read it per visit. */
export const dynamic = 'force-dynamic';

export default function CorporateLandingPage() {
  return <LandingPage searchParams={Promise.resolve({ aud: 'corporate' })} />;
}
