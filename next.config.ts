import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  // Ensure Fast Refresh is enabled (enabled by default in dev mode)
  experimental: {
    // Fast Refresh is automatically enabled in development
  },
};

export default nextConfig;
