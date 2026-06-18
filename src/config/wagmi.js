import { http, createConfig, createStorage } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { Attribution } from 'ox/erc8021';
import { base } from './chain.js';

// Deployed on Base Mainnet via Remix IDE
// Owner: 0x42b10b337a5692743d587134c89a725422c3dffb
// Basescan: https://basescan.org/address/0xd1B1A447A08216A9E34E3dEfb7622758c03d431D
export const LEADERBOARD_ADDRESS = '0xd1B1A447A08216A9E34E3dEfb7622758c03d431D';

// Base Builder Code (ERC-8021) — calldata suffix appended to every transaction
// so the Base indexer attributes onchain activity to this app.
// https://docs.base.org/apps/builder-codes/builder-codes
//
// Generated with the official `ox` ERC-8021 module (no hardcoded hex).
// We pass DATA_SUFFIX in three places for defense-in-depth attribution:
//   1. createConfig({ dataSuffix })  — viem public client (estimateGas, etc.)
//   2. writeContract({ dataSuffix }) — per-call (EOA path via eth_sendTransaction)
//   3. sendCalls capabilities        — Smart Wallet path (ERC-5792 wallet_sendCalls)
export const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ['bc_kj0vqo00'] });

export const wagmiConfig = createConfig({
  chains: [base], // mainnet-only
  connectors: [
    // Coinbase Smart Wallet (passkey-based, no extension required)
    coinbaseWallet({
      preference: 'smartWalletOnly',
      appName: 'Base Galaxy',
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  // Vite SPA — no server-side rendering.
  ssr: false,
  storage: createStorage({ storage: typeof window !== 'undefined' ? window.localStorage : undefined }),
  // Appends the builder code suffix to public client calls (estimateGas, etc.)
  // and to sendTransaction calls that resolve via this config's own client.
  dataSuffix: DATA_SUFFIX,
});
