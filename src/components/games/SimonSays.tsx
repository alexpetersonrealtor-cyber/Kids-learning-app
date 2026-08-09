"use client";

import { useEffect, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import { playSimonNote, playGameOver } from "@/lib/arcade-sound";

const PADS = [
  { color: "bg-emerald-500", lit: "bg-emerald-300" },
  { color: "bg-red-500", lit: "bg-red-300" },
  { color: "bg-yellow-400", lit: "bg-yellow-200" },
  { color: "bg-blue-500", lit: "bg-blue-300" },
];

const STEP_MS = 700;
const FLASH_MS = 400;

type Phase = "idle" | "playback" | "input" | "gameover";

function randomPad(): number {
  return Math.floor(Math.random() * PADS.length);
}

export default function SimonSays({ kidId }: { kidId: string }) {
  const [started, setStarted] = useState(false);
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activePad, setActivePad] = useState<number | null>(null);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [level, setLevel] = useState(0);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedAt = useRef(new Date());
  const recorded = useRef(false);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (phase !== "gameover" || recorded.current) return;
    recorded.current = true;
    playGameOver();
    recordGameSession({
      kidId,
      gameType: "simon-says",
      subject: "classic",
      skillTag: "simon-says",
      startedAt: startedAt.current,
      score: level,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function playSequence(seq: number[]) {
    setPhase("playback");
    setPlayerIndex(0);
    seq.forEach((pad, i) => {
      timeoutsRef.current.push(
        setTimeout(() => {
          setActivePad(pad);
          playSimonNote(pad);
        }, i * STEP_MS),
        setTimeout(() => setActivePad(null), i * STEP_MS + FLASH_MS),
      );
    });
    timeoutsRef.current.push(
      setTimeout(() => setPhase("input"), seq.length * STEP_MS),
    );
  }

  function startGame() {
    setStarted(true);
    setLevel(0);
    startedAt.current = new Date();
    recorded.current = false;
    const first = [randomPad()];
    setSequence(first);
    playSequence(first);
  }

  function handlePadClick(pad: number) {
    if (phase !== "input") return;
    setActivePad(pad);
    playSimonNote(pad, 0.15);
    timeoutsRef.current.push(setTimeout(() => setActivePad(null), 150));

    if (sequence[playerIndex] !== pad) {
      setPhase("gameover");
      return;
    }

    const nextIndex = playerIndex + 1;
    if (nextIndex === sequence.length) {
      const nextLevel = level + 1;
      setLevel(nextLevel);
      const nextSeq = [...sequence, randomPad()];
      setSequence(nextSeq);
      timeoutsRef.current.push(setTimeout(() => playSequence(nextSeq), STEP_MS));
    } else {
      setPlayerIndex(nextIndex);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-lg font-semibold text-slate-700">Level: {level}</p>

      <div className="relative">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-800 p-2 shadow-lg">
          {PADS.map((pad, i) => (
            <button
              key={i}
              onClick={() => handlePadClick(i)}
              disabled={phase !== "input"}
              className={`h-28 w-28 rounded-xl transition-colors sm:h-36 sm:w-36 ${
                activePad === i ? pad.lit : pad.color
              } ${phase === "input" ? "" : "opacity-90"}`}
            />
          ))}
        </div>

        {(!started || phase === "gameover") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/80 p-4 text-center text-white">
            {phase === "gameover" ? (
              <>
                <p className="text-2xl font-bold">Game over! 🎵</p>
                <p className="text-sm">You reached level {level}.</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold">How to play</p>
                <p className="max-w-[220px] text-sm">
                  Watch the pads light up, then tap them back in the same order.
                  Each round adds one more step.
                </p>
              </>
            )}
            <button
              onClick={startGame}
              className="mt-1 rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-400"
            >
              {phase === "gameover" ? "Play again" : "Start"}
            </button>
          </div>
        )}

        {phase === "playback" && (
          <div className="absolute inset-x-0 -bottom-8 text-center text-sm font-medium text-slate-500">
            Watch...
          </div>
        )}
        {phase === "input" && (
          <div className="absolute inset-x-0 -bottom-8 text-center text-sm font-medium text-emerald-600">
            Your turn!
          </div>
        )}
      </div>
    </div>
  );
}
