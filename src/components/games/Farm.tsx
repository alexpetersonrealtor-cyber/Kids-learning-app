"use client";

import { useEffect, useRef, useState } from "react";
import { FARM_SPRITES } from "@/lib/farm-sprites";
import {
  CROPS,
  MAX_LAND,
  MAX_UPGRADE_LEVEL,
  STARTING_LAND,
  effectiveGrowTimeMs,
  effectiveSellPrice,
  emptyPlots,
  getCrop,
  landCost,
  upgradeCost,
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
  plots: Plot[];
  basket: string[];
}

const DEFAULT_PROGRESS: FarmProgressState = {
  coins: 50,
  landLevel: STARTING_LAND,
  wateringLevel: 1,
  fertilizerLevel: 1,
  plots: emptyPlots(STARTING_LAND),
  basket: [],
};

type PlotStatus = "empty" | "growing" | "ready";

function plotState(plot: Plot, wateringLevel: number, now: number): PlotStatus {
  if (!plot.crop || !plot.plantedAt) return "empty";
  const crop = getCrop(plot.crop);
  if (!crop) return "empty";
  const readyAt = new Date(plot.plantedAt).getTime() + effectiveGrowTimeMs(crop, wateringLevel);
  return now >= readyAt ? "ready" : "growing";
}

function growProgress(plot: Plot, wateringLevel: number, now: number): number {
  if (!plot.crop || !plot.plantedAt) return 0;
  const crop = getCrop(plot.crop);
  if (!crop) return 0;
  const total = effectiveGrowTimeMs(crop, wateringLevel);
  const elapsed = now - new Date(plot.plantedAt).getTime();
  return Math.max(0, Math.min(1, elapsed / total));
}

const CANVAS_W = 480;
const CANVAS_H = 360;
const PLAYER_SPEED = 165;
const PLAYER_SIZE = 30;
const INTERACT_RADIUS = 48;
const TABLE_RADIUS = 54;
const TABLE_POS = { x: CANVAS_W / 2, y: 58 };

interface Point {
  x: number;
  y: number;
}

// Up to MAX_LAND plots, laid out in rows below the market table. Plots
// beyond the kid's current landLevel just aren't drawn/walkable yet.
const PLOT_POSITIONS: Point[] = (() => {
  const cols = 5;
  const spacingX = 84;
  const spacingY = 92;
  const startX = CANVAS_W / 2 - ((cols - 1) * spacingX) / 2;
  const startY = 168;
  const positions: Point[] = [];
  for (let i = 0; i < MAX_LAND; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    positions.push({ x: startX + col * spacingX, y: startY + row * spacingY });
  }
  return positions;
})();

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

interface Interaction {
  plotIndex: number | null;
  nearTable: boolean;
}

type Screen = "world" | "shop";

