// Base Galaxy — Game Engine
// Extracted from game.js into a self-contained module.
// Call `createEngine(canvas, callbacks)` to get an engine instance.

import {
  SHIP, SHIP_PALETTE,
  ENEMY_A, ENEMY_A_PAL,
  ENEMY_B, ENEMY_B_PAL,
  ENEMY_C, ENEMY_C_PAL,
  BOSS, BOSS_PAL,
  PU_PAL, PU_WEAPON, PU_RAPID, PU_SHIELD, PU_LIFE,
} from './sprites.js';
import { beep } from './audio.js';

// ---- Constants ----
const W = 360; // logical canvas width
const H = 640; // logical canvas height
const STATE = { MENU: 0, PLAY: 1, PAUSE: 2, OVER: 3 };

// ---- Sprite rendering helpers ----
function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

function drawSprite(ctx, grid, palette, cx, cy, scale = 2) {
  const rows = grid.length;
  const cols = grid[0].length;
  const ox = cx - (cols * scale) / 2;
  const oy = cy - (rows * scale) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v === 0) continue;
      px(ctx, ox + c * scale, oy + r * scale, scale, scale, palette[v]);
    }
  }
}

// ---- Factory ----

/**
 * Create a game engine attached to the given canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {object} cb  Callbacks:
 *   - onScoreChange(score, wave, lives)
 *   - onGameOver(score, wave)
 */
