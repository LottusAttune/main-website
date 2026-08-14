import { SITE } from '@/lib/site';

/**
 * LocalBusiness structured data. Silvana is a Toronto business near Bloor–Yonge,
 * so this is worth carrying on the home page.
 *
 * The street address is deliberately absent until the client confirms whether
 * the venue address should be public.
 */
export function LocalBusinessSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HealthAndBeautyBusiness',
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    email: SITE.email,
    telephone: '+1-416-871-5610',
    image: `${SITE.url}/assets/silvana-hero.webp`,
    logo: `${SITE.url}/assets/logo-circle.webp`,
    priceRange: '$$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Toronto',
      addressRegion: 'ON',
      addressCountry: 'CA',
    },
    areaServed: [
      { '@type': 'City', name: 'Toronto' },
      { '@type': 'AdministrativeArea', name: 'Greater Toronto Area' },
    ],
    slogan: SITE.motto,
    makesOffer: [
      {
        '@type': 'Offer',
        name: 'Private Sessions',
        description: 'Two-hour one-on-one immersive sound and somatic experience',
        price: '340',
        priceCurrency: 'CAD',
      },
      {
        '@type': 'Offer',
        name: 'Friends, Families & Groups',
        description: 'Two-hour immersive experience for 2 to 24 participants',
        price: '280',
        priceCurrency: 'CAD',
      },
      {
        '@type': 'Offer',
        name: 'Corporate Wellness',
        description: 'Two-hour immersive team experience for organizations',
        price: '280',
        priceCurrency: 'CAD',
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Serialised from a literal defined above — no user input reaches this.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
