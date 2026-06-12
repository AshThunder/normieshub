import type { NormieType } from "@normie/shared";

const COLORS: Record<NormieType, { main: string; trail: string }> = {
  Human: { main: "#48494b", trail: "rgba(72,73,75,0.35)" },
  Cat: { main: "#6b6d70", trail: "rgba(107,109,112,0.4)" },
  Alien: { main: "#3d3f42", trail: "rgba(61,63,66,0.45)" },
  Agent: { main: "#1a1a1a", trail: "rgba(26,26,26,0.4)" },
};

export function typeColors(type: string) {
  if (type === "Cat" || type === "Alien" || type === "Agent") return COLORS[type];
  return COLORS.Human;
}
