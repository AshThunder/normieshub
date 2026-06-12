import {
  getPixels,
  getTraits,
  normieImageUrl,
  normiePlaceholderDataUrl,
  parseNormieType,
  pixelsToDataUrl,
} from "@normie/shared";
import type { LevelDef, BlockDef } from "../levels";
import { GROUND_Y, SLING_POS, VIRTUAL_H, VIRTUAL_W } from "../levels";
import { audioManager } from "../../../audio/audioManager";
import { typeColors } from "./typeColors";
import { Vec2 } from "./Vec2";

interface Block extends BlockDef {
  vx: number;
  vy: number;
  intact: boolean;
  currentHp: number;
  originalHp: number;
  mass: number;
  shake: number;
  shakeTimer: number;
}

interface Bird {
  tokenId: number;
  normieType: string;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  trail: Vec2[];
  weight: number;
  active: boolean;
  launched: boolean;
}

interface Particle {
  pos: Vec2;
  vel: Vec2;
  color: string;
  life: number;
  decay: number;
  size: number;
}

export interface SlingshotHud {
  score: number;
  birdsLeft: number;
  enemiesLeft: number;
  abilityReady: boolean;
  currentBirdId: number | null;
  queuedBirdIds: number[];
}

export interface SlingshotCallbacks {
  onWin: (score: number, birdsLeft: number) => void;
  onLose: (score: number) => void;
  onScore: (score: number) => void;
  onHud: (hud: SlingshotHud) => void;
}

