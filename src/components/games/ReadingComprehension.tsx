"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import type { Passage } from "@/lib/reading-content";

export default function ReadingComprehension({
  kidId,
  passage,
}: {
  kidId: string;
  passage: Passage;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => passage.questions.map(() => null),
  );
  const [submitted, setSubmitted] = useState(false);
  const startedAt = useRef(new Date());
  const recorded = useRef(false);

  const correctCount = useMemo(
    () =>
      passage.questions.reduce(
        (sum, q, i) => sum + (answers[i] === q.answerIndex ? 1 : 0),
        0,
      ),
    [answers, passage.questions],
  );
  const accuracy = Math.round((correctCount / passage.questions.length) * 100);

  useEffect(() => {
    if (!submitted || recorded.current) return;
    recorded.current = true;
    recordGameSession({
      kidId,
      gameType: "reading",
      subject: "reading",
      skillTag: "reading-comprehension",
      startedAt: startedAt.current,
      score: correctCount,
      accuracy,
    });
  }, [submitted, kidId, correctCount, accuracy]);

  function selectAnswer(qIndex: number, choiceIndex: number) {
    if (submitted) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = choiceIndex;
      return next;
    });
  }

  const allAnswered = answers.every((a) => a !== null);

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <p className="text-2xl font-bold text-slate-800">
          {correctCount}/{passage.questions.length} correct ({accuracy}%) 🎉
        </p>
        <p className="text-sm text-slate-500">Refresh the page for a new passage.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-2 text-xl font-bold text-slate-800">{passage.title}</h2>
        <p className="leading-relaxed text-slate-600">{passage.text}</p>
      </div>

      {passage.questions.map((q, qi) => (
        <div key={qi} className="rounded-2xl bg-white p-5 shadow">
          <p className="mb-3 font-semibold text-slate-700">{q.question}</p>
          <div className="flex flex-col gap-2">
            {q.choices.map((choice, ci) => (
              <button
                key={ci}
                onClick={() => selectAnswer(qi, ci)}
                className={`rounded-lg border px-4 py-2 text-left text-sm font-medium ${
                  answers[qi] === ci
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        disabled={!allAnswered}
        onClick={() => setSubmitted(true)}
        className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
      >
        Submit answers
      </button>
    </div>
  );
}
