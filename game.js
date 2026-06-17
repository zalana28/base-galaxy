// Base Star Raider - Retro pixel-art space shooter for Base App / Farcaster Mini Apps
// Single-file vanilla JS using HTML5 Canvas. No build step required.

// -------- Farcaster / Base Mini App SDK (loaded from CDN) --------
let sdk = null;
let miniAppContext = null;
async function initMiniApp() {
  try {
    const mod = await import('https://esm.sh/@farcaster/miniapp-sdk@latest');
    sdk = mod.sdk;
    miniAppContext = await sdk.context;
    // Tell host we're ready (hides splash screen in Base App)
    await sdk.actions.ready();
  } catch (e) {
    console.warn('Mini App SDK not available (running standalone?):', e.message);
  }
}

// -------- Canvas setup --------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const W = canvas.width;   // 360 (logical pixels)
const H = canvas.height;  // 640

// Viewport height that respects mobile browser chrome (address bar).
function viewportH() {
  return window.visualViewport ? window.visualViewport.height : window.innerHeight;
}
function viewportW() {
  return window.visualViewport ? window.visualViewport.width : window.innerWidth;
}

function resize() {
  const ratio = W / H;
  const vw = viewportW();
  const vh = viewportH();
  const winRatio = vw / vh;
  let cw, ch;
  if (winRatio > ratio) {
    ch = vh;
    cw = ch * ratio;
  } else {
    cw = vw;
    ch = cw / ratio;
  }
  canvas.style.width = Math.floor(cw) + 'px';
  canvas.style.height = Math.floor(ch) + 'px';
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();

// Prevent the page from scrolling/bouncing while playing (mobile browsers).
window.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
window.addEventListener('wheel', (e) => { e.preventDefault(); }, { passive: false });

// -------- Input --------
const keys = { left: false, right: false, fire: false };
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') keys.fire = true;
  // Escape closes the Leaderboard modal first; otherwise toggles pause.
  if (e.key === 'Escape') {
    if (isLeaderboardOpen) { closeLeaderboard(); e.preventDefault(); return; }
    togglePause();
    return;
  }
  if (e.key === 'p' || e.key === 'P') togglePause();
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') keys.fire = false;
});

// Touch controls
function bindTouch(id, onDown, onUp) {
  const el = document.getElementById(id);
  const press = (e) => { e.preventDefault(); onDown(); };
  const release = (e) => { e.preventDefault(); onUp(); };
  el.addEventListener('touchstart', press, { passive: false });
  el.addEventListener('touchend', release);
  el.addEventListener('touchcancel', release);
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup', release);
  el.addEventListener('mouseleave', release);
}
bindTouch('btnLeft',  () => keys.left = true,  () => keys.left = false);
bindTouch('btnRight', () => keys.right = true, () => keys.right = false);
bindTouch('btnFire',  () => keys.fire = true,  () => keys.fire = false);

// Show touch controls on touch devices
if ('ontouchstart' in window) {
  document.getElementById('touchLeft').classList.remove('hidden');
  document.getElementById('touchRight').classList.remove('hidden');
}

// -------- Game State --------
const STATE = { MENU: 0, PLAY: 1, PAUSE: 2, OVER: 3 };
let state = STATE.MENU;

const player = {
  x: W / 2, y: H - 70, w: 18, h: 18,
  speed: 2.4, alive: true, blink: 0,
  weapon: 0,        // 0 single, 1 double, 2 triple, 3 spread
  rapid: 0,         // frames remaining
  shield: 0,        // frames remaining
  fireCooldown: 0,
};

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
let shake = 0;

// Init starfield
for (let i = 0; i < 80; i++) {
  stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 2 + 0.3, c: Math.random() < 0.15 ? '#ff4fd8' : (Math.random() < 0.3 ? '#00e0ff' : '#ffffff') });
}

// -------- Pixel-art sprite rendering helpers --------
function px(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}

// Draw a sprite from a 2D array of color indices (0 = transparent)
function drawSprite(grid, palette, cx, cy, scale = 2) {
  const rows = grid.length;
  const cols = grid[0].length;
  const ox = cx - (cols * scale) / 2;
  const oy = cy - (rows * scale) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = grid[r][c];
      if (v === 0) continue;
      px(ox + c * scale, oy + r * scale, scale, scale, palette[v]);
    }
  }
}

