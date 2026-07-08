let ctx: AudioContext | null = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function play(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.15) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(c.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.stop(c.currentTime + duration);
  } catch {}
}

export function playTradeOpen() {
  play(523, 0.12, "sine");
  setTimeout(() => play(659, 0.12, "sine"), 100);
}

export function playTradeWin() {
  play(523, 0.15, "sine");
  setTimeout(() => play(659, 0.15, "sine"), 120);
  setTimeout(() => play(784, 0.25, "sine"), 240);
}

export function playTradeLoss() {
  play(400, 0.2, "triangle");
  setTimeout(() => play(300, 0.3, "triangle"), 150);
}
