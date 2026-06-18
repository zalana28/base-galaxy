import { useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { DATA_SUFFIX } from '../config/wagmi.js';

/**
 * useBuilderCodeTransaction — sends a contract write with the Base Builder Code
 * (ERC-8021) suffix appended to the calldata, so the Base indexer attributes
 * the onchain activity to this app.
 *
 * Uses `useWriteContract` + per-call `dataSuffix`. The suffix is appended
 * directly to the calldata by viem (`concat([data, dataSuffix])`), so it works
 * identically for Coinbase Smart Wallet, MetaMask, and any EOA — no ERC-5792
 * capability negotiation required.
 *
 * https://docs.base.org/apps/builder-codes/builder-codes
 *
 * @param {object} opts
 * @param {import('viem').Address} opts.address  - contract address
 * @param {import('viem').Abi}      opts.abi      - contract ABI
 * @param {number}                  opts.chainId  - target chain id
 * @returns {{ send: (functionName: string, args?: unknown[]) => void,
 *            status: 'idle'|'pending'|'confirming'|'success'|'error',
 *            hash?: `0x${string}`, error?: Error }}
 */
export function useBuilderCodeTransaction({ address, abi, chainId }) {
  const {
    writeContractAsync,
    data: hash,
    isPending,
    error: writeError,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const send = useCallback(
    async (functionName, args = []) => {
      reset();
      try {
        await writeContractAsync({
          address,
          abi,
          functionName,
          args,
          chainId,
          // Append ERC-8021 builder code suffix to calldata.
          dataSuffix: DATA_SUFFIX,
        });
      } catch {
        // Error state is exposed via `writeError` from useWriteContract.
      }
    },
    [address, abi, chainId, writeContractAsync, reset],
  );

  // Map the write lifecycle onto a simple status for the UI.
  let status = 'idle';
  if (writeError) status = 'error';
  else if (isSuccess) status = 'success';
  else if (isConfirming) status = 'confirming';
  else if (isPending) status = 'pending';
  else if (hash) status = 'confirming';

  return { send, status, hash, error: writeError };
}
