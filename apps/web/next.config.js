const path = require('node:path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Trace workspace deps (pnpm monorepo) so standalone output is self-contained.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://cafe-api:3000/api/:path*',
      },
    ];
  },
  reactStrictMode: true,
  images: {
    domains: ['cafe.local'],
  },
};

module.exports = nextConfig;
