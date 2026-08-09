"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";

const ROUNDS = 8;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeRound(words: string[]): { target: string; choices: string[] } {
  const choices = shuffle(words).slice(0, 4);
  const target = choices[Math.floor(Math.random() * choices.length)];
  return { target, choices: shuffle(choices) };
}

export default function SightWords({
  kidId,
  words,
  skillTag,
}: {
  kidId: string;
  words: string[];
  skillTag: string;
}) {
  const [round, setRound] = useState(0);
  const [current, setCurrent] = useState(() => makeRound(words));
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const startedAt = useRef(new Date());
  const recorded = useRef(false);

  const done = round >= ROUNDS;
  const accuracy = useMemo(
    () => (round > 0 ? Math.round((correctCount / round) * 100) : 0),
    [round, correctCount],
  );

  useEffect(() => {
    if (!done || recorded.current) return;
    recorded.current = true;
    recordGameSession({
      kidId,
      gameType: "reading",
      subject: "reading",
      skillTag,
      startedAt: startedAt.current,
      score: correctCount,
      accuracy,
    });
  }, [done, kidId, skillTag, correctCount, accuracy]);

  function choose(word: string) {
    if (feedback) return;
    const isCorrect = word === current.target;
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) setCorrectCount((c) => c + 1);

    setTimeout(() => {
      setFeedback(null);
      setRound((r) => r + 1);
      setCurrent(makeRound(words));
    }, 700);
  }

  function reset() {
    setRound(0);
    setCorrectCount(0);
    setFeedback(null);
    setCurrent(makeRound(words));
    startedAt.current = new Date();
    recorded.current = false;
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-2xl font-bold text-slate-800">
          {correctCount}/{ROUNDS} correct ({accuracy}%) 🎉
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
        Word {round + 1} of {ROUNDS} · Correct: {correctCount}
      </p>
      <p className="text-lg text-slate-500">Find the word:</p>
      <p className="text-4xl font-extrabold text-slate-800">{current.target}</p>

      <div className="grid grid-cols-2 gap-4">
        {current.choices.map((word) => (
          <button
            key={word}
            onClick={() => choose(word)}
            className={`rounded-2xl px-6 py-4 text-2xl font-bold shadow ${
              feedback && word === current.target
                ? "bg-emerald-100 text-emerald-700"
                : feedback === "wrong" && word !== current.target
                  ? "bg-white text-slate-700 opacity-50"
                  : "bg-white text-slate-700 hover:bg-sky-50"
            }`}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  );
}
