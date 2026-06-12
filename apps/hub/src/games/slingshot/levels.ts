/** Level layouts — pattern coords (1024×576), scaled to 800×480 virtual space */

const SX = 800 / 1024;
const SY = 480 / 576;

function s(x: number, y: number, w: number, h: number) {
  return { x: Math.round(x * SX), y: Math.round(y * SY), w: Math.round(w * SX), h: Math.round(h * SY) };
}

export type BlockType = "wood" | "stone" | "glitch";

export interface BlockDef {
  x: number;
  y: number;
  w: number;
  h: number;
  type: BlockType;
  hp?: number;
  normieId?: number;
}

export interface LevelDef {
  id: number;
  name: string;
  targetNormieId: number;
  birdNormieIds: number[];
  blocks: BlockDef[];
}

type Raw = { x: number; y: number; w: number; h: number; type: BlockType; hp?: number };

const GY = 510; // ground line in pattern space

function pillar(x: number, h: number, type: BlockType = "wood", w = 40): Raw {
  return { x, y: GY - h, w, h, type };
}

function beam(x: number, y: number, w: number, type: BlockType = "wood", h = 20): Raw {
  return { x, y, w, h, type };
}

function glitch(cx: number, cy: number, size: number, hp = 1): Raw {
  return { x: cx - size / 2, y: cy - size / 2, w: size, h: size, type: "glitch", hp };
}

/** Two pillars + plank + target on top */
function gate(cx: number, span: number, pillarH: number, pillarType: BlockType, plankType: BlockType, targetHp = 1): Raw[] {
  const lw = 40;
  const left = cx - span / 2 - lw;
  const right = cx + span / 2;
  const plankY = GY - pillarH - 20;
  return [
    pillar(left, pillarH, pillarType, lw),
    pillar(right, pillarH, pillarType, lw),
    beam(left, plankY, span + lw * 2, plankType),
    glitch(cx, plankY - 40, 56, targetHp),
  ];
}

/** Stacked floors between two stone pillars */
function tower(cx: number, floors: { w: number; yOff: number; type: BlockType }[], pillarH: number, targetHp = 1): Raw[] {
  const lw = 36;
  const left = cx - 70;
  const right = cx + 34;
  const blocks: Raw[] = [
    pillar(left, pillarH, "stone", lw),
    pillar(right, pillarH, "stone", lw),
  ];
  for (const f of floors) {
    blocks.push(beam(cx - f.w / 2, GY - f.yOff, f.w, f.type));
  }
  const topY = GY - floors[floors.length - 1].yOff - 20;
  blocks.push(glitch(cx, topY - 30, 52, targetHp));
  return blocks;
}

/** Three vertical columns linked by horizontal spans */
function bridge(startX: number, cols: number, colH: number, spans: number[], targetCx: number, targetHp = 1): Raw[] {
  const colW = 32;
  const gap = 110;
  const blocks: Raw[] = [];
  for (let i = 0; i < cols; i++) {
    blocks.push(pillar(startX + i * gap, colH, i % 2 === 0 ? "stone" : "wood", colW));
  }
  spans.forEach((yOff, i) => {
    const w = (cols - 1) * gap + colW;
    blocks.push(beam(startX, GY - yOff, w, i % 2 === 0 ? "wood" : "stone"));
  });
  blocks.push(glitch(targetCx, GY - spans[spans.length - 1] - 50, 54, targetHp));
  return blocks;
}

/** Wide stone base with wood scaffolding and protected target */
function bunker(cx: number, targetHp = 2): Raw[] {
  return [
    beam(cx - 100, GY - 70, 200, "stone", 70),
    pillar(cx - 90, 130, "wood", 28),
    pillar(cx + 62, 130, "wood", 28),
    beam(cx - 110, GY - 150, 220, "wood"),
    pillar(cx - 20, 100, "wood", 24),
    beam(cx - 90, GY - 200, 180, "stone"),
    glitch(cx, GY - 235, 58, targetHp),
    beam(cx - 60, GY - 280, 120, "wood", 16),
  ];
}

