import {
  getPenaltyModifiers,
  getPixels,
  getTraits,
  normieImageUrl,
  normiePlaceholderDataUrl,
  pixelsToDataUrl,
} from "@normie/shared";
import { audioManager } from "../../../audio/audioManager";

export const VIRTUAL_W = 640;
export const VIRTUAL_H = 400;

export type PenaltyMode = "solo" | "shootout";
export type GoalZone = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type PenaltyPhase =
  | "aim"
  | "power"
  | "flying"
  | "result"
  | "keeper_aim"
  | "keeper_result"
  | "gameover";

export interface PenaltyHud {
  phase: PenaltyPhase;
  mode: PenaltyMode;
  round: number;
  maxRounds: number;
  playerGoals: number;
  playerSaves: number;
  aiGoals: number;
  aiSaves: number;
  isPlayerKicker: boolean;
  power: number;
  message: string;
  kickerId: number;
  keeperId: number;
}

export interface PenaltyCallbacks {
  onHud: (hud: PenaltyHud) => void;
  onComplete: (won: boolean, playerGoals: number, aiGoals: number) => void;
}

const ZONE_COLS = 3;
const ZONE_ROWS = 3;

function zoneCenter(zone: GoalZone): { x: number; y: number } {
  const col = zone % 3;
  const row = Math.floor(zone / 3);
  const gw = 280;
  const gh = 140;
  const gx = (VIRTUAL_W - gw) / 2;
  const gy = 40;
  return {
    x: gx + (col + 0.5) * (gw / ZONE_COLS),
    y: gy + (row + 0.5) * (gh / ZONE_ROWS),
  };
}

