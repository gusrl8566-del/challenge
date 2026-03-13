/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.megaworld.store/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
