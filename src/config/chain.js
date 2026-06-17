import { defineChain } from 'viem';

// Base mainnet (chainId 8453)
export const base = defineChain({
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
});

// Base Sepolia testnet (chainId 84532)
export const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan Sepolia', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
});

// Default to Base mainnet for production
export const defaultChain = base;
