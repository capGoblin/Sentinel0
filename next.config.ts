import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
