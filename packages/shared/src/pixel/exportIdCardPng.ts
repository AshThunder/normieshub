import { getPixels } from "../api/normies";
import type { NormieMetadata } from "../api/types";
import { PIXEL_OFF, PIXEL_ON } from "../constants";
import { drawPixelGrid, placeholderPixelString } from "./render";

export interface IdCardPngOptions {
  tokenId?: number;
  metadata?: NormieMetadata;
  userPixels?: string;
  displayName?: string;
  tagline?: string;
  level?: string | number;
  pixelCount?: string | number;
  actionPoints?: string | number;
  customized?: boolean;
  width?: number;
  height?: number;
}

const CARD_W = 600;
const CARD_H = 880;

async function loadNormiePixels(tokenId: number): Promise<string> {
  try {
    const pixels = await getPixels(tokenId);
    if (pixels.length >= 1600) return pixels;
  } catch {
    /* placeholder */
  }
  return placeholderPixelString(tokenId);
}

function traitRows(metadata: NormieMetadata): { label: string; value: string }[] {
  return metadata.attributes
    .filter(
      (a) =>
        !a.display_type &&
        !["Level", "Pixel Count", "Action Points", "Customized"].includes(a.trait_type),
    )
    .map((a) => ({ label: a.trait_type, value: String(a.value) }));
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
  return `${out}…`;
}

function drawStatCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  scale: number,
): void {
  ctx.strokeStyle = PIXEL_ON;
  ctx.lineWidth = 2 * scale;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = PIXEL_ON;
  ctx.textAlign = "center";
  ctx.font = `bold ${Math.floor(22 * scale)}px monospace`;
  ctx.fillText(value, x + w / 2, y + h * 0.58);
  ctx.fillStyle = "rgba(72, 73, 75, 0.65)";
  ctx.font = `${Math.floor(11 * scale)}px monospace`;
  ctx.fillText(label.toUpperCase(), x + w / 2, y + h * 0.3);
}

