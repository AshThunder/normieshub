import {
  getTowerStats,
  normieImageUrl,
  type TowerSpecial,
  type TowerStats,
} from "@normie/shared";
import { audioManager } from "../../../audio/audioManager";
import { DEFENSE_MAPS, VIRTUAL_H, VIRTUAL_W, type MapDef } from "../maps";
import {
  ENEMY_BASE_HP,
  ENEMY_BASE_SPEED,
  ENEMY_BOSS_HP,
  ENEMY_SPAWN_INTERVAL,
  getWavesForMap,
  INITIAL_PREP_TIME,
  KILL_REWARD,
  MAX_TOWER_LEVEL,
  MIN_ENEMY_SPACING,
  PLACE_TOWER_TIME,
  STARTING_COINS,
  STARTING_LIVES,
  UPGRADE_COST,
  WAVE_CLEAR_BONUS,
  WAVE_PREP_TIME,
  type WaveDef,
} from "../waves";

export interface SquadMember {
  tokenId: number;
  type: string;
  expression?: string;
  placed: boolean;
}

export interface PlacedTower {
  slotId: number;
  tokenId: number;
  type: string;
  level: number;
  stats: TowerStats;
  cooldown: number;
}

export interface DefenseHud {
  lives: number;
  coins: number;
  wave: number;
  maxWaves: number;
  enemiesLeft: number;
  phase: "prep" | "wave" | "won" | "lost";
  selectedSlot: number | null;
  message: string;
  towers: PlacedTower[];
  squad: SquadMember[];
  nextWave: WaveDef | null;
  prepSeconds: number;
  placingSeconds: number;
  towersPlaced: number;
}

export interface DefenseCallbacks {
  onHud: (hud: DefenseHud) => void;
  onWin: (lives: number) => void;
  onLose: () => void;
}

interface Enemy {
  id: number;
  tokenId: number;
  hp: number;
  maxHp: number;
  pathT: number;
  speed: number;
  slowTimer: number;
  boss: boolean;
}

interface Projectile {
  x: number;
  y: number;
  targetId: number;
  damage: number;
  special: TowerSpecial;
  speed: number;
}

