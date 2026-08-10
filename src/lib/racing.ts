export type CarStat = "engine" | "wheels" | "turbo";

export const CAR_STATS: CarStat[] = ["engine", "wheels", "turbo"];
export const MAX_CAR_LEVEL = 4;

export function upgradeCost(currentLevel: number): number {
  return currentLevel * 80;
}

export const CAR_COLORS = ["red", "blue", "green", "yellow", "black"] as const;
export type CarColor = (typeof CAR_COLORS)[number];

export const PLACEMENT_REWARDS = [100, 70, 45, 25];

export interface TrackDef {
  id: string;
  name: string;
  description: string;
  worldWidth: number;
  worldHeight: number;
  // Closed-loop waypoints cars follow, in order, wrapping back to the first.
  waypoints: { x: number; y: number }[];
  roadWidth: number;
}

const OVAL_WAYPOINTS = [
  { x: 200, y: 120 }, { x: 700, y: 120 }, { x: 860, y: 220 }, { x: 860, y: 380 },
  { x: 700, y: 480 }, { x: 200, y: 480 }, { x: 40, y: 380 }, { x: 40, y: 220 },
];

const FIGURE_EIGHT_WAYPOINTS = [
  { x: 150, y: 150 }, { x: 500, y: 150 }, { x: 650, y: 260 }, { x: 500, y: 370 },
  { x: 150, y: 370 }, { x: 60, y: 260 }, { x: 150, y: 150 },
  { x: 500, y: 150 }, { x: 850, y: 150 }, { x: 940, y: 260 }, { x: 850, y: 370 },
  { x: 500, y: 370 },
];

const ZIGZAG_WAYPOINTS = [
  { x: 80, y: 400 }, { x: 260, y: 150 }, { x: 440, y: 400 }, { x: 620, y: 150 },
  { x: 800, y: 400 }, { x: 900, y: 250 }, { x: 800, y: 100 }, { x: 500, y: 60 },
  { x: 200, y: 100 }, { x: 80, y: 250 },
];

export const TRACKS: TrackDef[] = [
  {
    id: "sunny-oval",
    name: "Sunny Oval",
    description: "A gentle, wide loop — great for a first race.",
    worldWidth: 900,
    worldHeight: 600,
    waypoints: OVAL_WAYPOINTS,
    roadWidth: 90,
  },
  {
    id: "figure-eight",
    name: "Figure Eight",
    description: "Crosses over itself in the middle — watch your turns.",
    worldWidth: 1000,
    worldHeight: 520,
    waypoints: FIGURE_EIGHT_WAYPOINTS,
    roadWidth: 80,
  },
  {
    id: "zigzag-canyon",
    name: "Zigzag Canyon",
    description: "Sharp switchbacks all the way around. Expert drivers only.",
    worldWidth: 980,
    worldHeight: 460,
    waypoints: ZIGZAG_WAYPOINTS,
    roadWidth: 70,
  },
];

export function getTrack(trackId: string): TrackDef | undefined {
  return TRACKS.find((t) => t.id === trackId);
}

export interface Decoration {
  x: number;
  y: number;
  type: "tree" | "cone";
}

// Deterministic (no randomness) so decorations are stable across renders —
// a ring of trees just outside the road on both sides of each waypoint.
export function trackDecorations(track: TrackDef): Decoration[] {
  const decorations: Decoration[] = [];
  const offset = track.roadWidth / 2 + 34;
  for (let i = 0; i < track.waypoints.length; i++) {
    const a = track.waypoints[i];
    const b = track.waypoints[(i + 1) % track.waypoints.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    decorations.push({ x: a.x + px * offset, y: a.y + py * offset, type: "tree" });
    decorations.push({ x: a.x - px * offset, y: a.y - py * offset, type: "tree" });
  }
  return decorations;
}
