import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../apps/hub/public/traits-index.json");

const types = ["Human", "Cat", "Alien", "Agent"];
const expressions = ["Neutral", "Slight Smile", "Serious", "Peaceful", "Confident"];
const accessories = ["Top Hat", "Fedora", "Cap", "Bandana", "Hoodie"];

const entries = Array.from({ length: 10000 }, (_, id) => ({
  id,
  type: types[id % 47 === 0 ? 1 : id % 113 === 0 ? 2 : id % 251 === 0 ? 3 : 0],
  gender: id % 3 === 0 ? "Non-Binary" : id % 2 === 0 ? "Male" : "Female",
  age: ["Young", "Middle-Aged", "Old"][id % 3],
  hair: "Short Hair",
  face: "Clean Shaven",
  eyes: "No Glasses",
  expression: expressions[id % expressions.length],
  accessory: accessories[id % accessories.length],
}));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(entries));
console.log(`Wrote ${OUT} (${entries.length} entries)`);
