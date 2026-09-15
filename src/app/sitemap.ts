import type { MetadataRoute } from 'next';

import { SITE } from '@/lib/site';

/** `/lp` and `/studio` are deliberately absent — both are noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: '', priority: 1 },
    { path: '/experience', priority: 0.9 },
    { path: '/offerings', priority: 0.9 },
    { path: '/founder', priority: 0.7 },
    { path: '/book', priority: 0.8 },
    { path: '/gift', priority: 0.6 },
  ];

  return routes.map((route) => ({
    url: `${SITE.url}${route.path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: route.priority,
  }));
}
