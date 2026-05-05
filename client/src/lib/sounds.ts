// Centralized audio service for handləkraft.
//
// Tiny WebAudio synth — zero asset files, zero network. Each "sound" is a
// short envelope on a few oscillators. Honors:
//   • A global mute (default OFF). Persisted in localStorage as `hk_sound`.
//   • Per-event opt-outs. Persisted in localStorage as `hk_sound_muted`
//     (JSON array of SoundName) and synced to the server when available.
//   • `prefers-reduced-motion` (treated as a strong "be quiet" hint).
//   • Audio policy: requires a prior user gesture; we no-op silently otherwise.
//
// Usage:
//   import { playSound, setGlobalSoundEnabled, setSoundMuted } from "@/lib/sounds";
//   playSound("drum");

export type SoundName = "drum" | "horn" | "parchment" | "lute";

const STORAGE_KEY = "hk_sound";
const MUTED_KEY   = "hk_sound_muted";

export const SOUND_LABELS: Record<SoundName, string> = {
  drum:      "Quest-completion drum",
  horn:      "Rank-up horn",
  parchment: "Factory parchment chime",
  lute:      "Crew-bond lute pluck",
};

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readMuted(): Set<SoundName> {
  try {
    const raw = localStorage.getItem(MUTED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((s): s is SoundName => typeof s === "string" && s in SOUND_LABELS));
  } catch {
    return new Set();
  }
}

export function isGlobalSoundEnabled(): boolean {
  return readEnabled();
}

export function getSoundMuted(): SoundName[] {
  return Array.from(readMuted());
}

export function isSoundMuted(name: SoundName): boolean {
  return readMuted().has(name);
}

export function setGlobalSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* private mode / quota — accept loss */
  }
  window.dispatchEvent(new CustomEvent("hk:sound-changed", { detail: { enabled: on } }));
}

// Hydrate per-event mute prefs from a server response (e.g. /api/auth/me).
// Used at app boot so server-stored prefs win over device-local defaults.
export function hydrateSoundMutedFromServer(serverMuted: unknown): void {
  if (!Array.isArray(serverMuted)) return;
  const valid = serverMuted.filter(
    (s): s is SoundName => typeof s === "string" && s in SOUND_LABELS,
  );
  try {
    localStorage.setItem(MUTED_KEY, JSON.stringify(valid));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent("hk:sound-muted-changed", { detail: { muted: valid } }),
  );
}

export function setSoundMuted(name: SoundName, muted: boolean): void {
  const set = readMuted();
  if (muted) set.add(name); else set.delete(name);
  try {
    localStorage.setItem(MUTED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent("hk:sound-muted-changed", { detail: { muted: Array.from(set) } }),
  );
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
  drum: () =>
    play([{ type: "sine", freq: 110, freqEnd: 55, gain: 0.35, attack: 0.01, release: 0.24 }], 0.25),
  horn: () =>
    play(
      [
        { type: "triangle", freq: 196, gain: 0.18, attack: 0.08, release: 1.1 },
        { type: "triangle", freq: 294, gain: 0.16, attack: 0.10, release: 1.1, delay: 0.02 },
      ],
      1.2,
    ),
  parchment: () =>
    play(
      [
        { type: "square",   freq: 1800, gain: 0.04, attack: 0.005, release: 0.06 },
        { type: "triangle", freq: 440,  gain: 0.05, attack: 0.04,  release: 0.18, delay: 0.04 },
      ],
      0.22,
    ),
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
  if (readMuted().has(name)) return;
  if (reducedMotion()) return;
  try {
    RECIPES[name]();
  } catch {
    /* policy / context blocked — silent no-op */
  }
}
