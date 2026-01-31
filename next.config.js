/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Disable caching for logos stored in /public/logos to ensure
  // the browser and Next image optimizer always fetch the latest file
  // after an upload. This sets Cache-Control headers for that path.
  async headers() {
    return [
      {
        source: '/logos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ]
  },
  // Rewrite /logo.png to an existing file in /public/logos to avoid 404s
  async rewrites() {
    return [
      {
        source: '/logo.png',
        destination: '/logos/green-1765139730896.png',
      },
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig
