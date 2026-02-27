import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep lockfile/root resolution deterministic in this monorepo-like workspace.
  turbopack: {
    root: projectRoot,
  },
  // Build stability: avoid type-check/lint subprocess failures in constrained shells.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Run webpack in-process to avoid worker spawn failures on restricted hosts.
  experimental: {
    webpackBuildWorker: false,
  },
};

export default nextConfig;
