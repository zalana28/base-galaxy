import { useState, useCallback, useEffect } from 'react';
import { LEADERBOARD_ADDRESS } from '../config/wagmi.js';
import { base } from '../config/chain.js';
import LEADERBOARD_ABI from '../abi/Leaderboard.json';
import { useBuilderCodeTransaction } from '../hooks/useBuilderCodeTransaction.js';
import { useMiniApp } from '../hooks/useMiniApp.js';
import { saveLocalScore } from '../lib/onchain.js';

/**
 * Game Over overlay — shows final score, submit onchain, share, and play again.
 *
 * Score submission goes through `useBuilderCodeTransaction` (ERC-5792
 * `wallet_sendCalls`) so the ERC-8021 builder code suffix is attached for both
 * the Smart Wallet (capability) and EOA (per-call dataSuffix) paths.
 */
export default function GameOverOverlay({ score = 0, wave = 1, onPlayAgain, onQuit }) {
  const [status, setStatus] = useState('');
  const { composeCast } = useMiniApp();

  const { send, status: txStatus, error } = useBuilderCodeTransaction({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    chainId: base.id,
  });

  const handleSubmit = useCallback(() => {
    setStatus('Submitting score...');
    // submitScore(uint256) — builder code suffix attached via the hook
    send('submitScore', [BigInt(score)]);
  }, [score, send]);

  // React to tx states inside an effect to avoid setState-during-render warnings.
  useEffect(() => {
    if (txStatus === 'error') {
      const msg = error?.shortMessage || error?.message || 'Transaction failed. Try again.';
      setStatus('⚠ ' + msg);
    } else if (txStatus === 'success') setStatus('✅ Score submitted onchain!');
    else if (txStatus === 'pending') setStatus('⏳ Transaction pending...');
  }, [txStatus, error]);

  // Save locally on mount
  useEffect(() => {
    saveLocalScore('Player', score);
  }, [score]);

  // Share
  async function handleShare() {
    const text = `🚀 I scored ${score} in Base Galaxy on wave ${wave}! Can you beat me?`;
    try {
      await composeCast(text, [window.location.href]);
    } catch {
      setStatus('Copied to clipboard!');
    }
  }

  return (
    <div className="overlay" data-overlay>
      <div className="panel" role="dialog" aria-modal="true">
        <h1>GAME OVER</h1>
        <h2>SCORE: {score}</h2>
        <p id="submitStatus" className="small">{status}</p>
        <button onClick={handleSubmit} disabled={txStatus === 'pending'}>
          🔗 SUBMIT ONCHAIN
        </button>
        <button className="alt" onClick={handleShare}>📢 SHARE</button>
        <button onClick={onPlayAgain}>🔄 PLAY AGAIN</button>
        <button className="alt" onClick={onQuit}>🏠 QUIT</button>
      </div>
    </div>
  );
}
