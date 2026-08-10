"use client";

import { useEffect, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import { playCorrect, playHurt } from "@/lib/arcade-sound";
import { PHONICS_WORDS, LETTER_CHOICES, type PhonicsWord } from "@/lib/phonics-content";

const TOTAL_ROUNDS = 8;

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface Round {
  word: PhonicsWord;
  choices: string[];
}

function makeRound(): Round {
  const word = PHONICS_WORDS[Math.floor(Math.random() * PHONICS_WORDS.length)];
  const distractorPool = LETTER_CHOICES.filter((l) => l !== word.letter);
  const distractors = shuffle(distractorPool).slice(0, 3);
  return { word, choices: shuffle([word.letter, ...distractors]) };
}

export default function Phonics({ kidId }: { kidId: string }) {
  const [round, setRound] = useState(0);
  const [current, setCurrent] = useState<Round>(() => makeRound());
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
      gameType: "phonics",
      subject: "reading",
      skillTag: "beginning-sounds",
      startedAt: startedAt.current,
      score: correctCount,
      accuracy,
    });
  }, [done, kidId, correctCount, accuracy]);

  function choose(letter: string) {
    if (feedback) return;
    const isCorrect = letter === current.word.letter;
    setFeedback(isCorrect ? "correct" : "wrong");
    (isCorrect ? playCorrect : playHurt)();
    if (isCorrect) setCorrectCount((c) => c + 1);

    setTimeout(() => {
      setFeedback(null);
      setRound((r) => r + 1);
      setCurrent(makeRound());
    }, 800);
  }

  function reset() {
    setRound(0);
    setCorrectCount(0);
    setFeedback(null);
    setCurrent(makeRound());
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
      <p className="text-lg text-slate-500">What letter does this start with?</p>

      <div
        className={`flex flex-col items-center gap-2 rounded-3xl px-10 py-8 shadow ${
          feedback === "correct" ? "bg-emerald-100" : feedback === "wrong" ? "bg-red-100" : "bg-white"
        }`}
      >
        <span className="text-7xl" role="img" aria-label={current.word.word}>
          {current.word.emoji}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {current.choices.map((letter) => (
          <button
            key={letter}
            onClick={() => choose(letter)}
            disabled={!!feedback}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-slate-700 shadow hover:bg-sky-50 disabled:opacity-60"
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