// --- Sprites (tiny pixel grids) ---
const SHIP = [
  [0,0,0,0,1,0,0,0,0],
  [0,0,0,1,2,1,0,0,0],
  [0,0,1,2,2,2,1,0,0],
  [0,1,2,2,3,2,2,1,0],
  [1,2,2,3,3,3,2,2,1],
  [1,2,3,3,3,3,3,2,1],
  [1,1,4,1,1,1,4,1,1],
  [0,0,5,0,0,0,5,0,0],
];
const SHIP_PALETTE = [null, '#00e0ff', '#7df9ff', '#ffffff', '#ff4fd8', '#ffd400'];

const ENEMY_A = [
  [0,0,1,1,1,1,1,0,0],
  [0,1,2,2,2,2,2,1,0],
  [1,2,3,2,2,2,3,2,1],
  [1,2,2,2,2,2,2,2,1],
  [0,1,2,1,2,1,2,1,0],
  [0,0,1,0,1,0,1,0,0],
];
const ENEMY_A_PAL = [null, '#ff3860', '#ff8aa2', '#ffd400'];

const ENEMY_B = [
  [0,0,0,1,1,0,0,0],
  [0,0,1,2,2,1,0,0],
  [0,1,2,3,3,2,1,0],
  [1,2,3,3,3,3,2,1],
  [1,2,2,2,2,2,2,1],
  [0,1,0,1,1,0,1,0],
];
const ENEMY_B_PAL = [null, '#a020f0', '#d486ff', '#ff4fd8'];

const ENEMY_C = [
  [0,1,1,0,0,1,1,0],
  [1,2,2,1,1,2,2,1],
  [1,2,3,2,2,3,2,1],
  [1,2,2,2,2,2,2,1],
  [0,1,2,2,2,2,1,0],
  [0,0,1,1,1,1,0,0],
];
const ENEMY_C_PAL = [null, '#00ff7f', '#80ffbf', '#ffd400'];

const BOSS = [
  [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,2,2,2,2,2,2,2,2,2,1,0,0],
  [0,1,2,2,3,2,2,4,2,2,3,2,2,1,0],
  [1,2,2,3,3,3,2,4,2,3,3,3,2,2,1],
  [1,2,2,3,3,3,2,2,2,3,3,3,2,2,1],
  [1,2,2,2,2,2,2,4,2,2,2,2,2,2,1],
  [0,1,2,1,2,1,2,4,2,1,2,1,2,1,0],
  [0,0,1,0,1,0,1,4,1,0,1,0,1,0,0],
];
const BOSS_PAL = [null, '#ff3860', '#ff8aa2', '#ffd400', '#00e0ff'];

// Power-up icons
const PU_PAL = [null, '#ffd400', '#ffffff', '#ff4fd8', '#00e0ff', '#00ff7f'];
const PU_WEAPON = [
  [0,1,1,1,1,1,0],
  [1,2,2,2,2,2,1],
  [1,2,3,2,3,2,1],
  [1,2,2,2,2,2,1],
  [0,1,1,1,1,1,0],
];
const PU_RAPID = [
  [0,1,1,1,1,1,0],
  [1,4,4,4,4,4,1],
  [1,4,2,2,2,4,1],
  [1,4,4,4,4,4,1],
  [0,1,1,1,1,1,0],
];
const PU_SHIELD = [
  [0,1,1,1,1,1,0],
  [1,5,5,5,5,5,1],
  [1,5,2,5,2,5,1],
  [1,5,5,5,5,5,1],
  [0,1,1,1,1,1,0],
];
const PU_LIFE = [
  [0,1,3,1,3,1,0],
  [1,3,3,3,3,3,1],
  [1,3,3,3,3,3,1],
  [0,1,3,3,3,1,0],
  [0,0,1,3,1,0,0],
];

// -------- Particles --------
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

