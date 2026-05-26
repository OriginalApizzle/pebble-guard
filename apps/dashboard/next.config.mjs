/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['cdn.discordapp.com', 'avatars.githubusercontent.com'],
  },
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
  },
  // Fixes transient TS errors from workspace packages in Next's compiler
  transpilePackages: ['@pebble-guard/shared', '@pebble-guard/database'],
};

export default nextConfig;
