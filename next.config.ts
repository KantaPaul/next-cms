import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Workspace packages ship TypeScript source; Next compiles them like app code.
  transpilePackages: ['@nextcms/builder-core', '@nextcms/builder-react'],
  typescript: {
    ignoreBuildErrors: false,
  },
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
