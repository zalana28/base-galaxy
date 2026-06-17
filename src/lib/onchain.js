// ---- Leaderboard helpers (local storage) ----
const LB_KEY = 'base_star_raider_lb_v1';

export function loadLocalLB() {
  try { return JSON.parse(localStorage.getItem(LB_KEY) || '[]'); }
  catch { return []; }
}

export function saveLocalScore(name, score) {
  const lb = loadLocalLB();
  lb.push({ name, score, ts: Date.now() });
  lb.sort((a, b) => b.score - a.score);
  localStorage.setItem(LB_KEY, JSON.stringify(lb.slice(0, 20)));
}

/** Escape HTML to prevent XSS in leaderboard names */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
