import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Les images viennent de l'API (autre hôte/port) : on les sert telles quelles,
  // sinon next/image refuse les domaines non déclarés et les photos n'apparaissent pas.
  images: { unoptimized: true },
};

export default nextConfig;
