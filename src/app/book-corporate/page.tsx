import type { Metadata } from 'next';

import { AUDIENCES } from '@/data/landing';
import LandingPage, { metadata as landingMetadata } from '../book-now/page';

/** The LinkedIn version of the ad page at a clean address - the same page as
 *  /book-now?aud=corporate. Ad traffic only, never indexed. */
export const metadata: Metadata = {
  ...landingMetadata,
  title: AUDIENCES.corporate.title,
};

export default function CorporateLandingPage() {
  return <LandingPage searchParams={Promise.resolve({ aud: 'corporate' })} />;
}
