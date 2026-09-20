import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/site';

/** Powers the icon Chrome/Android use for "Add to Home Screen" / "Install" -
 *  without this, they fall back to a plain generated letter tile. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#fbf7f1',
    theme_color: '#fbf7f1',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
