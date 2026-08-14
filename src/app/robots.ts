import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Ad landing pages and the owner dashboard must never be indexed.
      disallow: ['/lp', '/studio', '/api/'],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
