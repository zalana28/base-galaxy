import { http, createConfig, createStorage } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { base, baseSepolia } from './chain.js';

// TODO: Replace with your deployed contract address
export const LEADERBOARD_ADDRESS = '0x0000000000000000000000000000000000000000';

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    // Coinbase Smart Wallet (passkey-based, no extension required)
    coinbaseWallet({
      preference: 'smartWalletOnly',
      appName: 'Base Star Raider',
    }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
  storage: createStorage({ storage: typeof window !== 'undefined' ? window.localStorage : undefined }),
});