/** Two separate gate structures side by side */
function twinGates(x1: number, x2: number, pillarType: BlockType, targetHp = 1): Raw[] {
  return [...gate(x1, 80, 100, pillarType, "wood", targetHp), ...gate(x2, 80, 100, pillarType, "wood", targetHp)];
}

/** Ascending staircase of platforms with targets */
function staircase(cx: number, steps: number, targetHp = 1): Raw[] {
  const blocks: Raw[] = [];
  for (let i = 0; i < steps; i++) {
    const yOff = 80 + i * 55;
    const w = 140 - i * 15;
    blocks.push(beam(cx - w / 2, GY - yOff, w, i % 2 === 0 ? "wood" : "stone"));
    if (i < steps - 1) {
      blocks.push(pillar(cx - w / 2 + 10, yOff - 40, "wood", 22));
    }
  }
  blocks.push(glitch(cx, GY - 80 - steps * 55 - 25, 50, targetHp));
  return blocks;
}

/** Fortress: outer walls + inner tower + multiple targets */
function fortress(cx: number, targetHps: number[]): Raw[] {
  const blocks: Raw[] = [
    pillar(cx - 130, 120, "stone", 44),
    pillar(cx + 86, 120, "stone", 44),
    beam(cx - 130, GY - 120, 260, "stone"),
    pillar(cx - 90, 200, "stone", 36),
    pillar(cx + 54, 200, "stone", 36),
    beam(cx - 90, GY - 200, 180, "stone"),
    pillar(cx - 50, 160, "wood", 30),
    pillar(cx + 20, 160, "wood", 30),
    beam(cx - 90, GY - 280, 180, "wood"),
    beam(cx - 60, GY - 340, 120, "stone", 18),
  ];
  const targets = [
    { x: cx - 55, y: GY - 375 },
    { x: cx + 45, y: GY - 375 },
    { x: cx - 5, y: GY - 420 },
  ];
  targetHps.forEach((hp, i) => {
    const t = targets[i] ?? { x: cx, y: GY - 400 - i * 50 };
    blocks.push(glitch(t.x, t.y, 48 + (hp > 1 ? 6 : 0), hp));
  });
  return blocks;
}

function lvl(
  id: number,
  target: number,
  birds: number[],
  raw: Raw[],
  enemyIds: number[],
  name?: string,
): LevelDef {
  let ei = 0;
  return {
    id,
    name: name ?? `Level ${id}`,
    targetNormieId: target,
    birdNormieIds: birds,
    blocks: raw.map((b) => {
      const scaled = s(b.x, b.y, b.w, b.h);
      const block: BlockDef = { ...scaled, type: b.type, hp: b.hp ?? 1 };
      if (b.type === "glitch") {
        block.normieId = enemyIds[ei++] ?? target;
      }
      return block;
    }),
  };
}

const BIRDS = {
  early: [42, 0, 100],
  mid: [1459, 615, 3837],
  late: [42, 1459, 3837, 9999],
  boss: [42, 1459, 3837, 9999, 0],
};

