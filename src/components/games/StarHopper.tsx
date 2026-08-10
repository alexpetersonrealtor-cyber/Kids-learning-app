"use client";

import { useEffect, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import { playCorrect, playExplosion, playHurt, playGameOver } from "@/lib/arcade-sound";
import { STAR_HOPPER_SPRITES } from "@/lib/star-hopper-sprites";
import DifficultyGate from "@/components/DifficultyGate";
import type { Difficulty } from "@/lib/difficulty";

const WIDTH = 480;
const HEIGHT = 320;
const GROUND_Y = 280;
const GRAVITY = 1400;
const MOVE_SPEED = 190;
const JUMP_VELOCITY = -540;
const MAX_FALL_SPEED = 700;
const PLAYER_W = 26;
const PLAYER_H = 34;
const START_X = 40;
const START_Y = GROUND_Y - PLAYER_H;

interface Solid {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  minX: number;
  maxX: number;
  speed: number;
  dir: 1 | -1;
  alive: boolean;
}

interface Coin {
  x: number;
  y: number;
  r: number;
  collected: boolean;
}

const GROUND_SEGMENTS: Solid[] = [
  { x: 0, y: GROUND_Y, w: 500, h: HEIGHT - GROUND_Y },
  { x: 580, y: GROUND_Y, w: 420, h: HEIGHT - GROUND_Y },
  { x: 1060, y: GROUND_Y, w: 440, h: HEIGHT - GROUND_Y },
  { x: 1600, y: GROUND_Y, w: 800, h: HEIGHT - GROUND_Y },
];

const PLATFORMS: Solid[] = [
  { x: 650, y: 215, w: 120, h: 15 },
  { x: 1150, y: 200, w: 100, h: 15 },
  { x: 1750, y: 210, w: 150, h: 15 },
];

const WORLD_WIDTH = 2400;
const GOAL_X = 2340;

const DIFFICULTY_CONFIG: Record<Difficulty, { enemySpeedMul: number; lives: number }> = {
  easy: { enemySpeedMul: 0.6, lives: 4 },
  medium: { enemySpeedMul: 1, lives: 3 },
  hard: { enemySpeedMul: 1.4, lives: 3 },
  expert: { enemySpeedMul: 1.8, lives: 2 },
};

function makeEnemies(speedMul: number): Enemy[] {
  return [
    { x: 650, y: GROUND_Y - 26, w: 26, h: 26, minX: 620, maxX: 950, speed: 60 * speedMul, dir: 1, alive: true },
    { x: 1150, y: GROUND_Y - 26, w: 26, h: 26, minX: 1100, maxX: 1450, speed: 70 * speedMul, dir: -1, alive: true },
    { x: 1780, y: 210 - 26, w: 26, h: 26, minX: 1760, maxX: 1880, speed: 55 * speedMul, dir: 1, alive: true },
  ];
}

function makeCoins(): Coin[] {
  const positions: [number, number][] = [
    [220, 240], [430, 240], [700, 180], [820, 180], [950, 240],
    [1190, 165], [1320, 240], [1480, 240], [1790, 175], [2000, 240],
    [2150, 240], [2280, 240],
  ];
  return positions.map(([x, y]) => ({ x, y, r: 9, collected: false }));
}

function allSolids(): Solid[] {
  return [...GROUND_SEGMENTS, ...PLATFORMS];
}

function loadSprites(): Record<string, HTMLImageElement> {
  const images: Record<string, HTMLImageElement> = {};
  for (const [name, src] of Object.entries(STAR_HOPPER_SPRITES)) {
    const img = new Image();
    img.src = src;
    images[name] = img;
  }
  return images;
}

export default function StarHopper({ kidId }: { kidId: string }) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const playerRef = useRef({ x: START_X, y: START_Y, vx: 0, vy: 0, onGround: false, facing: 1 as 1 | -1 });
  const enemiesRef = useRef<Enemy[]>([]);
  const coinsRef = useRef<Coin[]>(makeCoins());
  const invulnRef = useRef(0);
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(0);
  const [won, setWon] = useState(false);
  const startedAt = useRef(new Date());
  const recorded = useRef(false);

  const gameOver = lives <= 0;
  const finished = gameOver || won;

  useEffect(() => {
    spritesRef.current = loadSprites();
  }, []);

  function startGame(chosen: Difficulty) {
    const config = DIFFICULTY_CONFIG[chosen];
    playerRef.current = { x: START_X, y: START_Y, vx: 0, vy: 0, onGround: false, facing: 1 };
    enemiesRef.current = makeEnemies(config.enemySpeedMul);
    coinsRef.current = makeCoins();
    invulnRef.current = 0;
    setScore(0);
    setLives(config.lives);
    setWon(false);
    startedAt.current = new Date();
    recorded.current = false;
    setDifficulty(chosen);
  }

  useEffect(() => {
    if (!finished || recorded.current || !difficulty) return;
    recorded.current = true;
    (won ? playCorrect : playGameOver)();
    recordGameSession({
      kidId,
      gameType: "star-hopper",
      subject: "classic",
      skillTag: `star-hopper-${difficulty}`,
      startedAt: startedAt.current,
      score,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function respawn() {
    playerRef.current = { x: START_X, y: START_Y, vx: 0, vy: 0, onGround: false, facing: 1 };
    invulnRef.current = 1.2;
  }

  function loseLife() {
    if (invulnRef.current > 0) return;
    playHurt();
    setLives((l) => Math.max(l - 1, 0));
    respawn();
  }

  function jump() {
    if (playerRef.current.onGround) {
      playerRef.current.vy = JUMP_VELOCITY;
      playerRef.current.onGround = false;
    }
  }

  function pressKey(key: string) {
    keysRef.current.add(key);
  }
  function releaseKey(key: string) {
    keysRef.current.delete(key);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key)) e.preventDefault();
      keysRef.current.add(e.key);
      if (e.key === "ArrowUp" || e.key === " ") jump();
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
  }, []);

  useEffect(() => {
    if (!difficulty) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let lastTime = performance.now();
    let rafId: number;

    const frame = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      if (!finished) {
        const player = playerRef.current;
        if (invulnRef.current > 0) invulnRef.current = Math.max(0, invulnRef.current - dt);

        if (keysRef.current.has("ArrowLeft")) {
          player.vx = -MOVE_SPEED;
          player.facing = -1;
        } else if (keysRef.current.has("ArrowRight")) {
          player.vx = MOVE_SPEED;
          player.facing = 1;
        } else {
          player.vx = 0;
        }

        player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL_SPEED);

        const prevBottom = player.y + PLAYER_H;
        player.x = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_W, player.x + player.vx * dt));
        player.y += player.vy * dt;

        player.onGround = false;
        if (player.vy >= 0) {
          for (const solid of allSolids()) {
            const withinX = player.x + PLAYER_W > solid.x && player.x < solid.x + solid.w;
            const crossedTop =
              prevBottom <= solid.y && player.y + PLAYER_H >= solid.y;
            if (withinX && crossedTop) {
              player.y = solid.y - PLAYER_H;
              player.vy = 0;
              player.onGround = true;
            }
          }
        }

        if (player.y > HEIGHT + 100) {
          loseLife();
        }

        for (const enemy of enemiesRef.current) {
          if (!enemy.alive) continue;
          enemy.x += enemy.speed * enemy.dir * dt;
          if (enemy.x < enemy.minX || enemy.x + enemy.w > enemy.maxX) {
            enemy.dir = enemy.dir === 1 ? -1 : 1;
            enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX - enemy.w, enemy.x));
          }

          const overlap =
            player.x < enemy.x + enemy.w &&
            player.x + PLAYER_W > enemy.x &&
            player.y < enemy.y + enemy.h &&
            player.y + PLAYER_H > enemy.y;

          if (overlap && invulnRef.current <= 0) {
            const stomped = player.vy > 0 && prevBottom <= enemy.y + enemy.h * 0.5;
            if (stomped) {
              enemy.alive = false;
              player.vy = JUMP_VELOCITY * 0.55;
              playExplosion();
              setScore((s) => s + 50);
            } else {
              loseLife();
            }
          }
        }

        for (const coin of coinsRef.current) {
          if (coin.collected) continue;
          const dx = player.x + PLAYER_W / 2 - coin.x;
          const dy = player.y + PLAYER_H / 2 - coin.y;
          if (Math.hypot(dx, dy) < coin.r + 16) {
            coin.collected = true;
            playCorrect();
            setScore((s) => s + 10);
          }
        }

        if (player.x + PLAYER_W >= GOAL_X) {
          setWon(true);
        }
      }

      const player = playerRef.current;
      const cameraX = Math.max(0, Math.min(player.x - WIDTH / 2, WORLD_WIDTH - WIDTH));
      const sprites = spritesRef.current;

      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (const g of GROUND_SEGMENTS) {
        drawTiledSolid(ctx, sprites, g, cameraX);
      }
      for (const p of PLATFORMS) {
        drawTiledSolid(ctx, sprites, p, cameraX);
      }

      for (const coin of coinsRef.current) {
        if (coin.collected) continue;
        if (sprites.gem?.complete) {
          ctx.drawImage(sprites.gem, coin.x - cameraX - coin.r, coin.y - coin.r, coin.r * 2, coin.r * 2);
        }
      }

      for (const enemy of enemiesRef.current) {
        if (!enemy.alive) continue;
        if (sprites.enemy?.complete) {
          ctx.drawImage(sprites.enemy, enemy.x - cameraX, enemy.y, enemy.w, enemy.h);
        }
      }

      if (sprites.flag?.complete) {
        ctx.drawImage(sprites.flag, GOAL_X - cameraX, GROUND_Y - 90, 36, 90);
      }

      if (invulnRef.current <= 0 || Math.floor(invulnRef.current * 10) % 2 === 0) {
        if (sprites.player?.complete) {
          ctx.save();
          if (player.facing === -1) {
            ctx.translate(player.x - cameraX + PLAYER_W, player.y);
            ctx.scale(-1, 1);
            ctx.drawImage(sprites.player, 0, 0, PLAYER_W, PLAYER_H);
          } else {
            ctx.drawImage(sprites.player, player.x - cameraX, player.y, PLAYER_W, PLAYER_H);
          }
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, difficulty]);

  function reset() {
    if (difficulty) startGame(difficulty);
  }

  if (!difficulty) {
    return (
      <DifficultyGate
        title="Choose a difficulty"
        description="Harder difficulty means faster space creatures and fewer lives."
        onSelect={startGame}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-6 text-sm font-semibold text-slate-600">
        <span>Score: {score}</span>
        <span className="flex items-center gap-1">
          Lives:
          {Array.from({ length: lives }).map((_, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- shared component also runs under Vite (the demo), which next/image can't target
            <img key={i} src={STAR_HOPPER_SPRITES.heart} alt="" className="h-4 w-4" style={{ imageRendering: "pixelated" }} />
          ))}
          {lives === 0 && "—"}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        className="max-w-full touch-none rounded-xl shadow-lg"
      />

      <div className="flex w-full max-w-[480px] items-center justify-between">
        <div className="flex gap-2">
          <TouchBtn
            label="⬅"
            onDown={() => pressKey("ArrowLeft")}
            onUp={() => releaseKey("ArrowLeft")}
          />
          <TouchBtn
            label="➡"
            onDown={() => pressKey("ArrowRight")}
            onUp={() => releaseKey("ArrowRight")}
          />
        </div>
        <TouchBtn label="⬆ Jump" onDown={jump} onUp={() => {}} wide />
      </div>
      <p className="text-xs text-slate-400">
        Arrow keys to move, Up/Space to jump — or use the buttons above
      </p>

      {finished && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-bold text-slate-800">
            {won ? `You made it! Score: ${score} 🎉` : `Game over! Score: ${score}`}
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}

function drawTiledSolid(
  ctx: CanvasRenderingContext2D,
  sprites: Record<string, HTMLImageElement>,
  solid: Solid,
  cameraX: number,
) {
  const tile = sprites.groundMid;
  if (!tile?.complete) return;
  const tileSize = 18;
  const drawY = solid.y;
  for (let x = solid.x; x < solid.x + solid.w; x += tileSize) {
    const drawW = Math.min(tileSize, solid.x + solid.w - x);
    ctx.drawImage(tile, 0, 0, drawW, tileSize, x - cameraX, drawY, drawW, tileSize);
  }
  // fill any remaining vertical space below the top tile row with a solid
  // color so pits read clearly against the sky.
  if (solid.h > tileSize) {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(solid.x - cameraX, drawY + tileSize, solid.w, solid.h - tileSize);
  }
}

function TouchBtn({
  label,
  onDown,
  onUp,
  wide,
}: {
  label: string;
  onDown: () => void;
  onUp: () => void;
  wide?: boolean;
}) {
  return (
    <button
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      className={`${wide ? "px-8" : "px-6"} h-14 rounded-2xl bg-white text-xl font-bold text-slate-700 shadow active:bg-sky-50`}
    >
      {label}
    </button>
  );
}
