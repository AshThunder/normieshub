import { GRID_SIZE, PIXEL_OFF, PIXEL_ON } from "../constants";
import { parsePixelString } from "./parse";

export function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  binary: string,
  x: number,
  y: number,
  scale: number,
): void {
  const grid = parsePixelString(binary);
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      ctx.fillStyle = grid[row][col] ? PIXEL_ON : PIXEL_OFF;
      ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
    }
  }
}

export function photoToNormiePixels(imageData: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;
  const ctx = canvas.getContext("2d")!;

  const temp = document.createElement("canvas");
  temp.width = imageData.width;
  temp.height = imageData.height;
  const tctx = temp.getContext("2d")!;
  tctx.putImageData(imageData, 0, 0);
  ctx.drawImage(temp, 0, 0, GRID_SIZE, GRID_SIZE);

  const scaled = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
  let binary = "";
  for (let i = 0; i < scaled.data.length; i += 4) {
    const r = scaled.data[i];
    const g = scaled.data[i + 1];
    const b = scaled.data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    binary += lum < 140 ? "1" : "0";
  }
  return binary;
}

export async function loadImageDataFromUrl(url: string): Promise<ImageData> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Deterministic 40×40 pixel string when the API is unavailable. */
export function placeholderPixelString(tokenId: number): string {
  let seed = tokenId * 2654435761;
  let binary = "";
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const inFace = row >= 8 && row < 32 && col >= 8 && col < 32;
      binary += inFace && seed % 3 === 0 ? "1" : "0";
    }
  }
  return binary;
}

/** Deterministic placeholder when the API is unavailable. */
export function normiePlaceholderDataUrl(tokenId: number, size = 80): string {
  return pixelsToDataUrl(placeholderPixelString(tokenId), size);
}

export function pixelsToDataUrl(binary: string, size = 80): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  drawPixelGrid(ctx, binary, 0, 0, size / GRID_SIZE);
  return canvas.toDataURL("image/png");
}

export async function loadImageDataFromFile(file: File): Promise<ImageData> {
  const url = URL.createObjectURL(file);
  try {
    return await loadImageDataFromUrl(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
