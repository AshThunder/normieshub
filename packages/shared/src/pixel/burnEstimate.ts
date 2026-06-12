import type { CanvasStatus } from "../api/types";

export interface BurnEstimate {
  totalSacrificePixels: number;
  tierPercent: number;
  estimatedActionPoints: number;
  sacrificeCount: number;
}

/** Estimate action points from burn tier config (approximation — on-chain math may differ). */
export function estimateBurnActionPoints(
  sacrificePixelCounts: number[],
  status: CanvasStatus,
): BurnEstimate {
  const sacrificeCount = sacrificePixelCounts.length;
  const totalSacrificePixels = sacrificePixelCounts.reduce((s, n) => s + n, 0);

  if (sacrificeCount === 0 || totalSacrificePixels === 0) {
    return { totalSacrificePixels: 0, tierPercent: 0, estimatedActionPoints: 0, sacrificeCount: 0 };
  }

  let tierPercent = status.tierMinPercents[0] ?? 1;
  for (let i = 0; i < status.tierThresholds.length; i++) {
    const threshold = status.tierThresholds[i];
    if (sacrificePixelCounts.some((p) => p >= threshold)) {
      tierPercent =
        status.tierMinPercents[Math.min(i + 1, status.tierMinPercents.length - 1)] ?? tierPercent;
    }
  }

  const raw = (totalSacrificePixels * tierPercent) / 100;
  const cap = (totalSacrificePixels * status.maxBurnPercent) / 100;
  const estimatedActionPoints = Math.max(0, Math.floor(Math.min(raw, cap)));

  return { totalSacrificePixels, tierPercent, estimatedActionPoints, sacrificeCount };
}
