import { getPixels, placeholderPixelString } from "@normie/shared";
import { useEffect, useRef, type RefObject } from "react";
import {
  getNormieAnalyser,
  resumeNormieAudio,
  sampleBands,
  sampleEnergy,
} from "./normieAudioAnalyser";

const GRID = 40;
const PIXEL_ON = "#e3e5e4";
const PIXEL_OFF = "rgba(72, 73, 75, 0.35)";
const NORMIE_COUNT = 16;
const WAVE_FACES = 12;

export type VisualizerMode = "wave" | "stream";

function parsePixels(binary: string): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < GRID; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < GRID; x++) {
      row.push(binary[y * GRID + x] === "1");
    }
    grid.push(row);
  }
  return grid;
}

async function loadNormieGrids(seed: number): Promise<boolean[][][]> {
  const ids = Array.from({ length: NORMIE_COUNT }, (_, i) => (seed * 137 + i * 619) % 10000);
  return Promise.all(
    ids.map(async (id) => {
      try {
        const px = await getPixels(id);
        if (px.length >= 1600) return parsePixels(px);
      } catch {
        /* fallback */
      }
      return parsePixels(placeholderPixelString(id));
    }),
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface AudioSample {
  bass: number;
  mid: number;
  treble: number;
  energy: number;
  freqs: Uint8Array | null;
}

function sampleAudio(
  isPlaying: boolean,
  audio: HTMLAudioElement | null,
): AudioSample {
  let bass = 0;
  let mid = 0;
  let treble = 0;
  let energy = 0;
  let freqs: Uint8Array | null = null;

  if (isPlaying && audio && !audio.paused) {
    try {
      const { analyser, freq, time } = getNormieAnalyser(audio);
      resumeNormieAudio(audio);
      analyser.getByteFrequencyData(freq as Uint8Array<ArrayBuffer>);
      analyser.getByteTimeDomainData(time as Uint8Array<ArrayBuffer>);
      freqs = freq;
      energy = sampleEnergy(time);
      const bands = sampleBands(freq);
      bass = bands.bass;
      mid = bands.mid;
      treble = bands.treble;
    } catch {
      /* analyser unavailable */
    }
  }

  return { bass, mid, treble, energy, freqs };
}

function updateColAmps(
  colAmps: number[],
  colCount: number,
  freqs: Uint8Array | null,
  bass: number,
  mid: number,
  treble: number,
  energy: number,
  isPlaying: boolean,
): void {
  const attack = isPlaying ? 0.88 : 0.12;
  const release = isPlaying ? 0.42 : 0.1;

  for (let i = 0; i < colCount; i++) {
    let target = 0.04 + 0.02 * Math.sin(i * 0.4);
    if (freqs) {
      const t = i / Math.max(colCount - 1, 1);
      const idx = Math.floor(t * t * (freqs.length - 1));
      const raw = freqs[idx] / 255;
      const bandBoost = i < colCount * 0.25 ? bass * 1.5 : i < colCount * 0.6 ? mid * 1.2 : treble;
      target = Math.min(1, raw * 0.95 + bandBoost * 0.5 + energy * 0.25);
    }
    const rate = target > colAmps[i] ? attack : release;
    colAmps[i] = lerp(colAmps[i], target, rate);
  }
}

function drawNormieFace(
  ctx: CanvasRenderingContext2D,
  grid: boolean[][],
  x: number,
  y: number,
  size: number,
  options?: { ringAlpha?: number; clipCircle?: boolean; flipY?: boolean },
): void {
  const { ringAlpha = 0.35, clipCircle = true, flipY = false } = options ?? {};
  const drawScale = size / GRID;

  ctx.save();
  if (flipY) {
    ctx.translate(x + size / 2, y + size / 2);
    ctx.scale(1, -1);
    ctx.translate(-(x + size / 2), -(y + size / 2));
  }
  if (clipCircle) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
  }
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      ctx.fillStyle = grid[row][col] ? PIXEL_ON : PIXEL_OFF;
      ctx.fillRect(x + col * drawScale, y + row * drawScale, drawScale, drawScale);
    }
  }
  ctx.restore();

  if (clipCircle) {
    ctx.strokeStyle = `rgba(227, 229, 228, ${ringAlpha})`;
    ctx.lineWidth = 1.5 * devicePixelRatio;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawWaveMode(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  grids: boolean[][][],
  colAmps: number[],
  trackSeed: number,
  bass: number,
  energy: number,
  freqs: Uint8Array | null,
): void {
  const centerY = h / 2;
  const minFace = Math.min(w / (WAVE_FACES * 1.35), h * 0.14);
  const maxFace = Math.min(w / (WAVE_FACES * 1.1), h * 0.38);

  for (let i = 0; i < WAVE_FACES; i++) {
    const amp = colAmps[i];
    const normieIndex = (i + trackSeed) % Math.max(grids.length, 1);
    const grid = grids[normieIndex];
    if (!grid) continue;

    const fi = freqs ? freqs[(normieIndex * 7) % freqs.length] / 255 : 0.15;
    const pulse = 1 + bass * 0.22 + fi * 0.12;
    const size = (minFace + amp * (maxFace - minFace)) * pulse;
    const x = (i + 0.5) * (w / WAVE_FACES) - size / 2;
    const displacement = amp * (h * 0.46);
    const ring = 0.2 + fi * 0.5 + energy * 0.25;

    drawNormieFace(ctx, grid, x, centerY - displacement - size / 2, size, { ringAlpha: ring });
    drawNormieFace(ctx, grid, x, centerY + displacement - size / 2, size, {
      ringAlpha: ring * 0.45,
      flipY: true,
    });
  }
}

function drawStreamMode(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  grids: boolean[][][],
  trackSeed: number,
  streamOffset: number,
  bass: number,
  mid: number,
  energy: number,
  freqs: Uint8Array | null,
  isPlaying: boolean,
): number {
  const scrollSpeed = (isPlaying ? 0.7 + bass * 4.2 + energy * 2 : 0.08) * (w / 640);
  const nextOffset = streamOffset + scrollSpeed;

  const faceSize = Math.min(Math.floor(h * 0.78), 36 * devicePixelRatio);
  const spacing = faceSize * 1.15;
  const count = Math.ceil(w / spacing) + 2;
  const streamY = (h - faceSize) / 2;

  for (let i = 0; i < count; i++) {
    const normieIndex = (i + trackSeed) % Math.max(grids.length, 1);
    const fi = freqs ? freqs[(normieIndex * 7) % freqs.length] / 255 : 0.15;
    const phase = nextOffset * 0.065 + i * 0.9;
    const bob = Math.sin(phase) * (mid * 24 + energy * 16 + bass * 10) * devicePixelRatio;
    const x = w - ((nextOffset + i * spacing) % (w + spacing * 2)) + spacing;
    const pulse = 1 + bass * 0.24 + fi * 0.14;
    const size = faceSize * pulse;
    const y = streamY + bob;
    const grid = grids[normieIndex];
    if (!grid) continue;

    drawNormieFace(ctx, grid, x, y, size, {
      ringAlpha: 0.25 + fi * 0.55 + energy * 0.2,
    });
  }

  return nextOffset;
}

interface NormieVisualizerProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  playing: boolean;
  trackSeed: number;
  mode: VisualizerMode;
}

