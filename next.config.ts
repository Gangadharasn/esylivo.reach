import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit loads its font metrics from its own package folder at runtime.
  serverExternalPackages: ["pdfkit", "unpdf"],
  outputFileTracingIncludes: { "/**": ["./assets/fonts/**"] },
};

export default nextConfig;
