import { http, createConfig, createStorage } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';
import { Attribution } from 'ox/erc8021';
import { base, baseSepolia } from './chain.js';

// Deployed on Base Mainnet via Remix IDE
// Owner: 0x42b10b337a5692743d587134c89a725422c3dffb
// Basescan: https://basescan.org/address/0xd1B1A447A08216A9E34E3dEfb7622758c03d431D
export const LEADERBOARD_ADDRESS = '0xd1B1A447A08216A9E34E3dEfb7622758c03d431D';

// Base Builder Code (ERC-8021) — appended to every transaction's calldata
// so the Base indexer attributes onchain activity to this app.
// https://docs.base.org/apps/builder-codes/builder-codes
//
// IMPORTANT: wagmi's writeContract/sendTransaction creates a fresh connector
// client (via getConnectorClient) that does NOT inherit config-level dataSuffix.
// So we pass DATA_SUFFIX explicitly in each writeContract call.
export const DATA_SUFFIX = Attribution.toDataSuffix({ codes: ['bc_kj0vqo00'] });

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
  // Also set at config level for viem public client calls (estimateGas, etc.)
  // and sendTransaction calls that use the config's own client.
  dataSuffix: DATA_SUFFIX,
});
