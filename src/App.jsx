import { useState, useCallback, useEffect } from 'react';
import WalletGate from './components/WalletGate.jsx';
import GameCanvas from './components/GameCanvas.jsx';
import HUD from './components/HUD.jsx';
import PauseOverlay from './components/PauseOverlay.jsx';
import GameOverOverlay from './components/GameOverOverlay.jsx';
import Leaderboard from './components/Leaderboard.jsx';

/**
 * Game phases:
 *  'wallet' — show WalletGate (must connect + enterGame before playing)
 *  'playing' — game is active
 *  'paused' — game is paused
 *  'over' — game over screen
 *  'leaderboard' — leaderboard overlay (on top of wallet or over)
 */
export default function App() {
  const [phase, setPhase] = useState('wallet'); // start at wallet gate
  const [hud, setHud] = useState({ score: 0, wave: 1, lives: 3 });
  const [finalScore, setFinalScore] = useState(0);
  const [finalWave, setFinalWave] = useState(1);
  const [showLB, setShowLB] = useState(false);
  const [_priorPhase, setPriorPhase] = useState('wallet');

  // Called when wallet gate confirms enterGame tx
  const handleWalletReady = useCallback(() => {
    setPhase('playing');
  }, []);

  // Game engine HUD updates
  const handleScoreChange = useCallback((score, wave, lives) => {
    setHud({ score, wave, lives });
  }, []);

  // Game over callback
  const handleGameOver = useCallback((score, wave) => {
    setFinalScore(score);
    setFinalWave(wave);
    setPhase('over');
  }, []);

  // Pause / resume
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') {
        if (showLB) { setShowLB(false); e.preventDefault(); return; }
        if (phase === 'playing') { setPhase('paused'); e.preventDefault(); return; }
        if (phase === 'paused') { setPhase('playing'); e.preventDefault(); return; }
      }
      if (e.key === 'p' || e.key === 'P') {
        if (phase === 'playing') setPhase('paused');
        else if (phase === 'paused') setPhase('playing');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, showLB]);

  // Play again (from game over or wallet screen)
  const handlePlayAgain = useCallback(() => {
    setPhase('playing');
  }, []);

  // Quit to wallet gate
  const handleQuit = useCallback(() => {
    setPhase('wallet');
  }, []);

  // Leaderboard open/close
  const handleOpenLB = useCallback(() => {
    setPriorPhase(phase);
    setShowLB(true);
  }, [phase]);

  const handleCloseLB = useCallback(() => {
    setShowLB(false);
  }, []);

  const isPlaying = phase === 'playing';

  return (
    <>
      {/* Game canvas — always mounted, engine starts/stops based on phase */}
      <GameCanvas
        playing={isPlaying}
        onScoreChange={handleScoreChange}
        onGameOver={handleGameOver}
      />

      {/* HUD — visible during play */}
      <HUD
        score={hud.score}
        wave={hud.wave}
        lives={hud.lives}
        visible={isPlaying}
      />

      {/* Overlays — mutually exclusive by phase */}
      {phase === 'wallet' && (
        <WalletGate onReady={handleWalletReady} onViewLeaderboard={handleOpenLB} />
      )}
      {phase === 'paused' && (
        <PauseOverlay
          onResume={() => setPhase('playing')}
          onQuit={handleQuit}
        />
      )}
      {phase === 'over' && (
        <GameOverOverlay
          score={finalScore}
          wave={finalWave}
          onPlayAgain={handlePlayAgain}
          onQuit={handleQuit}
        />
      )}

      {/* Leaderboard — can overlay on top of wallet or over screens */}
      {showLB && <Leaderboard onClose={handleCloseLB} />}
    </>
  );
}
