export interface CircleRing {
  count: number;
  radiusFrac: number;
  sizeFrac: number;
}

/** Three rings like an X interaction circle — inner to outer. */
export const CIRCLE_RINGS: CircleRing[] = [
  { count: 10, radiusFrac: 0.2, sizeFrac: 0.088 },
  { count: 12, radiusFrac: 0.33, sizeFrac: 0.072 },
  { count: 14, radiusFrac: 0.46, sizeFrac: 0.06 },
];

export const CIRCLE_NORMIE_COUNT = CIRCLE_RINGS.reduce((n, r) => n + r.count, 0);

export interface CircleSlot {
  ring: number;
  index: number;
  normieId: number;
  x: number;
  y: number;
  size: number;
}

export function layoutCircleSlots(
  normieIds: number[],
  size: number,
  options?: { reserveBottom?: number },
): CircleSlot[] {
  const footer = options?.reserveBottom ?? 0;
  const layoutSize = size - footer;
  const cx = size / 2;
  const cy = layoutSize / 2;
  const slots: CircleSlot[] = [];
  let idIdx = 0;

  CIRCLE_RINGS.forEach((ring, ringIndex) => {
    for (let i = 0; i < ring.count; i++) {
      const angle = (i / ring.count) * Math.PI * 2 - Math.PI / 2;
      const r = layoutSize * ring.radiusFrac;
      slots.push({
        ring: ringIndex,
        index: i,
        normieId: normieIds[idIdx++] ?? 0,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        size: layoutSize * ring.sizeFrac,
      });
    }
  });

  return slots;
}

export function randomNormieIds(count: number, exclude = new Set<number>()): number[] {
  const ids: number[] = [];
  const used = new Set(exclude);
  while (ids.length < count) {
    const id = Math.floor(Math.random() * 10000);
    if (!used.has(id)) {
      used.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** Pick up to `count` token IDs from wallet holdings (shuffled). */
export function squadFromHoldings(holdings: number[], count: number): number[] {
  if (holdings.length === 0) return [];
  const shuffled = [...holdings].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
