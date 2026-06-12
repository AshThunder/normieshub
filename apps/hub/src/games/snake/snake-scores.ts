import type { SnakeDifficulty } from "./engine/SnakeEngine";

const KEY = "normie-snake-scores";

export interface SnakeScores {
  easy: number;
  medium: number;
  hard: number;
}

const EMPTY: SnakeScores = { easy: 0, medium: 0, hard: 0 };

export function loadSnakeScores(): SnakeScores {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<SnakeScores>;
    return {
      easy: parsed.easy ?? 0,
      medium: parsed.medium ?? 0,
      hard: parsed.hard ?? 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveSnakeScore(difficulty: SnakeDifficulty, score: number) {
  const scores = loadSnakeScores();
  if (score <= scores[difficulty]) return;
  scores[difficulty] = score;
  localStorage.setItem(KEY, JSON.stringify(scores));
}

export function getSnakeHighScore(difficulty: SnakeDifficulty): number {
  return loadSnakeScores()[difficulty];
}

/** Migrate legacy per-key storage if present. */
export function migrateSnakeScores() {
  const scores = loadSnakeScores();
  let changed = false;
  for (const d of ["easy", "medium", "hard"] as SnakeDifficulty[]) {
    const legacy = parseInt(localStorage.getItem(`normie-snake-high-${d}`) ?? "0", 10) || 0;
    if (legacy > scores[d]) {
      scores[d] = legacy;
      changed = true;
    }
  }
  if (changed) localStorage.setItem(KEY, JSON.stringify(scores));
}
