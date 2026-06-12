import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const API_BASE = "https://api.normies.art";
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../data/traits-index.json");

interface Entry {
  id: number;
  type: string;
  gender: string;
  age: string;
  hair: string;
  face: string;
  eyes: string;
  expression: string;
  accessory: string;
}

async function fetchTraits(id: number): Promise<Entry> {
  const res = await fetch(`${API_BASE}/normie/${id}/traits`);
  if (!res.ok) throw new Error(`Failed ${id}: ${res.status}`);
  const data = (await res.json()) as {
    attributes: { trait_type: string; value: string }[];
  };
  const get = (t: string) =>
    data.attributes.find((a) => a.trait_type === t)?.value ?? "";
  return {
    id,
    type: get("Type"),
    gender: get("Gender"),
    age: get("Age"),
    hair: get("Hair Style"),
    face: get("Facial Feature"),
    eyes: get("Eyes"),
    expression: get("Expression"),
    accessory: get("Accessory"),
  };
}

async function main() {
  const entries: Entry[] = [];
  const BATCH = 30;
  const DELAY_MS = 1100;

  for (let start = 0; start < 10000; start += BATCH) {
    const batch = Array.from({ length: Math.min(BATCH, 10000 - start) }, (_, i) =>
      fetchTraits(start + i),
    );
    const results = await Promise.all(batch);
    entries.push(...results);
    process.stdout.write(`\rFetched ${entries.length}/10000`);
    if (start + BATCH < 10000) await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(entries));
  console.log(`\nWrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
