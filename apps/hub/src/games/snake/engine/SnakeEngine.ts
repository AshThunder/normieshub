import { normieImageUrl } from "@normie/shared";
import { audioManager } from "../../../audio/audioManager";
import { randomNormieIds } from "../../../data/traits-index";
import { getSnakeHighScore, saveSnakeScore } from "../snake-scores";

export const GRID = 20;
export const CELL = 24;
export const CANVAS_SIZE = GRID * CELL;

export type Direction = "up" | "down" | "left" | "right";
export type SnakeDifficulty = "easy" | "medium" | "hard";

export const SNAKE_SPEED: Record<
  SnakeDifficulty,
  { label: string; tickMs: number; minTickMs: number; speedUp: number }
> = {
  easy: { label: "Easy", tickMs: 185, minTickMs: 105, speedUp: 1 },
  medium: { label: "Medium", tickMs: 140, minTickMs: 75, speedUp: 2 },
  hard: { label: "Hard", tickMs: 95, minTickMs: 50, speedUp: 3 },
};

export interface SnakeSegment {
  x: number;
  y: number;
}

export interface SnakeHud {
  score: number;
  eaten: number;
  length: number;
  highScore: number;
  status: "ready" | "playing" | "dead";
  message: string;
  difficulty: SnakeDifficulty;
}

export interface SnakeCallbacks {
  onHud: (hud: SnakeHud) => void;
}

function opposite(a: Direction, b: Direction): boolean {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}

