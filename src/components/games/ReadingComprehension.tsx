"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import { playCorrect, playHurt } from "@/lib/arcade-sound";
import type { Passage } from "@/lib/reading-content";

function pickPassage(passages: Passage[], excluding?: Passage): Passage {
  const pool = passages.length > 1 && excluding ? passages.filter((p) => p !== excluding) : passages;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function ReadingComprehension({
  kidId,
  passages,
}: {
  kidId: string;
  passages: Passage[];
}) {
  const [passage, setPassage] = useState<Passage>(() => pickPassage(passages));
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    passage.questions.map(() => null),
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
    (correctCount === passage.questions.length ? playCorrect : playHurt)();
    recordGameSession({
      kidId,
      gameType: "reading",
      subject: "reading",
      skillTag: "reading-comprehension",
      startedAt: startedAt.current,
      score: correctCount,
      accuracy,
    });
  }, [submitted, kidId, correctCount, accuracy, passage.questions.length]);

  function selectAnswer(qIndex: number, choiceIndex: number) {
    if (submitted) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = choiceIndex;
      return next;
    });
  }

  function nextPassage() {
    const next = pickPassage(passages, passage);
    setPassage(next);
    setAnswers(next.questions.map(() => null));
    setSubmitted(false);
    startedAt.current = new Date();
    recorded.current = false;
  }

  const allAnswered = answers.every((a) => a !== null);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-2 text-xl font-bold text-slate-800">{passage.title}</h2>
        <p className="leading-relaxed text-slate-600">{passage.text}</p>
      </div>

      {submitted && (
        <div
          className={`rounded-2xl p-4 text-center text-lg font-bold ${
            correctCount === passage.questions.length
              ? "bg-emerald-100 text-emerald-700"
              : "bg-sky-100 text-sky-700"
          }`}
        >
          {correctCount}/{passage.questions.length} correct ({accuracy}%){" "}
          {correctCount === passage.questions.length ? "🎉" : ""}
        </div>
      )}

      {passage.questions.map((q, qi) => (
        <div key={qi} className="rounded-2xl bg-white p-5 shadow">
          <p className="mb-3 font-semibold text-slate-700">{q.question}</p>
          <div className="flex flex-col gap-2">
            {q.choices.map((choice, ci) => {
              const isPicked = answers[qi] === ci;
              const isAnswer = ci === q.answerIndex;
              let style = "border-slate-200 text-slate-600 hover:bg-slate-50";
              if (submitted) {
                if (isAnswer) style = "border-emerald-500 bg-emerald-50 text-emerald-700";
                else if (isPicked) style = "border-red-400 bg-red-50 text-red-600";
                else style = "border-slate-200 text-slate-400";
              } else if (isPicked) {
                style = "border-sky-500 bg-sky-50 text-sky-700";
              }
              return (
                <button
                  key={ci}
                  onClick={() => selectAnswer(qi, ci)}
                  disabled={submitted}
                  className={`rounded-lg border px-4 py-2 text-left text-sm font-medium ${style}`}
                >
                  {choice}
                  {submitted && isAnswer && " ✓"}
                  {submitted && isPicked && !isAnswer && " ✗"}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {submitted ? (
        <button
          onClick={nextPassage}
          className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
        >
          Try another passage
        </button>
      ) : (
        <button
          disabled={!allAnswered}
          onClick={() => setSubmitted(true)}
          className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
        >
          Submit answers
        </button>
      )}
    </div>
  );
}
