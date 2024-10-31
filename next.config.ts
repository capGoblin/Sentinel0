import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: config => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  images: {
    domains: [
      "sepolia.etherscan.io",
      "scrollscan.com",
      "assets-global.website-files.com",
      "optimistic.etherscan.io",
      "arbiscan.io",
      "basescan.org",
      "assets.reown.com",
    ],
  },
};

export default nextConfig;
