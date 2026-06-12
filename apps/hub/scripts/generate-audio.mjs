/**
 * Generates lightweight WAV assets for hub music loops and SFX.
 * Run: node scripts/generate-audio.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const out = join(__dir, "../public/audio");

const SR = 22050;

function writeWav(relPath, samples) {
  const path = join(out, relPath);
  mkdirSync(dirname(path), { recursive: true });
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (SR * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767 * 0.85), 44 + i * 2);
  }
  writeFileSync(path, buf);
  console.log("wrote", relPath);
}

function env(t, attack, release, dur) {
  if (t < attack) return t / attack;
  if (t > dur - release) return Math.max(0, (dur - t) / release);
  return 1;
}

function tone(freq, t, type = "square") {
  const phase = (2 * Math.PI * freq * t) % (2 * Math.PI);
  if (type === "sine") return Math.sin(phase);
  if (type === "triangle") return (2 / Math.PI) * Math.asin(Math.sin(phase));
  return Math.sin(phase) >= 0 ? 0.35 : -0.35;
}

function mix(...parts) {
  return parts.reduce((a, b) => a + b, 0);
}

function loopTrack(seconds, bpm, notes, wave = "square", vol = 0.12) {
  const len = Math.floor(SR * seconds);
  const out = new Float32Array(len);
  const beat = 60 / bpm;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const beatIdx = Math.floor(t / beat) % notes.length;
    const freq = notes[beatIdx];
    const local = (t % beat) / beat;
    const e = env(local * beat, 0.02, 0.08, beat);
    out[i] = tone(freq, t, wave) * e * vol;
    if (i > 0) out[i] += out[i - 1] * 0.08;
  }
  return out;
}

function padTrack(seconds, root, vol = 0.06) {
  const len = Math.floor(SR * seconds);
  const out = new Float32Array(len);
  const chord = [root, root * 1.25, root * 1.5];
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    out[i] =
      mix(...chord.map((f, j) => tone(f, t + j * 0.01, "sine") * 0.33)) * vol;
  }
  return out;
}

function addTracks(a, b) {
  const len = Math.max(a.length, b.length);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return out;
}

function sfxHit(freq = 180, dur = 0.12) {
  const len = Math.floor(SR * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = freq * (1 - t * 2.5);
    out[i] = tone(Math.max(40, f), t, "square") * env(t, 0.005, 0.04, dur) * 0.35;
  }
  return out;
}

function sfxCollect() {
  const dur = 0.18;
  const len = Math.floor(SR * dur);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 440 + t * 600;
    out[i] = tone(f, t, "sine") * env(t, 0.01, 0.06, dur) * 0.3;
  }
  return out;
}

function sfxWin() {
  const freqs = [523, 659, 784, 1047];
  const out = new Float32Array(SR * 0.9);
  freqs.forEach((f, n) => {
    const start = Math.floor(n * SR * 0.15);
    for (let i = 0; i < SR * 0.25; i++) {
      const t = i / SR;
      out[start + i] += tone(f, t, "square") * env(t, 0.01, 0.12, 0.25) * 0.2;
    }
  });
  return out;
}

function sfxLose() {
  const freqs = [392, 349, 294];
  const out = new Float32Array(SR * 0.9);
  freqs.forEach((f, n) => {
    const start = Math.floor(n * SR * 0.2);
    for (let i = 0; i < SR * 0.3; i++) {
      const t = i / SR;
      out[start + i] += tone(f, t, "triangle") * env(t, 0.01, 0.18, 0.3) * 0.18;
    }
  });
  return out;
}

function sfxClick() {
  return sfxHit(800, 0.04);
}

// Music loops (~16s)
writeWav(
  "music/hub.wav",
  addTracks(
    padTrack(16, 130),
    loopTrack(16, 72, [196, 220, 262, 220, 196, 165, 196, 220], "sine", 0.1),
  ),
);
writeWav(
  "music/action.wav",
  addTracks(
    padTrack(16, 98, 0.05),
    loopTrack(16, 140, [196, 196, 247, 294, 247, 196, 165, 196], "square", 0.11),
  ),
);
writeWav(
  "music/arcade.wav",
  addTracks(
    padTrack(16, 165, 0.04),
    loopTrack(16, 128, [330, 392, 440, 392, 330, 294, 330, 392], "square", 0.1),
  ),
);
writeWav(
  "music/defense.wav",
  addTracks(
    padTrack(16, 110, 0.07),
    loopTrack(16, 96, [110, 110, 131, 147, 131, 110, 98, 110], "triangle", 0.12),
  ),
);
writeWav(
  "music/dungeon.wav",
  addTracks(
    padTrack(16, 82, 0.08),
    loopTrack(16, 80, [98, 104, 110, 104, 98, 87, 98, 104], "triangle", 0.11),
  ),
);

writeWav("sfx/collect.wav", sfxCollect());
writeWav("sfx/hit.wav", sfxHit());
writeWav("sfx/win.wav", sfxWin());
writeWav("sfx/lose.wav", sfxLose());
writeWav("sfx/ui-click.wav", sfxClick());

console.log("Done.");
