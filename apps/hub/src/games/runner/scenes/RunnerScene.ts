import Phaser from "phaser";
import { getRunnerModifiers, parseNormieType } from "@normie/shared";
import { audioManager } from "../../../audio/audioManager";

export interface RunnerConfig {
  tokenId: number;
  normieType: string;
  playerImageUrl: string;
  normieTextureUrls: Record<number, string>;
  onCardCollect: (id: number) => void;
  onGameOver: (score: number) => void;
}

const LANES = [200, 400, 600];
const PLAYER_SIZE = 48;
const OBSTACLE_SIZE = 50;
const CARD_SIZE = 40;
const BLOCK_COLOR = 0x1a1a1a;

function normieTex(id: number) {
  return `normie_${id}`;
}

export class RunnerScene extends Phaser.Scene {
  private config!: RunnerConfig;
  private player!: Phaser.GameObjects.Image;
  private lane = 1;
  private score = 0;
  private scoreAccumulator = 0;
  private speed = 4;
  private obstacles!: Phaser.GameObjects.Group;
  private cards!: Phaser.GameObjects.Group;
  private spawnTimer = 0;
  private scoreText!: Phaser.GameObjects.Text;
  private dead = false;
  private mods = { speed: 1, magnet: 1, shield: 0 };
  private shieldActive = false;

  constructor() {
    super({ key: "RunnerScene" });
  }

  init(data: RunnerConfig) {
    this.config = data;
    this.lane = 1;
    this.score = 0;
    this.scoreAccumulator = 0;
    this.speed = 4;
    this.dead = false;
    this.shieldActive = false;
    this.mods = getRunnerModifiers(parseNormieType(data.normieType));
  }

  preload() {
    this.load.image("player", this.config.playerImageUrl);
    for (const [id, url] of Object.entries(this.config.normieTextureUrls)) {
      this.load.image(normieTex(Number(id)), url);
    }
  }

  create() {
    this.add.rectangle(400, 300, 800, 600, 0xe3e5e4);
    this.obstacles = this.add.group();
    this.cards = this.add.group();

    for (let i = 0; i < 3; i++) {
      this.add.rectangle(LANES[i], 300, 4, 600, 0xcccccc, 0.5);
    }

    if (this.textures.exists("player")) {
      this.player = this.add
        .image(LANES[this.lane], 500, "player")
        .setDisplaySize(PLAYER_SIZE, PLAYER_SIZE);
    } else {
      this.player = this.add.rectangle(
        LANES[this.lane],
        500,
        PLAYER_SIZE,
        PLAYER_SIZE,
        0x48494b,
      ) as unknown as Phaser.GameObjects.Image;
    }

    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "18px",
      color: "#48494b",
      fontFamily: "monospace",
    });

    this.input.keyboard?.on("keydown-LEFT", () => this.moveLane(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => this.moveLane(1));
    this.input.keyboard?.on("keydown-A", () => this.moveLane(-1));
    this.input.keyboard?.on("keydown-D", () => this.moveLane(1));

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.x < 400) this.moveLane(-1);
      else this.moveLane(1);
    });
  }

  shiftLane(dir: number) {
    if (this.dead) return;
    this.lane = Phaser.Math.Clamp(this.lane + dir, 0, 2);
    this.player.x = LANES[this.lane];
    audioManager.playSfx("laneSwitch");
  }

  private moveLane(dir: number) {
    this.shiftLane(dir);
  }

  private pickNormieId(): number {
    const pool = Object.keys(this.config.normieTextureUrls).map(Number);
    return pool[Phaser.Math.Between(0, pool.length - 1)] ?? this.config.tokenId;
  }

  update(_time: number, delta: number) {
    if (this.dead) return;

    this.scoreAccumulator += delta * 0.05 * this.mods.speed;
    this.score = Math.floor(this.scoreAccumulator);
    this.speed = Math.min(10, 4 + this.score / 500);
    this.scoreText.setText(`Score: ${this.score}`);

    this.spawnTimer += delta;
    if (this.spawnTimer > 1200 / this.mods.speed) {
      this.spawnTimer = 0;
      this.spawnObstacle();
      if (Math.random() < 0.4) this.spawnCard();
    }

    this.obstacles.getChildren().forEach((obj) => {
      const o = obj as Phaser.GameObjects.Rectangle;
      o.y += this.speed * this.mods.speed;
      if (o.y > 620) o.destroy();
      if (Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), o.getBounds())) {
        if (this.shieldActive) {
          this.shieldActive = false;
          o.destroy();
          audioManager.playSfx("hit");
        } else {
          this.gameOver();
        }
      }
    });

    this.cards.getChildren().forEach((obj) => {
      const c = obj as Phaser.GameObjects.Image;
      c.y += this.speed * 0.9;
      if (c.y > 620) c.destroy();
      if (Phaser.Geom.Rectangle.Overlaps(this.player.getBounds(), c.getBounds())) {
        const id = c.getData("tokenId") as number;
        this.config.onCardCollect(id);
        this.scoreAccumulator += 250;
        this.score = Math.floor(this.scoreAccumulator);
        this.scoreText.setText(`Score: ${this.score}`);
        audioManager.playSfx("collect");
        c.destroy();
      }
    });
  }

  private spawnObstacle() {
    const lane = Phaser.Math.Between(0, 2);
    const o = this.add.rectangle(LANES[lane], -30, OBSTACLE_SIZE, OBSTACLE_SIZE, BLOCK_COLOR);
    this.obstacles.add(o);
  }

  private spawnCard() {
    const lane = Phaser.Math.Between(0, 2);
    const id = this.pickNormieId();
    const key = normieTex(id);
    if (!this.textures.exists(key)) return;

    const c = this.add.image(LANES[lane], -30, key).setDisplaySize(CARD_SIZE, CARD_SIZE);
    c.setData("tokenId", id);
    this.cards.add(c);
  }

  private gameOver() {
    this.dead = true;
    audioManager.playSfx("crash");
    this.config.onGameOver(this.score);
  }
}
