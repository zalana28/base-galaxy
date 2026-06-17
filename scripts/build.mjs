// Minimal build for a no-bundler vanilla-JS game:
// 1. Syntax-check game.js, 2. Copy runtime files into dist/.
import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');

// Files that make up the runtime (no node_modules, no configs).
const ASSETS = [
  'index.html',
  'game.js',
  'README.md',
  'hero.png',
  'icon.png',
  'og.png',
  'splash.png',
  '.well-known/farcaster.json',
];

console.log('▶ Syntax-checking game.js ...');
try {
  execSync('node --check game.js', { cwd: root, stdio: 'inherit' });
} catch {
  console.error('✖ Syntax check failed.');
  process.exit(1);
}

console.log('▶ Building into ./dist ...');
if (existsSync(dist)) {
  const { rm } = await import('node:fs/promises');
  await rm(dist, { recursive: true, force: true });
}
await mkdir(join(dist, '.well-known'), { recursive: true });

for (const f of ASSETS) {
  await copyFile(join(root, f), join(dist, f));
}

const built = await readdir(dist, { recursive: true });
console.log('✓ Build OK. dist/ contains:');
for (const f of built) console.log('   -', f);
