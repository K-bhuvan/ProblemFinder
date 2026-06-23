import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    // Turbopack's dev filesystem cache can write duplicate build output under a
    // mangled absolute-path folder on Windows (e.g. CUsersbhuvaDocuments...).
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
