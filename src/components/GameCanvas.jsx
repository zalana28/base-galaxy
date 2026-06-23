import { useRef, useEffect, useCallback, useState } from 'react';
import { createEngine } from '../lib/engine.js';

const IS_TOUCH = typeof window !== 'undefined' && 'ontouchstart' in window;

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
  const dpadRef = useRef(null);
  const indicatorRef = useRef(null);
  const fireBtnRef = useRef(null);
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

    // Resize handler — canvas fills available space inside #game-wrap.
    function resize() {
      const ratio = 360 / 640;
      const wrap = canvas.parentElement;
      if (!wrap) return;
      const vw = wrap.clientWidth;
      const vh = wrap.clientHeight;
      const winRatio = vw / vh;
      let cw, ch;
      if (winRatio > ratio) { ch = vh; cw = ch * ratio; }
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

  // Prevent page scrolling while playing (only block on canvas / dpad / fire)
  useEffect(() => {
    if (!playing) return;
    const preventScroll = (e) => {
      const t = e.target;
      if (t?.tagName === 'CANVAS' || t?.closest?.('#mobile-controls') || t?.closest?.('.dpad-zone') || t?.closest?.('.fire-btn')) {
        e.preventDefault();
      }
    };
    window.addEventListener('touchmove', preventScroll, { passive: false });
    window.addEventListener('wheel', preventScroll, { passive: false });
    return () => {
      window.removeEventListener('touchmove', preventScroll);
      window.removeEventListener('wheel', preventScroll);
    };
  }, [playing]);

  // Bind D-pad joystick (Bomberman-style touch zone)
  const bindDpad = useCallback(() => {
    const zone = dpadRef.current;
    const indicator = indicatorRef.current;
    if (!zone) return () => {};
    const eng = engineRef.current;

    function applyDir(touch) {
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = touch.clientX - cx;
      const dy = touch.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (indicator) {
        indicator.style.display = 'block';
        const ix = Math.min(Math.max(touch.clientX - rect.left, 14), rect.width - 14);
        const iy = Math.min(Math.max(touch.clientY - rect.top, 14), rect.height - 14);
        indicator.style.left = ix + 'px';
        indicator.style.top = iy + 'px';
      }

      const deadzone = 16;
      eng?.touchLeft(false);
      eng?.touchRight(false);
      // Up/down not used in this game — only left/right movement + fire

      const leftArrow = document.getElementById('gc-da-left');
      const rightArrow = document.getElementById('gc-da-right');
      if (leftArrow) leftArrow.classList.remove('active');
      if (rightArrow) rightArrow.classList.remove('active');

      if (dist >= deadzone) {
        const angle = Math.atan2(dy, dx);
        if (angle > -Math.PI * 3/4 && angle <= -Math.PI * 1/4) {
          // up - no-op for this game
        } else if (angle > Math.PI * 1/4 && angle <= Math.PI * 3/4) {
          // down - no-op for this game
        } else if (angle > -Math.PI * 1/4 && angle <= Math.PI * 1/4) {
          eng?.touchRight(true);
          if (rightArrow) rightArrow.classList.add('active');
        } else {
          eng?.touchLeft(true);
          if (leftArrow) leftArrow.classList.add('active');
        }
      }
    }

    function releaseDir() {
      eng?.touchLeft(false);
      eng?.touchRight(false);
      if (indicator) indicator.style.display = 'none';
      const leftArrow = document.getElementById('gc-da-left');
      const rightArrow = document.getElementById('gc-da-right');
      if (leftArrow) leftArrow.classList.remove('active');
      if (rightArrow) rightArrow.classList.remove('active');
    }

    const onTouchStart = (e) => { e.preventDefault(); applyDir(e.touches[0]); };
    const onTouchMove  = (e) => { e.preventDefault(); applyDir(e.touches[0]); };
    const onTouchEnd   = (e) => { e.preventDefault(); releaseDir(); };
    const onTouchCancel = (e) => { e.preventDefault(); releaseDir(); };

    zone.addEventListener('touchstart', onTouchStart, { passive: false });
    zone.addEventListener('touchmove', onTouchMove, { passive: false });
    zone.addEventListener('touchend', onTouchEnd, { passive: false });
    zone.addEventListener('touchcancel', onTouchCancel, { passive: false });

    let mouseDown = false;
    const onMouseDown = (e) => { mouseDown = true; applyDir(e); };
    const onMouseMove = (e) => { if (mouseDown) applyDir(e); };
    const onMouseUp = () => { mouseDown = false; releaseDir(); };
    const onMouseLeave = () => { if (mouseDown) { mouseDown = false; releaseDir(); } };

    zone.addEventListener('mousedown', onMouseDown);
    zone.addEventListener('mousemove', onMouseMove);
    zone.addEventListener('mouseup', onMouseUp);
    zone.addEventListener('mouseleave', onMouseLeave);

    return () => {
      zone.removeEventListener('touchstart', onTouchStart);
      zone.removeEventListener('touchmove', onTouchMove);
      zone.removeEventListener('touchend', onTouchEnd);
      zone.removeEventListener('touchcancel', onTouchCancel);
      zone.removeEventListener('mousedown', onMouseDown);
      zone.removeEventListener('mousemove', onMouseMove);
      zone.removeEventListener('mouseup', onMouseUp);
      zone.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  // Bind fire button
  const bindFire = useCallback(() => {
    const btn = fireBtnRef.current;
    if (!btn) return () => {};
    const eng = engineRef.current;

    const press = (e) => {
      e.preventDefault();
      eng?.touchFire(true);
      btn.classList.add('pressed');
    };
    const release = (e) => {
      e.preventDefault();
      eng?.touchFire(false);
      btn.classList.remove('pressed');
    };

    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
    return () => {
      btn.removeEventListener('touchstart', press);
      btn.removeEventListener('touchend', release);
      btn.removeEventListener('touchcancel', release);
      btn.removeEventListener('mousedown', press);
      btn.removeEventListener('mouseup', release);
      btn.removeEventListener('mouseleave', release);
    };
  }, []);

  // Hook up controls whenever playing
  useEffect(() => {
    if (!playing) return;
    const unbindD = bindDpad();
    const unbindF = bindFire();
    return () => { unbindD(); unbindF(); };
  }, [playing, bindDpad, bindFire]);

  // Expose engine control for debugging via window
  useEffect(() => {
    window.__gameEngine = engineRef.current;
    return () => { delete window.__gameEngine; };
  }, []);

  const showControls = playing && IS_TOUCH;

  return (
    <div id="game-wrap">
      <canvas ref={canvasRef} id="game" width={360} height={640} />

      {/* Mobile controls — placed BELOW canvas (Bomberman-style) */}
      <div id="mobile-controls" className={showControls ? '' : 'hidden'}>
        {/* Left: D-Pad joystick zone */}
        <div className="dpad-zone" ref={dpadRef}>
          <div className="dpad-h" />
          <div className="dpad-v" />
          <div className="dpad-center" />
          <div className="dpad-arrow" id="gc-da-left">◀</div>
          <div className="dpad-arrow" id="gc-da-right">▶</div>
          <div className="dpad-indicator" ref={indicatorRef} />
        </div>

        <div className="ctrl-spacer" />

        {/* Right: Fire button */}
        <div className="fire-zone">
          <button className="fire-btn" ref={fireBtnRef}>●</button>
          <span className="fire-lbl">FIRE</span>
        </div>
      </div>
    </div>
  );
}
