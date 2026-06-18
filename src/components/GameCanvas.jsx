import { useRef, useEffect, useCallback, useState } from 'react';
import { createEngine } from '../lib/engine.js';

/**
 * GameCanvas — mounts the canvas and initializes the game engine.
 *
 * Props:
 *   playing  {boolean} — true when the game should be running
 *   onScoreChange(score, wave, lives)
 *   onGameOver(score, wave)
 */
export default function GameCanvas({ playing, onScoreChange, onGameOver }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const [, setHud] = useState({ score: 0, wave: 1, lives: 3 });

  // Create engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;
    engineRef.current = createEngine(canvas, {
      onScoreChange: (score, wave, lives) => {
        setHud({ score, wave, lives });
        onScoreChange?.(score, wave, lives);
      },
      onGameOver: (score, wave) => {
        onGameOver?.(score, wave);
      },
    });

    // Resize handler — on touch devices, leave room at the bottom for controls.
    function resize() {
      const ratio = 360 / 640;
      const isTouchDevice = 'ontouchstart' in window;
      const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      // On touch devices, reserve 96px at bottom for control buttons + safe area.
      const controlSpace = isTouchDevice ? 96 : 0;
      const effectiveVh = vh - controlSpace;
      const winRatio = vw / effectiveVh;
      let cw, ch;
      if (winRatio > ratio) { ch = effectiveVh; cw = ch * ratio; }
      else { cw = vw; ch = cw / ratio; }
      canvas.style.width = Math.floor(cw) + 'px';
      canvas.style.height = Math.floor(ch) + 'px';
    }
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', resize);
      engineRef.current?.stop();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start/stop engine based on `playing` prop
  useEffect(() => {
    if (playing) {
      engineRef.current?.start();
    } else {
      engineRef.current?.stop();
    }
  }, [playing]);

  // Keyboard input
  useEffect(() => {
    const onKD = (e) => {
      engineRef.current?.keyDown(e);
    };
    const onKU = (e) => {
      engineRef.current?.keyUp(e);
    };
    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup', onKU);
    return () => {
      window.removeEventListener('keydown', onKD);
      window.removeEventListener('keyup', onKU);
    };
  }, []);

  // Prevent page scrolling while playing
  useEffect(() => {
    const preventScroll = (e) => e.preventDefault();
    window.addEventListener('touchmove', preventScroll, { passive: false });
    window.addEventListener('wheel', preventScroll, { passive: false });
    return () => {
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('wheel', preventScroll);
    };
  }, []);

  // Touch control binding helpers
  const bindTouch = useCallback((id, onDown, onUp) => {
    const el = document.getElementById(id);
    if (!el) return () => {};
    const press = (e) => { e.preventDefault(); onDown(); };
    const release = (e) => { e.preventDefault(); onUp(); };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release);
    el.addEventListener('touchcancel', release);
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);
    return () => {
      el.removeEventListener('touchstart', press);
      el.removeEventListener('touchend', release);
      el.removeEventListener('touchcancel', release);
      el.removeEventListener('mousedown', press);
      el.removeEventListener('mouseup', release);
      el.removeEventListener('mouseleave', release);
    };
  }, []);

  // Bind touch controls
  useEffect(() => {
    if (!playing) return;
    const unbindL = bindTouch('btnLeft', () => engineRef.current?.touchLeft(true), () => engineRef.current?.touchLeft(false));
    const unbindR = bindTouch('btnRight', () => engineRef.current?.touchRight(true), () => engineRef.current?.touchRight(false));
    const unbindF = bindTouch('btnFire', () => engineRef.current?.touchFire(true), () => engineRef.current?.touchFire(false));
    return () => { unbindL(); unbindR(); unbindF(); };
  }, [playing, bindTouch]);

  // Expose engine control for debugging via window
  useEffect(() => {
    window.__gameEngine = engineRef.current;
    return () => { delete window.__gameEngine; };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} id="game" width={360} height={640} />

      {/* Touch controls for mobile */}
      <div className={`touch-ctrl left ${playing && ('ontouchstart' in window) ? '' : 'hidden'}`} id="touchLeft">
        <div className="tbtn" id="btnLeft">◀</div>
        <div className="tbtn" id="btnRight">▶</div>
      </div>
      <div className={`touch-ctrl right ${playing && ('ontouchstart' in window) ? '' : 'hidden'}`} id="touchRight">
        <div className="tbtn" id="btnFire">●</div>
      </div>
    </>
  );
}
