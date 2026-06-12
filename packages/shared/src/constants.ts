/** Same-origin proxy in the hub app avoids Vercel bot challenges on cross-origin browser requests. */
export const API_BASE =
  typeof import.meta !== "undefined" &&
  "env" in import.meta &&
  (import.meta as ImportMeta & { env: { VITE_NORMIES_API_BASE?: string } }).env
    .VITE_NORMIES_API_BASE
    ? (import.meta as ImportMeta & { env: { VITE_NORMIES_API_BASE: string } }).env
        .VITE_NORMIES_API_BASE
    : "https://api.normies.art";
export const NORMIES_CONTRACT = "0x9Eb6E2025B64f340691e424b7fe7022fFDE12438";
export const PIXEL_ON = "#48494b";
export const PIXEL_OFF = "#e3e5e4";
export const GRID_SIZE = 40;
export const TOKEN_MIN = 0;
export const TOKEN_MAX = 9999;

export const NORMIE_TYPES = ["Human", "Cat", "Alien", "Agent"] as const;
export type NormieType = (typeof NORMIE_TYPES)[number];