export class SnakeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: SnakeCallbacks;
  private headTokenId = 42;
  private snake: SnakeSegment[] = [];
  /** Eaten Normie faces for body segments tail → neck; append-only on eat. */
  private eatenNormies: number[] = [];
  private direction: Direction = "right";
  private nextDirection: Direction = "right";
  private food: { x: number; y: number; tokenId: number } | null = null;
  private score = 0;
  private eaten = 0;
  private status: SnakeHud["status"] = "ready";
  private message = "Press arrow keys or tap to start";
  private difficulty: SnakeDifficulty = "medium";
  private tickMs = 140;
  private minTickMs = 75;
  private speedUp = 2;
  private accumulator = 0;
  private lastTime = 0;
  private raf = 0;
  private running = false;
  private images = new Map<number, HTMLImageElement>();
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private inputBound = false;
  private touchStart: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: SnakeCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.callbacks = callbacks;
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.unbindInput();
  }

  steer(dir: Direction) {
    this.setDirection(dir);
  }

  retry() {
    if (this.status === "dead") {
      void this.start(this.headTokenId, this.difficulty);
    }
  }

  private resize = () => {
    this.canvas.width = this.canvas.clientWidth || CANVAS_SIZE;
    this.canvas.height = this.canvas.clientHeight || CANVAS_SIZE;
    const scaleX = this.canvas.width / CANVAS_SIZE;
    const scaleY = this.canvas.height / CANVAS_SIZE;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (this.canvas.width - CANVAS_SIZE * this.scale) / 2;
    this.offsetY = (this.canvas.height - CANVAS_SIZE * this.scale) / 2;
  };

  async start(headTokenId: number, difficulty: SnakeDifficulty = "medium") {
    this.headTokenId = headTokenId;
    this.difficulty = difficulty;
    const speed = SNAKE_SPEED[difficulty];
    this.tickMs = speed.tickMs;
    this.minTickMs = speed.minTickMs;
    this.speedUp = speed.speedUp;
    this.score = 0;
    this.eaten = 0;
    this.direction = "right";
    this.nextDirection = "right";
    this.status = "ready";
    this.message = "Arrow keys / WASD / swipe — press any direction to start";

    const cx = Math.floor(GRID / 2);
    const cy = Math.floor(GRID / 2);
    this.snake = [{ x: cx, y: cy }];
    this.eatenNormies = [];

    this.food = this.spawnFood();
    await this.preloadImages([headTokenId, this.food.tokenId]);

    this.bindInput();
    this.running = true;
    this.lastTime = performance.now();
    this.emitHud();
    this.loop();
  }

  private highScore(): number {
    return getSnakeHighScore(this.difficulty);
  }

  private emitHud() {
    this.callbacks.onHud({
      score: this.score,
      eaten: this.eaten,
      length: this.snake.length,
      highScore: this.highScore(),
      status: this.status,
      message: this.message,
      difficulty: this.difficulty,
    });
  }

  private imageReady(id: number): boolean {
    const img = this.images.get(id);
    return !!img?.complete && img.naturalWidth > 0;
  }

  private async preloadImages(ids: number[]) {
    const unique = [...new Set(ids.filter((id) => id >= 0))];
    await Promise.all(
      unique.map(async (id) => {
        if (this.imageReady(id)) return;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = normieImageUrl(id);
        await new Promise<void>((res) => {
          img.onload = () => res();
          img.onerror = () => res();
        });
        this.images.set(id, img);
      }),
    );
  }

  private ensureImagesLoaded(ids: number[]) {
    const missing = ids.filter((id) => id >= 0 && !this.imageReady(id));
    if (missing.length === 0) return;
    void this.preloadImages(missing);
  }

  private spawnFood() {
    const occupied = new Set(this.snake.map((s) => `${s.x},${s.y}`));
    let x = 0;
    let y = 0;
    let attempts = 0;
    do {
      x = Math.floor(Math.random() * GRID);
      y = Math.floor(Math.random() * GRID);
      attempts++;
    } while (occupied.has(`${x},${y}`) && attempts < 200);

    const used = new Set([this.headTokenId, ...this.eatenNormies]);
    let tokenId = randomNormieIds(1, this.headTokenId)[0];
    for (let i = 0; i < 20 && used.has(tokenId); i++) {
      tokenId = randomNormieIds(1, this.headTokenId)[0];
    }
    void this.preloadImages([tokenId]);
    return { x, y, tokenId };
  }

  private bindInput() {
    if (this.inputBound) return;
    this.inputBound = true;
    window.addEventListener("keydown", this.onKey);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
  }

  private unbindInput() {
    if (!this.inputBound) return;
    this.inputBound = false;
    window.removeEventListener("keydown", this.onKey);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
  }

  private setDirection(dir: Direction) {
    if (this.status === "dead") return;
    if (this.status === "ready") {
      this.status = "playing";
      this.message = "Eat Normies to grow!";
      audioManager.playSfx("start");
    }
    if (opposite(dir, this.direction)) return;
    this.nextDirection = dir;
    this.emitHud();
  }

  private onKey = (e: KeyboardEvent) => {
    const map: Record<string, Direction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      W: "up",
      s: "down",
      S: "down",
      a: "left",
      A: "left",
      d: "right",
      D: "right",
    };
    const dir = map[e.key];
    if (dir) {
      e.preventDefault();
      this.setDirection(dir);
    }
    if (e.key === " " && this.status === "dead") {
      e.preventDefault();
      void this.start(this.headTokenId, this.difficulty);
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    this.touchStart = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.touchStart) return;
    const dx = e.clientX - this.touchStart.x;
    const dy = e.clientY - this.touchStart.y;
    this.touchStart = null;
    if (Math.hypot(dx, dy) < 16) {
      if (this.status === "ready") this.setDirection(this.direction);
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      this.setDirection(dx > 0 ? "right" : "left");
    } else {
      this.setDirection(dy > 0 ? "down" : "up");
    }
  };

  private step() {
    this.direction = this.nextDirection;
    const head = this.snake[this.snake.length - 1];
    const next = { x: head.x, y: head.y };

    if (this.direction === "up") next.y--;
    if (this.direction === "down") next.y++;
    if (this.direction === "left") next.x--;
    if (this.direction === "right") next.x++;

    if (next.x < 0 || next.x >= GRID || next.y < 0 || next.y >= GRID) {
      this.die("Hit the wall!");
      return;
    }

    if (this.snake.some((s) => s.x === next.x && s.y === next.y)) {
      this.die("Bit yourself!");
      return;
    }

    const ate = this.food && next.x === this.food.x && next.y === this.food.y;
    this.snake.push(next);

    if (ate && this.food) {
      const foodId = this.food.tokenId;
      this.eaten++;
      this.score = this.eaten * 10;
      this.eatenNormies.push(foodId);
      void this.preloadImages([foodId]);
      audioManager.playSfx("eat");
      this.food = this.spawnFood();
      if (this.tickMs > this.minTickMs) this.tickMs -= this.speedUp;
    } else {
      this.snake.shift();
    }

    this.emitHud();
  }

  private die(reason: string) {
    this.status = "dead";
    audioManager.playSfx("die");
    saveSnakeScore(this.difficulty, this.score);
    this.message = `${reason} Score: ${this.score} (${this.eaten} Normies). Space to retry.`;
    this.emitHud();
  }

  private loop = (now = performance.now()) => {
    if (!this.running) return;
    const dt = now - this.lastTime;
    this.lastTime = now;

    if (this.status === "playing") {
      this.accumulator += dt;
      while (this.accumulator >= this.tickMs) {
        this.step();
        this.accumulator -= this.tickMs;
      }
    }

    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#e3e5e4";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#e3e5e4" : "#d8dad9";
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    ctx.strokeStyle = "#48494b";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (this.food) {
      const img = this.images.get(this.food.tokenId);
      const px = this.food.x * CELL + 2;
      const py = this.food.y * CELL + 2;
      const size = CELL - 4;
      ctx.fillStyle = "#f5f5f4";
      ctx.fillRect(px - 1, py - 1, size + 2, size + 2);
      ctx.strokeStyle = "#1a1a1a";
      ctx.strokeRect(px - 1, py - 1, size + 2, size + 2);
      if (img?.complete) {
        ctx.drawImage(img, px, py, size, size);
      }
    }

    this.ensureImagesLoaded([
      this.headTokenId,
      ...this.eatenNormies,
      ...(this.food ? [this.food.tokenId] : []),
    ]);

    this.snake.forEach((seg, i) => {
      const isHead = i === this.snake.length - 1;
      const faceId = isHead ? this.headTokenId : this.eatenNormies[i];
      const img = this.images.get(faceId);
      const pad = 2;
      const px = seg.x * CELL + pad;
      const py = seg.y * CELL + pad;
      const size = CELL - pad * 2;
      ctx.fillStyle = isHead ? "#48494b" : "#c8cac9";
      ctx.fillRect(px - 1, py - 1, size + 2, size + 2);
      if (faceId !== undefined && this.imageReady(faceId)) {
        ctx.drawImage(img!, px, py, size, size);
      } else {
        ctx.fillStyle = "#48494b";
        ctx.fillRect(px + 4, py + 4, size - 8, size - 8);
      }
      if (isHead) {
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
        ctx.strokeRect(px - 1, py - 1, size + 2, size + 2);
      }
    });

    if (this.status !== "playing") {
      ctx.fillStyle = "rgba(26, 26, 26, 0.45)";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.fillStyle = "#e3e5e4";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        this.status === "dead" ? "GAME OVER" : "NORMIE SNAKE",
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2 - 8,
      );
      ctx.font = "11px monospace";
      ctx.fillText(this.message, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 14);
    }

    ctx.restore();
  }
}
