// ---- Tiny synth audio ----

let audioCtx = null;

/**
 * Play a short synthesised beep.
 * @param {number} freq  Frequency in Hz (default 440)
 * @param {number} dur   Duration in seconds (default 0.08)
 * @param {string} type  Oscillator type (default 'square')
 * @param {number} vol   Volume 0-1 (default 0.08)
 */
export function beep(freq = 440, dur = 0.08, type = 'square', vol = 0.08) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.stop(audioCtx.currentTime + dur);
  } catch {
    /* audio may be unavailable before user gesture */
  }
}