// -------- Enemy spawning --------
function startWave(n) {
  wave = n;
  document.getElementById('hudWave').textContent = n;
  if (n % 5 === 0) {
    // Boss wave
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
}

function spawnEnemy() {
  const types = ['a', 'b', 'c'];
  const type = types[Math.floor(Math.random() * types.length)];
  const x = 30 + Math.random() * (W - 60);
  let e = { x, y: -20, w: 18, h: 14, type, hp: 1, vx: 0, vy: 1, shootCd: 60 + Math.random() * 60, score: 50 };
  if (type === 'a') { e.hp = 1; e.vy = 1.0 + wave * 0.05; e.score = 50; }
  if (type === 'b') { e.hp = 2; e.vy = 0.7 + wave * 0.05; e.score = 80; e.vx = (Math.random() < 0.5 ? -1 : 1) * 0.5; }
  if (type === 'c') { e.hp = 3; e.vy = 0.6 + wave * 0.05; e.score = 120; e.zig = Math.random() * Math.PI * 2; }
  enemies.push(e);
}

// -------- Shooting --------
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
    // spread
    for (let a = -2; a <= 2; a++) {
      bullets.push({ x: player.x, y, vx: a * 1.2, vy: -7, dmg: 1, color: '#ffd400' });
    }
  }
  // simple synth shoot sound
  beep(880, 0.04, 'square', 0.05);
}

function enemyShoot(e, vx = 0, vy = 3, color = '#ff3860') {
  eBullets.push({ x: e.x, y: e.y + 10, vx, vy, color });
}

// -------- Audio (tiny synth) --------
let audioCtx = null;
function beep(freq = 440, dur = 0.08, type = 'square', vol = 0.08) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  } catch { /* audio may be unavailable (e.g. before user gesture) */ }
}

// -------- Game lifecycle --------
function resetGame() {
  player.x = W / 2; player.y = H - 70;
  player.weapon = 0; player.rapid = 0; player.shield = 180; // start with brief shield
  player.blink = 0; player.alive = true;
  bullets = []; enemies = []; eBullets = []; particles = []; powerups = [];
  score = 0; lives = 3; wave = 0;
  updateHUD();
  startWave(1);
}

function updateHUD() {
  document.getElementById('hudScore').textContent = score;
  document.getElementById('hudWave').textContent = wave;
  document.getElementById('hudLives').textContent = lives;
}

function gameOver() {
  state = STATE.OVER;
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('finalScoreLabel').textContent = 'SCORE: ' + score;
  document.getElementById('submitStatus').textContent = '';
  show('screenOver');
  saveLocalScore(score);
}

function togglePause() {
  if (state === STATE.PLAY) {
    state = STATE.PAUSE;
    show('screenPause');
  } else if (state === STATE.PAUSE) {
    state = STATE.PLAY;
    hideAllOverlays();
  }
}

function startPlay() {
  hideAllOverlays();
  document.getElementById('hud').classList.remove('hidden');
  state = STATE.PLAY;
  resetGame();
}

// -------- Update loop --------
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
    // hit player
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
      if (e.y < 60) e.y += 0.5; // descend
      else { e.x += e.vx; if (e.x < 40 || e.x > W - 40) e.vx *= -1; }
      e.shootCd--;
      if (e.shootCd <= 0) {
        // 3-way shot
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
          updateHUD();
          spawnExplosion(e.x, e.y, e.type === 'boss' ? '#ffd400' : '#ff4fd8', e.type === 'boss' ? 40 : 14);
          beep(e.type === 'boss' ? 120 : 240, 0.18, 'sawtooth', 0.12);
          // chance to drop powerup
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

function damagePlayer() {
  if (player.shield > 0 || player.blink > 0) return;
  lives--;
  updateHUD();
  spawnExplosion(player.x, player.y, '#00e0ff', 20);
  beep(80, 0.3, 'sawtooth', 0.15);
  shake = 10;
  player.blink = 90;
  player.shield = 90;
  player.weapon = Math.max(0, player.weapon - 1);
  if (lives <= 0) {
    player.alive = false;
    setTimeout(gameOver, 600);
  }
}

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
  if (kind === 'rapid')  player.rapid = 360;
  if (kind === 'shield') player.shield = 360;
  if (kind === 'life')   { lives = Math.min(5, lives + 1); updateHUD(); }
  score += 25; updateHUD();
}

