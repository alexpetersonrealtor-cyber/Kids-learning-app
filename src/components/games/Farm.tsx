"use client";

import { useEffect, useRef, useState } from "react";
import { FARM_SPRITES } from "@/lib/farm-sprites";
import {
  ANIMALS,
  AUTO_HARVEST_COST,
  AUTO_PLANT_COST,
  CROPS,
  MAX_BARN_LEVEL,
  MAX_LAND,
  MAX_PEN_CAPACITY,
  MAX_UPGRADE_LEVEL,
  STARTING_LAND,
  addManyToBarn,
  addToBarn,
  addToBasket,
  animalCost,
  barnCapacityForLevel,
  barnTotal,
  barnUpgradeCost,
  basketTotal,
  canFulfillOrder,
  depositBasket,
  effectiveSellPrice,
  emptyAnimalPens,
  emptyPlots,
  generateOrder,
  getAnimal,
  getCrop,
  getPen,
  getSellableItem,
  growProgress,
  landCost,
  penExpandCost,
  penProgress,
  penState,
  plotState,
  upgradeCost,
  type Animal,
  type AnimalPens,
  type Barn,
  type Basket,
  type CustomerOrder,
  type Plot,
} from "@/lib/farm";

// See RaceTrack.tsx / StarHopper.tsx for why direct Date.now()/performance.now()
// calls are avoided anywhere reachable from render — wrap once here instead.
function nowMs(): number {
  return performance.now();
}
function currentTimeMs(): number {
  return Date.now();
}

interface FarmProgressState {
  coins: number;
  landLevel: number;
  wateringLevel: number;
  fertilizerLevel: number;
  barnLevel: number;
  autoHarvest: boolean;
  autoPlant: boolean;
  plots: Plot[];
  animalPens: AnimalPens;
  barn: Barn;
  basket: Basket;
  currentOrder: CustomerOrder | null;
}

const DEFAULT_PROGRESS: FarmProgressState = {
  coins: 50,
  landLevel: STARTING_LAND,
  wateringLevel: 1,
  fertilizerLevel: 1,
  barnLevel: 1,
  autoHarvest: false,
  autoPlant: false,
  plots: emptyPlots(STARTING_LAND),
  animalPens: emptyAnimalPens(),
  barn: {},
  basket: {},
  currentOrder: null,
};

const CANVAS_W = 480;
const CANVAS_H = 380;
const WORLD_W = 1650;
const PLAYER_SPEED = 175;
const PLAYER_SIZE = 30;
const INTERACT_RADIUS = 48;
const BUILDING_RADIUS = 54;
const ROW_Y = 190;

interface Point {
  x: number;
  y: number;
}

const BARN_POS: Point = { x: 100, y: ROW_Y };
const TABLE_POS: Point = { x: 240, y: ROW_Y };

// Every purchased plot/pen sits farther out along the row than the last —
// buying more land is literally walking farther from the barn, matching
// the rising cost curve.
const CROP_POSITIONS: Point[] = Array.from({ length: MAX_LAND }, (_, i) => ({
  x: 380 + i * 90,
  y: ROW_Y,
}));

const ANIMAL_POSITIONS: Record<string, Point> = {};
ANIMALS.forEach((a, i) => {
  ANIMAL_POSITIONS[a.id] = { x: 1320 + i * 110, y: ROW_Y };
});

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function loadSprites(): Record<string, HTMLImageElement> {
  const images: Record<string, HTMLImageElement> = {};
  for (const [name, src] of Object.entries(FARM_SPRITES)) {
    const img = new Image();
    img.src = src;
    images[name] = img;
  }
  return images;
}

function drawBarn(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const w = 70;
  const h = 56;
  ctx.fillStyle = "#b45309";
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = "#78350f";
  ctx.fillRect(x - 6, y + h / 2 - 22, 12, 22);
  ctx.beginPath();
  ctx.moveTo(x - w / 2 - 8, y - h / 2);
  ctx.lineTo(x, y - h / 2 - 26);
  ctx.lineTo(x + w / 2 + 8, y - h / 2);
  ctx.closePath();
  ctx.fillStyle = "#991b1b";
  ctx.fill();
  ctx.fillStyle = "#fef3c7";
  ctx.beginPath();
  ctx.arc(x, y - h / 2 - 8, 5, 0, Math.PI * 2);
  ctx.fill();
}

interface Interaction {
  plotIndex: number | null;
  animalId: string | null;
  nearBarn: boolean;
  nearTable: boolean;
}

type Screen = "world" | "shop" | "barn";

