"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import type { Tier } from "@/lib/grade-tiers";

const TOTAL_QUESTIONS = 10;

interface Question {
  a: number;
  b: number;
  op: "+" | "-";
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeQuestion(tier: Tier): Question {
  if (tier === "PRE_K_K") {
    const a = randInt(1, 5);
    const b = randInt(1, 5);
    return { a, b, op: "+" };
  }
  if (tier === "FIRST_SECOND") {
    const op: "+" | "-" = Math.random() < 0.5 ? "+" : "-";
    if (op === "+") {
      return { a: randInt(1, 15), b: randInt(1, 15), op };
    }
    const a = randInt(5, 20);
    const b = randInt(1, a);
    return { a, b, op };
  }
  // THIRD_FIFTH: multi-digit addition/subtraction within 100
  const op: "+" | "-" = Math.random() < 0.5 ? "+" : "-";
  if (op === "+") {
    return { a: randInt(10, 90), b: randInt(10, 90), op };
  }
  const a = randInt(20, 100);
  const b = randInt(1, a);
  return { a, b, op };
}

function answer(q: Question) {
  return q.op === "+" ? q.a + q.b : q.a - q.b;
}

export default function MathFacts({ kidId, tier }: { kidId: string; tier: Tier }) {
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState<Question>(() => makeQuestion(tier));
  const [input, setInput] = useState("");
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const startedAt = useRef(new Date());
  const recorded = useRef(false);

  const done = round >= TOTAL_QUESTIONS;
  const accuracy = useMemo(
    () => (round > 0 ? Math.round((correctCount / round) * 100) : 0),
    [round, correctCount],
  );

  useEffect(() => {
    if (!done || recorded.current) return;
    recorded.current = true;
    recordGameSession({
      kidId,
      gameType: "math-facts",
      subject: "math",
      skillTag: tier === "THIRD_FIFTH" ? "multi-digit-add-sub" : "add-sub-facts",
      startedAt: startedAt.current,
      score: correctCount,
      accuracy,
    });
  }, [done, kidId, tier, correctCount, accuracy]);

  function submit() {
    if (input.trim() === "") return;
    const isCorrect = Number(input) === answer(question);
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) setCorrectCount((c) => c + 1);

    setTimeout(() => {
      setFeedback(null);
      setInput("");
      setRound((r) => r + 1);
      setQuestion(makeQuestion(tier));
    }, 700);
  }

  function reset() {
    setRound(0);
    setCorrectCount(0);
    setInput("");
    setFeedback(null);
    setQuestion(makeQuestion(tier));
    startedAt.current = new Date();
    recorded.current = false;
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-2xl font-bold text-slate-800">
          {correctCount}/{TOTAL_QUESTIONS} correct ({accuracy}%) 🎉
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
        Question {round + 1} of {TOTAL_QUESTIONS} · Correct: {correctCount}
      </p>

      <div
        className={`rounded-3xl px-10 py-8 text-5xl font-extrabold shadow ${
          feedback === "correct"
            ? "bg-emerald-100 text-emerald-700"
            : feedback === "wrong"
              ? "bg-red-100 text-red-700"
              : "bg-white text-slate-800"
        }`}
      >
        {question.a} {question.op} {question.b} = ?
      </div>

      <input
        autoFocus
        type="number"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="w-32 rounded-xl border-2 border-slate-300 px-4 py-3 text-center text-3xl font-bold"
      />

      <button
        onClick={submit}
        className="rounded-lg bg-sky-600 px-6 py-2 font-semibold text-white hover:bg-sky-700"
      >
        Submit
      </button>
    </div>
  );
}
