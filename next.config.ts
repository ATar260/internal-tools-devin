import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal tools are per-request and auth-gated, so every page renders
  // dynamically. Cache Components would force a Suspense boundary around
  // every data read for no benefit here.
  cacheComponents: false,
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
