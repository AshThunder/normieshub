import { normieImageUrl } from "../api/normies";
import { HUB_HOST, PIXEL_OFF, PIXEL_ON } from "../constants";
import { CIRCLE_RINGS, layoutCircleSlots } from "./circleLayout";
import { drawPixelGrid } from "./render";

export interface CirclePngOptions {
  userPixels: string;
  normieIds: number[];
  handle?: string;
  size?: number;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
  return img;
}

function drawOrbitRings(ctx: CanvasRenderingContext2D, size: number, layoutSize: number) {
  const cx = size / 2;
  const cy = layoutSize / 2;
  ctx.strokeStyle = "rgba(72, 73, 75, 0.35)";
  ctx.lineWidth = Math.max(1, size * 0.004);
  for (const ring of CIRCLE_RINGS) {
    ctx.beginPath();
    ctx.arc(cx, cy, layoutSize * ring.radiusFrac, 0, Math.PI * 2);
    ctx.stroke();
  }
}

const FOOTER_FRAC = 0.11;

export async function drawCircleArt(
  ctx: CanvasRenderingContext2D,
  { userPixels, normieIds, handle, size = 800 }: CirclePngOptions,
): Promise<void> {
  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(0, 0, size, size);

  const footer = handle ? size * FOOTER_FRAC : size * 0.04;
  const layoutSize = size - footer;

  drawOrbitRings(ctx, size, layoutSize);

  const slots = layoutCircleSlots(normieIds, size, { reserveBottom: footer });
  const images = await Promise.all(slots.map((s) => loadImage(normieImageUrl(s.normieId))));

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const img = images[i];
    const half = slot.size / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, half, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, slot.x - half, slot.y - half, slot.size, slot.size);
    ctx.restore();
    ctx.strokeStyle = PIXEL_ON;
    ctx.lineWidth = Math.max(1, size * 0.003);
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, half, 0, Math.PI * 2);
    ctx.stroke();
  }

  const centerSize = layoutSize * 0.22;
  const cx = size / 2;
  const cy = layoutSize / 2;
  const gridScale = centerSize / 40;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, centerSize / 2, 0, Math.PI * 2);
  ctx.clip();
  drawPixelGrid(ctx, userPixels, cx - centerSize / 2, cy - centerSize / 2, gridScale);
  ctx.restore();

  ctx.strokeStyle = PIXEL_ON;
  ctx.lineWidth = Math.max(2, size * 0.005);
  ctx.beginPath();
  ctx.arc(cx, cy, centerSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  if (handle) {
    const label = `@${handle.replace(/^@/, "")}`;
    ctx.fillStyle = PIXEL_ON;
    ctx.font = `bold ${Math.round(size * 0.028)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, cx, size - footer * 0.55);
  }

  ctx.font = `${Math.round(size * 0.022)}px monospace`;
  ctx.fillStyle = "rgba(72, 73, 75, 0.6)";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(HUB_HOST, cx, size - size * 0.018);
}

export async function exportCirclePng(options: CirclePngOptions): Promise<Blob> {
  const size = options.size ?? 1200;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  await drawCircleArt(ctx, { ...options, size });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export PNG"));
    }, "image/png");
  });
}
