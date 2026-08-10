"use client";

import { useEffect, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import { playCorrect, playHurt, playGameOver } from "@/lib/arcade-sound";
import type { GradeLevel } from "@prisma/client";

const STARTING_LIVES = 3;
const MONKEY_COUNT = 4;
const MONKEY_EMOJI = ["🐒", "🙈", "🙉", "🙊"];

interface Question {
  a: number;
  b: number;
  op: "+" | "-" | "×" | "÷";
}

interface Monkey {
  label: number;
  correct: boolean;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addSub(min: number, max: number, allowSub: boolean): Question {
  if (!allowSub || Math.random() < 0.5) {
    return { a: randInt(min, max), b: randInt(min, max), op: "+" };
  }
  const a = randInt(min + 1, max);
  return { a, b: randInt(min, a), op: "-" };
}

function multiplyFacts(max: number): Question {
  return { a: randInt(1, max), b: randInt(1, max), op: "×" };
}

function divideFacts(max: number): Question {
  const b = randInt(2, max);
  const result = randInt(1, max);
  return { a: b * result, b, op: "÷" };
}

function makeQuestion(grade: GradeLevel): Question {
  switch (grade) {
    case "PRE_K":
      return addSub(1, 4, false);
    case "K":
      return addSub(1, 8, false);
    case "FIRST":
      return addSub(1, 15, true);
    case "SECOND":
      return Math.random() < 0.7 ? addSub(5, 30, true) : multiplyFacts(4);
    case "THIRD":
      return Math.random() < 0.5 ? addSub(10, 60, true) : multiplyFacts(8);
    case "FOURTH":
      return Math.random() < 0.4 ? multiplyFacts(10) : divideFacts(10);
    case "FIFTH": {
      const roll = Math.random();
      if (roll < 0.4) return multiplyFacts(12);
      if (roll < 0.75) return divideFacts(12);
      return addSub(50, 500, true);
    }
  }
}

function answer(q: Question): number {
  if (q.op === "+") return q.a + q.b;
  if (q.op === "-") return q.a - q.b;
  if (q.op === "×") return q.a * q.b;
  return q.a / q.b;
}

const TIME_LIMIT_BY_GRADE: Record<GradeLevel, number> = {
  PRE_K: 14,
  K: 12,
  FIRST: 10,
  SECOND: 9,
  THIRD: 8,
  FOURTH: 7,
  FIFTH: 6,
};

function makeMonkeys(question: Question): Monkey[] {
  const correctAnswer = answer(question);
  const maxOffset = Math.max(3, Math.round(Math.abs(correctAnswer) * 0.2) + 2);
  const distractors = new Set<number>();
  for (let attempts = 0; attempts < 200 && distractors.size < MONKEY_COUNT - 1; attempts++) {
    const offset = randInt(1, maxOffset) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = correctAnswer + offset;
    if (candidate !== correctAnswer && candidate >= 0) distractors.add(candidate);
  }
  let filler = correctAnswer + maxOffset + 1;
  while (distractors.size < MONKEY_COUNT - 1) {
    if (filler !== correctAnswer) distractors.add(filler);
    filler++;
  }

  const labels = [correctAnswer, ...distractors];
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }
  return labels.map((label) => ({ label, correct: label === correctAnswer }));
}

export default function BananaBlast({ kidId, grade }: { kidId: string; grade: GradeLevel }) {
  const [question, setQuestion] = useState<Question>(() => makeQuestion(grade));
  const [monkeys, setMonkeys] = useState<Monkey[]>(() => makeMonkeys(question));
  const [roundId, setRoundId] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);

  const roundEndedRef = useRef(false);
  const startedAt = useRef(new Date());
  const recorded = useRef(false);
  const timeLimit = TIME_LIMIT_BY_GRADE[grade];

  const gameOver = lives <= 0;
  const accuracy = totalRounds > 0 ? Math.round((correctCount / totalRounds) * 100) : 0;

  useEffect(() => {
    if (!gameOver || recorded.current) return;
    recorded.current = true;
    playGameOver();
    recordGameSession({
      kidId,
      gameType: "banana-blast",
      subject: "math",
      skillTag: `banana-math-${grade.toLowerCase()}`,
      startedAt: startedAt.current,
      score,
      accuracy,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  function nextRound(missed: boolean) {
    if (roundEndedRef.current) return;
    roundEndedRef.current = true;

    setTotalRounds((r) => r + 1);
    setFlash(missed ? "miss" : "hit");
    if (missed) {
      setLives((l) => Math.max(l - 1, 0));
    } else {
      setScore((s) => s + 1);
      setCorrectCount((c) => c + 1);
    }

    setTimeout(() => {
      const q = makeQuestion(grade);
      setQuestion(q);
      setMonkeys(makeMonkeys(q));
      setRoundId((r) => r + 1);
      setFlash(null);
      roundEndedRef.current = false;
    }, 700);
  }

  function pickMonkey(monkey: Monkey) {
    if (gameOver) return;
    if (monkey.correct) {
      playCorrect();
      nextRound(false);
    } else {
      playHurt();
      nextRound(true);
    }
  }

  useEffect(() => {
    if (gameOver) return;
    const timeout = setTimeout(() => {
      if (!roundEndedRef.current) nextRound(true);
    }, timeLimit * 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, gameOver]);

  function reset() {
    const q = makeQuestion(grade);
    setQuestion(q);
    setMonkeys(makeMonkeys(q));
    setRoundId((r) => r + 1);
    setScore(0);
    setLives(STARTING_LIVES);
    setCorrectCount(0);
    setTotalRounds(0);
    setFlash(null);
    roundEndedRef.current = false;
    startedAt.current = new Date();
    recorded.current = false;
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-6 text-sm font-semibold text-slate-600">
        <span>Score: {score}</span>
        <span>Lives: {"🥥".repeat(lives) || "—"}</span>
      </div>

      {!gameOver ? (
        <>
          <div className="rounded-2xl bg-emerald-700 px-8 py-4 text-3xl font-extrabold text-white shadow-lg">
            {question.a} {question.op} {question.b} = ?
          </div>

          <div key={roundId} className="h-2 w-64 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-amber-400"
              style={{
                animation: `banana-timer-shrink ${timeLimit}s linear forwards`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {monkeys.map((monkey, i) => (
              <button
                key={`${roundId}-${i}`}
                onClick={() => pickMonkey(monkey)}
                disabled={flash !== null}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-5 py-4 shadow transition ${
                  flash === "hit" && monkey.correct
                    ? "border-emerald-400 bg-emerald-100"
                    : flash === "miss" && monkey.correct
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50"
                }`}
              >
                <span className="text-4xl">{MONKEY_EMOJI[i % MONKEY_EMOJI.length]}</span>
                <span className="text-xl font-bold text-amber-600">🍌{monkey.label}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-bold text-slate-800">
            Game over! Score: {score} ({accuracy}% accuracy)
          </p>
          <button
            onClick={reset}
            className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
          >
            Play again
          </button>
        </div>
      )}

      <style>{`
        @keyframes banana-timer-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
