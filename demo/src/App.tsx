import { useState } from "react";
import { GAMES_CATALOG, type GameSlug } from "@/lib/games-catalog";
import { GRADE_LEVELS, tierForGrade } from "@/lib/grade-tiers";
import type { GradeLevel } from "@prisma/client";
import TicTacToe from "@/components/games/TicTacToe";
import MemoryMatch from "@/components/games/MemoryMatch";
import Snake from "@/components/games/Snake";
import Tetris from "@/components/games/Tetris";
import Checkers from "@/components/games/Checkers";
import MathFacts from "@/components/games/MathFacts";
import Reading from "@/components/games/Reading";
import ConnectFour from "@/components/games/ConnectFour";
import SimonSays from "@/components/games/SimonSays";
import NumberMatching from "@/components/games/NumberMatching";
import Phonics from "@/components/games/Phonics";
import SpellingBee from "@/components/games/SpellingBee";
import ChessGame from "@/components/games/Chess";
import BananaBlast from "@/components/games/BananaBlast";
import WordBlaster from "@/components/games/WordBlaster";
import StarHopper from "@/components/games/StarHopper";
import RaceTrack from "@/components/games/RaceTrack";
import Farm from "@/components/games/Farm";

const DEMO_KID_ID = "demo";

function GameArea({ slug, grade }: { slug: GameSlug; grade: GradeLevel }) {
  switch (slug) {
    case "tic-tac-toe":
      return <TicTacToe kidId={DEMO_KID_ID} />;
    case "memory-match":
      return <MemoryMatch kidId={DEMO_KID_ID} tier={tierForGrade(grade)} />;
    case "snake":
      return <Snake kidId={DEMO_KID_ID} />;
    case "tetris":
      return <Tetris kidId={DEMO_KID_ID} />;
    case "checkers":
      return <Checkers kidId={DEMO_KID_ID} />;
    case "math-facts":
      return <MathFacts kidId={DEMO_KID_ID} grade={grade} />;
    case "reading":
      return <Reading kidId={DEMO_KID_ID} grade={grade} />;
    case "connect-four":
      return <ConnectFour kidId={DEMO_KID_ID} />;
    case "simon-says":
      return <SimonSays kidId={DEMO_KID_ID} />;
    case "number-matching":
      return <NumberMatching kidId={DEMO_KID_ID} grade={grade} />;
    case "phonics":
      return <Phonics kidId={DEMO_KID_ID} />;
    case "spelling-bee":
      return <SpellingBee kidId={DEMO_KID_ID} grade={grade} />;
    case "chess":
      return <ChessGame kidId={DEMO_KID_ID} />;
    case "banana-blast":
      return <BananaBlast kidId={DEMO_KID_ID} grade={grade} />;
    case "word-blaster":
      return <WordBlaster kidId={DEMO_KID_ID} grade={grade} />;
    case "star-hopper":
      return <StarHopper kidId={DEMO_KID_ID} />;
    case "race-track":
      return <RaceTrack kidId={DEMO_KID_ID} />;
    case "farm":
      return <Farm kidId={DEMO_KID_ID} />;
  }
}

export default function App() {
  const [active, setActive] = useState<GameSlug | null>(null);
  const [grade, setGrade] = useState<GradeLevel>("SECOND");

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
              <GameArea slug={active} grade={grade} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              <label className="text-sm font-medium text-slate-600">
                Grade level (for Math Facts / Number Match / Reading / Spelling
                Bee / Memory Match / Banana Blast / Word Blaster):
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as GradeLevel)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
              >
                {GRADE_LEVELS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
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
