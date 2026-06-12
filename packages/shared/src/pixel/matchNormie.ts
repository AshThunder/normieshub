import { hammingDistance, pixelSimilarity } from "./canvasOps";
import type { NormieMatch } from "../api/types";

export async function fetchPixelsBatch(
  ids: number[],
  fetchPixels: (id: number) => Promise<string>,
  batchSize = 24,
): Promise<Map<number, string>> {
  const result = new Map<number, string>();
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const pairs = await Promise.all(
      batch.map(async (id) => {
        try {
          const px = await fetchPixels(id);
          return [id, px] as const;
        } catch {
          return null;
        }
      }),
    );
    for (const p of pairs) {
      if (p) result.set(p[0], p[1]);
    }
  }
  return result;
}

export function rankPixelMatches(userPixels: string, candidates: Map<number, string>, topN = 12): NormieMatch[] {
  const matches: NormieMatch[] = [];
  for (const [id, px] of candidates) {
    const distance = hammingDistance(userPixels, px);
    matches.push({ id, distance, score: pixelSimilarity(userPixels, px) });
  }
  matches.sort((a, b) => b.score - a.score || a.distance - b.distance);
  return matches.slice(0, topN);
}

/** Stratified sample across the collection for faster first pass. */
export function sampleNormieIds(count: number, filterIds?: number[]): number[] {
  if (filterIds && filterIds.length > 0) {
    const pool = [...filterIds];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, Math.min(count, pool.length));
  }
  const step = 10000 / count;
  return Array.from({ length: count }, (_, i) => Math.min(9999, Math.floor(i * step)));
}
