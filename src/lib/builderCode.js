// Base Builder Codes (ERC-8021) integration
// https://docs.base.org/apps/builder-codes/builder-codes
//
// Builder Codes are appended to transaction calldata as a suffix so the
// Base indexer can attribute onchain activity to your builder code. The
// target contract ignores the suffix (its function selector is still at
// the start of calldata), so no contract changes are required.
//
// Usage: pass `BUILDER_CODE_SUFFIX` as the `dataSuffix` parameter when
// sending a transaction (viem sendTransaction / wagmi useSendTransaction).

// Builder code identifier (minted as ERC-721 NFT on Base).
export const BUILDER_CODE = 'bc_kj0vqo00';

// Pre-encoded suffix for transaction calldata.
// This is the encoded form of the builder code (hex string), which encodes
// the ASCII "bc_kj0vqo00" prefix followed by the metadata envelope bytes
// as defined by the Builder Codes spec.
//
// Format breakdown:
//   62635f6b6a3076716f3030  -> "bc_kj0vqo00" (ASCII)
//   0b008021802180218021802180218021802180218021  -> metadata envelope
export const BUILDER_CODE_SUFFIX =
  '0x62635f6b6a3076716f30300b008021802180218021802180218021802180218021';
