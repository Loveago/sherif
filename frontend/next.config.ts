import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typedRoutes: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
    ],
  },
  async rewrites() {
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api/v1';
    const backendBase = process.env.BACKEND_URL || rawApiUrl.replace(/\/api\/v1\/?$/, '');

    return [
      {
        source: '/webhooks/:path*',
        destination: `${backendBase}/webhooks/:path*`,
      },
      {
        source: '/webhooks',
        destination: `${backendBase}/webhooks`,
      },
      {
        source: '/api/v1/webhooks/:path*',
        destination: `${backendBase}/api/v1/webhooks/:path*`,
      },
      {
        source: '/api/v1/webhooks',
        destination: `${backendBase}/api/v1/webhooks`,
      },
      {
        source: '/momo/:path*',
        destination: `${backendBase}/momo/:path*`,
      },
      {
        source: '/momo',
        destination: `${backendBase}/momo`,
      },
    ];
  },
};

export default nextConfig;
