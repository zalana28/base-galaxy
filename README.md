# 🚀 Base Star Raider

Retro pixel-art space shooter yang dijalankan sebagai **Mini App** di **Base App** (dan Farcaster clients lain seperti Warpcast). Dibuat dengan HTML5 Canvas vanilla — **tanpa build step**.

## ✨ Fitur

- **Retro pixel-art 80s arcade** (Canvas 2D, scale-aware)
- **Power-ups & weapon upgrades** — single → double → triple → spread, plus rapid fire, shield, extra life
- **Wave-based gameplay** dengan **boss fight tiap 5 wave**
- **Onchain leaderboard** — submit skor ke smart contract di Base via `sdk.wallet.getEthereumProvider()`
- **Share ke Farcaster/Base** lewat `sdk.actions.composeCast`
- **Touch controls** untuk mobile + keyboard (←/→ A/D, Space, P untuk pause)
- **Sound effects** synth (Web Audio API)

## 📁 Struktur Project

```
base-space-shooter/
├── index.html              # Entry point + Mini App embed metadata
├── game.js                 # Game logic + Mini App SDK integration
├── .well-known/
│   └── farcaster.json      # Manifest untuk Base App / Farcaster
├── contracts/
│   └── Leaderboard.sol     # Optional: contoh smart contract leaderboard
└── assets/                 # icon.png, splash.png, og.png, hero.png (tambahkan sendiri)
```

## 🛠️ Cara Deploy

### 1. Hosting static

Game ini 100% static — bisa dihosting di mana saja yang mendukung HTTPS:

- **Vercel** (rekomendasi): `vercel deploy`
- **Netlify**: drag-and-drop folder
- **GitHub Pages**, **Cloudflare Pages**, dll

Pastikan file `/.well-known/farcaster.json` dapat diakses publik di `https://YOUR_DOMAIN/.well-known/farcaster.json`.

### 2. Ganti placeholder

Di semua file, replace `YOUR_DOMAIN` dengan domain hosting kamu (contoh: `star-raider.vercel.app`):

```bash
grep -rl YOUR_DOMAIN . | xargs sed -i 's/YOUR_DOMAIN/star-raider.vercel.app/g'
```

### 3. Buat asset gambar

Tambahkan file berikut di root (atau folder `assets/`, sesuaikan path di manifest):

| File | Ukuran | Keperluan |
|---|---|---|
| `icon.png` | 1024×1024 | App icon di Base App |
| `splash.png` | 200×200 | Splash screen saat loading |
| `og.png` | 1200×800 (ratio 3:2) | Embed image saat di-share |
| `hero.png` | 1200×630 | Store hero image |

### 4. Sign manifest (account association)

Untuk publish ke **Base App store**, manifest perlu di-sign dengan custody address Farcaster kamu. Gunakan tool resmi:

```bash
npx @farcaster/miniapp-cli sign
```

Output-nya berupa 3 field (`header`, `payload`, `signature`) — paste ke `farcaster.json` di bagian `accountAssociation`.

### 5. Test di Base App

1. Buka Base App di HP
2. Cast URL game-mu (atau gunakan **Mini App debugger**: <https://farcaster.xyz/~/developers/mini-apps/debug>)
3. Tap embed → mainkan!

## 🔗 Onchain Leaderboard (opsional)

File `contracts/Leaderboard.sol` berisi contoh kontrak minimal. Untuk deploy:

```bash
# Pakai Foundry
forge create contracts/Leaderboard.sol:Leaderboard \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY
```

Lalu di `game.js`, update:

```js
const LEADERBOARD_ADDR = '0xYourDeployedAddress';
// Selector untuk submitScore(uint256). Hitung dengan:
// cast sig 'submitScore(uint256)'  →  0x9c4ae2d0 (contoh)
const selector = '0x9c4ae2d0';
```

> **Tip:** Untuk testing tanpa biaya gas, deploy ke **Base Sepolia** dulu dan ganti `BASE_CHAIN_ID` di `game.js` ke `'0x14a34'`.

## 🎮 Kontrol

| Aksi | Keyboard | Touch |
|---|---|---|
| Gerak kiri/kanan | ← → atau A/D | Tombol ◀ / ▶ |
| Tembak | Space (tahan) | Tombol ● |
| Pause | P atau Esc | — |

## 🧩 Tech Stack

- **HTML5 Canvas** (vanilla JS, no framework)
- **[@farcaster/miniapp-sdk](https://www.npmjs.com/package/@farcaster/miniapp-sdk)** via esm.sh (no bundler needed)
- **Web Audio API** untuk SFX
- **EIP-1193 wallet provider** dari host (Base App = Coinbase Smart Wallet)

## 📜 Lisensi

MIT — pakai dan modifikasi bebas.
