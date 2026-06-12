export const VIRTUAL_W = 800;
export const VIRTUAL_H = 450;

export interface Vec2 {
  x: number;
  y: number;
}

export interface TowerSlot {
  id: number;
  x: number;
  y: number;
}

export interface MapDef {
  id: number;
  name: string;
  path: Vec2[];
  slots: TowerSlot[];
}

export const DEFENSE_MAPS: MapDef[] = [
  {
    id: 0,
    name: "Straight Lane",
    path: [
      { x: 0, y: 225 },
      { x: 200, y: 225 },
      { x: 400, y: 225 },
      { x: 600, y: 225 },
      { x: 800, y: 225 },
    ],
    slots: [
      { id: 0, x: 120, y: 160 },
      { id: 1, x: 120, y: 290 },
      { id: 2, x: 280, y: 160 },
      { id: 3, x: 280, y: 290 },
      { id: 4, x: 440, y: 160 },
      { id: 5, x: 440, y: 290 },
      { id: 6, x: 600, y: 200 },
      { id: 7, x: 600, y: 250 },
    ],
  },
  {
    id: 1,
    name: "S-Curve",
    path: [
      { x: 0, y: 100 },
      { x: 180, y: 100 },
      { x: 280, y: 200 },
      { x: 380, y: 300 },
      { x: 520, y: 300 },
      { x: 620, y: 200 },
      { x: 800, y: 200 },
    ],
    slots: [
      { id: 0, x: 100, y: 170 },
      { id: 1, x: 220, y: 130 },
      { id: 2, x: 320, y: 250 },
      { id: 3, x: 420, y: 230 },
      { id: 4, x: 500, y: 350 },
      { id: 5, x: 580, y: 130 },
      { id: 6, x: 680, y: 280 },
    ],
  },
  {
    id: 2,
    name: "Split Lane",
    path: [
      { x: 0, y: 150 },
      { x: 160, y: 150 },
      { x: 300, y: 225 },
      { x: 440, y: 300 },
      { x: 580, y: 300 },
      { x: 720, y: 225 },
      { x: 800, y: 225 },
    ],
    slots: [
      { id: 0, x: 80, y: 90 },
      { id: 1, x: 80, y: 210 },
      { id: 2, x: 240, y: 300 },
      { id: 3, x: 360, y: 120 },
      { id: 4, x: 480, y: 360 },
      { id: 5, x: 560, y: 150 },
      { id: 6, x: 640, y: 300 },
      { id: 7, x: 720, y: 120 },
    ],
  },
];
