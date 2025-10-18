/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Place allowedDevOrigins at the top level, not inside `experimental`
  allowedDevOrigins: [
    'http://51.68.65.94',   // allow this specific origin
    'http://localhost:3000' // your local dev server
  ],

  // ✅ ESLint config is also top-level
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ TypeScript config — still fine at top level
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Image optimization config
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
