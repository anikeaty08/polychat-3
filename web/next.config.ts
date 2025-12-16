import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  // Fix workspace root warning by setting explicit root
  experimental: {
    // This helps Next.js understand the workspace structure
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Replace pino with empty module in browser builds
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "pino": false,
        "pino/file": false,
        "thread-stream": false,
      };
    }
    return config;
  },
};

export default nextConfig;