export default function Farm({ kidId }: { kidId: string }) {
  const [progress, setProgress] = useState<FarmProgressState>(DEFAULT_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<Screen>("world");
  const [plantingPlot, setPlantingPlot] = useState<number | null>(null);
  const [now, setNow] = useState(() => currentTimeMs());
  const [interaction, setInteraction] = useState<Interaction>({ plotIndex: null, nearTable: false });
  const [toast, setToast] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  const playerRef = useRef<Point>({ x: CANVAS_W / 2, y: CANVAS_H - 50 });
  const facingRef = useRef<1 | -1>(1);
  const progressRef = useRef(progress);
  const interactionRef = useRef<Interaction>({ plotIndex: null, nearTable: false });
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    spritesRef.current = loadSprites();
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    fetch(`/api/farm/progress?kidId=${kidId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.progress) {
          setProgress({
            coins: data.progress.coins,
            landLevel: data.progress.landLevel,
            wateringLevel: data.progress.wateringLevel,
            fertilizerLevel: data.progress.fertilizerLevel,
            plots: data.progress.plots as Plot[],
            basket: data.progress.basket as string[],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [kidId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(currentTimeMs()), 1000);
    return () => clearInterval(interval);
  }, []);

  function applyProgress(data: { progress?: FarmProgressState }) {
    if (data.progress) {
      setProgress({
        coins: data.progress.coins,
        landLevel: data.progress.landLevel,
        wateringLevel: data.progress.wateringLevel,
        fertilizerLevel: data.progress.fertilizerLevel,
        plots: data.progress.plots as Plot[],
        basket: data.progress.basket as string[],
      });
    }
  }

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

  function harvest(plotIndex: number) {
    const plot = progressRef.current.plots[plotIndex];
    const crop = plot?.crop ? getCrop(plot.crop) : null;
    if (!crop || plotState(plot, progressRef.current.wateringLevel, currentTimeMs()) !== "ready") return;
    setProgress((p) => {
      const plots = [...p.plots];
      plots[plotIndex] = { crop: null, plantedAt: null };
      return { ...p, plots, basket: [...p.basket, crop.id] };
    });
    syncInBackground("/api/farm/harvest", { kidId, plotIndex });
    showToast(`Picked ${crop.emoji} ${crop.name}!`);
  }

  function sellBasket() {
    const basket = progressRef.current.basket;
    if (basket.length === 0) return;
    let earned = 0;
    for (const cropId of basket) {
      const crop = getCrop(cropId);
      if (crop) earned += effectiveSellPrice(crop, progressRef.current.fertilizerLevel);
    }
    setProgress((p) => ({ ...p, coins: p.coins + earned, basket: [] }));
    syncInBackground("/api/farm/sell", { kidId });
    showToast(`Sold for 🪙${earned}!`);
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
    if (near.nearTable) sellBasket();
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
        player.x = Math.max(margin, Math.min(CANVAS_W - margin, player.x + dx * PLAYER_SPEED * dt));
        player.y = Math.max(margin + 90, Math.min(CANVAS_H - margin, player.y + dy * PLAYER_SPEED * dt));
      }

      const land = progressRef.current.landLevel;
      let nearPlot: number | null = null;
      for (let i = 0; i < land; i++) {
        if (dist(player, PLOT_POSITIONS[i]) < INTERACT_RADIUS) {
          nearPlot = i;
          break;
        }
      }
      const nearTable = dist(player, TABLE_POS) < TABLE_RADIUS;
      if (nearPlot !== interactionRef.current.plotIndex || nearTable !== interactionRef.current.nearTable) {
        interactionRef.current = { plotIndex: nearPlot, nearTable };
        setInteraction({ plotIndex: nearPlot, nearTable });
      }

      const sprites = spritesRef.current;
      const clockNow = currentTimeMs();

      ctx.fillStyle = "#86c46b";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "#7bb864";
      for (let gx = 0; gx < CANVAS_W; gx += 40) {
        for (let gy = 0; gy < CANVAS_H; gy += 40) {
          if (((gx / 40 + gy / 40) | 0) % 2 === 0) ctx.fillRect(gx, gy, 40, 40);
        }
      }

      if (sprites.table?.complete) {
        const tw = 84;
        const th = 42;
        ctx.drawImage(sprites.table, TABLE_POS.x - tw / 2, TABLE_POS.y - th / 2, tw, th);
      }
      if (nearTable) {
        ctx.strokeStyle = progressRef.current.basket.length > 0 ? "#facc15" : "rgba(250,204,21,0.4)";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(TABLE_POS.x, TABLE_POS.y + 10, TABLE_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      for (let i = 0; i < land; i++) {
        const pos = PLOT_POSITIONS[i];
        const plot = progressRef.current.plots[i];
        const state = plotState(plot, progressRef.current.wateringLevel, clockNow);
        const size = 56;

        if (sprites.soil?.complete) {
          ctx.drawImage(sprites.soil, pos.x - size / 2, pos.y - size / 2, size, size);
        }

        if (i === nearPlot) {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, INTERACT_RADIUS, 0, Math.PI * 2);
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
          ctx.fillText(crop.emoji, pos.x, pos.y);
          ctx.globalAlpha = 1;

          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillRect(pos.x - 22, pos.y + size / 2 - 6, 44, 6);
          ctx.fillStyle = "#22c55e";
          ctx.fillRect(pos.x - 22, pos.y + size / 2 - 6, 44 * frac, 6);
        } else if (crop && state === "ready") {
          const bounce = Math.sin(frameNow / 180) * 3;
          ctx.font = "30px sans-serif";
          ctx.fillText(crop.emoji, pos.x, pos.y + bounce);
        } else {
          ctx.font = "16px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.fillText("+", pos.x, pos.y);
        }
      }

      if (sprites.player?.complete) {
        const pw = PLAYER_SIZE;
        const ph = PLAYER_SIZE;
        ctx.save();
        if (facingRef.current === -1) {
          ctx.translate(player.x + pw / 2, player.y - ph / 2);
          ctx.scale(-1, 1);
          ctx.drawImage(sprites.player, 0, 0, pw, ph);
        } else {
          ctx.drawImage(sprites.player, player.x - pw / 2, player.y - ph / 2, pw, ph);
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

        <button onClick={() => setScreen("world")} className="text-sm text-slate-500 underline">
          Back to farm
        </button>
      </div>
    );
  }

  const nearPlot = interaction.plotIndex !== null ? progress.plots[interaction.plotIndex] : null;
  const nearPlotState = nearPlot ? plotState(nearPlot, progress.wateringLevel, now) : null;
  const actionLabel =
    interaction.plotIndex !== null
      ? nearPlotState === "empty"
        ? "🌱 Plant"
        : nearPlotState === "ready"
          ? "✋ Collect"
          : "⏳ Growing…"
      : interaction.nearTable
        ? progress.basket.length > 0
          ? `💰 Sell (${progress.basket.length})`
          : "🧺 Basket empty"
        : "Walk around";
  const canAct =
    (interaction.plotIndex !== null && (nearPlotState === "empty" || nearPlotState === "ready")) ||
    (interaction.nearTable && progress.basket.length > 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-slate-800">🪙 {progress.coins} coins</span>
        <span className="text-sm font-semibold text-slate-500">🧺 {progress.basket.length}</span>
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
                      sells for 🪙{sellsFor} (+{sellsFor - c.seedCost} profit)
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
        Walk to an empty patch to plant, walk back when it&rsquo;s ripe to
        collect it, then bring your basket to the market table to sell.
        Arrow keys to move, Space to act — or use the buttons above.
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
