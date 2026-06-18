import { useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { LEADERBOARD_ADDRESS } from '../config/wagmi.js';
import { base } from '../config/chain.js';
import LEADERBOARD_ABI from '../abi/Leaderboard.json';
import { useBuilderCodeTransaction } from '../hooks/useBuilderCodeTransaction.js';

/**
 * WalletGate — full-screen overlay shown BEFORE the player can start the game.
 *
 * Flow:
 * 1. Show "Connect Wallet" buttons (Coinbase Smart Wallet / MetaMask)
 * 2. After connect: ensure Base chain
 * 3. Player clicks "Enter Game & Play" → sends enterGame() tx via ERC-5792
 *    `wallet_sendCalls` with the ERC-8021 builder code suffix attached.
 * 4. Wait for tx confirmation → callback onReady()
 */
export default function WalletGate({ onReady, onViewLeaderboard }) {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const { send, status, id } = useBuilderCodeTransaction({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    chainId: base.id,
  });

  const isPending = status === 'pending';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  // Once the call settles successfully, unlock the game.
  useEffect(() => {
    if (isSuccess) onReady();
  }, [isSuccess, onReady]);

  function handleConnect(connectorId) {
    const c = connectors.find((c) => c.id === connectorId);
    if (c) {
      connect(
        { connector: c },
        {
          onSuccess: () => {
            // After connect, switch to Base
            try { switchChain({ chainId: base.id }); } catch { /* may already be on Base */ }
          },
        },
      );
    }
  }

  function handleEnterGame() {
    // enterGame() — ERC-8021 builder code suffix attached via the hook
    send('enterGame');
  }

  return (
    <div className="overlay">
      <div className="panel">
        <h1>BASE GALAXY</h1>
        <h2>✦ CONNECT WALLET ✦</h2>

        {!isConnected ? (
          <>
            <p>Connect your wallet on Base network to start playing.</p>
            <p className="small">
              Coinbase Smart Wallet uses passkeys — no extension needed.<br />
              MetaMask requires the browser extension.
            </p>

            {connectors.map((c) => (
              <button
                key={c.id}
                onClick={() => handleConnect(c.id)}
                disabled={isConnecting}
              >
                {isConnecting ? '⏳ Connecting...' : `🔗 ${c.name}`}
              </button>
            ))}

            {onViewLeaderboard && (
              <button className="alt" onClick={onViewLeaderboard}>
                🏆 LEADERBOARD
              </button>
            )}
          </>
        ) : (
          <>
            <div className="wallet-status">
              <span className="dot connected" />
              <span>Connected</span>
            </div>
            <p className="address">{address}</p>
            <p className="small">
              Connected via {connector?.name}
            </p>

            {!id && !isPending && !isError && (
              <>
                <p>Click below to enter the game. You&apos;ll pay a small gas fee on Base.</p>
                <button className="warn" onClick={handleEnterGame}>
                  🚀 ENTER GAME &amp; PLAY
                </button>
                <button className="alt" onClick={() => disconnect()}>
                  DISCONNECT
                </button>
              </>
            )}

            {isPending && (
              <div className="tx-status">
                ⏳ Transaction pending... Confirm in your wallet.
                {id && (
                  <p className="small">
                    Call ID: <code>{String(id).slice(0, 18)}…</code>
                  </p>
                )}
              </div>
            )}

            {isSuccess && (
              <div className="tx-status" style={{ borderColor: '#00ff7f' }}>
                ✅ Game entry confirmed! Starting...
              </div>
            )}

            {isError && (
              <div className="tx-status" style={{ borderColor: 'var(--danger)' }}>
                ⚠ Transaction failed. Try again.
                <br />
                <button className="alt" onClick={handleEnterGame} style={{ marginTop: 8, maxWidth: 200 }}>
                  RETRY
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
