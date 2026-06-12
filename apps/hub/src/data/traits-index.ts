import type { TraitsIndexEntry } from "@normie/shared";

let cache: TraitsIndexEntry[] | null = null;

export async function loadTraitsIndex(): Promise<TraitsIndexEntry[]> {
  if (cache) return cache;
  try {
    const res = await fetch("/traits-index.json");
    if (!res.ok) {
      return generateFallbackIndex();
    }
    const text = await res.text();
    cache = JSON.parse(text) as TraitsIndexEntry[];
    return cache;
  } catch {
    return generateFallbackIndex();
  }
}

function generateFallbackIndex(): TraitsIndexEntry[] {
  const types = ["Human", "Cat", "Alien", "Agent"];
  const expressions = ["Neutral", "Serious", "Peaceful", "Confident"];
  return Array.from({ length: 10000 }, (_, id) => ({
    id,
    type: types[id % 4],
    gender: id % 2 === 0 ? "Male" : "Female",
    age: "Young",
    hair: "Short Hair",
    face: "Clean Shaven",
    eyes: "No Glasses",
    expression: expressions[id % 4],
    accessory: "Top Hat",
  }));
}

export function filterTraits(
  entries: TraitsIndexEntry[],
  filters: {
    type?: string;
    expression?: string;
    search?: string;
  },
): TraitsIndexEntry[] {
  return entries.filter((e) => {
    if (filters.type && e.type !== filters.type) return false;
    if (filters.expression && e.expression !== filters.expression) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!String(e.id).includes(q) && !e.type.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function randomNormieIds(count: number, exclude?: number): number[] {
  const ids = new Set<number>();
  while (ids.size < count) {
    const id = Math.floor(Math.random() * 10000);
    if (id !== exclude) ids.add(id);
  }
  return [...ids];
}
