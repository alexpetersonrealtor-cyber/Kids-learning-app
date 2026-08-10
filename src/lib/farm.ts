import type { Prisma } from "@prisma/client";

export interface Crop {
  id: string;
  name: string;
  emoji: string;
  seedCost: number;
  growTimeMs: number;
  sellPrice: number;
}

export const CROPS: Crop[] = [
  { id: "carrot", name: "Carrot", emoji: "🥕", seedCost: 5, growTimeMs: 8000, sellPrice: 12 },
  { id: "corn", name: "Corn", emoji: "🌽", seedCost: 15, growTimeMs: 20000, sellPrice: 38 },
  { id: "pumpkin", name: "Pumpkin", emoji: "🎃", seedCost: 40, growTimeMs: 45000, sellPrice: 100 },
  { id: "strawberry", name: "Strawberry", emoji: "🍓", seedCost: 80, growTimeMs: 70000, sellPrice: 220 },
];

export function getCrop(cropId: string): Crop | undefined {
  return CROPS.find((c) => c.id === cropId);
}

export const STARTING_LAND = 4;
export const MAX_LAND = 10;
export const MAX_UPGRADE_LEVEL = 4;

export function landCost(currentLevel: number): number {
  return 40 + (currentLevel - STARTING_LAND) * 25;
}

export function upgradeCost(currentLevel: number): number {
  return currentLevel * 50;
}

// Watering Can: each level shortens grow time by 10%.
export function growTimeMultiplier(wateringLevel: number): number {
  return 1 - (wateringLevel - 1) * 0.1;
}

// Fertilizer: each level raises sell price by 10%.
export function sellPriceMultiplier(fertilizerLevel: number): number {
  return 1 + (fertilizerLevel - 1) * 0.1;
}

export function effectiveGrowTimeMs(crop: Crop, wateringLevel: number): number {
  return Math.round(crop.growTimeMs * growTimeMultiplier(wateringLevel));
}

export function effectiveSellPrice(crop: Crop, fertilizerLevel: number): number {
  return Math.round(crop.sellPrice * sellPriceMultiplier(fertilizerLevel));
}

export interface Plot {
  crop: string | null;
  plantedAt: string | null;
}

export function emptyPlots(count: number): Plot[] {
  return Array.from({ length: count }, () => ({ crop: null, plantedAt: null }));
}

// Prisma's Json input type wants each array element to satisfy an indexed
// InputJsonObject shape, which a plain named interface like Plot doesn't
// structurally match — bridge it here once instead of casting at every
// call site.
export function plotsToJson(plots: Plot[]): Prisma.InputJsonValue {
  return plots as unknown as Prisma.InputJsonValue;
}
