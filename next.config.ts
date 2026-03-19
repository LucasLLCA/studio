import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  serverExternalPackages: [
    "@opentelemetry/sdk-node",
    "@opentelemetry/auto-instrumentations-node",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
  output: 'standalone', // <-- essa linha habilita a build standalone
};

export default nextConfig;