export function NormieVisualizer({ audioRef, playing, trackSeed, mode }: NormieVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridsRef = useRef<boolean[][][]>([]);
  const playingRef = useRef(playing);
  const modeRef = useRef(mode);
  const colAmpsRef = useRef<number[]>(Array(WAVE_FACES).fill(0.08));
  const streamOffsetRef = useRef(0);
  const energyRef = useRef(0);
  const bassRef = useRef(0);
  const midRef = useRef(0);
  const rafRef = useRef(0);

  playingRef.current = playing;
  modeRef.current = mode;

  useEffect(() => {
    let cancelled = false;
    colAmpsRef.current = Array(WAVE_FACES).fill(0.08);
    streamOffsetRef.current = 0;
    void loadNormieGrids(trackSeed).then((grids) => {
      if (!cancelled) gridsRef.current = grids;
    });
    return () => {
      cancelled = true;
    };
  }, [trackSeed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      getNormieAnalyser(audio);
      resumeNormieAudio(audio);
    };
    audio.addEventListener("play", onPlay);
    return () => audio.removeEventListener("play", onPlay);
  }, [audioRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const isPlaying = playingRef.current;
      const vizMode = modeRef.current;
      const audio = audioRef.current;

      const { bass, mid, treble, energy, freqs } = sampleAudio(isPlaying, audio);

      const react = isPlaying ? 0.82 : 0.08;
      energyRef.current = lerp(energyRef.current, energy, react);
      bassRef.current = lerp(bassRef.current, bass, react);
      midRef.current = lerp(midRef.current, mid, react);
      const e = energyRef.current;
      const b = bassRef.current;
      const m = midRef.current;

      const grids = gridsRef.current;
      const colAmps = colAmpsRef.current;
      updateColAmps(colAmps, WAVE_FACES, freqs, b, m, treble, e, isPlaying);

      ctx.fillStyle = "#3d3e40";
      ctx.fillRect(0, 0, w, h);

      if (vizMode === "wave") {
        drawWaveMode(ctx, w, h, grids, colAmps, trackSeed, b, e, freqs);
      } else {
        streamOffsetRef.current = drawStreamMode(
          ctx,
          w,
          h,
          grids,
          trackSeed,
          streamOffsetRef.current,
          b,
          m,
          e,
          freqs,
          isPlaying,
        );
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audioRef, trackSeed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * devicePixelRatio);
      canvas.height = Math.floor(rect.height * devicePixelRatio);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="normie-pixelated w-full h-32 border-2 border-[#e3e5e4]/25 bg-[#3d3e40]"
      aria-hidden
    />
  );
}
