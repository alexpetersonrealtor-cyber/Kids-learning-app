import type { Prisma } from "@prisma/client";

export interface Crop {
  id: string;
  name: string;
  emoji: string;
  seedCost: number;
  growTimeMs: number;
  sellPrice: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// Idle-farm pacing: crops take real minutes-to-hours to grow, so there's a
// reason to plant, go do something else (another game, come back later),
// and return to collect — rather than a plot cycling in under a minute.
export const CROPS: Crop[] = [
  { id: "carrot", name: "Carrot", emoji: "🥕", seedCost: 5, growTimeMs: 5 * MINUTE, sellPrice: 12 },
  { id: "corn", name: "Corn", emoji: "🌽", seedCost: 15, growTimeMs: 20 * MINUTE, sellPrice: 38 },
  { id: "pumpkin", name: "Pumpkin", emoji: "🎃", seedCost: 40, growTimeMs: HOUR, sellPrice: 100 },
  { id: "strawberry", name: "Strawberry", emoji: "🍓", seedCost: 80, growTimeMs: 4 * HOUR, sellPrice: 220 },
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

// ---- Animals ----
// An animal is a one-time purchase that, once placed in a pen, produces its
// good on a repeating timer forever — unlike a crop, harvesting it doesn't
// clear the pen or cost anything to "replant".
export interface Animal {
  id: string;
  name: string;
  emoji: string;
  purchaseCost: number;
  cycleTimeMs: number;
  productId: string;
  productName: string;
  productEmoji: string;
  sellPrice: number;
}

export const ANIMALS: Animal[] = [
  {
    id: "chicken", name: "Chicken", emoji: "🐔", purchaseCost: 100, cycleTimeMs: 10 * MINUTE,
    productId: "egg", productName: "Egg", productEmoji: "🥚", sellPrice: 15,
  },
  {
    id: "cow", name: "Cow", emoji: "🐄", purchaseCost: 250, cycleTimeMs: 30 * MINUTE,
    productId: "milk", productName: "Milk", productEmoji: "🥛", sellPrice: 40,
  },
  {
    id: "sheep", name: "Sheep", emoji: "🐑", purchaseCost: 400, cycleTimeMs: HOUR,
    productId: "wool", productName: "Wool", productEmoji: "🧶", sellPrice: 80,
  },
];

export function getAnimal(animalId: string): Animal | undefined {
  return ANIMALS.find((a) => a.id === animalId);
}

// Animals are owned in bulk per type (three chickens, two cows, ...), not
// one-per-slot — all animals of a type share one production cycle, so
// collecting N chickens' worth of eggs is one action, not N. `capacity` is
// how many of that type the pen/pasture can currently hold; buying more
// land for that area (penExpandCost) raises it before more animals of that
// type can be bought at all.
export interface AnimalPenState {
  capacity: number;
  count: number;
  lastCollectedAt: string | null;
}

export type AnimalPens = Record<string, AnimalPenState>;

export function emptyAnimalPens(): AnimalPens {
  const pens: AnimalPens = {};
  for (const animal of ANIMALS) {
    pens[animal.id] = { capacity: 0, count: 0, lastCollectedAt: null };
  }
  return pens;
}

export function getPen(pens: AnimalPens, animalId: string): AnimalPenState {
  return pens[animalId] ?? { capacity: 0, count: 0, lastCollectedAt: null };
}

// Cost to expand a pen's capacity by one (unlocks room for one more animal
// of that type). Buyable even at capacity 0 — that's how a pen is unlocked
// in the first place.
export function penExpandCost(animal: Animal, currentCapacity: number): number {
  return Math.round(animal.purchaseCost * 0.4) + currentCapacity * 20;
}

// Cost of the next individual animal of this type (rises with how many are
// already owned, same shape as land/seed cost curves elsewhere).
export function animalCost(animal: Animal, currentCount: number): number {
  return animal.purchaseCost + currentCount * Math.round(animal.purchaseCost * 0.3);
}

export const MAX_PEN_CAPACITY = 8;

export type PenStatus = "empty" | "producing" | "ready";

export function penState(pen: AnimalPenState, animal: Animal, now: number): PenStatus {
  if (pen.count === 0 || !pen.lastCollectedAt) return "empty";
  const readyAt = new Date(pen.lastCollectedAt).getTime() + animal.cycleTimeMs;
  return now >= readyAt ? "ready" : "producing";
}

export function penProgress(pen: AnimalPenState, animal: Animal, now: number): number {
  if (pen.count === 0 || !pen.lastCollectedAt) return 0;
  const elapsed = now - new Date(pen.lastCollectedAt).getTime();
  return Math.max(0, Math.min(1, elapsed / animal.cycleTimeMs));
}

// Adds up to `quantity` units of itemId to the barn, respecting capacity.
// Returns how many actually fit.
export function addManyToBarn(barn: Barn, itemId: string, quantity: number, capacity: number): number {
  const room = Math.max(0, capacity - barnTotal(barn));
  const added = Math.min(room, quantity);
  if (added > 0) barn[itemId] = (barn[itemId] ?? 0) + added;
  return added;
}

// ---- Unified sellable items (crops + animal products) ----
export interface SellableItem {
  id: string;
  name: string;
  emoji: string;
  sellPrice: number;
}

export function getSellableItem(itemId: string): SellableItem | undefined {
  const crop = getCrop(itemId);
  if (crop) return crop;
  const animal = ANIMALS.find((a) => a.productId === itemId);
  if (animal) {
    return { id: animal.productId, name: animal.productName, emoji: animal.productEmoji, sellPrice: animal.sellPrice };
  }
  return undefined;
}

export function allSellableItemIds(): string[] {
  return [...CROPS.map((c) => c.id), ...ANIMALS.map((a) => a.productId)];
}

// ---- Barn storage ----
export type Barn = Record<string, number>;

export const STARTING_BARN_LEVEL = 1;
export const MAX_BARN_LEVEL = 5;

export function barnCapacityForLevel(level: number): number {
  return 20 + (level - 1) * 16;
}

export function barnUpgradeCost(currentLevel: number): number {
  return 60 + currentLevel * 60;
}

export function barnTotal(barn: Barn): number {
  return Object.values(barn).reduce((sum, n) => sum + n, 0);
}

// Adds one unit of itemId to the barn, respecting capacity. Returns whether
// it fit (callers use this to decide whether a harvest/collection actually
// happened, or the item stays on the plant/pen waiting for room).
export function addToBarn(barn: Barn, itemId: string, capacity: number): boolean {
  if (barnTotal(barn) >= capacity) return false;
  barn[itemId] = (barn[itemId] ?? 0) + 1;
  return true;
}

// ---- Basket ----
// Without auto-harvest, harvesting/collecting doesn't go straight into the
// barn — it goes into the basket the kid is physically carrying, which has
// to be walked over to the barn and deposited. Auto-harvest skips the
// basket entirely and deposits straight into the barn (that's the whole
// point of buying it). Small capacity on purpose — it forces regular trips
// back to the barn rather than letting one basket hold an unlimited haul.
export type Basket = Record<string, number>;
export const BASKET_CAPACITY = 8;

export function basketTotal(basket: Basket): number {
  return Object.values(basket).reduce((sum, n) => sum + n, 0);
}

export function addToBasket(basket: Basket, itemId: string, quantity: number): number {
  const room = Math.max(0, BASKET_CAPACITY - basketTotal(basket));
  const added = Math.min(room, quantity);
  if (added > 0) basket[itemId] = (basket[itemId] ?? 0) + added;
  return added;
}

// Moves as much of the basket into the barn as fits, leaving any overflow
// (barn full) still in the basket.
export function depositBasket(basket: Basket, barn: Barn, capacity: number): { basket: Basket; barn: Barn } {
  const nextBasket: Basket = { ...basket };
  const nextBarn: Barn = { ...barn };
  for (const [itemId, qty] of Object.entries(basket)) {
    const added = addManyToBarn(nextBarn, itemId, qty, capacity);
    if (added >= qty) delete nextBasket[itemId];
    else nextBasket[itemId] = qty - added;
  }
  return { basket: nextBasket, barn: nextBarn };
}

export function basketToJson(basket: Basket): Prisma.InputJsonValue {
  return basket as unknown as Prisma.InputJsonValue;
}

// ---- Customer orders ----
// Selling only ever happens by fulfilling the current customer's order —
// there's no "just sell whatever" option, and orders are only ever created
// or fulfilled from an explicit in-session action (never during the offline
// auto-harvest/auto-plant catch-up below).
export interface CustomerOrder {
  itemId: string;
  quantity: number;
  reward: number;
  createdAt: string;
}

const ORDER_REWARD_MULTIPLIER = 1.4;
const ORDER_MAX_QUANTITY = 4;

export function generateOrder(availableItemIds: string[], rand: () => number): CustomerOrder | null {
  if (availableItemIds.length === 0) return null;
  const itemId = availableItemIds[Math.floor(rand() * availableItemIds.length)];
  const item = getSellableItem(itemId);
  if (!item) return null;
  const quantity = 1 + Math.floor(rand() * ORDER_MAX_QUANTITY);
  const reward = Math.round(item.sellPrice * quantity * ORDER_REWARD_MULTIPLIER);
  return { itemId, quantity, reward, createdAt: new Date().toISOString() };
}

export function canFulfillOrder(barn: Barn, order: CustomerOrder): boolean {
  return (barn[order.itemId] ?? 0) >= order.quantity;
}

// ---- Automation (auto-harvest / auto-plant) ----
// Deliberately "super expensive" one-time purchases per the design brief —
// these are meant to be a late-game payoff, not an early convenience.
export const AUTO_HARVEST_COST = 500;
export const AUTO_PLANT_COST = 750; // requires auto-harvest already owned

// ---- Offline catch-up simulation ----
// Auto-harvest/auto-plant are allowed to run while the kid is away (that's
// the point of automation), but nothing is ever sold except through an
// explicit fulfillOrder action taken during an active session — this
// function only ever grows the barn/replants, never touches coins via a
// sale or generates/fulfills orders.
export interface FarmAutoState {
  coins: number;
  wateringLevel: number;
  barnLevel: number;
  autoHarvest: boolean;
  autoPlant: boolean;
  plots: Plot[];
  animalPens: AnimalPens;
  barn: Barn;
}

const MAX_AUTO_CYCLES_PER_SLOT = 200; // safety bound, not a balance lever

export function simulateAutoCycles(state: FarmAutoState, nowMs: number): FarmAutoState {
  if (!state.autoHarvest) return state;

  const capacity = barnCapacityForLevel(state.barnLevel);
  let coins = state.coins;
  const barn: Barn = { ...state.barn };
  const plots = state.plots.map((p) => ({ ...p }));
  const animalPens: AnimalPens = {};
  for (const [id, pen] of Object.entries(state.animalPens)) animalPens[id] = { ...pen };

  for (const plot of plots) {
    for (let i = 0; i < MAX_AUTO_CYCLES_PER_SLOT; i++) {
      if (!plot.crop || !plot.plantedAt) break;
      const crop = getCrop(plot.crop);
      if (!crop) break;
      const readyAt = new Date(plot.plantedAt).getTime() + effectiveGrowTimeMs(crop, state.wateringLevel);
      if (readyAt > nowMs) break;
      if (!addToBarn(barn, crop.id, capacity)) break; // barn full — leave it standing ready
      if (state.autoPlant && coins >= crop.seedCost) {
        coins -= crop.seedCost;
        plot.plantedAt = new Date(readyAt).toISOString();
      } else {
        plot.crop = null;
        plot.plantedAt = null;
        break;
      }
    }
  }

  for (const animal of ANIMALS) {
    const pen = animalPens[animal.id];
    if (!pen) continue;
    for (let i = 0; i < MAX_AUTO_CYCLES_PER_SLOT; i++) {
      if (pen.count === 0 || !pen.lastCollectedAt) break;
      const readyAt = new Date(pen.lastCollectedAt).getTime() + animal.cycleTimeMs;
      if (readyAt > nowMs) break;
      const added = addManyToBarn(barn, animal.productId, pen.count, capacity);
      if (added === 0) break; // barn full
      pen.lastCollectedAt = new Date(readyAt).toISOString();
      if (added < pen.count) break; // barn filled up partway through this cycle's yield
    }
  }

  return { ...state, coins, barn, plots, animalPens };
}

export type PlotStatus = "empty" | "growing" | "ready";

export function plotState(plot: Plot, wateringLevel: number, now: number): PlotStatus {
  if (!plot.crop || !plot.plantedAt) return "empty";
  const crop = getCrop(plot.crop);
  if (!crop) return "empty";
  const readyAt = new Date(plot.plantedAt).getTime() + effectiveGrowTimeMs(crop, wateringLevel);
  return now >= readyAt ? "ready" : "growing";
}

export function growProgress(plot: Plot, wateringLevel: number, now: number): number {
  if (!plot.crop || !plot.plantedAt) return 0;
  const crop = getCrop(plot.crop);
  if (!crop) return 0;
  const total = effectiveGrowTimeMs(crop, wateringLevel);
  const elapsed = now - new Date(plot.plantedAt).getTime();
  return Math.max(0, Math.min(1, elapsed / total));
}

// Prisma's Json input type wants each array/object element to satisfy an
// indexed InputJsonObject shape, which plain named interfaces don't
// structurally match — bridge it here once instead of casting at every
// call site.
export function plotsToJson(plots: Plot[]): Prisma.InputJsonValue {
  return plots as unknown as Prisma.InputJsonValue;
}

export function animalPensToJson(pens: AnimalPens): Prisma.InputJsonValue {
  return pens as unknown as Prisma.InputJsonValue;
}

export function barnToJson(barn: Barn): Prisma.InputJsonValue {
  return barn as unknown as Prisma.InputJsonValue;
}

export function orderToJson(order: CustomerOrder | null): Prisma.InputJsonValue {
  return order as unknown as Prisma.InputJsonValue;
}
