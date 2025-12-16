import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  // Fix workspace root warning for monorepo setups
  outputFileTracingRoot: path.join(__dirname),
  // Set empty turbopack config to use webpack instead
  turbopack: {},
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
