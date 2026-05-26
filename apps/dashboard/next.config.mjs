/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cdn.discordapp.com', 'avatars.githubusercontent.com'],
  },
  experimental: {
    serverActions: { allowedOrigins: ['*'] },
  },
};

export default nextConfig;
