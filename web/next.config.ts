import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  turbopack: {
    // Empty turbopack config to silence warnings while using webpack
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