// -------- Render --------
function render() {
  // Shake
  const sx = shake ? (Math.random() - 0.5) * shake : 0;
  const sy = shake ? (Math.random() - 0.5) * shake : 0;

  // Clear
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
    drawSprite(SHIP, SHIP_PALETTE, player.x, player.y, 2);
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
    if (e.type === 'boss') drawSprite(BOSS, BOSS_PAL, e.x, e.y, 3);
    else if (e.type === 'a') drawSprite(ENEMY_A, ENEMY_A_PAL, e.x, e.y, 2);
    else if (e.type === 'b') drawSprite(ENEMY_B, ENEMY_B_PAL, e.x, e.y, 2);
    else if (e.type === 'c') drawSprite(ENEMY_C, ENEMY_C_PAL, e.x, e.y, 2);
    // boss HP bar
    if (e.type === 'boss') {
      const maxHp = 30 + wave * 4;
      const w = 80;
      ctx.fillStyle = '#220011';
      ctx.fillRect(e.x - w/2, e.y - 28, w, 4);
      ctx.fillStyle = '#ff3860';
      ctx.fillRect(e.x - w/2, e.y - 28, w * (e.hp / maxHp), 4);
    }
  }

  // Powerups
  for (const p of powerups) {
    const bob = Math.sin(p.t) * 1.5;
    const grid = p.kind === 'weapon' ? PU_WEAPON :
                 p.kind === 'rapid'  ? PU_RAPID :
                 p.kind === 'shield' ? PU_SHIELD : PU_LIFE;
    drawSprite(grid, PU_PAL, p.x, p.y + bob, 2);
  }

  // Particles
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Wave banner
  if (state === STATE.PLAY && enemiesToSpawn > 0 && waveTimer < 0) {
    // (not used; left as scaffolding)
  }

  ctx.restore();
}

// -------- Main loop --------
function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

// -------- UI Overlays --------
/*
 * Modal state handling.
 *
 * Only ONE overlay is visible at a time, and visibility is controlled by the
 * `.hidden` class (display:none !important). A closed overlay is fully removed
 * from the document's interaction flow — it can NEVER block clicks, unlike the
 * old opacity/pointer-events toggling which left invisible layers over the game.
 *
 * `activeOverlayId` tracks which screen is up so Escape/backdrop-click knows
 * what to close, and `isLeaderboardOpen` is an explicit flag for the
 * Leaderboard (Top Pilots) modal as required.
 */
const OVERLAYS = ['screenStart', 'screenPause', 'screenOver', 'screenLB'];
let activeOverlayId = null;
let isLeaderboardOpen = false;

function showOverlay(id) {
  OVERLAYS.forEach((oid) => {
    const el = document.getElementById(oid);
    if (!el) return;
    if (oid === id) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });
  activeOverlayId = id;
  isLeaderboardOpen = id === 'screenLB';
}

function hideOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
  if (activeOverlayId === id) activeOverlayId = null;
  if (id === 'screenLB') isLeaderboardOpen = false;
}

function hideAllOverlays() {
  OVERLAYS.forEach((oid) => {
    const el = document.getElementById(oid);
    if (el) el.classList.add('hidden');
  });
  activeOverlayId = null;
  isLeaderboardOpen = false;
}

// Backward-compatible alias used by older call sites.
function show(id) { showOverlay(id); }

// Close the Leaderboard modal and restore whatever screen was underneath it.
// If we were mid-game-over, go back to the game-over screen; otherwise menu.
function closeLeaderboard() {
  hideOverlay('screenLB');
  if (state === STATE.OVER) showOverlay('screenOver');
  else if (state === STATE.PLAY || state === STATE.PAUSE) hideAllOverlays();
  else showOverlay('screenStart');
}

// Backdrop click: clicking the dim area outside the panel closes the modal
// (but clicks inside the panel are NOT forwarded, so buttons still work).
function onOverlayBackdrop(e) {
  // Only react when the click lands on the overlay itself, not its children.
  if (e.target !== e.currentTarget) return;
  if (activeOverlayId === 'screenLB') {
    closeLeaderboard();
  } else if (activeOverlayId === 'screenPause') {
    togglePause();
  }
}

