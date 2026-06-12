/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    position: 'bottom-right',
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
