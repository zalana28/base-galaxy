import { useCallback, useState } from 'react';
import { useAccount, useSendCalls, useCallsStatus } from 'wagmi';
import { DATA_SUFFIX } from '../config/wagmi.js';

/**
 * useBuilderCodeTransaction — sends an ERC-5792 `wallet_sendCalls` batch with
 * the Base Builder Code (ERC-8021) suffix attached for onchain attribution.
 *
 * Attribution is applied defensively in BOTH paths:
 *   • Smart Wallet (ERC-5792): `capabilities.dataSuffix` with `optional: true`,
 *     so the wallet appends the suffix at the capability level. `optional` means
 *     wallets that don't recognise the capability still proceed normally.
 *   • EOA / fallback (`eth_sendTransaction`): per-call `dataSuffix` is concatenated
 *     into the calldata by viem (`concat([data, dataSuffix])`).
 *
 * https://docs.base.org/apps/builder-codes/builder-codes
 * https://eips.ethereum.org/EIPS/eip-5792
 *
 * @param {object} opts
 * @param {import('viem').Address} opts.address  - contract address
 * @param {import('viem').Abi}      opts.abi      - contract ABI
 * @param {number}                  opts.chainId  - target chain id
 * @returns {{ send: (functionName: string, args?: unknown[], to?: `0x${string}`) => void,
 *            status: 'idle'|'pending'|'success'|'error',
 *            id?: string, error?: Error }}
 */
export function useBuilderCodeTransaction({ address, abi, chainId }) {
  const { address: account } = useAccount();
  const [id, setId] = useState(undefined);
  const [error, setError] = useState(undefined);

  const { sendCallsAsync, isPending } = useSendCalls();
  const { data: callsStatus } = useCallsStatus({ id, query: { enabled: !!id } });

  const send = useCallback(
    async (functionName, args = [], to = address) => {
      if (!account) {
        setError(new Error('No wallet connected'));
        return;
      }
      setError(undefined);
      setId(undefined);
      try {
        const result = await sendCallsAsync({
          account,
          chainId,
          // Per-call suffix — concatenated into calldata for the EOA path
          // (and for wallets that ignore capabilities).
          calls: [
            {
              to,
              abi,
              functionName,
              args,
              dataSuffix: DATA_SUFFIX,
            },
          ],
          // Capability-level suffix — used by ERC-5792 Smart Wallets.
          // `optional: true` = wallets that don't support it still send the tx.
          capabilities: {
            dataSuffix: { value: DATA_SUFFIX, optional: true },
          },
        });
        setId(result?.id);
      } catch (e) {
        setError(e);
      }
    },
    [account, address, abi, chainId, sendCallsAsync],
  );

  // Map the ERC-5792 lifecycle onto a simple status for the UI.
  let status = 'idle';
  if (error) status = 'error';
  else if (isPending) status = 'pending';
  else if (callsStatus?.status === 'success') status = 'success';
  else if (id && !callsStatus) status = 'pending';

  return { send, status, id, error };
}
