"use client";

import { useEffect, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import { playCorrect, playHurt } from "@/lib/arcade-sound";
import type { GradeLevel } from "@prisma/client";

const TOTAL_ROUNDS = 8;
const OBJECT_EMOJIS = ["🍎", "⭐", "🐝", "🎈", "🐟", "🌸", "🍪", "🚗"];

interface GradeConfig {
  min: number;
  max: number;
  distractorSpread: number;
}

const CONFIG_BY_GRADE: Record<GradeLevel, GradeConfig> = {
  PRE_K: { min: 1, max: 3, distractorSpread: 2 },
  K: { min: 1, max: 5, distractorSpread: 2 },
  FIRST: { min: 3, max: 10, distractorSpread: 2 },
  SECOND: { min: 5, max: 15, distractorSpread: 3 },
  THIRD: { min: 10, max: 25, distractorSpread: 3 },
  FOURTH: { min: 15, max: 40, distractorSpread: 4 },
  FIFTH: { min: 20, max: 50, distractorSpread: 5 },
};

interface Round {
  emoji: string;
  count: number;
  choices: number[];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeRound(grade: GradeLevel): Round {
  const { min, max, distractorSpread } = CONFIG_BY_GRADE[grade];
  const count = randInt(min, max);
  const emoji = OBJECT_EMOJIS[Math.floor(Math.random() * OBJECT_EMOJIS.length)];

  const distractors = new Set<number>();
  for (let attempts = 0; distractors.size < 3 && attempts < 200; attempts++) {
    const candidate = count + randInt(-distractorSpread, distractorSpread);
    if (candidate !== count && candidate >= 0) distractors.add(candidate);
  }
  // Fallback in the unlikely case the spread couldn't yield 3 distinct values.
  for (let filler = 0; distractors.size < 3; filler++) {
    if (count + filler !== count) distractors.add(count + filler + 1);
  }
  const choices = [count, ...distractors];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return { emoji, count, choices };
}

function emojiSizeClass(count: number): string {
  if (count <= 10) return "text-4xl";
  if (count <= 25) return "text-2xl";
  return "text-lg";
}

export default function NumberMatching({ kidId, grade }: { kidId: string; grade: GradeLevel }) {
  const [round, setRound] = useState(0);
  const [current, setCurrent] = useState<Round>(() => makeRound(grade));
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
      skillTag: `counting-${grade.toLowerCase()}`,
      startedAt: startedAt.current,
      score: correctCount,
      accuracy,
    });
  }, [done, kidId, grade, correctCount, accuracy]);

  function choose(value: number) {
    if (feedback) return;
    const isCorrect = value === current.count;
    setFeedback(isCorrect ? "correct" : "wrong");
    (isCorrect ? playCorrect : playHurt)();
    if (isCorrect) setCorrectCount((c) => c + 1);

    setTimeout(() => {
      setFeedback(null);
      setRound((r) => r + 1);
      setCurrent(makeRound(grade));
    }, 800);
  }

  function reset() {
    setRound(0);
    setCorrectCount(0);
    setFeedback(null);
    setCurrent(makeRound(grade));
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
        className={`flex max-w-sm flex-wrap justify-center gap-1.5 rounded-3xl p-6 shadow ${
          feedback === "correct"
            ? "bg-emerald-100"
            : feedback === "wrong"
              ? "bg-red-100"
              : "bg-white"
        }`}
      >
        {Array.from({ length: current.count }).map((_, i) => (
          <span key={i} className={emojiSizeClass(current.count)}>
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
