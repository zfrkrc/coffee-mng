const path = require('node:path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Trace workspace deps (pnpm monorepo) so standalone output is self-contained.
  outputFileTracingRoot: path.join(__dirname, '../../'),
  reactStrictMode: true,
  images: {
    domains: ['cafe.local'],
  },
};

module.exports = nextConfig;
