/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'], // Pour les avatars Google
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
