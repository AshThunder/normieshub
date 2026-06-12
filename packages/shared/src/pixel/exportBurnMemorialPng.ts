import { burnedNormiePngUrl } from "../api/normies";
import { HUB_HOST, PIXEL_OFF, PIXEL_ON } from "../constants";
import { drawPixelGrid, loadImageDataFromUrl, photoToNormiePixels, placeholderPixelString } from "./render";

export const MEMORIAL_CARD_W = 480;
export const MEMORIAL_CARD_H = 680;

export interface BurnMemorialPngOptions {
  tokenId: number;
  receiverTokenId?: string;
  burnedAt?: string;
  txHash?: string;
  width?: number;
  height?: number;
}

async function loadBurnedPixels(tokenId: number): Promise<string> {
  try {
    const res = await fetch(burnedNormiePngUrl(tokenId));
    if (!res.ok) throw new Error("burned image unavailable");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const data = await loadImageDataFromUrl(objectUrl);
      return photoToNormiePixels(data);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return placeholderPixelString(tokenId);
  }
}

function formatBurnDate(ts?: string): string | null {
  if (!ts) return null;
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export async function drawBurnMemorialArt(
  ctx: CanvasRenderingContext2D,
  options: BurnMemorialPngOptions,
): Promise<void> {
  const { tokenId, receiverTokenId, burnedAt, txHash, width = MEMORIAL_CARD_W, height = MEMORIAL_CARD_H } = options;

  ctx.fillStyle = "#2a2b2d";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(width * 0.06, height * 0.06, width * 0.88, height * 0.88);

  ctx.fillStyle = PIXEL_ON;
  ctx.textAlign = "center";
  ctx.font = `bold ${Math.floor(width * 0.045)}px monospace`;
  ctx.fillText("IN MEMORY OF", width / 2, height * 0.14);
  ctx.font = `bold ${Math.floor(width * 0.08)}px monospace`;
  ctx.fillText(`NORMIE #${tokenId}`, width / 2, height * 0.22);

  const faceSize = width * 0.48;
  const faceX = (width - faceSize) / 2;
  const faceY = height * 0.26;
  const pixels = await loadBurnedPixels(tokenId);

  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(faceX - 4, faceY - 4, faceSize + 8, faceSize + 8);
  drawPixelGrid(ctx, pixels, faceX, faceY, faceSize / 40);
  ctx.strokeStyle = PIXEL_ON;
  ctx.lineWidth = 3;
  ctx.strokeRect(faceX - 4, faceY - 4, faceSize + 8, faceSize + 8);

  let y = faceY + faceSize + width * 0.08;
  ctx.font = `${Math.floor(width * 0.028)}px monospace`;
  ctx.fillStyle = "rgba(72, 73, 75, 0.85)";
  ctx.fillText("Gone from the collection.", width / 2, y);
  y += width * 0.05;
  ctx.fillText("Preserved on Ethereum forever.", width / 2, y);

  const dateStr = formatBurnDate(burnedAt);
  if (dateStr) {
    y += width * 0.08;
    ctx.fillStyle = PIXEL_ON;
    ctx.fillText(`Burned ${dateStr}`, width / 2, y);
  }

  if (receiverTokenId) {
    y += width * 0.06;
    ctx.fillStyle = "rgba(72, 73, 75, 0.75)";
    ctx.fillText(`Sacrificed for Normie #${receiverTokenId}`, width / 2, y);
  }

  if (txHash) {
    y += width * 0.08;
    ctx.font = `${Math.floor(width * 0.02)}px monospace`;
    ctx.fillStyle = "rgba(72, 73, 75, 0.5)";
    const short = `${txHash.slice(0, 10)}…${txHash.slice(-8)}`;
    ctx.fillText(short, width / 2, y);
  }

  ctx.font = `${Math.floor(width * 0.025)}px monospace`;
  ctx.fillStyle = PIXEL_ON;
  ctx.fillText(HUB_HOST, width / 2, height * 0.92);
}

export async function exportBurnMemorialPng(options: BurnMemorialPngOptions): Promise<Blob> {
  const { width = MEMORIAL_CARD_W, height = MEMORIAL_CARD_H } = options;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  await drawBurnMemorialArt(ctx, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/png");
  });
}
