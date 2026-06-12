import type { SfxName } from "./types";

const CLIP_URLS: Partial<Record<SfxName, string>> = {
  eat: "/audio/sfx/collect.wav",
  collect: "/audio/sfx/collect.wav",
  goal: "/audio/sfx/collect.wav",
  floorClear: "/audio/sfx/collect.wav",
  waveClear: "/audio/sfx/win.wav",
  win: "/audio/sfx/win.wav",
  lose: "/audio/sfx/lose.wav",
  die: "/audio/sfx/lose.wav",
  crash: "/audio/sfx/lose.wav",
  hit: "/audio/sfx/hit.wav",
  towerHit: "/audio/sfx/hit.wav",
  enemyKill: "/audio/sfx/hit.wav",
  leak: "/audio/sfx/hit.wav",
  save: "/audio/sfx/hit.wav",
  uiClick: "/audio/sfx/ui-click.wav",
};

let ctx: AudioContext | null = null;
const clipCache = new Map<string, AudioBuffer>();

export function getAudioContext(): AudioContext | null {
  return ctx;
}

export function initAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, vol: number, slide?: number, type: OscillatorType = "sine") {
  try {
    const c = initAudioContext();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, c.currentTime + dur);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  } catch {
    /* ignore */
  }
}

async function loadClip(url: string): Promise<AudioBuffer | null> {
  if (clipCache.has(url)) return clipCache.get(url)!;
  try {
    const c = initAudioContext();
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const decoded = await c.decodeAudioData(buf.slice(0));
    clipCache.set(url, decoded);
    return decoded;
  } catch {
    return null;
  }
}

export async function preloadSfxClips() {
  await Promise.all([...new Set(Object.values(CLIP_URLS))].map((u) => loadClip(u)));
}

export function playClip(url: string, volume: number) {
  try {
    const c = initAudioContext();
    const buf = clipCache.get(url);
    if (!buf) {
      void loadClip(url).then((b) => b && playClip(url, volume));
      return;
    }
    const src = c.createBufferSource();
    const gain = c.createGain();
    src.buffer = buf;
    gain.gain.value = volume;
    src.connect(gain);
    gain.connect(c.destination);
    src.start();
  } catch {
    /* ignore */
  }
}

/** Procedural + clip SFX catalog. Volume multiplier applied by caller. */
export function playProceduralSfx(name: SfxName, volume: number) {
  const v = volume;
  switch (name) {
    case "stretch":
      tone(80, 0.04, 0.04 * v);
      break;
    case "shoot":
    case "kick":
    case "towerShoot":
      tone(150, 0.2, 0.1 * v, 500);
      break;
    case "impact":
      tone(100 + Math.random() * 40, 0.08, 0.08 * v);
      break;
    case "shatter":
    case "special":
      tone(600, 0.2, 0.06 * v, 120);
      break;
    case "start":
    case "waveStart":
      tone(330, 0.12, 0.08 * v, 660);
      break;
    case "turn":
    case "laneSwitch":
      tone(220, 0.03, 0.03 * v);
      break;
    case "place":
    case "select":
      tone(440, 0.08, 0.06 * v, 550);
      break;
    case "upgrade":
      tone(523, 0.15, 0.08 * v, 784);
      break;
    case "attack":
      tone(180, 0.1, 0.1 * v, 90, "square");
      break;
    case "defend":
      tone(120, 0.12, 0.07 * v, undefined, "triangle");
      break;
    default: {
      const url = CLIP_URLS[name];
      if (url) playClip(url, v);
      break;
    }
  }
}

export function playSfxInternal(name: SfxName, volume: number, impactScale = 1) {
  if (name === "impact") {
    tone(100 + Math.random() * 40, 0.08 * impactScale, Math.min(0.15, impactScale * 0.05) * volume);
    return;
  }
  if (name === "win") {
    [261, 329, 392, 523].forEach((f, i) =>
      setTimeout(() => tone(f, 0.3, 0.1 * volume), i * 100),
    );
    return;
  }
  if (name === "lose") {
    [293, 277, 261].forEach((f, i) =>
      setTimeout(() => tone(f, 0.35, 0.08 * volume), i * 180),
    );
    return;
  }
  const url = CLIP_URLS[name];
  if (url) {
    playClip(url, volume);
    return;
  }
  playProceduralSfx(name, volume);
}
