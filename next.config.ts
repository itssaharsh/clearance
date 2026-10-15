import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully dynamic app (live graph state): Cache Components off on purpose.
  // falkordb (and its redis client) break under bundling ("a.BigInt is not a function"):
  // keep them external and loaded from node_modules at runtime.
  serverExternalPackages: ["falkordb", "redis", "@redis/client"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
