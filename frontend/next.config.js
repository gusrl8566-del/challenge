/** @type {import('next').NextConfig} */
const backendApiBaseUrl = (
  process.env.NEXT_INTERNAL_API_URL || 'http://backend:3001/api'
).replace(/\/+$/, '');
const backendBaseUrl = backendApiBaseUrl.replace(/\/api$/, '');

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
      {
        source: '/uploads/:path*',
        destination: `${backendBaseUrl}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
