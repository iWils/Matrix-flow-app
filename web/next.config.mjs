/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    remotePatterns: []
  },
  // Désactiver assetPrefix pour éviter les problèmes d'accessibilité locale
  // assetPrefix: process.env.NODE_ENV === 'production' ? 'http://192.168.10.37:3000' : undefined,
  // Force HTTP pour tous les assets
  experimental: {
    forceSwcTransforms: true
  },
  // Configuration pour forcer HTTP et éviter HTTPS
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=0'
          }
        ],
      },
    ]
  },
  // Désactiver HTTPS redirect
  async redirects() {
    return []
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclure bcryptjs du bundling côté serveur pour éviter les warnings
      config.externals.push('bcryptjs')
    }
    return config
  }
}

export default nextConfig;