import { HUB_HOST, PIXEL_OFF, PIXEL_ON } from "../constants";
import { drawPixelGrid } from "./render";

export interface PixelPngOptions {
  pixels: string;
  size?: number;
  label?: string;
  showWatermark?: boolean;
}

export async function exportPixelPng({
  pixels,
  size = 800,
  label,
  showWatermark = true,
}: PixelPngOptions): Promise<Blob> {
  const pad = size * 0.08;
  const gridSize = size - pad * 2 - (label ? size * 0.08 : 0);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(0, 0, size, size);

  const scale = gridSize / 40;
  const ox = (size - gridSize) / 2;
  const oy = label ? pad : (size - gridSize) / 2;
  drawPixelGrid(ctx, pixels, ox, oy, scale);

  ctx.strokeStyle = PIXEL_ON;
  ctx.lineWidth = Math.max(2, size * 0.006);
  ctx.strokeRect(ox, oy, gridSize, gridSize);

  if (label) {
    ctx.fillStyle = PIXEL_ON;
    ctx.font = `bold ${Math.round(size * 0.04)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(label.startsWith("@") ? label : `@${label}`, size / 2, size - pad * 0.6);
  }

  if (showWatermark) {
    ctx.font = `${Math.round(size * 0.025)}px monospace`;
    ctx.fillStyle = "rgba(72, 73, 75, 0.5)";
    ctx.textAlign = "center";
    ctx.fillText(HUB_HOST, size / 2, size - pad * 0.15);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export PNG"));
    }, "image/png");
  });
}
