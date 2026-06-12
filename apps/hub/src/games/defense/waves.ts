export interface WaveDef {
  wave: number;
  count: number;
  hpMult: number;
  speedMult: number;
  boss: boolean;
}

const MAP_DIFFICULTY = [0.85, 1, 1.15];

export function getWavesForMap(mapId: number): WaveDef[] {
  const mapScale = MAP_DIFFICULTY[mapId] ?? 1;
  return Array.from({ length: 10 }, (_, i) => {
    const wave = i + 1;
    const count = Math.max(2, Math.round((2 + wave + Math.floor(wave / 3)) * mapScale));
    return {
      wave,
      count,
      hpMult: (1 + wave * 0.15) * mapScale,
      speedMult: 1 + wave * 0.04,
      boss: wave === 10,
    };
  });
}

export const KILL_REWARD = 12;
export const WAVE_CLEAR_BONUS = 35;
export const UPGRADE_COST = [0, 18, 40, 75];
export const MAX_TOWER_LEVEL = 3;
export const STARTING_LIVES = 15;
export const STARTING_COINS = 90;

export const ENEMY_BASE_HP = 20;
export const ENEMY_BOSS_HP = 65;
export const ENEMY_BASE_SPEED = 0.048;
export const ENEMY_SPAWN_INTERVAL = 0.65;
export const MIN_ENEMY_SPACING = 0.06;
export const INITIAL_PREP_TIME = 18;
export const WAVE_PREP_TIME = 12;
export const PLACE_TOWER_TIME = 1.2;
