let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, startOffset: number, duration: number, type: OscillatorType, gainPeak: number) {
  const audio = getContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime + startOffset);
  gain.gain.setValueAtTime(0, audio.currentTime + startOffset);
  gain.gain.linearRampToValueAtTime(gainPeak, audio.currentTime + startOffset + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + startOffset + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(audio.currentTime + startOffset);
  osc.stop(audio.currentTime + startOffset + duration);
}

export function playShoot() {
  try {
    tone(880, 0, 0.08, "square", 0.05);
    tone(440, 0.03, 0.06, "square", 0.03);
  } catch {
    // audio is a nice-to-have; ignore playback failures
  }
}

export function playExplosion() {
  try {
    tone(180, 0, 0.25, "sawtooth", 0.08);
    tone(90, 0.05, 0.3, "square", 0.06);
  } catch {
    // ignore
  }
}

export function playCorrect() {
  try {
    tone(523, 0, 0.1, "triangle", 0.06);
    tone(784, 0.09, 0.15, "triangle", 0.06);
  } catch {
    // ignore
  }
}

export function playHurt() {
  try {
    tone(220, 0, 0.15, "sawtooth", 0.07);
    tone(110, 0.1, 0.25, "sawtooth", 0.07);
  } catch {
    // ignore
  }
}

export function playGameOver() {
  try {
    tone(300, 0, 0.15, "square", 0.06);
    tone(240, 0.15, 0.15, "square", 0.06);
    tone(180, 0.3, 0.3, "square", 0.06);
  } catch {
    // ignore
  }
}

const SIMON_NOTE_FREQS = [329.63, 261.63, 220, 164.81]; // E4, C4, A3, E3

export function playSimonNote(index: number, duration = 0.35) {
  try {
    tone(SIMON_NOTE_FREQS[index % SIMON_NOTE_FREQS.length], 0, duration, "sine", 0.08);
  } catch {
    // ignore
  }
}
