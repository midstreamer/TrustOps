/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Dev (`npm run dev`) uses .next-dev; production build uses .next; CI checks use .next-build.
  // Keeps `next build` from clobbering the running dev server's cache.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

module.exports = nextConfig;
