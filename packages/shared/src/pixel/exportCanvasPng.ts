import { PIXEL_OFF } from "../constants";
import { drawPixelGrid } from "./render";

export interface CanvasPngOptions {
  pixels: string;
  size?: number;
}

export async function exportCanvasPng({ pixels, size = 800 }: CanvasPngOptions): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(0, 0, size, size);
  drawPixelGrid(ctx, pixels, 0, 0, size / 40);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/png");
  });
}
