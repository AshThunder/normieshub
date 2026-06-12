import {
  getPixels,
  normieImageUrl,
  normiePlaceholderDataUrl,
  pixelsToDataUrl,
} from "@normie/shared";
import { audioManager } from "../../../audio/audioManager";
import { randomNormieIds } from "../../../data/traits-index";
import {
  type ActivePiece,
  pieceCells,
  previewCells,
  randomPieceKind,
  rotatePiece,
  spawnPiece,
  type PieceKind,
} from "./tetrominoes";
import {
  BLOCK_SPEED,
  type BlockBuilderCallbacks,
  type BlockBuilderHud,
  type BlockDifficulty,
} from "./types";

export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const TOTAL_ROWS = 22;
export const CELL = 24;
export const SIDEBAR_W = 96;
export const VIRTUAL_W = COLS * CELL + SIDEBAR_W;
export const VIRTUAL_H = VISIBLE_ROWS * CELL;

const LINE_SCORES = [0, 100, 300, 500, 800];
const PIXEL_ON = "#48494b";
const PIXEL_OFF = "#e3e5e4";

export class BlockBuilderEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: BlockBuilderCallbacks;
  private board: (0 | 1)[][] = [];
  private active: ActivePiece | null = null;
  private nextKind: PieceKind = "T";
  private normiePool: number[] = [];
  private collectedNormieIds: number[] = [];
  private previewImages = new Map<number, HTMLImageElement>();
  private score = 0;
  private lines = 0;
  private level = 1;
  private status: BlockBuilderHud["status"] = "playing";
  private message = "";
  private difficulty: BlockDifficulty = "medium";
  private tickMs = 650;
  private minTickMs = 280;
  private linesPerLevel = 10;
  private accumulator = 0;
  private lastTime = 0;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private raf = 0;
  private running = false;
  private inputBound = false;
  private loadGeneration = 0;
  private resizeObserver?: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, callbacks: BlockBuilderCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.callbacks = callbacks;
    this.resetBoard();
    this.resize();
    window.addEventListener("resize", this.resize);
    if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas.parentElement);
    }
  }

  destroy() {
    this.loadGeneration++;
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.resizeObserver?.disconnect();
    this.unbindInput();
  }

  start(difficulty: BlockDifficulty = "medium") {
    this.loadGeneration++;
    const gen = this.loadGeneration;
    this.difficulty = difficulty;
    const speed = BLOCK_SPEED[difficulty];
    this.tickMs = speed.tickMs;
    this.minTickMs = speed.minTickMs;
    this.linesPerLevel = speed.linesPerLevel;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.collectedNormieIds = [];
    this.normiePool = randomNormieIds(32);
    this.resetBoard();
    this.nextKind = randomPieceKind();
    this.status = "playing";
    this.message = "";
    this.active = null;
    this.unbindInput();
    this.bindInput();
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.spawnNext();
    audioManager.playSfx("start");
    this.emitHud();
    this.loop(this.lastTime);
    void this.preloadPreviewImages(gen);
  }

  moveLeft() {
    if (this.status !== "playing" || !this.active) return;
    this.tryMove(-1, 0);
  }

  moveRight() {
    if (this.status !== "playing" || !this.active) return;
    this.tryMove(1, 0);
  }

  rotateCW() {
    if (this.status !== "playing" || !this.active) return;
    this.tryRotate(1);
  }

  softDrop() {
    if (this.status !== "playing" || !this.active) return;
    if (this.tryMove(0, 1)) {
      this.score += 1;
      this.emitHud();
    }
  }

  hardDrop() {
    if (this.status !== "playing" || !this.active) return;
    let dropped = 0;
    while (this.tryMove(0, 1)) dropped++;
    this.score += dropped * 2;
    this.lockPiece();
  }

  private resetBoard() {
    this.board = Array.from({ length: TOTAL_ROWS }, () =>
      Array.from({ length: COLS }, () => 0 as 0 | 1),
    );
  }

  private resize = () => {
    this.canvas.width = this.canvas.clientWidth || VIRTUAL_W;
    this.canvas.height = this.canvas.clientHeight || VIRTUAL_H;
    const scaleX = this.canvas.width / VIRTUAL_W;
    const scaleY = this.canvas.height / VIRTUAL_H;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (this.canvas.width - VIRTUAL_W * this.scale) / 2;
    this.offsetY = (this.canvas.height - VIRTUAL_H * this.scale) / 2;
  };

  private async preloadPreviewImages(gen: number) {
    const ids = [...new Set(this.collectedNormieIds.slice(-6))];
    await Promise.all(ids.map((id) => this.ensurePreviewImage(id, gen)));
  }

  private async ensurePreviewImage(id: number, gen: number) {
    if (gen !== this.loadGeneration || this.previewImages.has(id)) return;
    const img = await loadNormieImage(id);
    if (gen !== this.loadGeneration) return;
    this.previewImages.set(id, img);
  }

  private pickNormieId(): number {
    return this.normiePool[Math.floor(Math.random() * this.normiePool.length)] ?? 0;
  }

  private spawnNext() {
    const piece = spawnPiece(this.nextKind);
    this.nextKind = randomPieceKind();
    if (this.collides(pieceCells(piece))) {
      this.active = piece;
      this.gameOver();
      return;
    }
    this.active = piece;
  }

  private gameOver() {
    this.status = "dead";
    this.message = "Stack full!";
    this.running = false;
    audioManager.playSfx("die");
    this.emitHud();
    this.callbacks.onGameOver({
      score: this.score,
      linesCleared: this.lines,
      collectedNormieIds: [...this.collectedNormieIds],
    });
  }

  private collides(cells: { x: number; y: number }[]): boolean {
    for (const { x, y } of cells) {
      if (x < 0 || x >= COLS || y >= TOTAL_ROWS) return true;
      if (y >= 0 && this.board[y][x]) return true;
    }
    return false;
  }

  private tryMove(dx: number, dy: number): boolean {
    if (!this.active) return false;
    const moved = { ...this.active, x: this.active.x + dx, y: this.active.y + dy };
    if (this.collides(pieceCells(moved))) return false;
    this.active = moved;
    if (dx !== 0) audioManager.playSfx("turn", { minIntervalMs: 40 });
    return true;
  }

  private tryRotate(dir: 1 | -1): boolean {
    if (!this.active) return false;
    const rotated = rotatePiece(this.active, dir);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      const candidate = { ...rotated, x: rotated.x + kick };
      if (!this.collides(pieceCells(candidate))) {
        this.active = candidate;
        audioManager.playSfx("select");
        return true;
      }
    }
    return false;
  }

  private lockPiece() {
    if (!this.active) return;
    for (const { x, y } of pieceCells(this.active)) {
      if (y >= 0 && y < TOTAL_ROWS && x >= 0 && x < COLS) {
        this.board[y][x] = 1;
      }
    }
    this.active = null;
    audioManager.playSfx("place");
    this.clearLines();
    this.spawnNext();
    this.emitHud();
  }

  private clearLines() {
    let cleared = 0;
    for (let y = TOTAL_ROWS - 1; y >= 0; y--) {
      if (this.board[y].every((c) => c === 1)) {
        this.board.splice(y, 1);
        this.board.unshift(Array.from({ length: COLS }, () => 0));
        cleared++;
        y++;
      }
    }
    if (cleared === 0) return;

    for (let i = 0; i < cleared; i++) {
      const id = this.pickNormieId();
      this.collectedNormieIds.push(id);
      void this.ensurePreviewImage(id, this.loadGeneration);
    }

    this.lines += cleared;
    this.score += (LINE_SCORES[cleared] ?? cleared * 100) * this.level;
    const newLevel = Math.floor(this.lines / this.linesPerLevel) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.tickMs = Math.max(
        this.minTickMs,
        BLOCK_SPEED[this.difficulty].tickMs - (this.level - 1) * 45,
      );
    }
    audioManager.playSfx("floorClear");
    this.message = cleared > 1 ? `${cleared} lines — Normie collected!` : "Line clear — Normie collected!";
  }

  private ghostPiece(): ActivePiece | null {
    if (!this.active) return null;
    let ghost = { ...this.active };
    while (!this.collides(pieceCells({ ...ghost, y: ghost.y + 1 }))) {
      ghost = { ...ghost, y: ghost.y + 1 };
    }
    return ghost;
  }

  private emitHud() {
    this.callbacks.onHud({
      score: this.score,
      lines: this.lines,
      level: this.level,
      collected: this.collectedNormieIds.length,
      status: this.status,
      message: this.message,
      difficulty: this.difficulty,
    });
  }

  private bindInput() {
    if (this.inputBound) return;
    this.inputBound = true;
    window.addEventListener("keydown", this.onKey);
  }

  private unbindInput() {
    if (!this.inputBound) return;
    this.inputBound = false;
    window.removeEventListener("keydown", this.onKey);
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.status === "dead") return;
    switch (e.code) {
      case "ArrowLeft":
        e.preventDefault();
        this.moveLeft();
        break;
      case "ArrowRight":
        e.preventDefault();
        this.moveRight();
        break;
      case "ArrowUp":
        e.preventDefault();
        this.rotateCW();
        break;
      case "ArrowDown":
        e.preventDefault();
        this.softDrop();
        break;
      case "Space":
        e.preventDefault();
        this.hardDrop();
        break;
      default:
        break;
    }
  };

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = now - this.lastTime;
    this.lastTime = now;
    if (this.status === "playing" && this.active) {
      this.accumulator += dt;
      while (this.accumulator >= this.tickMs) {
        this.accumulator -= this.tickMs;
        if (!this.tryMove(0, 1)) {
          this.lockPiece();
          break;
        }
      }
    }
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = PIXEL_OFF;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    const boardW = COLS * CELL;
    ctx.fillStyle = "#f5f5f4";
    ctx.fillRect(0, 0, boardW, VIRTUAL_H);
    ctx.strokeStyle = "#d0d2d1";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, VIRTUAL_H);
      ctx.stroke();
    }
    for (let y = 0; y <= VISIBLE_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(boardW, y * CELL);
      ctx.stroke();
    }

    const rowOffset = TOTAL_ROWS - VISIBLE_ROWS;
    for (let y = 0; y < VISIBLE_ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.board[y + rowOffset][x]) {
          ctx.fillStyle = PIXEL_ON;
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        }
      }
    }

    const ghost = this.ghostPiece();
    if (ghost) this.drawPieceCells(pieceCells(ghost), "rgba(72,73,75,0.25)", true);
    if (this.active) this.drawPieceCells(pieceCells(this.active), PIXEL_ON, false);

    this.drawSidebar();

    ctx.restore();
  }

  private drawPieceCells(
    cells: { x: number; y: number }[],
    color: string,
    ghost: boolean,
  ) {
    const ctx = this.ctx;
    const rowOffset = TOTAL_ROWS - VISIBLE_ROWS;
    ctx.fillStyle = color;
    for (const { x, y } of cells) {
      const vy = y - rowOffset;
      if (vy < 0 || vy >= VISIBLE_ROWS) continue;
      if (ghost) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x * CELL + 3, vy * CELL + 3, CELL - 6, CELL - 6);
      } else {
        ctx.fillRect(x * CELL + 1, vy * CELL + 1, CELL - 2, CELL - 2);
      }
    }
  }

  private drawSidebar() {
    const ctx = this.ctx;
    const sx = COLS * CELL + 8;
    ctx.fillStyle = PIXEL_ON;
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("NEXT", sx, 18);

    const cells = previewCells(this.nextKind);
    const minX = Math.min(...cells.map((c) => c.x));
    const minY = Math.min(...cells.map((c) => c.y));
    const previewCell = 14;
    const px = sx + 8;
    const py = 28;
    ctx.fillStyle = PIXEL_ON;
    for (const c of cells) {
      ctx.fillRect(
        px + (c.x - minX) * previewCell,
        py + (c.y - minY) * previewCell,
        previewCell - 2,
        previewCell - 2,
      );
    }

    ctx.fillStyle = PIXEL_ON;
    ctx.fillText("NORMIES", sx, 96);
    ctx.font = "9px monospace";
    ctx.fillText(String(this.collectedNormieIds.length), sx, 110);

    const recent = this.collectedNormieIds.slice(-4);
    recent.forEach((id, i) => {
      const img = this.previewImages.get(id);
      const iy = 118 + i * 22;
      if (img?.complete && img.naturalWidth) {
        ctx.drawImage(img, sx, iy, 20, 20);
      } else {
        ctx.fillStyle = PIXEL_ON;
        ctx.fillRect(sx, iy, 20, 20);
      }
    });

    if (this.status === "ready") {
      ctx.fillStyle = "rgba(72,73,75,0.85)";
      ctx.font = "9px monospace";
      ctx.fillText("READY", sx, VIRTUAL_H - 48);
    }
  }
}

const IMAGE_LOAD_MS = 6000;

async function loadNormieImage(id: number): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";

  const loaded = await new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => resolve(false), IMAGE_LOAD_MS);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img.naturalWidth > 0);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(false);
    };
    img.src = normieImageUrl(id);
  });

  if (!loaded) {
    try {
      const pixels = await getPixels(id);
      img.src = pixelsToDataUrl(pixels, 40);
    } catch {
      img.src = normiePlaceholderDataUrl(id, 40);
    }
    await new Promise<void>((resolve) => {
      if (img.complete && img.naturalWidth > 0) {
        resolve();
        return;
      }
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  }

  return img;
}
