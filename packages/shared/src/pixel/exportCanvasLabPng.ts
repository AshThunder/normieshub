import { HUB_HOST, PIXEL_OFF, PIXEL_ON } from "../constants";
import { drawPixelGrid } from "./render";

export interface CanvasLabPngOptions {
  original: string;
  composited: string;
  tokenId: number;
  xorPartnerId?: number;
  pixelsChanged: number;
  size?: number;
}

export async function exportCanvasLabPng({
  original,
  composited,
  tokenId,
  xorPartnerId,
  pixelsChanged,
  size = 900,
}: CanvasLabPngOptions): Promise<Blob> {
  const pad = size * 0.06;
  const labelH = size * 0.1;
  const gridSize = size * 0.36;
  const gap = size * 0.08;
  const width = pad * 2 + gridSize * 2 + gap;
  const height = pad * 2 + labelH + gridSize + size * 0.08;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(0, 0, width, height);

  const scale = gridSize / 40;
  const gridY = pad + labelH;

  const drawPanel = (pixels: string, x: number, title: string, subtitle: string) => {
    ctx.fillStyle = PIXEL_ON;
    ctx.font = `bold ${Math.floor(size * 0.028)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(title, x + gridSize / 2, pad + size * 0.03);
    ctx.font = `${Math.floor(size * 0.02)}px monospace`;
    ctx.fillStyle = "rgba(72, 73, 75, 0.75)";
    ctx.fillText(subtitle, x + gridSize / 2, pad + size * 0.055);
    drawPixelGrid(ctx, pixels, x, gridY, scale);
    ctx.strokeStyle = PIXEL_ON;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, gridY, gridSize, gridSize);
  };

  drawPanel(original, pad, "ORIGINAL", `Normie #${tokenId} · mint`);
  const editSubtitle = xorPartnerId
    ? `XOR #${tokenId} + #${xorPartnerId} · ${pixelsChanged} px changed`
    : `${pixelsChanged} pixel${pixelsChanged === 1 ? "" : "s"} changed`;
  drawPanel(composited, pad + gridSize + gap, "YOUR EDIT", editSubtitle);

  ctx.fillStyle = "rgba(72, 73, 75, 0.6)";
  ctx.font = `${Math.floor(size * 0.022)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`Canvas Lab preview · ${HUB_HOST}`, width / 2, height - pad * 0.6);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/png");
  });
}
