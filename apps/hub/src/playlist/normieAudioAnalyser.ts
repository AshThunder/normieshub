const wired = new WeakMap<
  HTMLAudioElement,
  { ctx: AudioContext; analyser: AnalyserNode; freq: Uint8Array; time: Uint8Array }
>();

export function getNormieAnalyser(audio: HTMLAudioElement) {
  let entry = wired.get(audio);
  if (!entry) {
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.12;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    entry = {
      ctx,
      analyser,
      freq: new Uint8Array(analyser.frequencyBinCount),
      time: new Uint8Array(analyser.fftSize),
    };
    wired.set(audio, entry);
  }
  return entry;
}

export function resumeNormieAudio(audio: HTMLAudioElement) {
  const entry = wired.get(audio);
  if (entry) void entry.ctx.resume();
}

/** 0–1 overall loudness from time-domain signal. */
export function sampleEnergy(time: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < time.length; i++) {
    const v = (time[i] - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / time.length) * 2.2);
}

/** Bass / mid / treble buckets 0–1. */
export function sampleBands(freq: Uint8Array): { bass: number; mid: number; treble: number } {
  const n = freq.length;
  const bassEnd = Math.floor(n * 0.12);
  const midEnd = Math.floor(n * 0.45);
  let bass = 0;
  let mid = 0;
  let treble = 0;
  for (let i = 0; i < n; i++) {
    const v = freq[i] / 255;
    if (i < bassEnd) bass += v;
    else if (i < midEnd) mid += v;
    else treble += v;
  }
  return {
    bass: bass / Math.max(bassEnd, 1),
    mid: mid / Math.max(midEnd - bassEnd, 1),
    treble: treble / Math.max(n - midEnd, 1),
  };
}
