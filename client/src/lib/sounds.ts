// Centralized audio service for handləkraft.
//
// Tiny WebAudio synth — zero asset files, zero network. Each "sound" is a
// short envelope on a few oscillators. Honors:
//   • A global mute (default OFF). Persisted in localStorage as `hk_sound`.
//   • `prefers-reduced-motion` (treated as a strong "be quiet" hint).
//   • Audio policy: requires a prior user gesture; we no-op silently otherwise.
//
// Usage:
//   import { playSound, setGlobalSoundEnabled, isGlobalSoundEnabled } from "@/lib/sounds";
//   playSound("drum");

export type SoundName = "drum" | "horn" | "parchment" | "lute";

const STORAGE_KEY = "hk_sound";

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isGlobalSoundEnabled(): boolean {
  return readEnabled();
}

export function setGlobalSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* private mode / quota — accept loss */
  }
  window.dispatchEvent(new CustomEvent("hk:sound-changed", { detail: { enabled: on } }));
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

type AudioCtor = typeof AudioContext;
interface AudioWindow extends Window {
  AudioContext?: AudioCtor;
  webkitAudioContext?: AudioCtor;
}
function getAudioCtor(): AudioCtor | null {
  const w: AudioWindow = window;
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

// One shared context, lazily created on first sound. Browsers limit total
// contexts; reuse keeps us safe on long sessions.
let sharedCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (sharedCtx && sharedCtx.state !== "closed") return sharedCtx;
  const Ctor = getAudioCtor();
  if (!Ctor) return null;
  try {
    sharedCtx = new Ctor();
    return sharedCtx;
  } catch {
    return null;
  }
}

interface Voice {
  type: OscillatorType;
  freq: number;
  freqEnd?: number;
  gain: number;
  attack: number;
  release: number;
  delay?: number;
}

function play(voices: Voice[], duration: number): void {
  const c = ctx();
  if (!c) return;
  // Resume if suspended (Safari/Chrome autoplay rules).
  if (c.state === "suspended") void c.resume().catch(() => {});
  const t0 = c.currentTime;
  for (const v of voices) {
    const start = t0 + (v.delay ?? 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = v.type;
    o.frequency.setValueAtTime(v.freq, start);
    if (v.freqEnd != null) {
      o.frequency.exponentialRampToValueAtTime(Math.max(1, v.freqEnd), start + duration);
    }
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(v.gain, start + v.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + v.attack + v.release);
    o.connect(g).connect(c.destination);
    o.start(start);
    o.stop(start + v.attack + v.release + 0.05);
  }
}

const RECIPES: Record<SoundName, () => void> = {
  // Quest-complete drum: low thump.
  drum: () =>
    play([{ type: "sine", freq: 110, freqEnd: 55, gain: 0.35, attack: 0.01, release: 0.24 }], 0.25),

  // Rank-up horn: two stacked triangles, perfect fifth.
  horn: () =>
    play(
      [
        { type: "triangle", freq: 196, gain: 0.18, attack: 0.08, release: 1.1 },
        { type: "triangle", freq: 294, gain: 0.16, attack: 0.10, release: 1.1, delay: 0.02 },
      ],
      1.2,
    ),

  // Parchment open: tiny high "tick" then a soft pad — used when factory or
  // a wizard opens. Very quiet so it never startles.
  parchment: () =>
    play(
      [
        { type: "square",   freq: 1800, gain: 0.04, attack: 0.005, release: 0.06 },
        { type: "triangle", freq: 440,  gain: 0.05, attack: 0.04,  release: 0.18, delay: 0.04 },
      ],
      0.22,
    ),

  // Lute pluck: warm, brief — used for crew bond toast (a single shared note).
  lute: () =>
    play(
      [
        { type: "triangle", freq: 392, gain: 0.14, attack: 0.005, release: 0.42 },
        { type: "sine",     freq: 784, gain: 0.05, attack: 0.005, release: 0.30 },
      ],
      0.45,
    ),
};

export function playSound(name: SoundName): void {
  if (!readEnabled()) return;
  if (reducedMotion()) return;
  try {
    RECIPES[name]();
  } catch {
    /* policy / context blocked — silent no-op */
  }
}