export const SLINGSHOT_LEVELS: LevelDef[] = [
  // 1–5: learn mechanics — simple gates & single towers
  lvl(1, 42, BIRDS.early, gate(760, 120, 110, "wood", "wood"), [1337], "First Contact"),
  lvl(
    2,
    615,
    [1459, 3837, 9999],
    [
      ...twinGates(700, 880, "wood"),
      beam(760, GY - 300, 240, "stone", 16),
    ],
    [200, 500],
    "Double Trouble",
  ),
  lvl(
    3,
    100,
    BIRDS.early,
    [
      beam(700, GY - 60, 180, "stone", 60),
      pillar(710, 100, "wood", 24),
      pillar(790, 100, "wood", 24),
      beam(700, GY - 170, 180, "wood"),
      glitch(790, GY - 220, 48),
      glitch(710, GY - 280, 44),
    ],
    [300, 400],
    "Bunker Break",
  ),
  lvl(
    4,
    500,
    [1459, 615, 42],
    [
      ...tower(760, [
        { w: 200, yOff: 130, type: "stone" },
        { w: 160, yOff: 200, type: "wood" },
        { w: 120, yOff: 270, type: "wood" },
      ], 200, 2),
    ],
    [600],
    "Stone Tower",
  ),
  lvl(
    5,
    1337,
    [0, 42, 100, 500],
    [
      ...gate(680, 90, 95, "stone", "wood"),
      ...gate(860, 90, 95, "stone", "wood"),
      beam(680, GY - 310, 300, "stone", 18),
      glitch(770, GY - 350, 55, 2),
    ],
    [700, 800, 900],
    "Twin Forts",
  ),

  // 6–10: multi-layer & mixed materials
  lvl(
    6,
    9999,
    BIRDS.late,
    [
      pillar(680, 120, "stone"),
      pillar(840, 120, "stone"),
      beam(680, GY - 120, 200, "stone"),
      pillar(710, 100, "wood", 30),
      pillar(810, 100, "wood", 30),
      beam(680, GY - 220, 200, "wood"),
      glitch(720, GY - 265, 46),
      glitch(830, GY - 265, 46),
      beam(700, GY - 310, 160, "stone", 16),
      glitch(770, GY - 355, 52, 2),
    ],
    [1100, 1200, 1300],
    "Layer Cake",
  ),
  lvl(7, 200, [100, 500, 1337], [...bridge(660, 3, 115, [130, 210, 290], 770, 1)], [2100, 2200], "Triple Bridge"),
  lvl(
    8,
    300,
    [42, 615, 9999],
    [
      beam(700, GY - 75, 200, "stone", 75),
      pillar(705, 130, "wood", 26),
      pillar(785, 130, "wood", 26),
      beam(690, GY - 210, 220, "wood"),
      pillar(730, 90, "stone", 28),
      pillar(770, 90, "stone", 28),
      beam(710, GY - 310, 180, "stone"),
      glitch(770, GY - 355, 60, 2),
    ],
    [2300],
    "Heavy Base",
  ),
  lvl(
    9,
    400,
    [0, 100, 500],
    [
      ...staircase(740, 4, 1),
      pillar(880, 110, "wood"),
      glitch(900, GY - 250, 46),
      beam(860, GY - 300, 100, "stone", 16),
    ],
    [2400, 2500],
    "Staircase",
  ),
  lvl(10, 600, BIRDS.mid, [...bunker(780, 2)], [2600, 2700], "The Bunker"),

  // 11–15: complex multi-target layouts
  lvl(
    11,
    700,
    [42, 0, 1337],
    [
      pillar(700, 110, "stone", 36),
      pillar(820, 110, "stone", 36),
      beam(700, GY - 110, 160, "wood"),
      pillar(730, 80, "wood", 24),
      pillar(790, 80, "wood", 24),
      beam(710, GY - 195, 140, "stone"),
      glitch(760, GY - 240, 50),
      pillar(860, 130, "stone", 32),
      beam(830, GY - 130, 120, "wood"),
      glitch(880, GY - 175, 44),
    ],
    [2800],
    "Split Defense",
  ),
  lvl(
    12,
    800,
    [100, 500, 9999],
    [
      ...gate(720, 100, 105, "stone", "wood"),
      pillar(870, 140, "stone", 34),
      beam(800, GY - 140, 180, "stone"),
      beam(820, GY - 210, 140, "wood"),
      glitch(720, GY - 260, 48),
      glitch(810, GY - 260, 48),
      glitch(765, GY - 310, 52, 2),
    ],
    [2900, 3000, 3100],
    "Crossfire",
  ),
  lvl(13, 900, [615, 1459, 42], [...bridge(680, 4, 125, [120, 200, 280, 360], 790, 2)], [3200], "Long Bridge"),
  lvl(
    14,
    1000,
    [3837, 9999, 0],
    [
      pillar(660, 120, "stone"),
      pillar(740, 120, "stone"),
      beam(660, GY - 120, 120, "wood"),
      beam(660, GY - 200, 120, "wood"),
      glitch(700, GY - 245, 50, 2),
      pillar(840, 120, "stone"),
      beam(800, GY - 120, 120, "stone"),
      glitch(850, GY - 165, 44),
      beam(700, GY - 310, 260, "stone", 18),
      glitch(770, GY - 355, 54, 2),
    ],
    [3300, 3400],
    "Asymmetric",
  ),
  lvl(
    15,
    1500,
    [42, 100, 1337],
    [
      ...staircase(690, 3, 2),
      ...gate(880, 70, 90, "stone", "stone", 2),
      beam(740, GY - 330, 300, "stone", 16),
    ],
    [3500],
    "Mixed Assault",
  ),

  // 16–19: large compounds
  lvl(
    16,
    2000,
    BIRDS.late,
    [
      ...fortress(760, [1, 1, 2]),
      pillar(650, 100, "stone", 30),
      beam(620, GY - 100, 80, "wood"),
      glitch(655, GY - 145, 42),
    ],
    [3600, 3700],
    "Fortress",
  ),
  lvl(
    17,
    2500,
    [0, 500, 9999],
    [
      ...bridge(640, 4, 130, [110, 190, 270, 350, 420], 770, 2),
      pillar(900, 115, "wood", 34),
      glitch(915, GY - 160, 46, 1),
    ],
    [3800, 3900],
    "Highway",
  ),
  lvl(
    18,
    3000,
    [42, 615, 1459, 100],
    [
      ...bunker(720, 2),
      ...bunker(880, 1),
      beam(740, GY - 380, 280, "stone", 18),
      glitch(770, GY - 420, 56, 2),
    ],
    [4000, 4100],
    "Twin Bunkers",
  ),
  lvl(
    19,
    4000,
    BIRDS.late,
    [
      pillar(660, 115, "stone", 42),
      pillar(790, 115, "stone", 42),
      pillar(920, 115, "stone", 42),
      beam(660, GY - 115, 302, "stone"),
      pillar(680, 100, "wood", 30),
      pillar(900, 100, "wood", 30),
      beam(660, GY - 215, 302, "wood"),
      pillar(700, 90, "wood", 28),
      pillar(860, 90, "wood", 28),
      beam(680, GY - 305, 240, "stone"),
      glitch(730, GY - 350, 48),
      glitch(850, GY - 350, 48),
      beam(700, GY - 395, 200, "wood", 16),
      glitch(770, GY - 440, 58, 2),
    ],
    [4200, 4300, 4400],
    "Citadel",
  ),

  // 20: boss — tallest multi-story arena (fits within canvas)
  lvl(
    20,
    615,
    BIRDS.boss,
    [
      pillar(640, 120, "stone", 48),
      pillar(870, 120, "stone", 48),
      beam(640, GY - 120, 278, "stone"),
      pillar(670, 100, "wood", 36),
      pillar(840, 100, "wood", 36),
      beam(640, GY - 220, 278, "stone"),
      pillar(690, 85, "wood", 32),
      pillar(820, 85, "wood", 32),
      beam(660, GY - 305, 238, "wood"),
      beam(680, GY - 370, 198, "stone", 18),
      glitch(710, GY - 410, 50, 2),
      glitch(810, GY - 410, 50, 2),
      beam(700, GY - 445, 160, "wood", 14),
      glitch(755, GY - 478, 52, 2),
      beam(720, GY - 498, 100, "stone", 12),
      glitch(770, GY - 530, 58, 3),
    ],
    [4500, 4600, 4700, 615],
    "Boss #615",
  ),
];

export const VIRTUAL_W = 800;
export const VIRTUAL_H = 480;
export const GROUND_Y = Math.round(510 * SY);
export const SLING_POS = { x: Math.round(180 * SX), y: Math.round(420 * SY) };
