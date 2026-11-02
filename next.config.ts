import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/ESM-heavy packages out of the server bundle. React-PDF
  // resolves @react-pdf/hyphenate subpaths through its own exports map.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
