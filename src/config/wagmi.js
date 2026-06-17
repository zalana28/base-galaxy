import { http, createConfig, createStorage } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { base, baseSepolia } from './chain.js';

// Deployed on Base Mainnet via Remix IDE
// Owner: 0x42b10b337a5692743d587134c89a725422c3dffb
// Basescan: https://basescan.org/address/0xd1B1A447A08216A9E34E3dEfb7622758c03d431D
export const LEADERBOARD_ADDRESS = '0xd1B1A447A08216A9E34E3dEfb7622758c03d431D';

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
