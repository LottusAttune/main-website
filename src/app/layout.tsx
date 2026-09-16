import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, EB_Garamond, Jost } from 'next/font/google';
import Script from 'next/script';

import { SITE } from '@/lib/site';
import '@/styles/global.css';

const GA_MEASUREMENT_ID = 'G-9HNTMCTLNS';

/* 500 added for the mobile/tablet readability pass - without a real
   medium-weight file loaded, every font-weight:500 on this family was
   silently substituting the plain 400 face (reading as no change at all)
   or getting synthetic faux-bold from the browser for weight:600+ (reading
   as grotesque/distorted) - neither is real font weight, just the browser
   guessing. This is the actual fix for both complaints at once. */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
  variable: '--font-cormorant',
});

// Used only for the /v1 trust-bar figures: EB Garamond is the classic
// revival Cormorant Garamond was stylized from, so it keeps the same
// feeling, but its numeral 1 is a plain stroke with a flag rather than a
// full serif that reads as a capital I at small sizes.
const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-eb-garamond',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500'],
  display: 'swap',
  variable: '--font-jost',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Immersive Soma Sound in Toronto`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} — Immersive Soma Sound in Toronto`,
    description: SITE.description,
    // Absolute, resolved against metadataBase — crawlers cannot follow a
    // relative OG image.
    images: [{ url: '/assets/silvana-hero.webp', width: 962, height: 1635 }],
  },
  twitter: { card: 'summary_large_image' },
  verification: {
    google: 'QC0nVB1HnLTt1Ru56akSFIfC4vpjAqQAraE8OUmHg6k',
  },
};

export const viewport: Viewport = {
  themeColor: '#FBF7F1',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable} ${ebGaramond.variable}`}>
      <body>
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
