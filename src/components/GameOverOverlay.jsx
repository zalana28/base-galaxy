import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { LEADERBOARD_ADDRESS } from '../config/wagmi.js';
import { base } from '../config/chain.js';
import LEADERBOARD_ABI from '../abi/Leaderboard.json';
import { useMiniApp } from '../hooks/useMiniApp.js';
import { saveLocalScore } from '../lib/onchain.js';

/**
 * Game Over overlay — shows final score, submit onchain, share, and play again.
 */
export default function GameOverOverlay({ score = 0, wave = 1, onPlayAgain, onQuit }) {
  const [status, setStatus] = useState('');
  const { address } = useAccount();
  const { composeCast } = useMiniApp();

  // Submit score onchain
  const {
    writeContract: submitScore,
    data: txHash,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleSubmit = useCallback(() => {
    if (!address) { setStatus('⚠ No wallet connected'); return; }
    setStatus('Submitting score...');
    submitScore({
      address: LEADERBOARD_ADDRESS,
      abi: LEADERBOARD_ABI,
      functionName: 'submitScore',
      args: [BigInt(score)],
      chainId: base.id,
    });
  }, [address, score, submitScore]);

  // React to tx states inside an effect to avoid setState-during-render warnings.
  useEffect(() => {
    if (writeError) setStatus('⚠ ' + (writeError.shortMessage || writeError.message));
    else if (isConfirmed) setStatus('✅ Score submitted onchain!');
    else if (isConfirming) setStatus('⏳ Waiting for confirmation...');
    else if (isWriting) setStatus('⏳ Transaction pending...');
  }, [isWriting, isConfirming, isConfirmed, writeError]);

  // Save locally on mount
  useEffect(() => {
    saveLocalScore('Player', score);
  }, [score]);

  // Share
  async function handleShare() {
    const text = `🚀 I scored ${score} in Base Star Raider on wave ${wave}! Can you beat me?`;
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
        <button onClick={handleSubmit} disabled={isWriting || isConfirming}>
          🔗 SUBMIT ONCHAIN
        </button>
        <button className="alt" onClick={handleShare}>📢 SHARE</button>
        <button onClick={onPlayAgain}>🔄 PLAY AGAIN</button>
        <button className="alt" onClick={onQuit}>🏠 QUIT</button>
      </div>
    </div>
  );
}
