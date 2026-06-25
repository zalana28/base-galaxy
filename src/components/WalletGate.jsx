import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { LEADERBOARD_ADDRESS } from '../config/wagmi.js';
import { base } from '../config/chain.js';
import LEADERBOARD_ABI from '../abi/Leaderboard.json';
import { useBuilderCodeTransaction } from '../hooks/useBuilderCodeTransaction.js';

// Emoji map for known wallet connectors (fallback to generic )
const CONNECTOR_ICONS = {
  baseAccount: '🔵',
  coinbaseWallet: '🔵',
  metaMask: '🦊',
  injected: '🌐',
  walletConnect: '🔷',
  rabby: '🐰',
  okxWallet: '🟢',
  phantom: '👻',
  braveWallet: '🦁',
  tronLink: '🔴',
};

function getConnectorIcon(name, id) {
  const lowerId = id.toLowerCase();
  if (CONNECTOR_ICONS[id]) return CONNECTOR_ICONS[id];
  if (lowerId.includes('coinbase') || lowerId.includes('baseaccount')) return '🔵';
  if (lowerId.includes('metamask')) return '🦊';
  if (lowerId.includes('rabby')) return '🐰';
  if (lowerId.includes('okx')) return '🟢';
  if (lowerId.includes('phantom')) return '👻';
  if (lowerId.includes('brave')) return '🦁';
  if (lowerId.includes('tron')) return '🔴';
  if (lowerId.includes('injected')) return '🌐';
  if (lowerId.includes('walletconnect')) return '🔷';
  return '🔗';
}

export default function WalletGate({ onReady, onViewLeaderboard }) {
  const [showModal, setShowModal] = useState(false);

  const { address, isConnected, connector } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const { send, status, hash, error } = useBuilderCodeTransaction({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    chainId: base.id,
  });

  const isPending = status === 'pending';
  const isConfirming = status === 'confirming';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  useEffect(() => {
    if (isSuccess) onReady();
  }, [isSuccess, onReady]);

  async function handleConnect(connectorId) {
    const c = connectors.find((c) => c.id === connectorId);
    if (!c) return;
    try {
      await connectAsync({ connector: c });
      try {
        await switchChainAsync({ chainId: base.id });
      } catch {
        // may already be on Base
      }
      setShowModal(false);
    } catch {
      // Connection cancelled or failed
    }
  }

  function handleEnterGame() {
    send('enterGame');
  }

  const shortAddress = address
    ? address.slice(0, 6) + '...' + address.slice(-4)
    : '';

  return (
    <>
      {showModal && (
        <div
          className="wallet-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Select wallet"
        >
          <div className="wallet-modal">
            <h3>🚀 CONNECT WALLET</h3>
            {connectors.map((c) => (
              <button
                key={c.id}
                className="connector-btn"
                onClick={() => handleConnect(c.id)}
                disabled={isConnecting}
              >
                <span className="connector-icon">
                  {getConnectorIcon(c.name, c.id)}
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {isConnecting ? '⏳ Connecting...' : c.name}
                </span>
              </button>
            ))}
            <button className="close-btn" onClick={() => setShowModal(false)}>
              CLOSE
            </button>
          </div>
        </div>
      )}

      <div className="overlay">
        <div className="panel">
          <div className="hero-mascot">🚀</div>
          <div className="hero-title">BASE GALAXY</div>
          <div className="hero-subtitle">ON BASE NETWORK</div>

          {!isConnected ? (
            <>
              <div className="blink" style={{ margin: '14px 0' }}>
                — TAP TO START —
              </div>

              <button
                className="primary"
                onClick={() => setShowModal(true)}
                disabled={isConnecting}
              >
                {isConnecting ? '⏳ CONNECTING...' : 'CONNECT WALLET'}
              </button>

              {onViewLeaderboard && (
                <button className="secondary" onClick={onViewLeaderboard}>
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
              <p className="address">{shortAddress}</p>
              <p className="small">via {connector?.name}</p>

              {!hash && !isPending && !isConfirming && !isError && (
                <>
                  <p style={{ marginTop: 12 }}>
                    Ready to launch? Pay a small gas fee on Base to start.
                  </p>
                  <button className="warn" onClick={handleEnterGame}>
                    🚀 ENTER GAME & PLAY
                  </button>
                  <button className="secondary" onClick={() => disconnect()}>
                    DISCONNECT
                  </button>
                </>
              )}

              {isPending && (
                <div className="tx-status">
                  ⏳ Transaction pending... Confirm in your wallet.
                </div>
              )}

              {isConfirming && (
                <div className="tx-status">
                  ⏳ Waiting for confirmation...
                  {hash && (
                    <p className="small" style={{ marginTop: 6 }}>
                      TX:{""}
                      <a
                        href={'https://basescan.org/tx/' + hash}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--base-bright)', marginLeft: 4 }}
                      >
                        {hash.slice(0, 10)}...
                      </a>
                    </p>
                  )}
                </div>
              )}

              {isSuccess && (
                <div
                  className="tx-status"
                  style={{ borderColor: 'var(--frog)' }}
                >
                  ✅ Game entry confirmed! Starting...
                </div>
              )}

              {isError && (
                <div
                  className="tx-status"
                  style={{ borderColor: 'var(--danger)' }}
                >
                  ⚠{""}
                  {error?.shortMessage ||
                    error?.message ||
                    'Transaction failed. Try again.'}
                  <br />
                  <button
                    className="secondary"
                    onClick={handleEnterGame}
                    style={{ marginTop: 8, maxWidth: 200 }}
                  >
                    RETRY
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}