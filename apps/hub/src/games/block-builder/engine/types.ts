export type BlockDifficulty = "slow" | "medium" | "fast";

export const BLOCK_SPEED: Record<
  BlockDifficulty,
  { label: string; tickMs: number; minTickMs: number; linesPerLevel: number }
> = {
  slow: { label: "Slow", tickMs: 900, minTickMs: 400, linesPerLevel: 10 },
  medium: { label: "Medium", tickMs: 650, minTickMs: 280, linesPerLevel: 10 },
  fast: { label: "Fast", tickMs: 450, minTickMs: 180, linesPerLevel: 10 },
};

export type BlockBuilderStatus = "ready" | "playing" | "dead";

export interface BlockBuilderHud {
  score: number;
  lines: number;
  level: number;
  collected: number;
  status: BlockBuilderStatus;
  message: string;
  difficulty: BlockDifficulty;
}

export interface BlockBuilderResult {
  score: number;
  linesCleared: number;
  collectedNormieIds: number[];
}

export interface BlockBuilderCallbacks {
  onHud: (hud: BlockBuilderHud) => void;
  onGameOver: (result: BlockBuilderResult) => void;
}
