"use client";

import { useEffect, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import { playCorrect, playHurt } from "@/lib/arcade-sound";
import type { Tier } from "@/lib/grade-tiers";

const TOTAL_ROUNDS = 8;
const OBJECT_EMOJIS = ["🍎", "⭐", "🐝", "🎈", "🐟", "🌸", "🍪", "🚗"];

const RANGE_BY_TIER: Record<Tier, [number, number]> = {
  PRE_K_K: [1, 5],
  FIRST_SECOND: [1, 10],
  THIRD_FIFTH: [1, 20],
};

interface Round {
  emoji: string;
  count: number;
  choices: number[];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeRound(tier: Tier): Round {
  const [min, max] = RANGE_BY_TIER[tier];
  const count = randInt(min, max);
  const emoji = OBJECT_EMOJIS[Math.floor(Math.random() * OBJECT_EMOJIS.length)];

  const distractors = new Set<number>();
  while (distractors.size < 3) {
    const candidate = count + randInt(-3, 3);
    if (candidate !== count && candidate >= 0) distractors.add(candidate);
  }
  const choices = [count, ...distractors];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { emoji, count, choices };
}

export default function NumberMatching({ kidId, tier }: { kidId: string; tier: Tier }) {
  const [round, setRound] = useState(0);
  const [current, setCurrent] = useState<Round>(() => makeRound(tier));
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const startedAt = useRef(new Date());
  const recorded = useRef(false);

  const done = round >= TOTAL_ROUNDS;
  const accuracy = round > 0 ? Math.round((correctCount / round) * 100) : 0;

  useEffect(() => {
    if (!done || recorded.current) return;
    recorded.current = true;
    recordGameSession({
      kidId,
      gameType: "number-matching",
      subject: "math",
      skillTag: "counting",
      startedAt: startedAt.current,
      score: correctCount,
      accuracy,
    });
  }, [done, kidId, correctCount, accuracy]);

  function choose(value: number) {
    if (feedback) return;
    const isCorrect = value === current.count;
    setFeedback(isCorrect ? "correct" : "wrong");
    (isCorrect ? playCorrect : playHurt)();
    if (isCorrect) setCorrectCount((c) => c + 1);

    setTimeout(() => {
      setFeedback(null);
      setRound((r) => r + 1);
      setCurrent(makeRound(tier));
    }, 800);
  }

  function reset() {
    setRound(0);
    setCorrectCount(0);
    setFeedback(null);
    setCurrent(makeRound(tier));
    startedAt.current = new Date();
    recorded.current = false;
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-2xl font-bold text-slate-800">
          {correctCount}/{TOTAL_ROUNDS} correct ({accuracy}%) 🎉
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
        >
          Play again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm font-semibold text-slate-600">
        Round {round + 1} of {TOTAL_ROUNDS} · Correct: {correctCount}
      </p>
      <p className="text-lg text-slate-500">How many?</p>

      <div
        className={`flex max-w-xs flex-wrap justify-center gap-2 rounded-3xl p-6 shadow ${
          feedback === "correct"
            ? "bg-emerald-100"
            : feedback === "wrong"
              ? "bg-red-100"
              : "bg-white"
        }`}
      >
        {Array.from({ length: current.count }).map((_, i) => (
          <span key={i} className="text-4xl">
            {current.emoji}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-3">
        {current.choices.map((value) => (
          <button
            key={value}
            onClick={() => choose(value)}
            disabled={!!feedback}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-slate-700 shadow hover:bg-sky-50 disabled:opacity-60"
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}
