import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/bootsky',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
