export type BannerFormat = "x-header" | "social-card";
export type BannerTemplate = "parade" | "spotlight" | "mosaic" | "collector";

export const BANNER_SQUAD_COUNT = 8;

export const BANNER_FORMATS: Record<BannerFormat, { w: number; h: number }> = {
  "x-header": { w: 1500, h: 500 },
  "social-card": { w: 1200, h: 630 },
};

/** X header safe content band (centered). */
export const X_SAFE_ZONE = {
  x: 150,
  y: 70,
  w: 1200,
  h: 360,
};

/** Bottom-left avatar overlap on X desktop. */
export const X_AVATAR_ZONE = {
  x: 0,
  y: 300,
  w: 200,
  h: 200,
};

export interface BannerSlot {
  normieId: number;
  x: number;
  y: number;
  size: number;
}

export function layoutParadeSlots(
  normieIds: number[],
  w: number,
  h: number,
  hasUser: boolean,
): BannerSlot[] {
  const count = Math.min(normieIds.length, hasUser ? 7 : 8);
  const ids = normieIds.slice(0, count);
  const faceH = h * 0.42;
  const faceSize = faceH;
  const gap = faceSize * 0.12;
  const userSize = hasUser ? faceSize * 0.85 : 0;
  const totalW = ids.length * faceSize + (ids.length - 1) * gap + (hasUser ? userSize + gap : 0);
  let x = (w - totalW) / 2 + (hasUser ? userSize + gap : 0);
  const y = h * 0.48;

  return ids.map((normieId) => {
    const slot = { normieId, x: x + faceSize / 2, y: y + faceSize / 2, size: faceSize };
    x += faceSize + gap;
    return slot;
  });
}

export function layoutSpotlightSlots(
  featuredId: number,
  normieIds: number[],
  w: number,
  h: number,
): { hero: BannerSlot; flank: BannerSlot[] } {
  const heroSize = Math.min(h * 0.62, w * 0.28);
  const flankSize = heroSize * 0.42;
  const heroX = w * 0.22;
  const heroY = h * 0.5;
  const hero: BannerSlot = { normieId: featuredId, x: heroX, y: heroY, size: heroSize };

  const flankIds = normieIds.filter((id) => id !== featuredId).slice(0, 4);
  const flank: BannerSlot[] = flankIds.map((normieId, i) => ({
    normieId,
    x: heroX + heroSize * 0.55 + i * (flankSize + flankSize * 0.15),
    y: heroY + (i % 2 === 0 ? -flankSize * 0.35 : flankSize * 0.35),
    size: flankSize,
  }));

  return { hero, flank };
}

export function layoutMosaicGrid(
  normieIds: number[],
  w: number,
  h: number,
): { cols: number; rows: number; tileSize: number } {
  const tileSize = Math.max(36, Math.min(52, Math.floor(w / 28)));
  const cols = Math.ceil(w / tileSize);
  const rows = Math.ceil(h / tileSize);
  return { cols, rows, tileSize };
}

export function mosaicNormieId(normieIds: number[], col: number, row: number): number {
  const idx = (col * 7 + row * 13) % normieIds.length;
  return normieIds[idx] ?? normieIds[0] ?? 0;
}

export function layoutCollectorSlots(normieIds: number[], w: number, h: number): BannerSlot[] {
  const count = Math.min(normieIds.length, 6);
  const ids = normieIds.slice(0, count);
  const faceSize = h * 0.28;
  const gap = faceSize * 0.14;
  const totalW = ids.length * faceSize + (ids.length - 1) * gap;
  let x = (w - totalW) / 2;
  const y = h * 0.58;

  return ids.map((normieId) => {
    const slot = { normieId, x: x + faceSize / 2, y, size: faceSize };
    x += faceSize + gap;
    return slot;
  });
}

export function userPixelSlot(w: number, h: number, template: BannerTemplate): { x: number; y: number; size: number } {
  if (template === "parade") {
    const faceH = h * 0.42;
    const userSize = faceH * 0.85;
    const count = 7;
    const gap = faceH * 0.12;
    const totalW = count * faceH + (count - 1) * gap + userSize + gap;
    const startX = (w - totalW) / 2;
    return { x: startX + userSize / 2, y: h * 0.48 + faceH / 2, size: userSize };
  }
  if (template === "collector") {
    const size = h * 0.22;
    return { x: w * 0.12, y: h * 0.58, size };
  }
  const size = Math.min(h * 0.35, w * 0.12);
  return { x: w * 0.88, y: h * 0.5, size };
}