export function createEngine(canvas, cb = {}) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let state = STATE.MENU;
  let animFrameId = null;
  let shake = 0;

  // Player
  const player = {
    x: W / 2, y: H - 70, w: 18, h: 18,
    speed: 2.4, alive: true, blink: 0,
    weapon: 0, rapid: 0, shield: 0, fireCooldown: 0,
  };

  // Entities
  let bullets = [];
  let enemies = [];
  let eBullets = [];
  let particles = [];
  let powerups = [];
  let stars = [];
  let score = 0;
  let wave = 1;
  let lives = 3;
  let waveTimer = 0;
  let spawnCooldown = 0;
  let enemiesToSpawn = 0;

  // Input
  const keys = { left: false, right: false, fire: false };

  // Init starfield
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      s: Math.random() * 2 + 0.3,
      c: Math.random() < 0.15 ? '#ff4fd8' : (Math.random() < 0.3 ? '#00e0ff' : '#ffffff'),
    });
  }

  // ---- Particles ----
  function spawnExplosion(x, y, color, count = 14) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 25 + Math.random() * 15,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  // ---- Enemy spawning ----
  function startWave(n) {
    wave = n;
    if (n % 5 === 0) {
      enemies.push({
        x: W / 2, y: -60, w: 60, h: 32,
        type: 'boss', hp: 30 + n * 4, vx: 1.5, vy: 0,
        shootCd: 60, pattern: 0, score: 500 + n * 50,
      });
      enemiesToSpawn = 0;
    } else {
      enemiesToSpawn = 6 + n * 2;
    }
    spawnCooldown = 30;
    waveTimer = 0;
    notifyHUD();
  }

  function spawnEnemy() {
    const types = ['a', 'b', 'c'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = 30 + Math.random() * (W - 60);
    const e = { x, y: -20, w: 18, h: 14, type, hp: 1, vx: 0, vy: 1, shootCd: 60 + Math.random() * 60, score: 50 };
    if (type === 'a') { e.hp = 1; e.vy = 1.0 + wave * 0.05; e.score = 50; }
    if (type === 'b') { e.hp = 2; e.vy = 0.7 + wave * 0.05; e.score = 80; e.vx = (Math.random() < 0.5 ? -1 : 1) * 0.5; }
    if (type === 'c') { e.hp = 3; e.vy = 0.6 + wave * 0.05; e.score = 120; e.zig = Math.random() * Math.PI * 2; }
    enemies.push(e);
  }

  // ---- Shooting ----
  function playerShoot() {
    const cd = player.rapid > 0 ? 6 : 14;
    if (player.fireCooldown > 0) return;
    player.fireCooldown = cd;
    const y = player.y - 14;
    if (player.weapon === 0) {
      bullets.push({ x: player.x, y, vx: 0, vy: -7, dmg: 1, color: '#00e0ff' });
    } else if (player.weapon === 1) {
      bullets.push({ x: player.x - 6, y, vx: 0, vy: -7, dmg: 1, color: '#00e0ff' });
      bullets.push({ x: player.x + 6, y, vx: 0, vy: -7, dmg: 1, color: '#00e0ff' });
    } else if (player.weapon === 2) {
      bullets.push({ x: player.x, y, vx: 0, vy: -7, dmg: 2, color: '#ff4fd8' });
      bullets.push({ x: player.x - 8, y, vx: 0, vy: -7, dmg: 1, color: '#00e0ff' });
      bullets.push({ x: player.x + 8, y, vx: 0, vy: -7, dmg: 1, color: '#00e0ff' });
    } else {
      for (let a = -2; a <= 2; a++) {
        bullets.push({ x: player.x, y, vx: a * 1.2, vy: -7, dmg: 1, color: '#ffd400' });
      }
    }
    beep(880, 0.04, 'square', 0.05);
  }

  function enemyShoot(e, vx = 0, vy = 3, color = '#ff3860') {
    eBullets.push({ x: e.x, y: e.y + 10, vx, vy, color });
  }

  // ---- Powerups ----
  function spawnPowerup(x, y) {
    const kinds = ['weapon', 'rapid', 'shield', 'life'];
    const weights = [0.45, 0.25, 0.2, 0.1];
    let r = Math.random(), acc = 0, k = 'weapon';
    for (let i = 0; i < kinds.length; i++) { acc += weights[i]; if (r < acc) { k = kinds[i]; break; } }
    powerups.push({ x, y, kind: k, t: 0 });
  }

  function applyPowerup(kind) {
    beep(1200, 0.12, 'sine', 0.1);
    if (kind === 'weapon') player.weapon = Math.min(3, player.weapon + 1);
    if (kind === 'rapid') player.rapid = 360;
    if (kind === 'shield') player.shield = 360;
    if (kind === 'life') { lives = Math.min(5, lives + 1); }
    score += 25;
    notifyHUD();
  }

  function notifyHUD() {
    cb.onScoreChange?.(score, wave, lives);
  }

  // ---- Damage ----
  function damagePlayer() {
    if (player.shield > 0 || player.blink > 0) return;
    lives--;
    notifyHUD();
    spawnExplosion(player.x, player.y, '#00e0ff', 20);
    beep(80, 0.3, 'sawtooth', 0.15);
    shake = 10;
    player.blink = 90;
    player.shield = 90;
    player.weapon = Math.max(0, player.weapon - 1);
    if (lives <= 0) {
      player.alive = false;
      setTimeout(() => {
        state = STATE.OVER;
        cb.onGameOver?.(score, wave);
      }, 600);
    }
  }

  // ---- Update ----
  function update() {
    if (state !== STATE.PLAY) return;

    // Stars
    for (const s of stars) {
      s.y += s.s * 0.6;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    }

    // Player movement
    if (keys.left) player.x -= player.speed;
    if (keys.right) player.x += player.speed;
    player.x = Math.max(12, Math.min(W - 12, player.x));
    if (keys.fire) playerShoot();
    if (player.fireCooldown > 0) player.fireCooldown--;
    if (player.rapid > 0) player.rapid--;
    if (player.shield > 0) player.shield--;
    if (player.blink > 0) player.blink--;

    // Spawn enemies
    if (enemiesToSpawn > 0) {
      spawnCooldown--;
      if (spawnCooldown <= 0) {
        spawnEnemy();
        enemiesToSpawn--;
        spawnCooldown = 25 + Math.random() * 40;
      }
    }

    // Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx; b.y += b.vy;
      if (b.y < -10 || b.x < -10 || b.x > W + 10) bullets.splice(i, 1);
    }

    // Enemy bullets
    for (let i = eBullets.length - 1; i >= 0; i--) {
      const b = eBullets[i];
      b.x += b.vx; b.y += b.vy;
      if (b.y > H + 10 || b.x < -10 || b.x > W + 10) { eBullets.splice(i, 1); continue; }
      if (player.alive && Math.abs(b.x - player.x) < 10 && Math.abs(b.y - player.y) < 10) {
        eBullets.splice(i, 1);
        damagePlayer();
      }
    }

    // Enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.type === 'boss') {
        e.y += e.vy;
        if (e.y < 60) e.y += 0.5;
        else { e.x += e.vx; if (e.x < 40 || e.x > W - 40) e.vx *= -1; }
        e.shootCd--;
        if (e.shootCd <= 0) {
          enemyShoot(e, -1.5, 3, '#ffd400');
          enemyShoot(e, 0, 3, '#ffd400');
          enemyShoot(e, 1.5, 3, '#ffd400');
          e.shootCd = 50;
        }
      } else if (e.type === 'c') {
        e.zig += 0.08;
        e.x += Math.sin(e.zig) * 1.4;
        e.y += e.vy;
        e.shootCd--;
        if (e.shootCd <= 0) { enemyShoot(e); e.shootCd = 80 + Math.random() * 80; }
      } else {
        e.x += e.vx; e.y += e.vy;
        if (e.x < 20 || e.x > W - 20) e.vx *= -1;
        e.shootCd--;
        if (e.shootCd <= 0 && Math.random() < 0.5) { enemyShoot(e); e.shootCd = 100 + Math.random() * 100; }
      }

      // Bullet vs enemy
      for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        const hitR = e.type === 'boss' ? 28 : 12;
        if (Math.abs(b.x - e.x) < hitR && Math.abs(b.y - e.y) < hitR) {
          e.hp -= b.dmg;
          bullets.splice(j, 1);
          spawnExplosion(b.x, b.y, '#ffffff', 4);
          if (e.hp <= 0) {
            score += e.score;
            notifyHUD();
            spawnExplosion(e.x, e.y, e.type === 'boss' ? '#ffd400' : '#ff4fd8', e.type === 'boss' ? 40 : 14);
            beep(e.type === 'boss' ? 120 : 240, 0.18, 'sawtooth', 0.12);
            const dropChance = e.type === 'boss' ? 1.0 : 0.12;
            if (Math.random() < dropChance) spawnPowerup(e.x, e.y);
            enemies.splice(i, 1);
            shake = e.type === 'boss' ? 12 : 4;
            break;
          }
        }
      }

      // Enemy vs player collide
      if (player.alive && Math.abs(e.x - player.x) < 14 && Math.abs(e.y - player.y) < 14) {
        spawnExplosion(e.x, e.y, '#ff4fd8', 12);
        if (e.type !== 'boss') enemies.splice(i, 1);
        damagePlayer();
      } else if (e.y > H + 20) {
        enemies.splice(i, 1);
      }
    }

    // Powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.y += 1.2;
      p.t += 0.15;
      if (Math.abs(p.x - player.x) < 14 && Math.abs(p.y - player.y) < 14) {
        applyPowerup(p.kind);
        powerups.splice(i, 1);
        continue;
      }
      if (p.y > H + 10) powerups.splice(i, 1);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vx *= 0.95; p.vy *= 0.95;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Next wave?
    if (enemies.length === 0 && enemiesToSpawn === 0) {
      waveTimer++;
      if (waveTimer > 60) startWave(wave + 1);
    }

    if (shake > 0) shake--;
  }

  // ---- Render ----
  function render() {
    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;

    ctx.fillStyle = '#050010';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(sx, sy);

    // Stars
    for (const s of stars) {
      ctx.fillStyle = s.c;
      ctx.fillRect(s.x | 0, s.y | 0, s.s | 0 || 1, s.s | 0 || 1);
    }

    // Player (blink when invuln)
    if (player.alive && (player.blink === 0 || (player.blink % 8) < 4)) {
      drawSprite(ctx, SHIP, SHIP_PALETTE, player.x, player.y, 2);
      if (player.shield > 0) {
        ctx.strokeStyle = 'rgba(0,255,127,' + (0.4 + 0.3 * Math.sin(Date.now() / 80)) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Bullets
    for (const b of bullets) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - 1, b.y - 4, 2, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - 0.5, b.y - 2, 1, 4);
    }
    for (const b of eBullets) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Enemies
    for (const e of enemies) {
      if (e.type === 'boss') drawSprite(ctx, BOSS, BOSS_PAL, e.x, e.y, 3);
      else if (e.type === 'a') drawSprite(ctx, ENEMY_A, ENEMY_A_PAL, e.x, e.y, 2);
      else if (e.type === 'b') drawSprite(ctx, ENEMY_B, ENEMY_B_PAL, e.x, e.y, 2);
      else if (e.type === 'c') drawSprite(ctx, ENEMY_C, ENEMY_C_PAL, e.x, e.y, 2);
      // boss HP bar
      if (e.type === 'boss') {
        const maxHp = 30 + wave * 4;
        const w = 80;
        ctx.fillStyle = '#220011';
        ctx.fillRect(e.x - w / 2, e.y - 28, w, 4);
        ctx.fillStyle = '#ff3860';
        ctx.fillRect(e.x - w / 2, e.y - 28, w * (e.hp / maxHp), 4);
      }
    }

    // Powerups
    for (const p of powerups) {
      const bob = Math.sin(p.t) * 1.5;
      const grid = p.kind === 'weapon' ? PU_WEAPON :
                   p.kind === 'rapid' ? PU_RAPID :
                   p.kind === 'shield' ? PU_SHIELD : PU_LIFE;
      drawSprite(ctx, grid, PU_PAL, p.x, p.y + bob, 2);
    }

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / 40);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // ---- Loop ----
  function loop() {
    update();
    render();
    animFrameId = requestAnimationFrame(loop);
  }

  function resetGame() {
    player.x = W / 2;
    player.y = H - 70;
    player.weapon = 0;
    player.rapid = 0;
    player.shield = 180; // start with brief shield
    player.blink = 0;
    player.alive = true;
    bullets = [];
    enemies = [];
    eBullets = [];
    particles = [];
    powerups = [];
    score = 0;
    lives = 3;
    wave = 0;
    notifyHUD();
    startWave(1);
  }

  // ---- Public API ----
  return {
    W,
    H,

    /** Start / resume the game loop and begin a new session */
    start() {
      state = STATE.PLAY;
      resetGame();
      if (!animFrameId) loop();
    },

    /** Pause the game */
    pause() {
      if (state === STATE.PLAY) state = STATE.PAUSE;
    },

    /** Resume from pause */
    resume() {
      if (state === STATE.PAUSE) state = STATE.PLAY;
    },

    /** Stop the loop and reset to menu state */
    stop() {
      state = STATE.MENU;
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    },

    /** @returns {boolean} true if the engine is currently in PLAY state */
    isPlaying() {
      return state === STATE.PLAY;
    },

    /** @returns {boolean} true if game is over */
    isGameOver() {
      return state === STATE.OVER;
    },

    // Keyboard input bindings
    keyDown(e) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') keys.fire = true;
    },

    keyUp(e) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') keys.fire = false;
    },

    // Touch helpers
    touchLeft(on)  { keys.left = on; },
    touchRight(on) { keys.right = on; },
    touchFire(on)  { keys.fire = on; },

    /** Get current score */
    getScore() { return score; },
    /** Get current wave */
    getWave() { return wave; },
    /** Get current lives */
    getLives() { return lives; },
  };
}
