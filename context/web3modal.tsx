// context/AppKit.tsx

"use client";

import { createAppKit, useAppKitTheme } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import {
  sepolia,
  scrollSepolia,
  seiTestnet,
  polygonAmoy,
  optimismSepolia,
  arbitrumSepolia,
  baseSepolia,
  zoraTestnet,
  flowTestnet,
  polygonZkEvmTestnet,
  zksyncSepoliaTestnet,
} from "@reown/appkit/networks";

// 1. Get projectId at https://cloud.reown.com
const projectId = "b307ae98c2b2c1dc3ce0bce1081cc667";

// 2. Create a metadata object
const metadata = {
  name: "secret-drive",
  description: "AppKit Example",
  url: "https://reown.com/appkit", // origin must match your domain & subdomain
  icons: ["https://assets.reown.com/reown-profile-pic.png"],
};

// 3. Create the AppKit instance
createAppKit({
  adapters: [new EthersAdapter()],
  metadata,
  networks: [
    sepolia,
    scrollSepolia,
    seiTestnet,
    polygonAmoy,
    optimismSepolia,
    arbitrumSepolia,
    baseSepolia,
    zoraTestnet,
    flowTestnet,
    polygonZkEvmTestnet,
    zksyncSepoliaTestnet,
  ],
  chainImages: {
    // Sepolia Testnet
    sepolia:
      "https://sepolia.etherscan.io/images/svg/brands/ethereum-original.svg",

    // Scroll Testnet
    scrollSepolia:
      "https://scrollscan.com/images/svg/brands/main.svg?v=24.4.3.0",

    // Polygon Amoy Testnet
    polygonAmoy:
      "https://assets-global.website-files.com/637e2b6d602973ea0941d482/63e26c8a3f6e812d91a7aa3d_Polygon-New-Logo.png",

    // Optimism Testnet
    optimismSepolia:
      "https://optimistic.etherscan.io/assets/optimism/images/svg/logos/chain-light.svg?v=24.4.4.4",

    // Arbitrum Testnet
    arbitrumSepolia: "https://arbiscan.io/images/svg/brands/arbitrum.svg?v=1.5",

    // Base Sepolia Testnet
    baseSepolia: "https://basescan.org/images/svg/brands/main.svg?v=24.4.4.9",
  },
  projectId,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
});

export function AppKit({ children }: any) {
  const { themeMode, themeVariables, setThemeMode, setThemeVariables } = useAppKitTheme()
  setThemeMode('light')
  return children;
}