function pathPoint(map: MapDef, t: number): { x: number; y: number } {
  const path = map.path;
  if (path.length < 2) return path[0] ?? { x: 0, y: 0 };
  const total = path.length - 1;
  const seg = Math.min(total - 0.001, Math.max(0, t)) * total;
  const i = Math.floor(seg);
  const f = seg - i;
  const a = path[i];
  const b = path[Math.min(i + 1, path.length - 1)];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

export class DefenseEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: DefenseCallbacks;
  private map: MapDef = DEFENSE_MAPS[0];
  private squad: SquadMember[] = [];
  private towers: PlacedTower[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private lives = STARTING_LIVES;
  private coins = STARTING_COINS;
  private wave = 0;
  private enemiesToSpawn = 0;
  private spawnTimer = 0;
  private prepTimer = 0;
  private placeTimer = 0;
  private pendingPlace: { slotId: number; tokenId: number; member: SquadMember } | null = null;
  private phase: DefenseHud["phase"] = "prep";
  private selectedSlot: number | null = null;
  private message = "Place towers, then start wave";
  private enemyId = 0;
  private images = new Map<number, HTMLImageElement>();
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private raf = 0;
  private running = false;
  private lastTime = 0;
  private inputBound = false;
  private enemyPool: number[] = [];

  constructor(canvas: HTMLCanvasElement, callbacks: DefenseCallbacks) {
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

  private resize = () => {
    this.canvas.width = this.canvas.clientWidth || VIRTUAL_W;
    this.canvas.height = this.canvas.clientHeight || VIRTUAL_H;
    const scaleX = this.canvas.width / VIRTUAL_W;
    const scaleY = this.canvas.height / VIRTUAL_H;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (this.canvas.width - VIRTUAL_W * this.scale) / 2;
    this.offsetY = (this.canvas.height - VIRTUAL_H * this.scale) / 2;
  };

  async start(mapId: number, squad: SquadMember[], enemyIds: number[]) {
    this.map = DEFENSE_MAPS[mapId] ?? DEFENSE_MAPS[0];
    this.squad = squad.map((s) => ({ ...s, placed: false }));
    this.enemyPool = enemyIds;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.lives = STARTING_LIVES;
    this.coins = STARTING_COINS;
    this.wave = 0;
    this.phase = "prep";
    this.prepTimer = INITIAL_PREP_TIME;
    this.placeTimer = 0;
    this.pendingPlace = null;
    this.selectedSlot = null;
    this.message = `Place towers — ${INITIAL_PREP_TIME}s until wave 1`;

    const ids = new Set<number>([...squad.map((s) => s.tokenId), ...enemyIds.slice(0, 20)]);
    await this.loadImages([...ids]);

    this.bindInput();
    this.running = true;
    this.lastTime = performance.now();
    this.emitHud();
    this.loop();
  }

  private async loadImages(ids: number[]) {
    await Promise.all(
      ids.map(async (id) => {
        if (this.images.has(id)) return;
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

  startWave() {
    if (this.phase !== "prep") return;
    if (this.pendingPlace) return;
    if (this.towers.length === 0) {
      this.message = "Place at least one tower before starting";
      this.emitHud();
      return;
    }
    this.beginWave();
  }

  private beginWave() {
    const waves = getWavesForMap(this.map.id);
    if (this.wave >= waves.length) return;

    const def = waves[this.wave];
    this.wave++;
    this.enemiesToSpawn = def.count + (def.boss ? 1 : 0);
    this.spawnTimer = 0;
    this.phase = "wave";
    this.selectedSlot = null;
    this.message = `Wave ${this.wave} — defend!`;
    audioManager.playSfx("waveStart");
    this.emitHud();
  }

  placeTower(tokenId: number) {
    if (this.phase !== "prep" || this.pendingPlace) return false;
    if (this.selectedSlot === null) return false;
    const member = this.squad.find((s) => s.tokenId === tokenId && !s.placed);
    if (!member) return false;
    if (this.towers.some((t) => t.slotId === this.selectedSlot)) return false;

    const slotId = this.selectedSlot;
    this.pendingPlace = { slotId, tokenId, member };
    this.placeTimer = PLACE_TOWER_TIME;
    this.message = `Deploying #${tokenId}…`;
    this.emitHud();
    return true;
  }

  private finishPlace() {
    if (!this.pendingPlace) return;
    const { slotId, tokenId, member } = this.pendingPlace;
    const stats = getTowerStats(member.type, member.expression);
    this.towers.push({
      slotId,
      tokenId: member.tokenId,
      type: member.type,
      level: 1,
      stats: this.scaledStats(stats, 1),
      cooldown: 0,
    });
    member.placed = true;
    this.pendingPlace = null;
    this.placeTimer = 0;
    this.selectedSlot = null;
    this.message = `Deployed #${tokenId}`;
    audioManager.playSfx("place");
    this.emitHud();
  }

  upgradeTower(slotId: number) {
    if (this.phase !== "prep" || this.pendingPlace) return false;
    const tower = this.towers.find((t) => t.slotId === slotId);
    if (!tower || tower.level >= MAX_TOWER_LEVEL) return false;
    const cost = UPGRADE_COST[tower.level] ?? 999;
    if (this.coins < cost) {
      this.message = `Need ${cost} coins`;
      this.emitHud();
      return false;
    }
    this.coins -= cost;
    tower.level++;
    const base = getTowerStats(tower.type);
    tower.stats = this.scaledStats(base, tower.level);
    this.message = `Tower upgraded to Lv${tower.level}`;
    audioManager.playSfx("upgrade");
    this.emitHud();
    return true;
  }

  selectSlot(slotId: number | null) {
    this.selectedSlot = slotId;
    this.emitHud();
  }

  private scaledStats(base: TowerStats, level: number): TowerStats {
    const mult = 1 + (level - 1) * 0.4;
    return {
      ...base,
      damage: base.damage * mult * 1.25,
      range: base.range * (1 + (level - 1) * 0.18),
      fireRate: base.fireRate * (1 + (level - 1) * 0.22),
    };
  }

  private emitHud() {
    const waves = getWavesForMap(this.map.id);
    const nextWave = this.wave < waves.length ? waves[this.wave] : null;
    this.callbacks.onHud({
      lives: this.lives,
      coins: this.coins,
      wave: this.wave,
      maxWaves: waves.length,
      enemiesLeft: this.enemies.length + this.enemiesToSpawn,
      phase: this.phase,
      selectedSlot: this.selectedSlot,
      message: this.message,
      towers: [...this.towers],
      squad: [...this.squad],
      nextWave,
      prepSeconds: Math.max(0, Math.ceil(this.prepTimer)),
      placingSeconds: this.pendingPlace ? Math.max(0, Math.ceil(this.placeTimer)) : 0,
      towersPlaced: this.towers.length,
    });
  }

  private bindInput() {
    if (this.inputBound) return;
    this.inputBound = true;
    this.canvas.addEventListener("pointerdown", this.onPointer);
  }

  private unbindInput() {
    if (!this.inputBound) return;
    this.inputBound = false;
    this.canvas.removeEventListener("pointerdown", this.onPointer);
  }

  private screenToVirtual(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.offsetX) / this.scale,
      y: (clientY - rect.top - this.offsetY) / this.scale,
    };
  }

  private onPointer = (e: PointerEvent) => {
    const { x, y } = this.screenToVirtual(e.clientX, e.clientY);
    let closest: number | null = null;
    let closestDist = 32;
    for (const slot of this.map.slots) {
      const d = Math.hypot(x - slot.x, y - slot.y);
      if (d < closestDist) {
        closestDist = d;
        closest = slot.id;
      }
    }
    if (closest !== null) {
      const occupied = this.towers.some((t) => t.slotId === closest);
      if (occupied) {
        if (this.phase === "prep" && !this.pendingPlace) {
          this.selectedSlot = closest;
          this.message = "Tower selected — upgrade from panel";
        }
      } else if (this.phase === "prep" && !this.pendingPlace) {
        this.selectedSlot = closest;
        this.message = "Pick a Normie from your squad";
      }
      this.emitHud();
    }
  };

  private spawnEnemy(boss: boolean): boolean {
    const waves = getWavesForMap(this.map.id);
    const def = waves[this.wave - 1];
    if (!def) return false;

    const spawnBlocked = this.enemies.some((e) => e.pathT < MIN_ENEMY_SPACING);
    if (spawnBlocked) return false;

    const tokenId = this.enemyPool[this.enemyId % this.enemyPool.length] ?? 0;
    const hp = (boss ? ENEMY_BOSS_HP : ENEMY_BASE_HP) * def.hpMult;
    this.enemies.push({
      id: ++this.enemyId,
      tokenId,
      hp,
      maxHp: hp,
      pathT: 0,
      speed: (boss ? ENEMY_BASE_SPEED * 0.85 : ENEMY_BASE_SPEED) * def.speedMult,
      slowTimer: 0,
      boss,
    });
    return true;
  }

  private update(dt: number) {
    if (this.phase === "prep") {
      if (this.pendingPlace) {
        this.placeTimer -= dt;
        if (this.placeTimer <= 0) this.finishPlace();
      } else {
        this.prepTimer -= dt;
        if (this.prepTimer <= 0) {
          if (this.towers.length === 0) {
            this.prepTimer = 3;
            this.message = "Place at least one tower!";
          } else {
            this.beginWave();
          }
        }
      }
    }

    if (this.phase === "wave") {
      if (this.enemiesToSpawn > 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          const waves = getWavesForMap(this.map.id);
          const def = waves[this.wave - 1];
          const isBoss = def?.boss && this.enemiesToSpawn === 1;
          if (this.spawnEnemy(isBoss)) {
            this.enemiesToSpawn--;
            this.spawnTimer = isBoss ? 0.8 : ENEMY_SPAWN_INTERVAL;
          } else {
            this.spawnTimer = 0.12;
          }
        }
      }

      for (const enemy of this.enemies) {
        const speedMult = enemy.slowTimer > 0 ? 0.5 : 1;
        enemy.pathT += enemy.speed * speedMult * dt;
        if (enemy.slowTimer > 0) enemy.slowTimer -= dt;
        if (enemy.pathT >= 1) {
          enemy.pathT = 1;
        }
      }

      const leaked = this.enemies.filter((e) => e.pathT >= 1);
      if (leaked.length > 0) {
        this.lives -= leaked.length;
        audioManager.playSfx("leak");
        this.enemies = this.enemies.filter((e) => e.pathT < 1);
        if (this.lives <= 0) {
          this.phase = "lost";
          audioManager.playSfx("lose");
          this.callbacks.onLose();
          this.emitHud();
          return;
        }
      }

      for (const tower of this.towers) {
        tower.cooldown -= dt;
        if (tower.cooldown > 0) continue;
        const slot = this.map.slots.find((s) => s.id === tower.slotId);
        if (!slot) continue;

        let target: Enemy | null = null;
        let bestT = -1;
        for (const enemy of this.enemies) {
          const pos = pathPoint(this.map, enemy.pathT);
          const dist = Math.hypot(pos.x - slot.x, pos.y - slot.y);
          if (dist <= tower.stats.range && enemy.pathT > bestT) {
            bestT = enemy.pathT;
            target = enemy;
          }
        }

        if (target) {
          tower.cooldown = 1 / tower.stats.fireRate;
          audioManager.playSfx("towerShoot");
          const pos = pathPoint(this.map, target.pathT);
          this.projectiles.push({
            x: slot.x,
            y: slot.y,
            targetId: target.id,
            damage: tower.stats.damage,
            special: tower.stats.special,
            speed: 280,
          });
        }
      }

      for (const proj of this.projectiles) {
        const target = this.enemies.find((e) => e.id === proj.targetId);
        if (!target) continue;
        const pos = pathPoint(this.map, target.pathT);
        const dx = pos.x - proj.x;
        const dy = pos.y - proj.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 12) {
          target.hp -= proj.damage;
          audioManager.playSfx("towerHit");
          if (proj.special === "slow") target.slowTimer = 2;
          if (proj.special === "splash") {
            for (const other of this.enemies) {
              if (other.id === target.id) continue;
              const op = pathPoint(this.map, other.pathT);
              if (Math.hypot(op.x - pos.x, op.y - pos.y) < 40) {
                other.hp -= proj.damage * 0.4;
              }
            }
          }
          proj.targetId = -1;
        } else {
          proj.x += (dx / dist) * proj.speed * dt;
          proj.y += (dy / dist) * proj.speed * dt;
        }
      }
      this.projectiles = this.projectiles.filter((p) => p.targetId >= 0);

      const killed = this.enemies.filter((e) => e.hp <= 0);
      if (killed.length > 0) audioManager.playSfx("enemyKill");
      for (const _ of killed) {
        this.coins += KILL_REWARD;
      }
      this.enemies = this.enemies.filter((e) => e.hp > 0);

      if (this.enemiesToSpawn === 0 && this.enemies.length === 0) {
        const waves = getWavesForMap(this.map.id);
        if (this.wave >= waves.length) {
          this.phase = "won";
          audioManager.playSfx("win");
          this.callbacks.onWin(this.lives);
          this.emitHud();
        } else {
          this.phase = "prep";
          this.prepTimer = WAVE_PREP_TIME;
          this.coins += WAVE_CLEAR_BONUS;
          this.message = `Wave ${this.wave} cleared! +${WAVE_CLEAR_BONUS}c — ${WAVE_PREP_TIME}s to place`;
          audioManager.playSfx("waveClear");
          this.emitHud();
        }
      }
    }

    if (this.phase === "prep" || this.phase === "wave") {
      this.emitHud();
    }
  }

  private loop = (now = performance.now()) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#d8dad9";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    ctx.fillStyle = "#e3e5e4";
    ctx.fillRect(0, 0, VIRTUAL_W, VIRTUAL_H);

    const path = this.map.path;
    if (path.length > 1) {
      ctx.strokeStyle = "#c8cac9";
      ctx.lineWidth = 36;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();

      ctx.strokeStyle = "#48494b";
      ctx.lineWidth = 20;
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
      ctx.stroke();
    }

    const start = path[0];
    const end = path[path.length - 1];
    if (start) {
      ctx.fillStyle = "#48494b";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("SPAWN", start.x + 36, start.y - 18);
      ctx.beginPath();
      ctx.arc(start.x, start.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    if (end) {
      ctx.fillStyle = "#1a1a1a";
      ctx.font = "bold 11px monospace";
      ctx.fillText("BASE", end.x - 36, end.y - 18);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 3;
      ctx.strokeRect(end.x - 14, end.y - 14, 28, 28);
    }

    for (const slot of this.map.slots) {
      const occupied = this.towers.find((t) => t.slotId === slot.id);
      const selected = this.selectedSlot === slot.id;

      if (selected && occupied) {
        ctx.beginPath();
        ctx.arc(slot.x, slot.y, occupied.stats.range, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(72, 73, 75, 0.12)";
        ctx.fill();
        ctx.strokeStyle = "rgba(26, 26, 26, 0.25)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.arc(slot.x, slot.y, selected ? 24 : 20, 0, Math.PI * 2);
      ctx.fillStyle = occupied ? "#c8cac9" : selected ? "#48494b" : "#f5f5f4";
      ctx.fill();
      ctx.strokeStyle = selected ? "#1a1a1a" : "#48494b";
      ctx.lineWidth = selected ? 3 : 2;
      ctx.stroke();

      if (!occupied) {
        ctx.font = "10px monospace";
        ctx.fillStyle = selected ? "#e3e5e4" : "#48494b";
        ctx.textAlign = "center";
        ctx.fillText(String(slot.id + 1), slot.x, slot.y + 4);
      }

      if (occupied) {
        const img = this.images.get(occupied.tokenId);
        if (img?.complete) {
          ctx.drawImage(img, slot.x - 16, slot.y - 16, 32, 32);
        }
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#1a1a1a";
        ctx.textAlign = "center";
        ctx.fillText(`L${occupied.level}`, slot.x, slot.y + 30);
      }
    }

    for (const enemy of this.enemies) {
      const pos = pathPoint(this.map, enemy.pathT);
      const size = enemy.boss ? 40 : 24;
      const img = this.images.get(enemy.tokenId);
      if (img?.complete) {
        ctx.drawImage(img, pos.x - size / 2, pos.y - size / 2, size, size);
      }
      const barW = enemy.boss ? 36 : 24;
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(pos.x - barW / 2, pos.y - size / 2 - 8, barW, 4);
      ctx.fillStyle = "#e3e5e4";
      ctx.fillRect(
        pos.x - barW / 2,
        pos.y - size / 2 - 8,
        barW * (enemy.hp / enemy.maxHp),
        4,
      );
    }

    for (const proj of this.projectiles) {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(proj.x - 3, proj.y - 3, 6, 6);
    }

    ctx.restore();
  }
}
