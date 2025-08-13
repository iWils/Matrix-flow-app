/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  images: {
    remotePatterns: []
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclure bcryptjs du bundling côté serveur pour éviter les warnings
      config.externals.push('bcryptjs')
    }
    return config
  }
}

export default nextConfig