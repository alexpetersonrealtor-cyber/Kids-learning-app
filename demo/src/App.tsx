import { useState } from "react";
import { GAMES_CATALOG, type GameSlug } from "@/lib/games-catalog";
import type { Tier } from "@/lib/grade-tiers";
import TicTacToe from "@/components/games/TicTacToe";
import MemoryMatch from "@/components/games/MemoryMatch";
import Snake from "@/components/games/Snake";
import Tetris from "@/components/games/Tetris";
import Checkers from "@/components/games/Checkers";
import MathFacts from "@/components/games/MathFacts";
import Reading from "@/components/games/Reading";

const DEMO_KID_ID = "demo";

const TIERS: { value: Tier; label: string }[] = [
  { value: "PRE_K_K", label: "Pre-K – K" },
  { value: "FIRST_SECOND", label: "1st – 2nd" },
  { value: "THIRD_FIFTH", label: "3rd – 5th" },
];

function GameArea({ slug, tier }: { slug: GameSlug; tier: Tier }) {
  switch (slug) {
    case "tic-tac-toe":
      return <TicTacToe kidId={DEMO_KID_ID} />;
    case "memory-match":
      return <MemoryMatch kidId={DEMO_KID_ID} tier={tier} />;
    case "snake":
      return <Snake kidId={DEMO_KID_ID} />;
    case "tetris":
      return <Tetris kidId={DEMO_KID_ID} />;
    case "checkers":
      return <Checkers kidId={DEMO_KID_ID} />;
    case "math-facts":
      return <MathFacts kidId={DEMO_KID_ID} tier={tier} />;
    case "reading":
      return <Reading kidId={DEMO_KID_ID} tier={tier} />;
  }
}

export default function App() {
  const [active, setActive] = useState<GameSlug | null>(null);
  const [tier, setTier] = useState<Tier>("FIRST_SECOND");

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 to-emerald-50 px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="rounded-2xl bg-white/80 p-4 text-center text-sm text-slate-600 shadow">
          🎮 <strong>Demo mode</strong> — try the games with no sign-up. Progress
          and timers aren&rsquo;t saved here; the full app (parent dashboard,
          accounts, saved progress) deploys separately.
        </div>

        {active ? (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setActive(null)}
              className="self-start text-sm font-medium text-slate-500"
            >
              ← Back to games
            </button>
            <div className="flex justify-center">
              <GameArea slug={active} tier={tier} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              <label className="text-sm font-medium text-slate-600">
                Grade tier (for Math Facts / Reading / Memory Match):
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as Tier)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              >
                {TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
              {GAMES_CATALOG.map((game) => (
                <button
                  key={game.slug}
                  onClick={() => setActive(game.slug)}
                  className="flex flex-col items-center gap-2 rounded-3xl bg-white p-6 text-center shadow-md transition hover:scale-105 hover:shadow-lg"
                >
                  <span className="text-5xl">{game.emoji}</span>
                  <span className="text-lg font-bold text-slate-800">
                    {game.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {game.description}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