document.querySelectorAll('.overlay').forEach((el) => {
  el.addEventListener('click', onOverlayBackdrop);
});

// -------- Leaderboard (local + onchain stub) --------
const LB_KEY = 'base_star_raider_lb_v1';
function loadLocalLB() {
  try { return JSON.parse(localStorage.getItem(LB_KEY) || '[]'); } catch { return []; }
}
function saveLocalScore(s) {
  const lb = loadLocalLB();
  const name = (miniAppContext?.user?.username) || (miniAppContext?.user?.displayName) || 'You';
  lb.push({ name, score: s, ts: Date.now() });
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem(LB_KEY, JSON.stringify(lb.slice(0, 20)));
}
function renderLB() {
  const list = document.getElementById('lbList');
  const lb = loadLocalLB();
  list.innerHTML = '';
  if (lb.length === 0) {
    list.innerHTML = '<li class="small">No scores yet — be the first!</li>';
  } else {
    lb.slice(0, 10).forEach((row, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<span><span class="rank">#${i + 1}</span> ${escapeHtml(row.name)}</span><span class="score">${row.score}</span>`;
      list.appendChild(li);
    });
  }
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// -------- Onchain Submit (Base) --------
// Stub: writes score to a hypothetical Leaderboard contract on Base.
// Replace LEADERBOARD_ADDR with your deployed contract. The contract must expose
// `function submitScore(uint256 score) external` and emit an event.
const LEADERBOARD_ADDR = '0x0000000000000000000000000000000000000000'; // TODO: set after deploy
const BASE_CHAIN_ID = '0x2105'; // Base mainnet (8453). Use '0x14a34' for Base Sepolia (84532).

async function submitOnchain() {
  const status = document.getElementById('submitStatus');
  status.textContent = 'Connecting wallet...';
  try {
    if (!sdk) throw new Error('Mini App SDK not loaded. Open this game in Base App or Warpcast.');
    // Get the EIP-1193 provider from the Mini App host
    const provider = await sdk.wallet.getEthereumProvider();
    if (!provider) throw new Error('No wallet provider available.');

    // Make sure we are on Base
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BASE_CHAIN_ID }] });
    } catch { /* user may already be on Base */ }

    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const from = accounts[0];
    status.textContent = 'Submitting score from ' + from.slice(0, 6) + '...';

    // encode submitScore(uint256) selector = 0xa6f9e1a1 (example - regenerate from your ABI!)
    // For real use, compute selector with ethers/viem. Below is a placeholder.
    const selector = '0xa6f9e1a1';
    const padded = score.toString(16).padStart(64, '0');
    const data = selector + padded;

    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from, to: LEADERBOARD_ADDR, data, value: '0x0' }],
    });
    status.textContent = '✓ Tx sent: ' + txHash.slice(0, 10) + '...';
  } catch (err) {
    status.textContent = '⚠ ' + (err.message || 'Submit failed');
  }
}

async function shareScore() {
  const text = `🚀 I scored ${score} in Base Star Raider on wave ${wave}! Can you beat me?`;
  try {
    if (sdk?.actions?.composeCast) {
      await sdk.actions.composeCast({ text, embeds: [window.location.href] });
    } else if (navigator.share) {
      await navigator.share({ text, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(text + ' ' + window.location.href);
      document.getElementById('submitStatus').textContent = 'Copied to clipboard!';
    }
  } catch (e) {
    console.warn('Share failed:', e);
  }
}

// -------- Wire up UI --------
document.getElementById('btnStart').addEventListener('click', startPlay);
document.getElementById('btnRestart').addEventListener('click', startPlay);
document.getElementById('btnResume').addEventListener('click', togglePause);
document.getElementById('btnQuit').addEventListener('click', () => { state = STATE.MENU; document.getElementById('hud').classList.add('hidden'); show('screenStart'); });
document.getElementById('btnViewLB').addEventListener('click', () => { renderLB(); showOverlay('screenLB'); });
document.getElementById('btnCloseLB').addEventListener('click', closeLeaderboard);
document.getElementById('btnSubmit').addEventListener('click', submitOnchain);
document.getElementById('btnShare').addEventListener('click', shareScore);

// -------- Boot --------
initMiniApp();
requestAnimationFrame(loop);
