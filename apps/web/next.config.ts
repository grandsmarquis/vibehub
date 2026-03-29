import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  turbopack: {
    // Monorepo + hoisted `next` at repo root; without this, Turbopack can infer the wrong root
    // (e.g. .../src/app) and fail to resolve next/package.json — notably in Docker builds.
    root: repoRoot,
  },
};

export default nextConfig;
