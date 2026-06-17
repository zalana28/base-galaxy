import { useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { LEADERBOARD_ADDRESS } from '../config/wagmi.js';
import { base } from '../config/chain.js';
import LEADERBOARD_ABI from '../abi/Leaderboard.json';
import { loadLocalLB, escapeHtml } from '../lib/onchain.js';

/**
 * Leaderboard overlay — shows local scores and optionally onchain scores.
 */
export default function Leaderboard({ onClose }) {
  // Onchain leaderboard read (may fail if contract not deployed yet)
  const { data: recentEntries } = useReadContract({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: 'getRecent',
    chainId: base.id,
    query: {
      staleTime: 60_000, // 1 min cache
    },
  });

  // Local leaderboard
  const localLB = useMemo(() => loadLocalLB(), []);

  // Combine: prefer onchain, fallback to local
  const entries = useMemo(() => {
    if (recentEntries && Array.isArray(recentEntries)) {
      const valid = recentEntries.filter((e) => e.player !== '0x0000000000000000000000000000000000000000' && e.score > 0n);
      return valid.map((e) => ({
        name: e.player.slice(0, 8) + '...',
        score: Number(e.score),
      })).sort((a, b) => b.score - a.score);
    }
    return localLB;
  }, [recentEntries, localLB]);

  const source = recentEntries ? 'Onchain + Local' : 'Local scores';

  return (
    <div className="overlay" data-overlay>
      <div className="panel" role="dialog" aria-modal="true">
        <h1>LEADERBOARD</h1>
        <h2>TOP PILOTS</h2>
        <ol className="leaderboard" id="lbList">
          {entries.length === 0 ? (
            <li className="small">No scores yet — be the first!</li>
          ) : (
            entries.slice(0, 10).map((row, i) => (
              <li key={i}>
                <span>
                  <span className="rank">#{i + 1}</span>{' '}
                  {escapeHtml(row.name)}
                </span>
                <span className="score">{row.score}</span>
              </li>
            ))
          )}
        </ol>
        <p className="small" id="lbSource">{source}</p>
        <button onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}
