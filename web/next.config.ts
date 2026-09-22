import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // This app needs the monorepo root as the Turbopack root: it imports the
  // shared Convex backend (my-app/convex) through the npm workspace link,
  // which only resolves via the root node_modules.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
