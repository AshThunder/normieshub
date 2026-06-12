import { GRID_SIZE } from "../constants";

export function parsePixelString(binary: string): boolean[][] {
  const grid: boolean[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const idx = y * GRID_SIZE + x;
      row.push(binary[idx] === "1");
    }
    grid.push(row);
  }
  return grid;
}

export function gridToPixelString(grid: boolean[][]): string {
  let out = "";
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      out += grid[y]?.[x] ? "1" : "0";
    }
  }
  return out;
}
