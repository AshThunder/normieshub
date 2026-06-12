import { GRID_SIZE } from "../constants";
import { gridToPixelString, parsePixelString } from "./parse";

/** Composited = original XOR transform (each `1` in transform flips that pixel). */
export function xorPixels(original: string, transform: string): string {
  const len = Math.min(original.length, transform.length, GRID_SIZE * GRID_SIZE);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += original[i] === transform[i] ? "0" : "1";
  }
  return out.padEnd(GRID_SIZE * GRID_SIZE, "0");
}

export function emptyTransform(): string {
  return "0".repeat(GRID_SIZE * GRID_SIZE);
}

export function toggleTransformAt(transform: string, x: number, y: number): string {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return transform;
  const idx = y * GRID_SIZE + x;
  const grid = parsePixelString(transform.padEnd(GRID_SIZE * GRID_SIZE, "0"));
  grid[y][x] = !grid[y][x];
  return gridToPixelString(grid);
}

export function countPixelsOn(binary: string): number {
  let n = 0;
  for (let i = 0; i < binary.length; i++) {
    if (binary[i] === "1") n++;
  }
  return n;
}

export function countTransformFlips(transform: string): number {
  return countPixelsOn(transform);
}

export function hammingDistance(a: string, b: string): number {
  const len = Math.min(a.length, b.length, GRID_SIZE * GRID_SIZE);
  let d = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) d++;
  }
  return d + Math.abs(a.length - b.length);
}

/** 0–1 similarity (1 = identical). */
export function pixelSimilarity(a: string, b: string): number {
  const maxDist = GRID_SIZE * GRID_SIZE;
  return 1 - hammingDistance(a, b) / maxDist;
}

export function mergeTransforms(a: string, b: string): string {
  const gridA = parsePixelString(a.padEnd(GRID_SIZE * GRID_SIZE, "0"));
  const gridB = parsePixelString(b.padEnd(GRID_SIZE * GRID_SIZE, "0"));
  const out: boolean[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push(gridA[y][x] !== gridB[y][x]);
    }
    out.push(row);
  }
  return gridToPixelString(out);
}