export default function Farm({ kidId }: { kidId: string }) {
  const [progress, setProgress] = useState<FarmProgressState>(DEFAULT_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("world");
  const [plantingPlot, setPlantingPlot] = useState<number | null>(null);
  const [now, setNow] = useState(() => currentTimeMs());
  const [interaction, setInteraction] = useState<Interaction>({
    plotIndex: null,
    animalId: null,
    nearBarn: false,
    nearTable: false,
  });
  const [toast, setToast] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  const playerRef = useRef<Point>({ x: 170, y: 280 });
  const facingRef = useRef<1 | -1>(1);
  const progressRef = useRef(progress);
  const interactionRef = useRef<Interaction>({ plotIndex: null, animalId: null, nearBarn: false, nearTable: false });
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    spritesRef.current = loadSprites();
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  function applyProgress(data: { progress?: FarmProgressState }) {
    if (data.progress) {
      setProgress({
        coins: data.progress.coins,
        landLevel: data.progress.landLevel,
        wateringLevel: data.progress.wateringLevel,
        fertilizerLevel: data.progress.fertilizerLevel,
        barnLevel: data.progress.barnLevel,
        autoHarvest: data.progress.autoHarvest,
        autoPlant: data.progress.autoPlant,
        plots: data.progress.plots as Plot[],
        animalPens: data.progress.animalPens as AnimalPens,
        barn: data.progress.barn as Barn,
        basket: data.progress.basket as Basket,
        currentOrder: (data.progress.currentOrder as CustomerOrder | null) ?? null,
      });
    }
  }

  // Order generation normally happens server-side (see /api/farm/progress),
  // but that means the demo (no backend) or any failed request would leave
  // currentOrder stuck at null forever — fall back to generating one
  // locally whenever a sync doesn't come back with one.
  function ensureOrder() {
    setProgress((p) => {
      if (p.currentOrder) return p;
      const availableItemIds = [
        ...CROPS.map((c) => c.id),
        ...ANIMALS.filter((a) => getPen(p.animalPens, a.id).count > 0).map((a) => a.productId),
      ];
      return { ...p, currentOrder: generateOrder(availableItemIds, Math.random) };
    });
  }

  useEffect(() => {
    fetch(`/api/farm/progress?kidId=${kidId}`)
      .then((res) => res.json())
      .then((data) => applyProgress(data))
      .catch(() => {})
      .finally(() => {
        setLoaded(true);
        ensureOrder();
      });
  }, [kidId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(currentTimeMs()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-harvest/auto-plant advance server-side (see simulateAutoCycles) even
  // while the kid is away; re-polling periodically while owned pulls those
  // changes in during an active session too, reusing the exact same offline
  // catch-up logic instead of duplicating it client-side.
  useEffect(() => {
    if (!progress.autoHarvest) return;
    const interval = setInterval(() => {
      fetch(`/api/farm/progress?kidId=${kidId}`)
        .then((res) => res.json())
        .then((data) => applyProgress(data))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [progress.autoHarvest, kidId]);

  // Every action updates local state immediately (optimistic) and syncs to
  // the server in the background — without this the game is unplayable
  // wherever there's no backend to round-trip through (like the static demo).
  function syncInBackground(url: string, body: unknown) {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) applyProgress(data);
      })
      .catch(() => {});
  }

  function showToast(text: string) {
    setToast(text);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 1600);
  }

  function plant(plotIndex: number, cropId: string) {
    const crop = getCrop(cropId);
    if (!crop || progressRef.current.coins < crop.seedCost) return;
    setPlantingPlot(null);
    setProgress((p) => {
      const plots = [...p.plots];
      plots[plotIndex] = { crop: crop.id, plantedAt: new Date().toISOString() };
      return { ...p, coins: p.coins - crop.seedCost, plots };
    });
    syncInBackground("/api/farm/plant", { kidId, plotIndex, cropId });
    showToast(`Planted ${crop.emoji} ${crop.name}`);
  }

  // Auto-harvest deposits straight into the barn; otherwise it goes into the
  // basket, which has to be carried over to the barn and deposited.
  function harvest(plotIndex: number) {
    const plot = progressRef.current.plots[plotIndex];
    const crop = plot?.crop ? getCrop(plot.crop) : null;
    if (!crop || plotState(plot, progressRef.current.wateringLevel, currentTimeMs()) !== "ready") return;
    const autoHarvest = progressRef.current.autoHarvest;
    setProgress((p) => {
      const plots = [...p.plots];
      plots[plotIndex] = { crop: null, plantedAt: null };
      if (autoHarvest) {
        const barn = { ...p.barn };
        addToBarn(barn, crop.id, barnCapacityForLevel(p.barnLevel));
        return { ...p, plots, barn };
      }
      const basket = { ...p.basket };
      addToBasket(basket, crop.id, 1);
      return { ...p, plots, basket };
    });
    syncInBackground("/api/farm/harvest", { kidId, plotIndex });
    showToast(`Picked ${crop.emoji} ${crop.name}!`);
  }

  function collectAnimal(animalId: string) {
    const animal = getAnimal(animalId);
    const pen = getPen(progressRef.current.animalPens, animalId);
    if (!animal || penState(pen, animal, currentTimeMs()) !== "ready") return;
    const autoHarvest = progressRef.current.autoHarvest;
    setProgress((p) => {
      const prevPen = getPen(p.animalPens, animalId);
      const nextPens = { ...p.animalPens, [animalId]: { ...prevPen, lastCollectedAt: new Date().toISOString() } };
      if (autoHarvest) {
        const barn = { ...p.barn };
        addManyToBarn(barn, animal.productId, prevPen.count, barnCapacityForLevel(p.barnLevel));
        return { ...p, animalPens: nextPens, barn };
      }
      const basket = { ...p.basket };
      addToBasket(basket, animal.productId, prevPen.count);
      return { ...p, animalPens: nextPens, basket };
    });
    syncInBackground("/api/farm/collect-animal", { kidId, animalId });
    showToast(`Collected ${animal.productEmoji} x${pen.count}!`);
  }

  function depositBasketAction() {
    if (basketTotal(progressRef.current.basket) === 0) return;
    setProgress((p) => {
      const capacity = barnCapacityForLevel(p.barnLevel);
      const { basket, barn } = depositBasket(p.basket, p.barn, capacity);
      return { ...p, basket, barn };
    });
    syncInBackground("/api/farm/deposit-basket", { kidId });
    showToast("Deposited into the barn!");
  }

  function fulfillOrder() {
    const order = progressRef.current.currentOrder;
    if (!order || !canFulfillOrder(progressRef.current.barn, order)) return;
    setProgress((p) => {
      const barn = { ...p.barn };
      barn[order.itemId] = (barn[order.itemId] ?? 0) - order.quantity;
      if (barn[order.itemId] <= 0) delete barn[order.itemId];
      return { ...p, coins: p.coins + order.reward, barn, currentOrder: null };
    });
    fetch("/api/farm/fulfill-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kidId }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) applyProgress(data);
        ensureOrder(); // no-op if the server already provided the next one
      })
      .catch(() => ensureOrder());
    showToast(`Sold for 🪙${order.reward}!`);
  }

  function buyLand() {
    if (progressRef.current.landLevel >= MAX_LAND) return;
    const cost = landCost(progressRef.current.landLevel);
    if (progressRef.current.coins < cost) return;
    setProgress((p) => ({
      ...p,
      coins: p.coins - cost,
      landLevel: p.landLevel + 1,
      plots: [...p.plots, { crop: null, plantedAt: null }],
    }));
    syncInBackground("/api/farm/buy-land", { kidId });
  }

  function buyUpgrade(stat: "watering" | "fertilizer") {
    const field = stat === "watering" ? "wateringLevel" : "fertilizerLevel";
    const currentLevel = progressRef.current[field];
    if (currentLevel >= MAX_UPGRADE_LEVEL) return;
    const cost = upgradeCost(currentLevel);
    if (progressRef.current.coins < cost) return;
    setProgress((p) => ({ ...p, coins: p.coins - cost, [field]: currentLevel + 1 }));
    syncInBackground("/api/farm/upgrade", { kidId, stat });
  }

  function buyBarnUpgrade() {
    if (progressRef.current.barnLevel >= MAX_BARN_LEVEL) return;
    const cost = barnUpgradeCost(progressRef.current.barnLevel);
    if (progressRef.current.coins < cost) return;
    setProgress((p) => ({ ...p, coins: p.coins - cost, barnLevel: p.barnLevel + 1 }));
    syncInBackground("/api/farm/upgrade-barn", { kidId });
  }

  function buyAutomation(type: "harvest" | "plant") {
    const field = type === "harvest" ? "autoHarvest" : "autoPlant";
    const cost = type === "harvest" ? AUTO_HARVEST_COST : AUTO_PLANT_COST;
    if (progressRef.current[field]) return;
    if (type === "plant" && !progressRef.current.autoHarvest) return;
    if (progressRef.current.coins < cost) return;
    setProgress((p) => ({ ...p, coins: p.coins - cost, [field]: true }));
    syncInBackground("/api/farm/buy-automation", { kidId, type });
  }

  function expandPen(animal: Animal) {
    const pen = getPen(progressRef.current.animalPens, animal.id);
    if (pen.capacity >= MAX_PEN_CAPACITY) return;
    const cost = penExpandCost(animal, pen.capacity);
    if (progressRef.current.coins < cost) return;
    setProgress((p) => {
      const prevPen = getPen(p.animalPens, animal.id);
      return { ...p, coins: p.coins - cost, animalPens: { ...p.animalPens, [animal.id]: { ...prevPen, capacity: prevPen.capacity + 1 } } };
    });
    syncInBackground("/api/farm/expand-pen", { kidId, animalId: animal.id });
  }

  function buyAnimal(animal: Animal) {
    const pen = getPen(progressRef.current.animalPens, animal.id);
    if (pen.count >= pen.capacity) return;
    const cost = animalCost(animal, pen.count);
    if (progressRef.current.coins < cost) return;
    setProgress((p) => {
      const prevPen = getPen(p.animalPens, animal.id);
      const nextPen = { ...prevPen, count: prevPen.count + 1, lastCollectedAt: prevPen.lastCollectedAt ?? new Date().toISOString() };
      return { ...p, coins: p.coins - cost, animalPens: { ...p.animalPens, [animal.id]: nextPen } };
    });
    syncInBackground("/api/farm/buy-animal", { kidId, animalId: animal.id });
    showToast(`Bought a ${animal.emoji} ${animal.name}!`);
  }

  function handleAction() {
    if (plantingPlot !== null) return;
    const near = interactionRef.current;
    if (near.plotIndex !== null) {
      const plot = progressRef.current.plots[near.plotIndex];
      const state = plotState(plot, progressRef.current.wateringLevel, currentTimeMs());
      if (state === "empty") setPlantingPlot(near.plotIndex);
      else if (state === "ready") harvest(near.plotIndex);
      return;
    }
    if (near.animalId !== null) {
      const animal = getAnimal(near.animalId);
      if (!animal) return;
      const pen = getPen(progressRef.current.animalPens, near.animalId);
      const state = penState(pen, animal, currentTimeMs());
      if (state === "ready") {
        collectAnimal(near.animalId);
        return;
      }
      if (pen.count < pen.capacity) {
        buyAnimal(animal);
        return;
      }
      return;
    }
    if (near.nearBarn) {
      setScreen("barn");
      return;
    }
    if (near.nearTable) fulfillOrder();
  }

  function pressKey(key: string) {
    keysRef.current.add(key);
  }
  function releaseKey(key: string) {
    keysRef.current.delete(key);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
      keysRef.current.add(e.key);
      if (e.key === " " || e.key === "Enter") handleAction();
    }
    function onKeyUp(e: KeyboardEvent) {
      keysRef.current.delete(e.key);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantingPlot]);

  useEffect(() => {
    if (screen !== "world" || !loaded) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let lastTime = nowMs();
    let rafId: number;

    const frame = (frameNow: number) => {
      const dt = Math.min((frameNow - lastTime) / 1000, 0.05);
      lastTime = frameNow;
      const player = playerRef.current;

      if (plantingPlot === null) {
        let dx = 0;
        let dy = 0;
        if (keysRef.current.has("ArrowLeft")) dx -= 1;
        if (keysRef.current.has("ArrowRight")) dx += 1;
        if (keysRef.current.has("ArrowUp")) dy -= 1;
        if (keysRef.current.has("ArrowDown")) dy += 1;
        if (dx !== 0 && dy !== 0) {
          dx *= Math.SQRT1_2;
          dy *= Math.SQRT1_2;
        }
        if (dx < 0) facingRef.current = -1;
        else if (dx > 0) facingRef.current = 1;

        const margin = PLAYER_SIZE / 2;
        player.x = Math.max(margin, Math.min(WORLD_W - margin, player.x + dx * PLAYER_SPEED * dt));
        player.y = Math.max(margin + 90, Math.min(CANVAS_H - margin, player.y + dy * PLAYER_SPEED * dt));
      }

      const land = progressRef.current.landLevel;
      let nearPlot: number | null = null;
      for (let i = 0; i < land; i++) {
        if (dist(player, CROP_POSITIONS[i]) < INTERACT_RADIUS) {
          nearPlot = i;
          break;
        }
      }
      let nearAnimalId: string | null = null;
      for (const animal of ANIMALS) {
        const pen = getPen(progressRef.current.animalPens, animal.id);
        if (pen.capacity === 0) continue;
        if (dist(player, ANIMAL_POSITIONS[animal.id]) < INTERACT_RADIUS) {
          nearAnimalId = animal.id;
          break;
        }
      }
      const nearBarn = dist(player, BARN_POS) < BUILDING_RADIUS;
      const nearTable = dist(player, TABLE_POS) < BUILDING_RADIUS;
      const prev = interactionRef.current;
      if (nearPlot !== prev.plotIndex || nearAnimalId !== prev.animalId || nearBarn !== prev.nearBarn || nearTable !== prev.nearTable) {
        interactionRef.current = { plotIndex: nearPlot, animalId: nearAnimalId, nearBarn, nearTable };
        setInteraction({ plotIndex: nearPlot, animalId: nearAnimalId, nearBarn, nearTable });
      }

      const sprites = spritesRef.current;
      const clockNow = currentTimeMs();
      const cameraX = Math.max(0, Math.min(player.x - CANVAS_W / 2, WORLD_W - CANVAS_W));

      ctx.fillStyle = "#86c46b";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "#7bb864";
      for (let gx = 0; gx < WORLD_W; gx += 40) {
        for (let gy = 0; gy < CANVAS_H; gy += 40) {
          const sx = gx - cameraX;
          if (sx < -40 || sx > CANVAS_W) continue;
          if (((gx / 40 + gy / 40) | 0) % 2 === 0) ctx.fillRect(sx, gy, 40, 40);
        }
      }

      drawBarn(ctx, BARN_POS.x - cameraX, BARN_POS.y);
      if (nearBarn) {
        ctx.strokeStyle = basketTotal(progressRef.current.basket) > 0 ? "#facc15" : "rgba(250,204,21,0.4)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(BARN_POS.x - cameraX, BARN_POS.y, BUILDING_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (sprites.table?.complete) {
        const tw = 84;
        const th = 42;
        ctx.drawImage(sprites.table, TABLE_POS.x - cameraX - tw / 2, TABLE_POS.y - th / 2, tw, th);
      }
      const order = progressRef.current.currentOrder;
      if (order) {
        const item = getSellableItem(order.itemId);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "22px sans-serif";
        ctx.fillText("🧑", TABLE_POS.x - cameraX, TABLE_POS.y - 40);
        if (item) {
          ctx.font = "bold 13px sans-serif";
          ctx.fillStyle = "#1e293b";
          ctx.fillText(`${item.emoji} x${order.quantity}`, TABLE_POS.x - cameraX, TABLE_POS.y - 60);
        }
      }
      if (nearTable) {
        ctx.strokeStyle = order && canFulfillOrder(progressRef.current.barn, order) ? "#facc15" : "rgba(250,204,21,0.4)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(TABLE_POS.x - cameraX, TABLE_POS.y + 10, BUILDING_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (let i = 0; i < land; i++) {
        const pos = CROP_POSITIONS[i];
        const sx = pos.x - cameraX;
        if (sx < -60 || sx > CANVAS_W + 60) continue;
        const plot = progressRef.current.plots[i];
        const state = plotState(plot, progressRef.current.wateringLevel, clockNow);
        const size = 56;

        if (sprites.soil?.complete) {
          ctx.drawImage(sprites.soil, sx - size / 2, pos.y - size / 2, size, size);
        }

        if (i === nearPlot) {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(sx, pos.y, INTERACT_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        const crop = plot.crop ? getCrop(plot.crop) : null;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (crop && state === "growing") {
          const frac = growProgress(plot, progressRef.current.wateringLevel, clockNow);
          ctx.font = `${14 + frac * 16}px sans-serif`;
          ctx.globalAlpha = 0.85;
          ctx.fillText(crop.emoji, sx, pos.y);
          ctx.globalAlpha = 1;

          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillRect(sx - 22, pos.y + size / 2 - 6, 44, 6);
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(sx - 22, pos.y + size / 2 - 6, 44 * frac, 6);
        } else if (crop && state === "ready") {
          const bounce = Math.sin(frameNow / 180) * 3;
          ctx.font = "30px sans-serif";
          ctx.fillText(crop.emoji, sx, pos.y + bounce);
        } else {
          ctx.font = "16px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillText("+", sx, pos.y);
        }
      }

      for (const animal of ANIMALS) {
        const pen = getPen(progressRef.current.animalPens, animal.id);
        const pos = ANIMAL_POSITIONS[animal.id];
        const sx = pos.x - cameraX;
        if (sx < -60 || sx > CANVAS_W + 60) continue;
        if (pen.capacity === 0) {
          ctx.strokeStyle = "rgba(100,100,100,0.4)";
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, pos.y, 28, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = "18px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🔒", sx, pos.y);
          continue;
        }

        ctx.fillStyle = "#dbeafe";
        ctx.beginPath();
        ctx.roundRect(sx - 32, pos.y - 26, 64, 52, 8);
        ctx.fill();

        if (animal.id === nearAnimalId) {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(sx, pos.y, INTERACT_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const state = penState(pen, animal, clockNow);
        if (pen.count === 0) {
          ctx.font = "24px sans-serif";
          ctx.globalAlpha = 0.5;
          ctx.fillText(animal.emoji, sx, pos.y - 4);
          ctx.globalAlpha = 1;
        } else {
          const bounce = state === "ready" ? Math.sin(frameNow / 180) * 2 : 0;
          ctx.font = "24px sans-serif";
          ctx.fillText(animal.emoji, sx, pos.y - 6 + bounce);
          ctx.font = "bold 11px sans-serif";
          ctx.fillStyle = "#1e293b";
          ctx.fillText(`x${pen.count}`, sx, pos.y + 18);
          if (state === "producing") {
            const frac = penProgress(pen, animal, clockNow);
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.fillRect(sx - 22, pos.y + 24, 44, 5);
            ctx.fillStyle = "#22c55e";
            ctx.fillRect(sx - 22, pos.y + 24, 44 * frac, 5);
          }
        }
      }

      if (sprites.player?.complete) {
        const pw = PLAYER_SIZE;
        const ph = PLAYER_SIZE;
        ctx.save();
        if (facingRef.current === -1) {
          ctx.translate(player.x - cameraX + pw / 2, player.y - ph / 2);
          ctx.scale(-1, 1);
          ctx.drawImage(sprites.player, 0, 0, pw, ph);
        } else {
          ctx.drawImage(sprites.player, player.x - cameraX - pw / 2, player.y - ph / 2, pw, ph);
        }
        ctx.restore();
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [screen, plantingPlot, loaded]);

  if (!loaded) {
    return <p className="text-sm text-slate-400">Loading farm…</p>;
  }

  const barnCapacity = barnCapacityForLevel(progress.barnLevel);
  const barnUsed = barnTotal(progress.barn);

  if (screen === "shop") {
    return (
      <div className="flex flex-col items-center gap-5">
        <span className="text-lg font-bold text-slate-800">🪙 {progress.coins} coins</span>

        <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow">
          {/* eslint-disable-next-line @next/next/no-img-element -- shared component also runs under Vite (the demo), which next/image can't target */}
          <img src={FARM_SPRITES.hoe} alt="" className="h-8 w-8" style={{ imageRendering: "pixelated" }} />
          <div>
            <p className="font-semibold text-slate-700">Land — {progress.landLevel} / {MAX_LAND} plots</p>
            <p className="text-xs text-slate-400">Buy more land to grow more crops at once.</p>
          </div>
          <button
            onClick={buyLand}
            disabled={progress.landLevel >= MAX_LAND || progress.coins < landCost(progress.landLevel)}
            className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {progress.landLevel >= MAX_LAND ? "Max" : `Buy — 🪙${landCost(progress.landLevel)}`}
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow">
          {/* eslint-disable-next-line @next/next/no-img-element -- shared component also runs under Vite (the demo), which next/image can't target */}
          <img src={FARM_SPRITES.wateringCan} alt="" className="h-8 w-8" style={{ imageRendering: "pixelated" }} />
          <div>
            <p className="font-semibold text-slate-700">Watering Can — Level {progress.wateringLevel} / {MAX_UPGRADE_LEVEL}</p>
            <p className="text-xs text-slate-400">Crops grow faster.</p>
          </div>
          <button
            onClick={() => buyUpgrade("watering")}
            disabled={progress.wateringLevel >= MAX_UPGRADE_LEVEL || progress.coins < upgradeCost(progress.wateringLevel)}
            className="ml-auto rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
          >
            {progress.wateringLevel >= MAX_UPGRADE_LEVEL ? "Max" : `Upgrade — 🪙${upgradeCost(progress.wateringLevel)}`}
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow">
          <span className="flex h-8 w-8 items-center justify-center text-2xl">🌱</span>
          <div>
            <p className="font-semibold text-slate-700">Fertilizer — Level {progress.fertilizerLevel} / {MAX_UPGRADE_LEVEL}</p>
            <p className="text-xs text-slate-400">Crops sell for more.</p>
          </div>
          <button
            onClick={() => buyUpgrade("fertilizer")}
            disabled={progress.fertilizerLevel >= MAX_UPGRADE_LEVEL || progress.coins < upgradeCost(progress.fertilizerLevel)}
            className="ml-auto rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
          >
            {progress.fertilizerLevel >= MAX_UPGRADE_LEVEL ? "Max" : `Upgrade — 🪙${upgradeCost(progress.fertilizerLevel)}`}
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow">
          <span className="flex h-8 w-8 items-center justify-center text-2xl">🏚️</span>
          <div>
            <p className="font-semibold text-slate-700">Barn Size — Level {progress.barnLevel} / {MAX_BARN_LEVEL}</p>
            <p className="text-xs text-slate-400">Holds {barnCapacity} items — same footprint, more room inside.</p>
          </div>
          <button
            onClick={buyBarnUpgrade}
            disabled={progress.barnLevel >= MAX_BARN_LEVEL || progress.coins < barnUpgradeCost(progress.barnLevel)}
            className="ml-auto rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
          >
            {progress.barnLevel >= MAX_BARN_LEVEL ? "Max" : `Upgrade — 🪙${barnUpgradeCost(progress.barnLevel)}`}
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow">
          <span className="flex h-8 w-8 items-center justify-center text-2xl">🤖</span>
          <div>
            <p className="font-semibold text-slate-700">Auto-Harvester {progress.autoHarvest && "— Owned"}</p>
            <p className="text-xs text-slate-400">Harvests ready crops &amp; animals straight into the barn, even while you&rsquo;re away.</p>
          </div>
          <button
            onClick={() => buyAutomation("harvest")}
            disabled={progress.autoHarvest || progress.coins < AUTO_HARVEST_COST}
            className="ml-auto rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
          >
            {progress.autoHarvest ? "Owned" : `Buy — 🪙${AUTO_HARVEST_COST}`}
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow">
          <span className="flex h-8 w-8 items-center justify-center text-2xl">🌾</span>
          <div>
            <p className="font-semibold text-slate-700">Auto-Planter {progress.autoPlant && "— Owned"}</p>
            <p className="text-xs text-slate-400">Replants the same crop after auto-harvest, as long as you can afford the seed. Needs Auto-Harvester.</p>
          </div>
          <button
            onClick={() => buyAutomation("plant")}
            disabled={progress.autoPlant || !progress.autoHarvest || progress.coins < AUTO_PLANT_COST}
            className="ml-auto rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
          >
            {progress.autoPlant ? "Owned" : `Buy — 🪙${AUTO_PLANT_COST}`}
          </button>
        </div>

        {ANIMALS.map((animal) => {
          const pen = getPen(progress.animalPens, animal.id);
          return (
            <div key={animal.id} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow">
              <span className="flex h-8 w-8 items-center justify-center text-2xl">{animal.emoji}</span>
              <div>
                <p className="font-semibold text-slate-700">
                  {animal.name} Pen — {pen.capacity} / {MAX_PEN_CAPACITY} spaces
                </p>
                <p className="text-xs text-slate-400">Expand to make room for more {animal.name.toLowerCase()}s.</p>
              </div>
              <button
                onClick={() => expandPen(animal)}
                disabled={pen.capacity >= MAX_PEN_CAPACITY || progress.coins < penExpandCost(animal, pen.capacity)}
                className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
              >
                {pen.capacity >= MAX_PEN_CAPACITY ? "Max" : `Expand — 🪙${penExpandCost(animal, pen.capacity)}`}
              </button>
            </div>
          );
        })}

        <button onClick={() => setScreen("world")} className="text-sm text-slate-500 underline">
          Back to farm
        </button>
      </div>
    );
  }

  if (screen === "barn") {
    const items = Object.entries(progress.barn).filter(([, qty]) => qty > 0);
    const basketItems = Object.entries(progress.basket).filter(([, qty]) => qty > 0);
    return (
      <div className="flex flex-col items-center gap-5">
        <p className="text-lg font-bold text-slate-800">🏚️ Barn — {barnUsed} / {barnCapacity}</p>

        <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow">
          <p className="mb-2 text-sm font-semibold text-slate-600">Stored</p>
          {items.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing stored yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {items.map(([itemId, qty]) => {
                const item = getSellableItem(itemId);
                if (!item) return null;
                return (
                  <div key={itemId} className="flex flex-col items-center rounded-lg bg-slate-50 p-2">
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-xs font-semibold text-slate-600">{item.name} x{qty}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {basketItems.length > 0 && (
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow">
            <p className="mb-2 text-sm font-semibold text-slate-600">🧺 In your basket</p>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {basketItems.map(([itemId, qty]) => {
                const item = getSellableItem(itemId);
                if (!item) return null;
                return (
                  <div key={itemId} className="flex flex-col items-center rounded-lg bg-slate-50 p-2">
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-xs font-semibold text-slate-600">{item.name} x{qty}</span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={depositBasketAction}
              className="w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              Deposit into barn
            </button>
          </div>
        )}

        <button onClick={() => setScreen("world")} className="text-sm text-slate-500 underline">
          Back to farm
        </button>
      </div>
    );
  }

  const nearPlot = interaction.plotIndex !== null ? progress.plots[interaction.plotIndex] : null;
  const nearPlotState = nearPlot ? plotState(nearPlot, progress.wateringLevel, now) : null;
  const nearAnimal = interaction.animalId !== null ? getAnimal(interaction.animalId) : null;
  const nearPen = nearAnimal ? getPen(progress.animalPens, nearAnimal.id) : null;
  const nearPenState = nearAnimal && nearPen ? penState(nearPen, nearAnimal, now) : null;
  const basketFull = basketTotal(progress.basket) > 0;
  const order = progress.currentOrder;
  const canFulfill = order ? canFulfillOrder(progress.barn, order) : false;

  const actionLabel =
    interaction.plotIndex !== null
      ? nearPlotState === "empty"
        ? "🌱 Plant"
        : nearPlotState === "ready"
          ? "✋ Collect"
          : "⏳ Growing…"
      : nearAnimal && nearPen
        ? nearPenState === "ready"
          ? `✋ Collect ${nearAnimal.productEmoji}`
          : nearPen.count < nearPen.capacity
            ? `🪙 Buy ${nearAnimal.emoji} (${animalCost(nearAnimal, nearPen.count)})`
            : "⏳ Growing…"
        : interaction.nearBarn
          ? basketFull
            ? "🏚️ Open Barn"
            : "🏚️ Look Inside"
          : interaction.nearTable
            ? order
              ? canFulfill
                ? `💰 Sell ${order.quantity}x`
                : "❌ Not enough stock"
              : "No customer yet"
            : "Walk around";

  const canAct =
    (interaction.plotIndex !== null && (nearPlotState === "empty" || nearPlotState === "ready")) ||
    (nearAnimal !== null && nearPen !== null && (nearPenState === "ready" || nearPen.count < nearPen.capacity)) ||
    interaction.nearBarn ||
    (interaction.nearTable && canFulfill);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="text-lg font-bold text-slate-800">🪙 {progress.coins} coins</span>
        <span className="text-sm font-semibold text-slate-500">🧺 {basketTotal(progress.basket)}</span>
        <span className="text-sm font-semibold text-slate-500">🏚️ {barnUsed}/{barnCapacity}</span>
        <button
          onClick={() => setScreen("shop")}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Farm Shop
        </button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="max-w-full touch-none rounded-xl shadow-lg"
        />
        {toast && (
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white">
            {toast}
          </div>
        )}
        {plantingPlot !== null && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 p-4">
            <div className="flex w-56 flex-col gap-1 rounded-xl bg-white p-3 shadow-lg">
              <p className="mb-1 text-center text-sm font-semibold text-slate-700">Choose a seed</p>
              {CROPS.map((c) => {
                const sellsFor = effectiveSellPrice(c, progress.fertilizerLevel);
                return (
                  <button
                    key={c.id}
                    onClick={() => plant(plantingPlot, c.id)}
                    disabled={progress.coins < c.seedCost}
                    className="flex flex-col rounded-lg px-2 py-1 text-left text-sm hover:bg-sky-50 disabled:opacity-40"
                  >
                    <span className="flex items-center justify-between">
                      <span>{c.emoji} {c.name}</span>
                      <span className="text-slate-400">🪙{c.seedCost}</span>
                    </span>
                    <span className="text-xs text-emerald-600">
                      worth 🪙{sellsFor} at a customer&rsquo;s asking price
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => setPlantingPlot(null)}
                className="mt-1 text-xs text-slate-400 underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="h-4 text-sm font-semibold text-slate-600">{actionLabel}</p>

      <div className="flex w-full max-w-[480px] items-center justify-between">
        <div className="grid grid-cols-3 grid-rows-2 gap-1">
          <span />
          <TouchBtn label="⬆" onDown={() => pressKey("ArrowUp")} onUp={() => releaseKey("ArrowUp")} />
          <span />
          <TouchBtn label="⬅" onDown={() => pressKey("ArrowLeft")} onUp={() => releaseKey("ArrowLeft")} />
          <TouchBtn label="⬇" onDown={() => pressKey("ArrowDown")} onUp={() => releaseKey("ArrowDown")} />
          <TouchBtn label="➡" onDown={() => pressKey("ArrowRight")} onUp={() => releaseKey("ArrowRight")} />
        </div>
        <TouchBtn label={actionLabel} onDown={handleAction} onUp={() => {}} disabled={!canAct} wide />
      </div>

      <p className="max-w-sm text-center text-xs text-slate-400">
        Plant, then collect into your basket and carry it to the barn to
        store it. A customer at the stand only wants specific goods — check
        what they&rsquo;re asking for before you sell. Arrow keys to move,
        Space to act.
      </p>
    </div>
  );
}

function TouchBtn({
  label,
  onDown,
  onUp,
  wide,
  disabled,
}: {
  label: string;
  onDown: () => void;
  onUp: () => void;
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        if (!disabled) onDown();
      }}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      disabled={disabled}
      className={`touch-none select-none ${wide ? "px-5 text-sm" : "px-4 text-2xl"} h-12 rounded-2xl bg-white font-bold text-slate-900 shadow active:bg-sky-50 disabled:opacity-40`}
    >
      {label}
    </button>
  );
}
