/**
 * HUD overlay showing SCORE, WAVE, and LIVES.
 * Shown during gameplay, hidden otherwise.
 */
export default function HUD({ score = 0, wave = 1, lives = 3, visible = true }) {
  if (!visible) return null;
  return (
    <div className="hud">
      <div className="hud-block">
        <span className="label">SCORE</span>
        <span className="val">{score}</span>
      </div>
      <div className="hud-block" style={{ textAlign: 'center' }}>
        <span className="label">WAVE</span>
        <span className="val">{wave}</span>
      </div>
      <div className="hud-block" style={{ textAlign: 'right' }}>
        <span className="label">LIVES</span>
        <span className="val">{lives}</span>
      </div>
    </div>
  );
}
