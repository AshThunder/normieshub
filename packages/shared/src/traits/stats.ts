import type { NormieType } from "../constants";

export interface CombatStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  special: string;
}

export interface SlingshotAbility {
  name: string;
  description: string;
  type: NormieType | "default";
}

const TYPE_BASE: Record<NormieType, CombatStats> = {
  Human: { hp: 100, attack: 12, defense: 10, speed: 10, special: "Balanced Strike" },
  Cat: { hp: 80, attack: 14, defense: 6, speed: 18, special: "Split Shot" },
  Alien: { hp: 90, attack: 10, defense: 8, speed: 12, special: "Phase Burst" },
  Agent: { hp: 110, attack: 11, defense: 14, speed: 8, special: "Pierce Line" },
};

const SLINGSHOT_ABILITIES: Record<NormieType, SlingshotAbility> = {
  Human: {
    name: "Splash",
    description: "Balanced area damage on impact",
    type: "Human",
  },
  Cat: {
    name: "Split",
    description: "Splits into 3 projectiles on impact",
    type: "Cat",
  },
  Alien: {
    name: "Phase",
    description: "Phases through the first block hit",
    type: "Alien",
  },
  Agent: {
    name: "Pierce",
    description: "Pierces through blocks in a line",
    type: "Agent",
  },
};

const RUNNER_MODIFIERS: Record<NormieType, { speed: number; magnet: number; shield: number }> = {
  Human: { speed: 1, magnet: 1, shield: 0 },
  Cat: { speed: 1.25, magnet: 1, shield: 0 },
  Alien: { speed: 1, magnet: 1.5, shield: 0 },
  Agent: { speed: 0.95, magnet: 1, shield: 1 },
};

export function parseNormieType(type: string): NormieType {
  if (type === "Cat" || type === "Alien" || type === "Agent") return type;
  return "Human";
}

export function getCombatStats(type: string, expression?: string): CombatStats {
  const base = { ...TYPE_BASE[parseNormieType(type)] };
  if (expression === "Serious") base.attack += 3;
  if (expression === "Peaceful") base.defense += 3;
  if (expression === "Confident") base.speed += 2;
  return base;
}

export function getSlingshotAbility(type: string): SlingshotAbility {
  return SLINGSHOT_ABILITIES[parseNormieType(type)];
}

export function getRunnerModifiers(type: string) {
  return RUNNER_MODIFIERS[parseNormieType(type)];
}

export interface PenaltyModifiers {
  name: string;
  description: string;
  powerSweetSpot: number;
  powerSpeed: number;
  maxPower: number;
  curve: number;
  diveSpeed: number;
  diveReach: number;
  diveBias: number;
}

const PENALTY_MODIFIERS: Record<NormieType, PenaltyModifiers> = {
  Human: {
    name: "Balanced",
    description: "Even aim and dive stats",
    powerSweetSpot: 0.5,
    powerSpeed: 1,
    maxPower: 1,
    curve: 0,
    diveSpeed: 1,
    diveReach: 1,
    diveBias: 0,
  },
  Cat: {
    name: "Quick Shot",
    description: "Wider sweet spot, less power",
    powerSweetSpot: 0.42,
    powerSpeed: 1.3,
    maxPower: 0.85,
    curve: 0,
    diveSpeed: 1.35,
    diveReach: 0.8,
    diveBias: 0,
  },
  Agent: {
    name: "Power Shot",
    description: "Slow meter, high power cap",
    powerSweetSpot: 0.5,
    powerSpeed: 0.75,
    maxPower: 1.2,
    curve: 0,
    diveSpeed: 0.8,
    diveReach: 1.3,
    diveBias: 0,
  },
  Alien: {
    name: "Curve Ball",
    description: "Ball curves; keeper dives unpredictably",
    powerSweetSpot: 0.48,
    powerSpeed: 1,
    maxPower: 1,
    curve: 0.15,
    diveSpeed: 1,
    diveReach: 1,
    diveBias: 0.25,
  },
};

export function getPenaltyModifiers(type: string): PenaltyModifiers {
  return PENALTY_MODIFIERS[parseNormieType(type)];
}

export type TowerSpecial = "splash" | "rapid" | "sniper" | "slow";

export interface TowerStats {
  damage: number;
  range: number;
  fireRate: number;
  special: TowerSpecial;
  label: string;
}

export function getTowerStats(type: string, expression?: string): TowerStats {
  const combat = getCombatStats(type, expression);
  const t = parseNormieType(type);
  const base = {
    Human: {
      damage: combat.attack,
      range: 100,
      fireRate: 1.1,
      special: "splash" as TowerSpecial,
      label: "Balanced splash",
    },
    Cat: {
      damage: combat.attack * 0.75,
      range: 78,
      fireRate: 2,
      special: "rapid" as TowerSpecial,
      label: "Rapid fire",
    },
    Agent: {
      damage: combat.attack * 1.4,
      range: 130,
      fireRate: 0.65,
      special: "sniper" as TowerSpecial,
      label: "Long range",
    },
    Alien: {
      damage: combat.attack * 0.95,
      range: 95,
      fireRate: 1,
      special: "slow" as TowerSpecial,
      label: "Slow on hit",
    },
  };
  return base[t];
}
