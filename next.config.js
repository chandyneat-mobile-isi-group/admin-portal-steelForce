/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // The standalone bundle is for the Docker image. Vercel packages Next.js itself, and
  // sets VERCEL=1 during its builds, so the option is left off there.
  output: process.env.VERCEL ? undefined : 'standalone',
  skipTrailingSlashRedirect: true,

  async redirects() {
    return [
      {
        source: '/products',
        destination: '/materials',
        permanent: false,
      },
      {
        source: '/products/:path*',
        destination: '/materials/:path*',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