async function drawNormieCard(
  ctx: CanvasRenderingContext2D,
  options: IdCardPngOptions,
  width: number,
  height: number,
): Promise<void> {
  const { tokenId, metadata, level, pixelCount, actionPoints, customized } = options;
  if (tokenId === undefined || !metadata) return;

  const scale = width / CARD_W;
  const pad = 20 * scale;
  const headerH = 52 * scale;

  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = PIXEL_ON;
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(pad * 0.4, pad * 0.4, width - pad * 0.8, height - pad * 0.8);

  ctx.fillStyle = PIXEL_ON;
  ctx.fillRect(pad, pad, width - pad * 2, headerH);
  ctx.fillStyle = PIXEL_OFF;
  ctx.textAlign = "left";
  ctx.font = `bold ${Math.floor(20 * scale)}px monospace`;
  ctx.fillText("NORMIES", pad + 14 * scale, pad + headerH * 0.62);
  ctx.textAlign = "right";
  ctx.font = `bold ${Math.floor(26 * scale)}px monospace`;
  ctx.fillText(`#${String(tokenId).padStart(4, "0")}`, width - pad - 14 * scale, pad + headerH * 0.62);

  const traits = traitRows(metadata);
  const typeTrait = traits.find((t) => t.label === "Type");
  const otherTraits = traits.filter((t) => t.label !== "Type");

  const faceSize = width * 0.44;
  const faceX = (width - faceSize) / 2;
  const faceY = pad + headerH + 18 * scale;

  ctx.fillStyle = PIXEL_ON;
  ctx.fillRect(faceX - 6 * scale, faceY - 6 * scale, faceSize + 12 * scale, faceSize + 12 * scale);
  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(faceX - 2 * scale, faceY - 2 * scale, faceSize + 4 * scale, faceSize + 4 * scale);

  const facePixels = await loadNormiePixels(tokenId);
  drawPixelGrid(ctx, facePixels, faceX, faceY, faceSize / 40);

  let y = faceY + faceSize + 22 * scale;
  if (typeTrait) {
    const badgeW = Math.min(width * 0.5, ctx.measureText(typeTrait.value.toUpperCase()).width + 40 * scale);
    const badgeX = (width - badgeW) / 2;
    ctx.fillStyle = PIXEL_ON;
    ctx.fillRect(badgeX, y, badgeW, 28 * scale);
    ctx.fillStyle = PIXEL_OFF;
    ctx.textAlign = "center";
    ctx.font = `bold ${Math.floor(14 * scale)}px monospace`;
    ctx.fillText(typeTrait.value.toUpperCase(), width / 2, y + 19 * scale);
    y += 38 * scale;
  }

  const statsY = y;
  const cellW = (width - pad * 2 - 8 * scale) / 3;
  const cellH = 52 * scale;
  const stats = [
    { label: "Level", value: level !== undefined && level !== "" ? String(level) : "—" },
    { label: "Pixels", value: pixelCount !== undefined && pixelCount !== "" ? String(pixelCount) : "—" },
    { label: "AP", value: actionPoints !== undefined && actionPoints !== "" ? String(actionPoints) : "—" },
  ];
  stats.forEach((s, i) => {
    drawStatCell(ctx, pad + i * (cellW + 4 * scale), statsY, cellW, cellH, s.label, s.value, scale);
  });

  y = statsY + cellH + 16 * scale;
  const traitsH = height - y - 48 * scale;
  ctx.strokeStyle = PIXEL_ON;
  ctx.lineWidth = 2 * scale;
  ctx.strokeRect(pad, y, width - pad * 2, traitsH);

  const rowH = Math.min((traitsH - 12 * scale) / Math.max(otherTraits.length, 1), 34 * scale);
  otherTraits.forEach((trait, i) => {
    const ry = y + 10 * scale + i * rowH;
    if (i > 0) {
      ctx.strokeStyle = "rgba(72, 73, 75, 0.2)";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(pad + 10 * scale, ry - 4 * scale);
      ctx.lineTo(width - pad - 10 * scale, ry - 4 * scale);
      ctx.stroke();
    }
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(72, 73, 75, 0.6)";
    ctx.font = `${Math.floor(11 * scale)}px monospace`;
    ctx.fillText(trait.label.toUpperCase(), pad + 14 * scale, ry + rowH * 0.45);
    ctx.fillStyle = PIXEL_ON;
    ctx.font = `bold ${Math.floor(13 * scale)}px monospace`;
    ctx.fillText(
      truncateText(ctx, trait.value, width - pad * 2 - 130 * scale),
      pad + 120 * scale,
      ry + rowH * 0.45,
    );
  });

  if (customized) {
    ctx.fillStyle = PIXEL_ON;
    ctx.fillRect(pad, y + traitsH - 22 * scale, 90 * scale, 18 * scale);
    ctx.fillStyle = PIXEL_OFF;
    ctx.font = `bold ${Math.floor(9 * scale)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("CUSTOMIZED", pad + 45 * scale, y + traitsH - 9 * scale);
  }

  ctx.fillStyle = "rgba(72, 73, 75, 0.55)";
  ctx.font = `${Math.floor(11 * scale)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText("FULLY ON-CHAIN · normies.art", width / 2, height - pad * 0.9);
}

async function drawPersonalCard(
  ctx: CanvasRenderingContext2D,
  options: IdCardPngOptions,
  width: number,
  height: number,
): Promise<void> {
  const { userPixels, displayName, tagline } = options;
  if (!userPixels) return;

  const scale = width / CARD_W;
  const pad = 20 * scale;
  const headerH = 52 * scale;

  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = PIXEL_ON;
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(pad * 0.4, pad * 0.4, width - pad * 0.8, height - pad * 0.8);

  ctx.fillStyle = PIXEL_ON;
  ctx.fillRect(pad, pad, width - pad * 2, headerH);
  ctx.fillStyle = PIXEL_OFF;
  ctx.textAlign = "center";
  ctx.font = `bold ${Math.floor(20 * scale)}px monospace`;
  ctx.fillText("PROVE YOU'RE A NORMIE", width / 2, pad + headerH * 0.62);

  const faceSize = width * 0.52;
  const faceX = (width - faceSize) / 2;
  const faceY = pad + headerH + 28 * scale;

  ctx.fillStyle = PIXEL_ON;
  ctx.fillRect(faceX - 6 * scale, faceY - 6 * scale, faceSize + 12 * scale, faceSize + 12 * scale);
  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(faceX - 2 * scale, faceY - 2 * scale, faceSize + 4 * scale, faceSize + 4 * scale);
  drawPixelGrid(ctx, userPixels, faceX, faceY, faceSize / 40);

  let y = faceY + faceSize + 36 * scale;
  ctx.fillStyle = PIXEL_ON;
  ctx.textAlign = "center";
  ctx.font = `bold ${Math.floor(28 * scale)}px monospace`;
  ctx.fillText(truncateText(ctx, (displayName || "NORMIE").toUpperCase(), width - pad * 2), width / 2, y);
  y += 36 * scale;

  if (tagline?.trim()) {
    ctx.font = `${Math.floor(14 * scale)}px monospace`;
    ctx.fillStyle = "rgba(72, 73, 75, 0.8)";
    ctx.fillText(truncateText(ctx, tagline.trim(), width - pad * 2), width / 2, y);
  }

  ctx.fillStyle = "rgba(72, 73, 75, 0.55)";
  ctx.font = `${Math.floor(11 * scale)}px monospace`;
  ctx.fillText("normies.art", width / 2, height - pad * 0.9);
}

export async function drawIdCardArt(
  ctx: CanvasRenderingContext2D,
  options: IdCardPngOptions,
): Promise<void> {
  const width = options.width ?? CARD_W;
  const height = options.height ?? CARD_H;

  if (options.userPixels && !options.metadata) {
    await drawPersonalCard(ctx, options, width, height);
  } else {
    await drawNormieCard(ctx, options, width, height);
  }
}

export async function exportIdCardPng(options: IdCardPngOptions): Promise<Blob> {
  const width = options.width ?? CARD_W;
  const height = options.height ?? CARD_H;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  await drawIdCardArt(ctx, { ...options, width, height });
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/png");
  });
}

export { CARD_W as ID_CARD_W, CARD_H as ID_CARD_H };
