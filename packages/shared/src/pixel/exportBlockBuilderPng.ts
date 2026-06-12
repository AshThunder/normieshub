import { getPixels } from "../api/normies";
import { HUB_HOST, PIXEL_OFF, PIXEL_ON } from "../constants";
import { drawPixelGrid, placeholderPixelString } from "./render";

export interface BlockBuilderPngOptions {
  normieIds: number[];
  score: number;
  linesCleared: number;
  width?: number;
}

async function loadPixelMap(ids: number[]): Promise<Map<number, string>> {
  const unique = [...new Set(ids)];
  const map = new Map<number, string>();
  const batchSize = 24;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const pairs = await Promise.all(
      batch.map(async (id) => {
        try {
          const pixels = await getPixels(id);
          if (pixels.length >= 1600) return [id, pixels] as const;
        } catch {
          /* placeholder */
        }
        return [id, placeholderPixelString(id)] as const;
      }),
    );
    for (const [id, px] of pairs) map.set(id, px);
  }
  return map;
}

function gridDims(count: number): { cols: number; rows: number } {
  if (count === 0) return { cols: 1, rows: 1 };
  const cols = Math.min(6, Math.ceil(Math.sqrt(count * 1.4)));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

export function blockBuilderPosterHeight(count: number, width = 900): number {
  const header = 200;
  const footer = 56;
  const pad = 32;
  const { cols, rows } = gridDims(count);
  const cell = Math.floor((width - pad * 2) / cols);
  const gridH = rows * cell;
  const emptyH = count === 0 ? 120 : 0;
  return header + gridH + emptyH + footer + pad;
}

export async function drawBlockBuilderPosterArt(
  ctx: CanvasRenderingContext2D,
  {
    normieIds,
    score,
    linesCleared,
    width = 900,
  }: BlockBuilderPngOptions,
): Promise<void> {
  const count = normieIds.length;
  const pad = 32;
  const header = 200;
  const footer = 56;
  const { cols, rows } = gridDims(count);
  const cell = Math.floor((width - pad * 2) / Math.max(cols, 1));
  const gridH = rows * cell;
  const emptyH = count === 0 ? 120 : 0;
  const height = header + gridH + emptyH + footer + pad;

  ctx.canvas.width = width;
  ctx.canvas.height = height;

  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = PIXEL_ON;
  ctx.font = "bold 42px monospace";
  ctx.textAlign = "left";
  ctx.fillText("NORMIE BLOCK BUILDER", pad, 52);

  ctx.font = "18px monospace";
  const statsY = 88;
  ctx.fillText(`Score: ${score}`, pad, statsY);
  ctx.fillText(`Lines cleared: ${linesCleared}`, pad + 220, statsY);
  ctx.fillText(`Normies collected: ${count}`, pad + 480, statsY);

  ctx.font = "14px monospace";
  ctx.fillStyle = "rgba(72, 73, 75, 0.85)";
  ctx.fillText("Each line cleared adds a Normie to your haul", pad, 118);

  const pixelMap = await loadPixelMap(normieIds);

  if (count === 0) {
    ctx.fillStyle = PIXEL_ON;
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("No lines cleared — stack higher next time!", width / 2, header + 64);
  } else {
    for (let i = 0; i < count; i++) {
      const id = normieIds[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * cell;
      const y = header + row * cell;
      const inset = Math.floor(cell * 0.08);
      const labelH = Math.max(18, Math.floor(cell * 0.2));
      const size = cell - inset * 2 - labelH;
      const artX = x + (cell - size) / 2;
      const artY = y + inset;
      const px = pixelMap.get(id) ?? placeholderPixelString(id);

      ctx.fillStyle = PIXEL_OFF;
      ctx.fillRect(artX, artY, size, size);
      drawPixelGrid(ctx, px, artX, artY, size / 40);
      ctx.strokeStyle = PIXEL_ON;
      ctx.lineWidth = 2;
      ctx.strokeRect(artX, artY, size, size);
      ctx.fillStyle = PIXEL_ON;
      ctx.font = `bold ${Math.max(11, Math.floor(cell * 0.11))}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(`#${id}`, x + cell / 2, artY + size + Math.floor(labelH * 0.15));
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(72, 73, 75, 0.75)";
  ctx.font = "14px monospace";
  const date = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  ctx.fillText(`${HUB_HOST} · ${date}`, width / 2, height - 24);
}

export async function exportBlockBuilderPng(options: BlockBuilderPngOptions): Promise<Blob> {
  const width = options.width ?? 900;
  const height = blockBuilderPosterHeight(options.normieIds.length, width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  await drawBlockBuilderPosterArt(ctx, options);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/png");
  });
}
