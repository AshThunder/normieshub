export interface DefenseProgress {
  unlockedMaps: number;
  mapStars: Record<number, 1 | 2 | 3>;
}

const KEY = "normie-defense-progress";

export function loadDefenseProgress(): DefenseProgress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { unlockedMaps: 0, mapStars: {} };
    return JSON.parse(raw) as DefenseProgress;
  } catch {
    return { unlockedMaps: 0, mapStars: {} };
  }
}

export function saveDefenseProgress(p: DefenseProgress) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function starsFromLives(lives: number): 1 | 2 | 3 {
  if (lives >= 12) return 3;
  if (lives >= 7) return 2;
  return 1;
}
