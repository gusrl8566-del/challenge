/** @type {import('next').NextConfig} */
const backendApiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');

const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendApiBaseUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
