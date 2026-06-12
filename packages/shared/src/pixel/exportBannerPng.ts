import { getPixels, getTraits } from "../api/normies";
import { HUB_HOST, PIXEL_OFF, PIXEL_ON } from "../constants";
import {
  BANNER_FORMATS,
  layoutCollectorSlots,
  layoutMosaicGrid,
  layoutParadeSlots,
  layoutSpotlightSlots,
  mosaicNormieId,
  userPixelSlot,
  X_AVATAR_ZONE,
  X_SAFE_ZONE,
  type BannerFormat,
  type BannerTemplate,
} from "./bannerLayout";
import { drawPixelGrid, placeholderPixelString } from "./render";

export interface BannerPngOptions {
  format: BannerFormat;
  template: BannerTemplate;
  normieIds: number[];
  featuredId: number;
  userPixels?: string;
  title?: string;
  tagline?: string;
  description?: string;
  handle?: string;
  width?: number;
  height?: number;
}

async function loadPixelMap(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids)];
  const pairs = await Promise.all(
    unique.map(async (id) => {
      try {
        const pixels = await getPixels(id);
        if (pixels.length >= 1600) return [id, pixels] as const;
      } catch {
        /* fall through to placeholder */
      }
      return [id, placeholderPixelString(id)] as const;
    }),
  );
  return new Map(pairs);
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function drawPixelFace(
  ctx: CanvasRenderingContext2D,
  pixels: string,
  x: number,
  y: number,
  size: number,
  circular = true,
): void {
  const half = size / 2;
  const scale = size / 40;
  ctx.save();
  if (circular) {
    ctx.beginPath();
    ctx.arc(x, y, half, 0, Math.PI * 2);
    ctx.clip();
  }
  drawPixelGrid(ctx, pixels, x - half, y - half, scale);
  ctx.restore();
  if (circular) {
    ctx.strokeStyle = PIXEL_ON;
    ctx.lineWidth = Math.max(2, size * 0.04);
    ctx.beginPath();
    ctx.arc(x, y, half, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTextBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  h: number,
  alpha = 0.75,
): void {
  ctx.fillStyle = `rgba(227, 229, 228, ${alpha})`;
  ctx.fillRect(0, y, w, h);
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.font = `${Math.round(h * 0.04)}px monospace`;
  ctx.fillStyle = "rgba(72, 73, 75, 0.55)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(HUB_HOST, w - w * 0.03, h - h * 0.04);
}

async function drawParade(
  ctx: CanvasRenderingContext2D,
  opts: BannerPngOptions,
  w: number,
  h: number,
  pixels: Map<number, string>,
): Promise<void> {
  const hasUser = Boolean(opts.userPixels);
  const slots = layoutParadeSlots(opts.normieIds, w, h, hasUser);

  const textX = w / 2;
  const maxW = w * 0.7;
  ctx.textAlign = "center";
  ctx.fillStyle = PIXEL_ON;

  if (opts.title) {
    ctx.font = `bold ${Math.round(h * 0.11)}px monospace`;
    ctx.fillText(truncateText(ctx, opts.title.toUpperCase(), maxW), textX, h * 0.22);
  }
  if (opts.tagline) {
    ctx.font = `${Math.round(h * 0.055)}px monospace`;
    ctx.fillStyle = "rgba(72, 73, 75, 0.85)";
    ctx.fillText(truncateText(ctx, opts.tagline, maxW), textX, h * 0.32);
  }
  if (opts.description && opts.format === "social-card") {
    ctx.font = `${Math.round(h * 0.042)}px monospace`;
    ctx.fillText(truncateText(ctx, opts.description, maxW * 0.9), textX, h * 0.4);
  }

  for (const slot of slots) {
    const px = pixels.get(slot.normieId);
    if (px) drawPixelFace(ctx, px, slot.x, slot.y, slot.size);
  }

  if (opts.userPixels) {
    const u = userPixelSlot(w, h, "parade");
    drawPixelFace(ctx, opts.userPixels, u.x, u.y, u.size);
  }
}

async function drawSpotlight(
  ctx: CanvasRenderingContext2D,
  opts: BannerPngOptions,
  w: number,
  h: number,
  pixels: Map<number, string>,
): Promise<void> {
  const { hero, flank } = layoutSpotlightSlots(opts.featuredId, opts.normieIds, w, h);

  for (const slot of flank) {
    const px = pixels.get(slot.normieId);
    if (px) drawPixelFace(ctx, px, slot.x, slot.y, slot.size);
  }
  const heroPx = pixels.get(hero.normieId);
  if (heroPx) drawPixelFace(ctx, heroPx, hero.x, hero.y, hero.size);

  let featuredType = "Normie";
  try {
    const traits = await getTraits(opts.featuredId);
    featuredType = traits.attributes.find((a) => a.trait_type === "Type")?.value ?? "Normie";
  } catch {
    /* optional */
  }

  const textX = w * 0.62;
  const maxW = w * 0.32;
  ctx.textAlign = "left";
  ctx.fillStyle = PIXEL_ON;

  if (opts.title) {
    ctx.font = `bold ${Math.round(h * 0.1)}px monospace`;
    ctx.fillText(truncateText(ctx, opts.title.toUpperCase(), maxW), textX, h * 0.28);
  }

  const badge = featuredType.toUpperCase();
  ctx.font = `bold ${Math.round(h * 0.05)}px monospace`;
  const badgeW = ctx.measureText(badge).width + h * 0.06;
  const badgeY = h * 0.36;
  ctx.fillStyle = PIXEL_ON;
  ctx.fillRect(textX, badgeY, badgeW, h * 0.08);
  ctx.fillStyle = PIXEL_OFF;
  ctx.textBaseline = "middle";
  ctx.fillText(badge, textX + h * 0.03, badgeY + h * 0.04);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "rgba(72, 73, 75, 0.85)";
  ctx.font = `${Math.round(h * 0.045)}px monospace`;
  ctx.fillText(`#${opts.featuredId}`, textX, h * 0.5);

  if (opts.tagline) {
    ctx.fillText(truncateText(ctx, opts.tagline, maxW), textX, h * 0.6);
  }
  if (opts.description) {
    ctx.font = `${Math.round(h * 0.038)}px monospace`;
    ctx.fillText(truncateText(ctx, opts.description, maxW), textX, h * 0.72);
  }

  if (opts.userPixels) {
    const u = userPixelSlot(w, h, "spotlight");
    drawPixelFace(ctx, opts.userPixels, u.x, u.y, u.size);
  }
}

async function drawMosaic(
  ctx: CanvasRenderingContext2D,
  opts: BannerPngOptions,
  w: number,
  h: number,
  pixels: Map<number, string>,
): Promise<void> {
  const { cols, rows, tileSize } = layoutMosaicGrid(opts.normieIds, w, h);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const id = mosaicNormieId(opts.normieIds, col, row);
      const px = pixels.get(id);
      if (!px) continue;
      const pad = 2;
      const size = tileSize - pad * 2;
      const x = col * tileSize + pad + size / 2;
      const y = row * tileSize + pad + size / 2;
      drawPixelFace(ctx, px, x, y, size, false);
    }
  }

  const bandH = opts.format === "social-card" ? h * 0.38 : h * 0.45;
  const bandY = h * 0.28;
  drawTextBand(ctx, w, bandY, bandH, 0.82);

  const textX = w / 2;
  const maxW = w * 0.75;
  ctx.textAlign = "center";
  ctx.fillStyle = PIXEL_ON;

  if (opts.title) {
    ctx.font = `bold ${Math.round(h * 0.1)}px monospace`;
    ctx.fillText(truncateText(ctx, opts.title.toUpperCase(), maxW), textX, bandY + h * 0.1);
  }
  if (opts.tagline) {
    ctx.font = `${Math.round(h * 0.05)}px monospace`;
    ctx.fillText(truncateText(ctx, opts.tagline, maxW), textX, bandY + h * 0.2);
  }
  if (opts.description) {
    ctx.font = `${Math.round(h * 0.04)}px monospace`;
    ctx.fillStyle = "rgba(72, 73, 75, 0.9)";
    ctx.fillText(truncateText(ctx, opts.description, maxW), textX, bandY + h * 0.3);
  }

  if (opts.userPixels) {
    const u = userPixelSlot(w, h, "mosaic");
    drawPixelFace(ctx, opts.userPixels, u.x, u.y, u.size);
  }
}

