import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Both apps in this monorepo share the root node_modules, so Turbopack's
  // root must be the workspace root rather than this folder.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
