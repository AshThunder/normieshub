import { getPixels } from "../api/normies";
import { HUB_HOST, PIXEL_OFF, PIXEL_ON } from "../constants";
import { drawPixelGrid, placeholderPixelString } from "./render";

export interface SquadSheetPngOptions {
  normieIds: number[];
  walletAddress?: string;
  hideWalletAddress?: boolean;
  title?: string;
  width?: number;
}

function showWalletOnSheet(walletAddress?: string, hideWalletAddress?: boolean): boolean {
  return Boolean(walletAddress) && !hideWalletAddress;
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
  const cols = Math.ceil(Math.sqrt(count * 1.4));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

export function squadSheetHeight(
  count: number,
  width: number,
  walletAddress?: string,
  hideWalletAddress?: boolean,
): number {
  const footer = showWalletOnSheet(walletAddress, hideWalletAddress) ? 72 : 48;
  const header = 100;
  const pad = 24;
  const { cols, rows } = gridDims(count);
  const cell = Math.floor((width - pad * 2) / cols);
  return header + rows * cell + footer + pad;
}

export async function drawSquadSheetArt(
  ctx: CanvasRenderingContext2D,
  {
    normieIds,
    walletAddress,
    hideWalletAddress,
    title = "MY NORMIES",
    width = 1200,
  }: SquadSheetPngOptions,
): Promise<void> {
  const count = normieIds.length;
  const showWallet = showWalletOnSheet(walletAddress, hideWalletAddress);
  const footer = showWallet ? 72 : 48;
  const header = 100;
  const { cols, rows } = gridDims(count);
  const pad = 24;
  const gridW = width - pad * 2;
  const cell = Math.floor(gridW / cols);
  const gridH = rows * cell;
  const height = header + gridH + footer + pad;

  ctx.canvas.width = width;
  ctx.canvas.height = height;

  ctx.fillStyle = PIXEL_OFF;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = PIXEL_ON;
  ctx.font = `bold ${Math.floor(width * 0.045)}px monospace`;
  ctx.textAlign = "left";
  ctx.fillText(title, pad, 48);
  ctx.font = `${Math.floor(width * 0.022)}px monospace`;
  ctx.fillText(`${count} Normie${count === 1 ? "" : "s"} on Ethereum`, pad, 78);

  const pixelMap = await loadPixelMap(normieIds);

  for (let i = 0; i < count; i++) {
    const id = normieIds[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * cell;
    const y = header + row * cell;
    const inset = Math.floor(cell * 0.08);
    const size = cell - inset * 2;
    const px = pixelMap.get(id) ?? placeholderPixelString(id);

    ctx.fillStyle = PIXEL_OFF;
    ctx.fillRect(x + inset, y + inset, size, size);
    drawPixelGrid(ctx, px, x + inset, y + inset, size / 40);

    ctx.strokeStyle = PIXEL_ON;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + inset, y + inset, size, size);
    ctx.fillStyle = PIXEL_ON;
    ctx.font = `bold ${Math.max(10, Math.floor(cell * 0.12))}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(`#${id}`, x + cell / 2, y + cell - inset * 0.6);
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(72, 73, 75, 0.75)";
  ctx.font = `${Math.floor(width * 0.02)}px monospace`;
  const footerY = header + gridH + 36;
  if (showWallet && walletAddress) {
    ctx.fillText(walletAddress, width / 2, footerY);
  }
  ctx.fillText(`${HUB_HOST} · On-chain generative faces`, width / 2, footerY + (showWallet ? 24 : 0));
}

export async function exportSquadSheetPng(options: SquadSheetPngOptions): Promise<Blob> {
  const width = options.width ?? 1200;
  const height = squadSheetHeight(
    options.normieIds.length,
    width,
    options.walletAddress,
    options.hideWalletAddress,
  );
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  await drawSquadSheetArt(ctx, options);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), "image/png");
  });
}