async function drawCollector(
  ctx: CanvasRenderingContext2D,
  opts: BannerPngOptions,
  w: number,
  h: number,
  pixels: Map<number, string>,
): Promise<void> {
  const slots = layoutCollectorSlots(opts.normieIds, w, h);

  const headline = opts.title?.toUpperCase() || "MY NORMIES";
  ctx.textAlign = "center";
  ctx.fillStyle = PIXEL_ON;
  ctx.font = `bold ${Math.round(h * 0.12)}px monospace`;
  ctx.fillText(truncateText(ctx, headline, w * 0.85), w / 2, h * 0.22);

  if (opts.tagline) {
    ctx.font = `${Math.round(h * 0.05)}px monospace`;
    ctx.fillStyle = "rgba(72, 73, 75, 0.85)";
    ctx.fillText(truncateText(ctx, opts.tagline, w * 0.8), w / 2, h * 0.32);
  }

  for (const slot of slots) {
    const px = pixels.get(slot.normieId);
    if (px) drawPixelFace(ctx, px, slot.x, slot.y, slot.size);
    ctx.font = `${Math.round(slot.size * 0.18)}px monospace`;
    ctx.fillStyle = PIXEL_ON;
    ctx.textAlign = "center";
    ctx.fillText(`#${slot.normieId}`, slot.x, slot.y + slot.size * 0.65);
  }

  if (opts.userPixels) {
    const u = userPixelSlot(w, h, "collector");
    drawPixelFace(ctx, opts.userPixels, u.x, u.y, u.size);
  }

  if (opts.description) {
    ctx.font = `${Math.round(h * 0.042)}px monospace`;
    ctx.fillStyle = "rgba(72, 73, 75, 0.9)";
    ctx.fillText(truncateText(ctx, opts.description, w * 0.85), w / 2, h * 0.82);
  }

  if (opts.handle) {
    ctx.font = `bold ${Math.round(h * 0.045)}px monospace`;
    ctx.fillStyle = PIXEL_ON;
    ctx.fillText(`@${opts.handle.replace(/^@/, "")}`, w / 2, h * 0.93);
  }
}

