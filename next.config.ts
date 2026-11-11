import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["exceljs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
    middlewareClientMaxBodySize: "250mb",
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "/v1/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/terms-of-service",
        destination: "/terms",
        permanent: true,
      },
      {
        source: "/privacy-policy",
        destination: "/privacy",
        permanent: true,
      },
      {
        source: "/refunds",
        destination: "/refund-policy",
        permanent: true,
      },
      {
        source: "/cancellation-policy",
        destination: "/refund-policy",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