export class PenaltyEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: PenaltyCallbacks;
  private mode: PenaltyMode = "solo";
  private phase: PenaltyPhase = "aim";
  private round = 1;
  private maxRounds = 5;
  private playerGoals = 0;
  private playerSaves = 0;
  private aiGoals = 0;
  private aiSaves = 0;
  private isPlayerKicker = true;
  private suddenDeath = false;

  private kickerId = 42;
  private keeperId = 615;
  private playerType = "Human";
  private aiType = "Alien";

  private aimZone: GoalZone = 4;
  private power = 0;
  private powerDir = 1;
  private keeperZone: GoalZone | null = null;
  private ballPos = { x: VIRTUAL_W / 2, y: VIRTUAL_H - 60 };
  private ballTarget = { x: VIRTUAL_W / 2, y: 100 };
  private ballT = 0;
  private resultTimer = 0;
  private message = "Pick a zone, then set power";

  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private images = new Map<number, HTMLImageElement>();
  private raf = 0;
  private running = false;
  private inputBound = false;
  private lastTime = 0;
  private loadGeneration = 0;
  private resizeObserver?: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, callbacks: PenaltyCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.callbacks = callbacks;
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

  private resize = () => {
    this.canvas.width = this.canvas.clientWidth || VIRTUAL_W;
    this.canvas.height = this.canvas.clientHeight || VIRTUAL_H;
    const scaleX = this.canvas.width / VIRTUAL_W;
    const scaleY = this.canvas.height / VIRTUAL_H;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (this.canvas.width - VIRTUAL_W * this.scale) / 2;
    this.offsetY = (this.canvas.height - VIRTUAL_H * this.scale) / 2;
  };

  async start(mode: PenaltyMode, kickerId: number, squadIds: number[]) {
    const gen = ++this.loadGeneration;
    this.unbindInput();
    this.mode = mode;
    this.kickerId = kickerId;
    this.keeperId = squadIds.find((id) => id !== kickerId) ?? 615;
    this.round = 1;
    this.playerGoals = 0;
    this.playerSaves = 0;
    this.aiGoals = 0;
    this.aiSaves = 0;
    this.suddenDeath = false;
    this.isPlayerKicker = true;
    this.phase = "aim";
    this.message = "Pick a zone, then set power";
    this.playerType = "Human";
    this.aiType = "Alien";

    this.bindInput();
    this.running = true;
    this.lastTime = performance.now();
    this.resize();
    this.emitHud();
    this.loop();

    void this.preloadAssets(gen, [kickerId, this.keeperId, 615, 100, 200], kickerId, this.keeperId);
  }

  private async preloadAssets(
    gen: number,
    imageIds: number[],
    kickerId: number,
    keeperId: number,
  ) {
    await Promise.all(imageIds.map((id) => this.ensureImage(id, gen)));

    if (gen !== this.loadGeneration) return;

    try {
      const traits = await getTraits(kickerId);
      if (gen !== this.loadGeneration) return;
      this.playerType =
        traits.attributes.find((a) => a.trait_type === "Type")?.value ?? "Human";
    } catch {
      this.playerType = "Human";
    }
    try {
      const traits = await getTraits(keeperId);
      if (gen !== this.loadGeneration) return;
      this.aiType = traits.attributes.find((a) => a.trait_type === "Type")?.value ?? "Alien";
    } catch {
      this.aiType = "Alien";
    }
    this.emitHud();
  }

  private async ensureImage(id: number, gen: number) {
    if (gen !== this.loadGeneration || this.images.has(id)) return;
    const img = await loadNormieImage(id);
    if (gen !== this.loadGeneration) return;
    this.images.set(id, img);
  }

  private emitHud() {
    this.callbacks.onHud({
      phase: this.phase,
      mode: this.mode,
      round: this.round,
      maxRounds: this.maxRounds,
      playerGoals: this.playerGoals,
      playerSaves: this.playerSaves,
      aiGoals: this.aiGoals,
      aiSaves: this.aiSaves,
      isPlayerKicker: this.isPlayerKicker,
      power: this.power,
      message: this.message,
      kickerId: this.isPlayerKicker ? this.kickerId : this.keeperId,
      keeperId: this.isPlayerKicker ? this.keeperId : this.kickerId,
    });
  }

  private bindInput() {
    if (this.inputBound) return;
    this.inputBound = true;
    this.canvas.addEventListener("pointerdown", this.onPointer);
    window.addEventListener("keydown", this.onKey);
  }

  private unbindInput() {
    if (!this.inputBound) return;
    this.inputBound = false;
    this.canvas.removeEventListener("pointerdown", this.onPointer);
    window.removeEventListener("keydown", this.onKey);
  }

  private screenToVirtual(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left - this.offsetX) / this.scale;
    const y = (clientY - rect.top - this.offsetY) / this.scale;
    return { x, y };
  }

  private hitZone(x: number, y: number): GoalZone | null {
    const gw = 280;
    const gh = 140;
    const gx = (VIRTUAL_W - gw) / 2;
    const gy = 40;
    if (x < gx || x > gx + gw || y < gy || y > gy + gh) return null;
    const col = Math.min(2, Math.floor(((x - gx) / gw) * 3));
    const row = Math.min(2, Math.floor(((y - gy) / gh) * 3));
    return (row * 3 + col) as GoalZone;
  }

  private onPointer = (e: PointerEvent) => {
    const { x, y } = this.screenToVirtual(e.clientX, e.clientY);
    const zone = this.hitZone(x, y);

    if (this.phase === "aim" && zone !== null) {
      this.aimZone = zone;
      this.phase = "power";
      this.power = 0;
      this.powerDir = 1;
      this.message = "Tap or press Space to stop the power bar";
      this.emitHud();
      return;
    }

    if (this.phase === "power") {
      this.lockPower();
      return;
    }

    if (this.phase === "keeper_aim" && zone !== null) {
      this.keeperZone = zone;
      this.resolveKeeper();
    }
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (this.phase === "power") this.lockPower();
    }
  };

  private lockPower() {
    const mods = getPenaltyModifiers(this.isPlayerKicker ? this.playerType : this.aiType);
    const sweet = mods.powerSweetSpot;
    const dist = Math.abs(this.power - sweet);
    const accuracy = Math.max(0, 1 - dist * 2.5);

    const target = zoneCenter(this.aimZone);
    const curve = mods.curve * (Math.random() - 0.5) * 40;
    this.ballTarget = {
      x: target.x + curve + (1 - accuracy) * (Math.random() - 0.5) * 60,
      y: target.y + (1 - accuracy) * (Math.random() - 0.5) * 30,
    };
    this.ballPos = { x: VIRTUAL_W / 2, y: VIRTUAL_H - 60 };
    this.ballT = 0;

    if (this.isPlayerKicker) {
      const aiMods = getPenaltyModifiers(this.aiType);
      const zones: GoalZone[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      let pick = this.aimZone;
      if (Math.random() < 0.35 + aiMods.diveReach * 0.15) {
        pick = zones[Math.floor(Math.random() * zones.length)];
      }
      if (Math.random() < aiMods.diveBias) {
        pick = zones[Math.floor(Math.random() * zones.length)];
      }
      this.keeperZone = pick;
      this.phase = "flying";
      this.message = "Shoot!";
      audioManager.playSfx("kick");
    } else {
      this.phase = "keeper_aim";
      this.message = "Dive to a zone!";
      this.keeperZone = null;
    }
    this.emitHud();
  }

  private resolveShot() {
    const mods = getPenaltyModifiers(this.isPlayerKicker ? this.playerType : this.aiType);
    const dist = Math.abs(this.power - mods.powerSweetSpot);
    const accuracy = Math.max(0, 1 - dist * 2.5);
    const goalZone = this.zoneFromPoint(this.ballTarget.x, this.ballTarget.y);
    const saved = this.keeperZone === goalZone;

    if (this.isPlayerKicker) {
      if (saved) {
        this.aiSaves++;
        this.message = "Saved!";
        audioManager.playSfx("save");
      } else {
        this.playerGoals++;
        this.message = accuracy > 0.6 ? "GOAL!" : "Scuffed goal!";
        audioManager.playSfx("goal");
      }
    } else {
      if (saved) {
        this.playerSaves++;
        this.message = "SAVE!";
        audioManager.playSfx("save");
      } else {
        this.aiGoals++;
        this.message = "AI scores!";
        audioManager.playSfx("goal");
      }
    }

    this.phase = "result";
    this.resultTimer = 1.8;
    this.emitHud();
  }

  private resolveKeeper() {
    if (this.keeperZone === null) return;
    const aiZone = this.aimZone;
    const aiMods = getPenaltyModifiers(this.aiType);
    const target = zoneCenter(aiZone);
    const curve = aiMods.curve * (Math.random() - 0.5) * 50;
    this.ballTarget = { x: target.x + curve, y: target.y };
    this.ballPos = { x: VIRTUAL_W / 2, y: VIRTUAL_H - 60 };
    this.ballT = 0;
    this.phase = "flying";
    this.message = "AI shoots!";
    audioManager.playSfx("kick");
    this.emitHud();
  }

  private zoneFromPoint(x: number, y: number): GoalZone {
    const gw = 280;
    const gh = 140;
    const gx = (VIRTUAL_W - gw) / 2;
    const gy = 40;
    const col = Math.min(2, Math.max(0, Math.floor(((x - gx) / gw) * 3)));
    const row = Math.min(2, Math.max(0, Math.floor(((y - gy) / gh) * 3)));
    return (row * 3 + col) as GoalZone;
  }

  private endShootout() {
    this.phase = "gameover";
    const won = this.playerGoals > this.aiGoals;
    audioManager.playSfx(won ? "win" : "lose");
    this.callbacks.onComplete(won, this.playerGoals, this.aiGoals);
    this.emitHud();
  }

  private advanceRound() {
    if (this.mode === "solo") {
      if (this.round >= this.maxRounds) {
        this.phase = "gameover";
        audioManager.playSfx("win");
        this.callbacks.onComplete(true, this.playerGoals, 0);
        this.emitHud();
        return;
      }
      this.round++;
      this.phase = "aim";
      this.message = `Shot ${this.round}/${this.maxRounds}`;
      this.emitHud();
      return;
    }

    const regularComplete = this.round >= this.maxRounds * 2;

    if (regularComplete && this.playerGoals !== this.aiGoals) {
      this.endShootout();
      return;
    }

    if (regularComplete && this.playerGoals === this.aiGoals && !this.suddenDeath) {
      this.suddenDeath = true;
      this.message = "Sudden death!";
    }

    if (this.suddenDeath && this.playerGoals !== this.aiGoals) {
      this.endShootout();
      return;
    }

    this.round++;
    this.isPlayerKicker = this.round % 2 === 1;

    if (!this.isPlayerKicker) {
      this.aiShootSetup();
    } else {
      this.phase = "aim";
      this.message = this.suddenDeath
        ? "Sudden death — pick a zone!"
        : "Your shot — pick a zone";
    }
    this.emitHud();
  }

  private aiShootSetup() {
    const zones: GoalZone[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const playerMods = getPenaltyModifiers(this.playerType);
    let pick = zones[Math.floor(Math.random() * zones.length)];
    if (this.keeperZone !== null && Math.random() < 0.4) {
      const avoid = this.keeperZone;
      const others = zones.filter((z) => z !== avoid);
      pick = others[Math.floor(Math.random() * others.length)];
    }
    this.aimZone = pick;
    const aiMods = getPenaltyModifiers(this.aiType);
    this.power = aiMods.powerSweetSpot + (Math.random() - 0.5) * 0.2;
    this.phase = "keeper_aim";
    this.message = "AI lines up — pick your dive zone!";
    this.keeperZone = null;
    this.emitHud();
  }

  private loop = (now = performance.now()) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (this.phase === "power") {
      const mods = getPenaltyModifiers(this.isPlayerKicker ? this.playerType : this.aiType);
      this.power += this.powerDir * dt * 0.9 * mods.powerSpeed;
      if (this.power >= 1) {
        this.power = 1;
        this.powerDir = -1;
      } else if (this.power <= 0) {
        this.power = 0;
        this.powerDir = 1;
      }
      this.emitHud();
    }

    if (this.phase === "flying") {
      this.ballT += dt * 1.8;
      const t = Math.min(1, this.ballT);
      this.ballPos.x = VIRTUAL_W / 2 + (this.ballTarget.x - VIRTUAL_W / 2) * t;
      this.ballPos.y = VIRTUAL_H - 60 + (this.ballTarget.y - (VIRTUAL_H - 60)) * t;
      if (t >= 1) this.resolveShot();
    }

    if (this.phase === "result") {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) this.advanceRound();
    }
  }

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#e3e5e4";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    ctx.fillStyle = "#c8cac9";
    ctx.fillRect(0, VIRTUAL_H - 80, VIRTUAL_W, 80);

    const gw = 280;
    const gh = 140;
    const gx = (VIRTUAL_W - gw) / 2;
    const gy = 40;

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3;
    ctx.strokeRect(gx - 10, gy - 10, gw + 20, gh + 20);

    for (let z = 0; z < 9; z++) {
      const col = z % 3;
      const row = Math.floor(z / 3);
      const zx = gx + col * (gw / 3);
      const zy = gy + row * (gh / 3);
      const isAim = this.phase === "aim" || this.phase === "keeper_aim";
      const highlight =
        (this.phase === "aim" && z === this.aimZone) ||
        (this.phase === "keeper_aim" && z === this.keeperZone);
      ctx.fillStyle = highlight ? "#48494b" : isAim ? "#d0d2d1" : "#e3e5e4";
      ctx.fillRect(zx + 2, zy + 2, gw / 3 - 4, gh / 3 - 4);
      if (this.keeperZone === z && this.phase !== "keeper_aim") {
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
        ctx.strokeRect(zx + 2, zy + 2, gw / 3 - 4, gh / 3 - 4);
      }
    }

    const keeperImg = this.images.get(this.isPlayerKicker ? this.keeperId : this.kickerId);
    if (keeperImg?.complete) {
      ctx.drawImage(keeperImg, gx + gw / 2 - 24, gy + gh + 8, 48, 48);
    }

    const kickerImg = this.images.get(this.isPlayerKicker ? this.kickerId : this.keeperId);
    if (kickerImg?.complete) {
      ctx.drawImage(kickerImg, VIRTUAL_W / 2 - 28, VIRTUAL_H - 110, 56, 56);
    }

    ctx.beginPath();
    ctx.arc(this.ballPos.x, this.ballPos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();

    if (this.phase === "power") {
      const barW = 200;
      const barX = (VIRTUAL_W - barW) / 2;
      const barY = VIRTUAL_H - 30;
      ctx.fillStyle = "#f5f5f4";
      ctx.fillRect(barX, barY, barW, 14);
      ctx.strokeStyle = "#48494b";
      ctx.strokeRect(barX, barY, barW, 14);
      const mods = getPenaltyModifiers(this.isPlayerKicker ? this.playerType : this.aiType);
      const sweetX = barX + mods.powerSweetSpot * barW;
      ctx.fillStyle = "#48494b";
      ctx.fillRect(sweetX - 4, barY - 2, 8, 18);
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(barX, barY, this.power * barW, 14);
    }

    ctx.restore();
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
      img.src = pixelsToDataUrl(pixels, 80);
    } catch {
      img.src = normiePlaceholderDataUrl(id, 80);
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