export function drawBannerSafeZone(
  ctx: CanvasRenderingContext2D,
  format: BannerFormat,
  w: number,
  h: number,
): void {
  if (format !== "x-header") return;

  const scaleX = w / BANNER_FORMATS["x-header"].w;
  const scaleY = h / BANNER_FORMATS["x-header"].h;

  ctx.save();
  ctx.setLineDash([8 * scaleX, 6 * scaleX]);
  ctx.strokeStyle = "rgba(255, 80, 80, 0.6)";
  ctx.lineWidth = 2;

  ctx.strokeRect(
    X_SAFE_ZONE.x * scaleX,
    X_SAFE_ZONE.y * scaleY,
    X_SAFE_ZONE.w * scaleX,
    X_SAFE_ZONE.h * scaleY,
  );

  ctx.fillStyle = "rgba(255, 80, 80, 0.12)";
  ctx.fillRect(
    X_AVATAR_ZONE.x * scaleX,
    X_AVATAR_ZONE.y * scaleY,
    X_AVATAR_ZONE.w * scaleX,
    X_AVATAR_ZONE.h * scaleY,
  );
  ctx.restore();
}

export async function drawBannerArt(
  ctx: CanvasRenderingContext2D,
  options: BannerPngOptions,
): Promise<void> {
  const dims = BANNER_FORMATS[options.format];
  const w = options.width ?? dims.w;
  const h = options.height ?? dims.h;

  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(0, 0, w, h);

  const ids = [...options.normieIds, options.featuredId];
  const pixels = await loadPixelMap(ids);

  switch (options.template) {
    case "parade":
      await drawParade(ctx, options, w, h, pixels);
      break;
    case "spotlight":
      await drawSpotlight(ctx, options, w, h, pixels);
      break;
    case "mosaic":
      await drawMosaic(ctx, options, w, h, pixels);
      break;
    case "collector":
      await drawCollector(ctx, options, w, h, pixels);
      break;
  }

  if (options.handle && options.template !== "collector") {
    ctx.font = `bold ${Math.round(h * 0.045)}px monospace`;
    ctx.fillStyle = PIXEL_ON;
    ctx.textAlign = "center";
    ctx.fillText(`@${options.handle.replace(/^@/, "")}`, w / 2, h * 0.95);
  }

  drawWatermark(ctx, w, h);
}

export async function exportBannerPng(options: BannerPngOptions): Promise<Blob> {
  const dims = BANNER_FORMATS[options.format];
  const canvas = document.createElement("canvas");
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  await drawBannerArt(ctx, { ...options, width: dims.w, height: dims.h });

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });
  if (!blob) throw new Error("Failed to export PNG");
  return blob;
}
