export type MusicTrackId = "hub" | "action" | "arcade" | "defense" | "dungeon";

export type SfxName =
  | "stretch"
  | "shoot"
  | "impact"
  | "shatter"
  | "win"
  | "lose"
  | "eat"
  | "die"
  | "start"
  | "turn"
  | "place"
  | "upgrade"
  | "towerShoot"
  | "towerHit"
  | "enemyKill"
  | "leak"
  | "waveClear"
  | "waveStart"
  | "kick"
  | "goal"
  | "save"
  | "select"
  | "laneSwitch"
  | "collect"
  | "hit"
  | "crash"
  | "attack"
  | "defend"
  | "special"
  | "floorClear"
  | "uiClick";

export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicEnabled: false,
  sfxEnabled: true,
  musicVolume: 0.45,
  sfxVolume: 0.7,
};
