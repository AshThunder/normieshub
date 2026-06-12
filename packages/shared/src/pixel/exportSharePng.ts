import { normieImageUrl } from "../api/normies";
import { PIXEL_OFF, PIXEL_ON } from "../constants";
import { drawPixelGrid } from "./render";

export interface SharePngOptions {
  normieIds: number[];
  userPixels?: string;
  title?: string;
  score?: number;
}

async function loadNormieImage(id: number): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load normie ${id}`));
    img.src = normieImageUrl(id);
  });
  return img;
}

export async function exportSharePng(options: SharePngOptions): Promise<Blob> {
  const { normieIds, userPixels, title = "NORMIE RUN", score = 0 } = options;
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = PIXEL_ON;
  ctx.font = "bold 48px monospace";
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, 60);

  if (userPixels) {
    ctx.font = "16px monospace";
    ctx.textAlign = "left";
    ctx.fillText("YOUR PIXEL SELF", 80, 110);
    drawPixelGrid(ctx, userPixels, 80, 130, 8);
  }

  const cardStartX = userPixels ? 480 : 120;
  ctx.font = "16px monospace";
  ctx.fillText("COLLECTED NORMIES", cardStartX, 110);

  const ids = normieIds.slice(0, 12);
  const cols = Math.min(6, Math.max(1, ids.length));
  const cardSize = ids.length > 6 ? 80 : 120;
  const gap = ids.length > 6 ? 12 : 20;
  const images = await Promise.all(ids.map(loadNormieImage));
  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = cardStartX + col * (cardSize + gap);
    const y = 130 + row * (cardSize + 36);
    ctx.drawImage(img, x, y, cardSize, cardSize);
    ctx.font = "12px monospace";
    ctx.fillText(`#${ids[i]}`, x + cardSize / 2 - 16, y + cardSize + 16);
  });

  ctx.font = "20px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`SCORE: ${score}`, W / 2, H - 80);
  ctx.font = "14px monospace";
  ctx.fillStyle = "#888";
  ctx.fillText("normies.art", W / 2, H - 40);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export PNG"));
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