export class SlingshotEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level!: LevelDef;
  private callbacks: SlingshotCallbacks;

  private gravity = new Vec2(0, 0.22);
  private slingshotPos = new Vec2(SLING_POS.x, SLING_POS.y);
  private slingshotRadius = 90;
  private isDragging = false;
  private dragPos = new Vec2(SLING_POS.x, SLING_POS.y);
  private isBirdFlying = false;
  private abilityUsed = false;
  private canUseAbility = false;
  private levelFinished = false;
  private screenShake = 0;
  private stretchTick = 0;

  private birds: Bird[] = [];
  private currentBird: Bird | null = null;
  private blocks: Block[] = [];
  private particles: Particle[] = [];
  private score = 0;

  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private images = new Map<number, HTMLImageElement>();
  private traitTypes = new Map<number, string>();
  private raf = 0;
  private running = false;
  private inputBound = false;
  private loadGeneration = 0;
  private resizeObserver?: ResizeObserver;

  private readonly PIXEL_ON = "#48494b";
  private readonly PIXEL_OFF = "#e3e5e4";

  constructor(canvas: HTMLCanvasElement, callbacks: SlingshotCallbacks) {
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

  /** Mobile joystick: normalized -1..1 offset from slingshot */
  joystickMove(nx: number, ny: number) {
    if (this.levelFinished || !this.currentBird || this.isBirdFlying) return;
    audioManager.sfx.init();
    this.isDragging = true;
    const dragLimit = this.slingshotRadius;
    this.dragPos = this.slingshotPos.copy().add(new Vec2(nx * dragLimit, ny * dragLimit));
    this.currentBird.pos.set(this.dragPos.x, this.dragPos.y);
    this.stretchTick++;
    if (this.stretchTick % 4 === 0) audioManager.sfx.stretch();
  }

  joystickRelease() {
    if (this.isDragging) this.handleEnd();
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

  async loadLevel(level: LevelDef, squadIds: number[]) {
    const gen = ++this.loadGeneration;
    this.unbindInput();
    this.level = level;
    this.score = 0;
    this.levelFinished = false;
    this.isBirdFlying = false;
    this.isDragging = false;
    this.abilityUsed = false;
    this.particles = [];
    this.screenShake = 0;

    const birdIds =
      squadIds.length > 0
        ? squadIds.slice(0, level.birdNormieIds.length)
        : [...level.birdNormieIds];

    while (birdIds.length < level.birdNormieIds.length) {
      birdIds.push(level.birdNormieIds[birdIds.length]);
    }

    const allIds = new Set<number>([
      ...birdIds,
      level.targetNormieId,
      ...level.blocks.filter((b) => b.normieId != null).map((b) => b.normieId!),
    ]);

    this.blocks = level.blocks.map((b) => ({
      ...b,
      vx: 0,
      vy: 0,
      intact: true,
      originalHp: b.hp ?? 1,
      currentHp: b.hp ?? 1,
      mass: b.type === "stone" ? 3 : b.type === "wood" ? 1.5 : 1,
      shake: 0,
      shakeTimer: 0,
    }));

    this.birds = birdIds.map((tokenId, i) => ({
      tokenId,
      normieType: this.traitTypes.get(tokenId) ?? "Human",
      pos: this.slingshotPos.copy(),
      vel: new Vec2(0, 0),
      radius: 20,
      trail: [],
      weight: 1,
      active: i === 0,
      launched: false,
    }));
    this.currentBird = this.birds.find((b) => b.active) ?? null;

    this.bindInput();
    this.emitHud();
    this.resize();
    if (!this.running) {
      this.running = true;
      this.loop();
    }

    void this.preloadAssets(gen, [...allIds], birdIds);
  }

  private async preloadAssets(gen: number, imageIds: number[], birdIds: number[]) {
    await Promise.all(imageIds.map((id) => this.ensureImage(id, gen)));
    await Promise.all(birdIds.map((id) => this.ensureTrait(id, gen)));
    if (gen !== this.loadGeneration) return;

    for (const bird of this.birds) {
      bird.normieType = this.traitTypes.get(bird.tokenId) ?? "Human";
    }
    this.emitHud();
  }

  private async ensureImage(id: number, gen: number) {
    if (gen !== this.loadGeneration || this.images.has(id)) return;
    const img = await loadNormieImage(id);
    if (gen !== this.loadGeneration) return;
    this.images.set(id, img);
  }

  private async ensureTrait(id: number, gen: number) {
    if (gen !== this.loadGeneration || this.traitTypes.has(id)) return;
    try {
      const d = await getTraits(id);
      this.traitTypes.set(
        id,
        d.attributes.find((a) => a.trait_type === "Type")?.value ?? "Human",
      );
    } catch {
      this.traitTypes.set(id, "Human");
    }
  }

  private emitHud() {
    const queued = this.birds.filter((b) => !b.launched);
    this.callbacks.onHud({
      score: this.score,
      birdsLeft: queued.length,
      enemiesLeft: this.blocks.filter((b) => b.type === "glitch" && b.intact).length,
      abilityReady: this.isBirdFlying && this.canUseAbility && !this.abilityUsed,
      currentBirdId: this.currentBird?.tokenId ?? null,
      queuedBirdIds: queued.map((b) => b.tokenId),
    });
    this.callbacks.onScore(this.score);
  }

  private toVirtual(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    return new Vec2(
      (clientX - rect.left - this.offsetX) / this.scale,
      (clientY - rect.top - this.offsetY) / this.scale,
    );
  }

  private bindInput() {
    if (this.inputBound) return;
    this.inputBound = true;
    this.canvas.addEventListener("mousedown", this.onDown);
    window.addEventListener("mousemove", this.onMove);
    window.addEventListener("mouseup", this.onUp);
    this.canvas.addEventListener("touchstart", this.onTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.onTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.onTouchEnd, { passive: false });
  }

  private unbindInput() {
    if (!this.inputBound) return;
    this.inputBound = false;
    this.canvas.removeEventListener("mousedown", this.onDown);
    window.removeEventListener("mousemove", this.onMove);
    window.removeEventListener("mouseup", this.onUp);
    this.canvas.removeEventListener("touchstart", this.onTouchStart);
    this.canvas.removeEventListener("touchmove", this.onTouchMove);
    this.canvas.removeEventListener("touchend", this.onTouchEnd);
  }

  private onDown = (e: MouseEvent) => this.handleStart(e.clientX, e.clientY, 40);
  private onMove = (e: MouseEvent) => this.handleMove(e.clientX, e.clientY);
  private onUp = () => this.handleEnd();
  private onTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    this.handleStart(t.clientX, t.clientY, 80);
  };
  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    this.handleMove(t.clientX, t.clientY);
  };
  private onTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    this.handleEnd();
  };

  private handleStart(x: number, y: number, hitR: number) {
    if (this.levelFinished) return;
    audioManager.sfx.init();
    const v = this.toVirtual(x, y);
    if (this.currentBird && !this.isBirdFlying && v.dist(this.currentBird.pos) < hitR) {
      this.isDragging = true;
      this.dragPos.set(v.x, v.y);
    } else if (this.isBirdFlying && this.canUseAbility && !this.abilityUsed) {
      this.triggerAbility();
    }
  }

  private handleMove(x: number, y: number) {
    if (!this.isDragging || !this.currentBird) return;
    const v = this.toVirtual(x, y);
    const offset = v.copy().sub(this.slingshotPos);
    const dist = offset.mag();
    if (dist > this.slingshotRadius) offset.normalize().mult(this.slingshotRadius);
    this.dragPos = this.slingshotPos.copy().add(offset);
    this.currentBird.pos.set(this.dragPos.x, this.dragPos.y);
    if (Math.random() < 0.12) audioManager.sfx.stretch();
  }

  private handleEnd() {
    if (!this.isDragging || !this.currentBird) return;
    this.isDragging = false;
    const force = this.slingshotPos.copy().sub(this.dragPos).mult(0.28);
    this.currentBird.vel.set(force.x, force.y);
    this.currentBird.launched = true;
    this.isBirdFlying = true;
    this.canUseAbility = true;
    this.abilityUsed = false;
    audioManager.sfx.shoot();
    this.emitHud();
  }

  private triggerAbility() {
    if (!this.currentBird) return;
    this.abilityUsed = true;
    this.canUseAbility = false;
    audioManager.sfx.shatter();
    this.screenShake = 8;
    const type = parseNormieType(this.currentBird.normieType);

    if (type === "Cat") {
      const v = this.currentBird.vel;
      for (let i = 0; i < 2; i++) {
        this.birds.push({
          tokenId: this.currentBird.tokenId,
          normieType: this.currentBird.normieType,
          pos: this.currentBird.pos.copy(),
          vel: new Vec2(v.x + (Math.random() - 0.5) * 4, v.y + (i === 0 ? -2 : 2)),
          radius: 14,
          trail: [],
          weight: 0.8,
          active: true,
          launched: true,
        });
      }
      this.currentBird.radius = 14;
    } else if (type === "Alien") {
      this.currentBird.vel.mult(1.8);
    } else if (type === "Agent") {
      this.blocks.forEach((b) => {
        if (!b.intact || b.type === "glitch") return;
        if (Math.abs(b.x + b.w / 2 - this.currentBird!.pos.x) < 120) {
          b.currentHp = 0;
          b.intact = false;
          this.createSparks(new Vec2(b.x + b.w / 2, b.y + b.h / 2), this.PIXEL_ON, 8);
        }
      });
    } else {
      this.shockwaveBlocks(this.currentBird.pos, 100, 0.15);
    }
    this.createSparks(this.currentBird.pos, this.PIXEL_ON, 18);
    this.emitHud();
  }

  private shockwaveBlocks(source: Block | Vec2, radius: number, impulse: number) {
    const sx = source instanceof Vec2 ? source.x : source.x + source.w / 2;
    const sy = source instanceof Vec2 ? source.y : source.y + source.h / 2;
    for (const b of this.blocks) {
      if (!b.intact) continue;
      const bx = b.x + b.w / 2;
      const by = b.y + b.h / 2;
      const dx = bx - sx;
      const dy = by - sy;
      const dist = Math.hypot(dx, dy);
      if (dist < radius && dist > 0) {
        const falloff = 1 - dist / radius;
        const nudge = falloff * impulse * 12;
        b.vx += (dx / dist) * nudge;
        b.vy += (dy / dist) * nudge - falloff * 0.5;
        b.shake = Math.min(6, falloff * impulse * 10);
        b.shakeTimer = Math.round(8 + falloff * 10);
        if (dist < 80 && impulse > 0.1) {
          b.currentHp -= falloff * 0.5;
          if (b.currentHp <= 0) this.destroyBlock(b);
        }
      }
    }
  }

  private destroyBlock(b: Block) {
    if (!b.intact) return;
    b.intact = false;
    this.score += b.type === "glitch" ? 1500 : 1000;
    this.createSparks(new Vec2(b.x + b.w / 2, b.y + b.h / 2), b.type === "glitch" ? "#1a1a1a" : this.PIXEL_ON, 14);
    this.screenShake = Math.max(this.screenShake, 4);
    audioManager.sfx.impact(1.5);
    this.emitHud();
  }

  private checkCircleBox(bird: Bird, box: Block) {
    const closestX = Math.max(box.x, Math.min(bird.pos.x, box.x + box.w));
    const closestY = Math.max(box.y, Math.min(bird.pos.y, box.y + box.h));
    const dx = bird.pos.x - closestX;
    const dy = bird.pos.y - closestY;
    const distSq = dx * dx + dy * dy;
    if (distSq >= bird.radius * bird.radius) return null;
    const dist = Math.sqrt(distSq) || 0.001;
    return { nx: dx / dist, ny: dy / dist, overlap: bird.radius - dist };
  }

  private createSparks(pos: Vec2, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const m = 2 + Math.random() * 6;
      this.particles.push({
        pos: pos.copy(),
        vel: new Vec2(Math.cos(a) * m, Math.sin(a) * m),
        color,
        life: 1,
        decay: 0.03 + Math.random() * 0.04,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private retireBird() {
    this.isBirdFlying = false;
    this.canUseAbility = false;
    if (this.currentBird) this.currentBird.active = false;

    const next = this.birds.find((b) => !b.launched && !b.active);
    if (next) {
      this.currentBird = next;
      next.active = true;
      next.pos.set(this.slingshotPos.x, this.slingshotPos.y);
      next.vel.set(0, 0);
    } else {
      this.currentBird = this.birds.find((b) => b.launched && b.active) ?? null;
    }
    this.emitHud();
  }

  private updateBird(bird: Bird, isCurrent: boolean) {
    if (!bird.active || !bird.launched) return;
    bird.vel.add(this.gravity);
    bird.pos.add(bird.vel);
    bird.trail.push(bird.pos.copy());
    if (bird.trail.length > 25) bird.trail.shift();

    if (bird.pos.y >= GROUND_Y - bird.radius) {
      bird.pos.y = GROUND_Y - bird.radius;
      bird.vel.y *= -0.35;
      bird.vel.x *= 0.75;
      if (Math.abs(bird.vel.x) < 0.2 && Math.abs(bird.vel.y) < 0.2) {
        if (isCurrent) this.retireBird();
        else bird.active = false;
      }
    }
  }

  private resolveBlockCollisions() {
    for (let i = 0; i < this.blocks.length; i++) {
      const b1 = this.blocks[i];
      if (!b1.intact) continue;
      for (let j = i + 1; j < this.blocks.length; j++) {
        const b2 = this.blocks[j];
        if (!b2.intact) continue;
        if (b1.x >= b2.x + b2.w || b1.x + b1.w <= b2.x || b1.y >= b2.y + b2.h || b1.y + b1.h <= b2.y) continue;

        const overlapX = Math.min(b1.x + b1.w - b2.x, b2.x + b2.w - b1.x);
        const overlapY = Math.min(b1.y + b1.h - b2.y, b2.y + b2.h - b1.y);
        if (overlapX < overlapY) {
          const dir = b1.x + b1.w / 2 < b2.x + b2.w / 2 ? -1 : 1;
          b1.x += dir * overlapX * 0.5;
          b2.x -= dir * overlapX * 0.5;
          const tv = b1.vx;
          b1.vx = b2.vx * 0.5;
          b2.vx = tv * 0.5;
        } else {
          const dir = b1.y + b1.h / 2 < b2.y + b2.h / 2 ? -1 : 1;
          b1.y += dir * overlapY * 0.5;
          b2.y -= dir * overlapY * 0.5;
          const tv = b1.vy;
          b1.vy = b2.vy * 0.5;
          b2.vy = tv * 0.5;
        }
        const rel = Math.hypot(b1.vx - b2.vx, b1.vy - b2.vy);
        if (rel > 2) {
          const dmg = (rel - 1.5) * 0.45;
          b1.currentHp -= dmg;
          b2.currentHp -= dmg;
          if (b1.currentHp <= 0) this.destroyBlock(b1);
          if (b2.currentHp <= 0) this.destroyBlock(b2);
        }
      }
    }
  }

  private updatePhysics() {
    this.birds.forEach((bird) => {
      this.updateBird(bird, bird === this.currentBird && this.isBirdFlying);
    });

    for (const b of this.blocks) {
      if (!b.intact) continue;
      if (b.y < GROUND_Y - b.h) b.vy += this.gravity.y;
      b.x += b.vx;
      b.y += b.vy;
      b.vx *= 0.98;
      b.vy *= 0.98;
      if (b.shakeTimer > 0) {
        b.shakeTimer--;
        b.shake *= 0.82;
      }

      if (b.y >= GROUND_Y - b.h) {
        const fall = Math.abs(b.vy);
        b.y = GROUND_Y - b.h;
        if (fall > 2) {
          audioManager.sfx.impact(fall * 0.2);
          b.currentHp -= (fall - 1.5) * 0.5;
          if (b.currentHp <= 0) this.destroyBlock(b);
        }
        b.vy = 0;
        b.vx *= 0.9;
      }

      for (const bird of this.birds) {
        if (!bird.active || !bird.launched) continue;
        const col = this.checkCircleBox(bird, b);
        if (!col) continue;
        bird.pos.x += col.nx * col.overlap;
        bird.pos.y += col.ny * col.overlap;
        const relVel = bird.vel.x * col.nx + bird.vel.y * col.ny;
        if (relVel < 0) {
          const impulse = -1.5 * relVel;
          bird.vel.x += col.nx * impulse;
          bird.vel.y += col.ny * impulse;
          b.vx -= (col.nx * impulse) / b.mass;
          b.vy -= (col.ny * impulse) / b.mass;
          const dmg = impulse * 0.7;
          if (dmg > 0.5) {
            b.currentHp -= dmg;
            this.score += Math.round(dmg * 100);
            audioManager.sfx.impact(dmg);
            this.createSparks(bird.pos, "#ffffff", 5);
            this.shockwaveBlocks(b, 70, impulse * 0.4);
            if (b.currentHp <= 0) this.destroyBlock(b);
          }
        }
      }
    }

    this.resolveBlockCollisions();

    this.particles = this.particles.filter((p) => {
      p.pos.add(p.vel);
      p.life -= p.decay;
      return p.life > 0;
    });

    if (this.screenShake > 0) this.screenShake *= 0.88;

    this.checkEnd();
  }

  private checkEnd() {
    if (this.levelFinished) return;
    const enemiesLeft = this.blocks.filter((b) => b.type === "glitch" && b.intact).length;
    if (enemiesLeft === 0) {
      this.levelFinished = true;
      const birdsLeft = this.birds.filter((b) => !b.launched).length;
      audioManager.sfx.win();
      setTimeout(() => this.callbacks.onWin(this.score, birdsLeft), 800);
      return;
    }
    const anyFlying = this.birds.some((b) => b.launched && b.active);
    const anyQueued = this.birds.some((b) => !b.launched);
    if (!anyFlying && !anyQueued && this.particles.length < 3) {
      this.levelFinished = true;
      audioManager.sfx.lose();
      setTimeout(() => this.callbacks.onLose(this.score), 1000);
    }
  }

  private drawTrajectory() {
    if (!this.isDragging || !this.currentBird) return;
    const ctx = this.ctx;
    const force = this.slingshotPos.copy().sub(this.dragPos).mult(0.28);
    const sim = this.currentBird.pos.copy();
    const vel = force.copy();
    ctx.strokeStyle = "rgba(72,73,75,0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(sim.x, sim.y);
    for (let i = 0; i < 70; i++) {
      vel.add(this.gravity);
      sim.add(vel);
      ctx.lineTo(sim.x, sim.y);
      if (sim.y >= GROUND_Y) break;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawNormie(ctx: CanvasRenderingContext2D, id: number, x: number, y: number, r: number) {
    const img = this.images.get(id);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    if (img?.complete && img.naturalWidth) {
      ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = this.PIXEL_ON;
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = this.PIXEL_ON;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  private draw() {
    const ctx = this.ctx;
    ctx.fillStyle = this.PIXEL_OFF;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();

    const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake : 0;
    const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake * 0.6 : 0;
    ctx.translate(this.offsetX + shakeX, this.offsetY + shakeY);
    ctx.scale(this.scale, this.scale);

    ctx.strokeStyle = "#d0d2d1";
    ctx.lineWidth = 1;
    for (let x = 0; x < VIRTUAL_W; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VIRTUAL_H);
      ctx.stroke();
    }
    for (let y = 0; y < VIRTUAL_H; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIRTUAL_W, y);
      ctx.stroke();
    }

    ctx.strokeStyle = this.PIXEL_ON;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(VIRTUAL_W, GROUND_Y);
    ctx.stroke();

    // Queue preview
    const waiting = this.birds.filter((b) => !b.launched && b !== this.currentBird);
    waiting.forEach((b, i) => {
      this.drawNormie(ctx, b.tokenId, 50 + i * 36, GROUND_Y - 28, 14);
    });

    if (this.isDragging && this.currentBird) {
      ctx.strokeStyle = "#aaa";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.slingshotPos.x - 12, this.slingshotPos.y - 10);
      ctx.lineTo(this.currentBird.pos.x, this.currentBird.pos.y);
      ctx.stroke();
    }

    ctx.strokeStyle = this.PIXEL_ON;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.slingshotPos.x - 12, this.slingshotPos.y - 12);
    ctx.lineTo(this.slingshotPos.x, this.slingshotPos.y + 35);
    ctx.lineTo(this.slingshotPos.x + 12, this.slingshotPos.y - 12);
    ctx.lineTo(this.slingshotPos.x, GROUND_Y);
    ctx.stroke();

    for (const bird of this.birds) {
      if (!bird.launched && bird !== this.currentBird) continue;
      if (bird.trail.length > 1) {
        const { trail } = typeColors(bird.normieType);
        ctx.strokeStyle = trail;
        ctx.lineWidth = bird.radius * 0.7;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(bird.trail[0].x, bird.trail[0].y);
        for (let i = 1; i < bird.trail.length; i++) ctx.lineTo(bird.trail[i].x, bird.trail[i].y);
        ctx.stroke();
      }
    }

    for (const b of this.blocks) {
      if (!b.intact) continue;
      const sx = b.shake > 0 ? (Math.random() - 0.5) * b.shake * 2 : 0;
      const sy = b.shake > 0 ? (Math.random() - 0.5) * b.shake : 0;
      ctx.save();
      ctx.translate(b.x + sx, b.y + sy);

      if (b.type === "glitch" && b.normieId != null) {
        ctx.fillStyle = "#f5f5f4";
        ctx.fillRect(0, 0, b.w, b.h);
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, b.w, b.h);
        this.drawNormie(ctx, b.normieId, b.w / 2, b.h / 2 - 4, Math.min(b.w, b.h) / 2 - 4);
        const hpPct = b.currentHp / b.originalHp;
        ctx.fillStyle = "#ccc";
        ctx.fillRect(2, b.h - 6, b.w - 4, 4);
        ctx.fillStyle = hpPct > 0.5 ? this.PIXEL_ON : "#1a1a1a";
        ctx.fillRect(2, b.h - 6, (b.w - 4) * hpPct, 4);
      } else {
        ctx.fillStyle = b.type === "stone" ? "#6b6d70" : "#9a9c9f";
        ctx.fillRect(0, 0, b.w, b.h);
        ctx.strokeStyle = this.PIXEL_ON;
        ctx.strokeRect(0, 0, b.w, b.h);
        ctx.strokeStyle = "rgba(72,73,75,0.25)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(b.w, b.h);
        ctx.moveTo(b.w, 0);
        ctx.lineTo(0, b.h);
        ctx.stroke();
      }
      ctx.restore();
    }

    this.drawTrajectory();

    for (const bird of this.birds) {
      if (!bird.active && bird.launched) continue;
      if (!bird.launched && bird !== this.currentBird) continue;
      this.drawNormie(ctx, bird.tokenId, bird.pos.x, bird.pos.y, bird.radius);
      if (bird === this.currentBird && this.canUseAbility && !this.abilityUsed && bird.launched) {
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(bird.pos.x, bird.pos.y, bird.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (this.isDragging && this.currentBird) {
      ctx.strokeStyle = this.PIXEL_ON;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.slingshotPos.x + 12, this.slingshotPos.y - 10);
      ctx.lineTo(this.currentBird.pos.x, this.currentBird.pos.y);
      ctx.stroke();
    }

    for (const p of this.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.pos.x, p.pos.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private loop = () => {
    if (!this.running) return;
    this.updatePhysics();
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };
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
