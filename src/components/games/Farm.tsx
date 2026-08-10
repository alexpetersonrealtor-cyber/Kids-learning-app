"use client";

import { useEffect, useState } from "react";
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

interface FarmProgressState {
  coins: number;
  landLevel: number;
  wateringLevel: number;
  fertilizerLevel: number;
  plots: Plot[];
}

const DEFAULT_PROGRESS: FarmProgressState = {
  coins: 50,
  landLevel: STARTING_LAND,
  wateringLevel: 1,
  fertilizerLevel: 1,
  plots: emptyPlots(STARTING_LAND),
};

type PlotState = "empty" | "growing" | "ready";

function plotState(plot: Plot, wateringLevel: number, now: number): PlotState {
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

export default function Farm({ kidId }: { kidId: string }) {
  const [progress, setProgress] = useState<FarmProgressState>(DEFAULT_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [plantingPlot, setPlantingPlot] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [kidId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
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
      });
    }
  }

  // Every action updates local state immediately (optimistic) and syncs to
  // the server in the background. Without this, the game would be entirely
  // unplayable wherever there's no backend to round-trip through (like the
  // static demo) — the UI would just silently do nothing on every tap.
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

  function plant(plotIndex: number, cropId: string) {
    const crop = getCrop(cropId);
    if (!crop || progress.coins < crop.seedCost) return;
    setPlantingPlot(null);
    setProgress((p) => {
      const plots = [...p.plots];
      plots[plotIndex] = { crop: crop.id, plantedAt: new Date().toISOString() };
      return { ...p, coins: p.coins - crop.seedCost, plots };
    });
    syncInBackground("/api/farm/plant", { kidId, plotIndex, cropId });
  }

  function harvest(plotIndex: number) {
    const plot = progress.plots[plotIndex];
    const crop = plot?.crop ? getCrop(plot.crop) : null;
    if (!crop || plotState(plot, progress.wateringLevel, now) !== "ready") return;
    const earned = effectiveSellPrice(crop, progress.fertilizerLevel);
    setProgress((p) => {
      const plots = [...p.plots];
      plots[plotIndex] = { crop: null, plantedAt: null };
      return { ...p, coins: p.coins + earned, plots };
    });
    syncInBackground("/api/farm/harvest", { kidId, plotIndex });
  }

  function buyLand() {
    if (progress.landLevel >= MAX_LAND) return;
    const cost = landCost(progress.landLevel);
    if (progress.coins < cost) return;
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
    const currentLevel = progress[field];
    if (currentLevel >= MAX_UPGRADE_LEVEL) return;
    const cost = upgradeCost(currentLevel);
    if (progress.coins < cost) return;
    setProgress((p) => ({ ...p, coins: p.coins - cost, [field]: currentLevel + 1 }));
    syncInBackground("/api/farm/upgrade", { kidId, stat });
  }

  if (!loaded) {
    return <p className="text-sm text-slate-400">Loading farm…</p>;
  }

  if (showShop) {
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

        <button onClick={() => setShowShop(false)} className="text-sm text-slate-500 underline">
          Back to farm
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-slate-800">🪙 {progress.coins} coins</span>
        <button
          onClick={() => setShowShop(true)}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Farm Shop
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {progress.plots.slice(0, progress.landLevel).map((plot, i) => {
          const state = plotState(plot, progress.wateringLevel, now);
          const crop = plot.crop ? getCrop(plot.crop) : null;
          const progressFrac = growProgress(plot, progress.wateringLevel, now);

          return (
            <div key={i} className="relative">
              <button
                onClick={() => {
                  if (state === "empty") setPlantingPlot(i);
                  else if (state === "ready") harvest(i);
                }}
                disabled={state === "growing"}
                className="relative flex h-24 w-24 flex-col items-center justify-center overflow-hidden rounded-xl shadow"
                style={{
                  backgroundImage: `url(${FARM_SPRITES.soil})`,
                  backgroundSize: "cover",
                  imageRendering: "pixelated",
                }}
              >
                {state === "empty" && (
                  <span className="rounded bg-white/80 px-2 py-1 text-xs font-semibold text-slate-700">
                    + Plant
                  </span>
                )}
                {state === "growing" && crop && (
                  <>
                    <span className="text-2xl opacity-70">{crop.emoji}</span>
                    <div className="absolute bottom-1 left-1 right-1 h-1.5 overflow-hidden rounded-full bg-white/60">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.round(progressFrac * 100)}%` }}
                      />
                    </div>
                  </>
                )}
                {state === "ready" && crop && (
                  <span className="animate-bounce text-4xl drop-shadow">{crop.emoji}</span>
                )}
              </button>

              {plantingPlot === i && (
                <div className="absolute left-1/2 top-full z-10 mt-2 flex w-40 -translate-x-1/2 flex-col gap-1 rounded-xl bg-white p-2 shadow-lg">
                  {CROPS.map((c) => {
                    const sellsFor = effectiveSellPrice(c, progress.fertilizerLevel);
                    return (
                      <button
                        key={c.id}
                        onClick={() => plant(i, c.id)}
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
              )}
            </div>
          );
        })}
      </div>

      <p className="max-w-sm text-center text-xs text-slate-400">
        Tap an empty plot to plant a seed. Sell prices go up and grow times go
        down with Farm Shop upgrades — reinvest your coins to grow faster!
      </p>
    </div>
  );
}
