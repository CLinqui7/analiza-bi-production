import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  // Keep tracing within this project even when a parent directory has another
  // package lockfile; Netlify's Next runtime requires a stable trace root.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
