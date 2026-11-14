import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  // Workspace packages ship TypeScript source; Next compiles them like app code.
  transpilePackages: [
    '@nextcms/builder-core',
    '@nextcms/builder-react',
    '@nextcms/editor-ui',
    '@nextcms/plugin-sdk',
  ],
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
  async redirects() {
    return [
      {
        source: '/dashboard/header-footer/:path*',
        destination: '/dashboard/site-templates/:path*',
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
