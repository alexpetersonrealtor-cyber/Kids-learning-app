"use client";

import { useEffect, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import { playCorrect, playHurt, playGameOver } from "@/lib/arcade-sound";
import { SPELLING_WORDS, type SpellingWord } from "@/lib/spelling-content";
import type { GradeLevel } from "@prisma/client";

const STARTING_LIVES = 3;
const OPTION_COUNT = 4;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

const TIME_LIMIT_BY_GRADE: Record<GradeLevel, number> = {
  PRE_K: 10,
  K: 9,
  FIRST: 8,
  SECOND: 7,
  THIRD: 7,
  FOURTH: 6,
  FIFTH: 6,
};

function pickWord(grade: GradeLevel): SpellingWord {
  const words = SPELLING_WORDS[grade];
  return words[Math.floor(Math.random() * words.length)];
}

function makeOptions(correctLetter: string): string[] {
  const options = new Set<string>([correctLetter]);
  for (let attempts = 0; attempts < 100 && options.size < OPTION_COUNT; attempts++) {
    const letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    options.add(letter);
  }
  const list = [...options];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export default function WordBlaster({ kidId, grade }: { kidId: string; grade: GradeLevel }) {
  const [word, setWord] = useState<SpellingWord>(() => pickWord(grade));
  const [letterIndex, setLetterIndex] = useState(0);
  const [options, setOptions] = useState<string[]>(() => makeOptions(word.word[0]));
  const [roundId, setRoundId] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [wordsAttempted, setWordsAttempted] = useState(0);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);

  const roundEndedRef = useRef(false);
  const startedAt = useRef(new Date());
  const recorded = useRef(false);
  const timeLimit = TIME_LIMIT_BY_GRADE[grade];

  const gameOver = lives <= 0;
  const accuracy =
    wordsAttempted > 0 ? Math.round((wordsCompleted / wordsAttempted) * 100) : 0;

  useEffect(() => {
    if (!gameOver || recorded.current) return;
    recorded.current = true;
    playGameOver();
    recordGameSession({
      kidId,
      gameType: "word-blaster",
      subject: "reading",
      skillTag: `word-blaster-${grade.toLowerCase()}`,
      startedAt: startedAt.current,
      score,
      accuracy,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameOver]);

  function newWord() {
    const w = pickWord(grade);
    setWord(w);
    setLetterIndex(0);
    setOptions(makeOptions(w.word[0]));
    setRoundId((r) => r + 1);
    setFlash(null);
    roundEndedRef.current = false;
  }

  function failWord() {
    if (roundEndedRef.current) return;
    roundEndedRef.current = true;
    setFlash("miss");
    setWordsAttempted((n) => n + 1);
    setLives((l) => Math.max(l - 1, 0));
    setTimeout(newWord, 700);
  }

  function pickLetter(letter: string) {
    if (gameOver || roundEndedRef.current) return;
    if (letter !== word.word[letterIndex]) {
      playHurt();
      failWord();
      return;
    }

    playCorrect();
    const nextIndex = letterIndex + 1;
    if (nextIndex >= word.word.length) {
      roundEndedRef.current = true;
      setFlash("hit");
      setScore((s) => s + 1);
      setWordsCompleted((n) => n + 1);
      setWordsAttempted((n) => n + 1);
      setTimeout(newWord, 700);
    } else {
      setLetterIndex(nextIndex);
      setOptions(makeOptions(word.word[nextIndex]));
    }
  }

  useEffect(() => {
    if (gameOver) return;
    const timeout = setTimeout(() => {
      if (!roundEndedRef.current) failWord();
    }, timeLimit * 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, letterIndex, gameOver]);

  function reset() {
    const w = pickWord(grade);
    setWord(w);
    setLetterIndex(0);
    setOptions(makeOptions(w.word[0]));
    setRoundId((r) => r + 1);
    setScore(0);
    setLives(STARTING_LIVES);
    setWordsCompleted(0);
    setWordsAttempted(0);
    setFlash(null);
    roundEndedRef.current = false;
    startedAt.current = new Date();
    recorded.current = false;
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-6 text-sm font-semibold text-slate-600">
        <span>Score: {score}</span>
        <span>Lives: {"💥".repeat(lives) || "—"}</span>
      </div>

      {!gameOver ? (
        <>
          <span className="text-6xl">{word.emoji}</span>
          <div className="flex gap-2">
            {word.word.split("").map((letter, i) => (
              <span
                key={i}
                className="flex h-12 w-10 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-2xl font-extrabold uppercase text-slate-800"
              >
                {i < letterIndex ? letter : ""}
              </span>
            ))}
          </div>

          <div key={`${roundId}-${letterIndex}`} className="h-2 w-64 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-sky-400"
              style={{
                animation: `word-timer-shrink ${timeLimit}s linear forwards`,
              }}
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            {options.map((letter, i) => (
              <button
                key={`${roundId}-${letterIndex}-${i}`}
                onClick={() => pickLetter(letter)}
                disabled={flash !== null}
                className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-2xl font-bold uppercase shadow transition ${
                  flash === "hit" && letter === word.word[letterIndex - 1]
                    ? "border-emerald-400 bg-emerald-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-sky-400 hover:bg-sky-50"
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xl font-bold text-slate-800">
            Game over! Words spelled: {score} ({accuracy}% accuracy)
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
        @keyframes word-timer-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
