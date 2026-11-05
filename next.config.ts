import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/ESM-heavy packages out of the server bundle. React-PDF
  // resolves @react-pdf/hyphenate subpaths through its own exports map.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  async redirects() {
    return [
      // Keep /help.html from competing with /help as a second indexable URL.
      { source: "/help.html", destination: "/help", permanent: true },
    ];
  },
  async rewrites() {
    // Serve the standalone setup manual at /help without exposing its
    // filename. The file lives in public/ so it ships untouched.
    return [{ source: "/help", destination: "/help.html" }];
  },
};

export default nextConfig;
