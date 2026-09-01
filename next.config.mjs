/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    // The client flagged compression artefacts in an earlier round, so the
    // hero and gallery photography is served at a high quality.
    qualities: [75, 90],
  },
  async redirects() {
    return [
      // /v1 was promoted to be the site itself - anyone with an old /v1/...
      // bookmark lands on the same page at its new, clean URL.
      { source: '/v1', destination: '/', permanent: true },
      { source: '/v1/:path*', destination: '/:path*', permanent: true },
      // Benefits and What's Included are now sections within /experience.
      { source: '/benefits', destination: '/experience', permanent: true },
      { source: '/included', destination: '/experience#included', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
