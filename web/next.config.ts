import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  turbopack: {
    root: path.resolve(__dirname, ".."),
    resolveAlias: {
      pino: path.resolve(__dirname, "src/lib/empty.ts"),
      "pino/file": path.resolve(__dirname, "src/lib/empty.ts"),
      "thread-stream": path.resolve(__dirname, "src/lib/empty.ts"),
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      pino: path.resolve(__dirname, "src/lib/empty.ts"),
      "pino/file": path.resolve(__dirname, "src/lib/empty.ts"),
      "thread-stream": path.resolve(__dirname, "src/lib/empty.ts"),
    };
    return config;
  },
};

export default nextConfig;
