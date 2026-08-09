"use client";

import { useEffect, useRef, useState } from "react";
import { recordGameSession } from "@/lib/record-session";
import { playCorrect, playHurt, playGameOver } from "@/lib/arcade-sound";
import { SPELLING_WORDS, type SpellingWord } from "@/lib/spelling-content";
import type { Tier } from "@/lib/grade-tiers";

const TOTAL_ROUNDS = 6;

interface Tile {
  id: number;
  letter: string;
  used: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickWord(bank: SpellingWord[], excluding?: SpellingWord): SpellingWord {
  const pool = bank.length > 1 && excluding ? bank.filter((w) => w !== excluding) : bank;
  return pool[Math.floor(Math.random() * pool.length)];
}

function makeTiles(word: string): Tile[] {
  return shuffle(word.split("").map((letter, id) => ({ id, letter, used: false })));
}

export default function SpellingBee({ kidId, tier }: { kidId: string; tier: Tier }) {
  const bank = SPELLING_WORDS[tier];
  const [round, setRound] = useState(0);
  const [word, setWord] = useState<SpellingWord>(() => pickWord(bank));
  const [tiles, setTiles] = useState<Tile[]>(() => makeTiles(word.word));
  const [built, setBuilt] = useState<string[]>([]);
  const [wrongTileId, setWrongTileId] = useState<number | null>(null);
  const [correctWords, setCorrectWords] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);

  const startedAt = useRef(new Date());
  const recorded = useRef(false);

  const accuracy =
    correctWords + mistakes > 0 ? Math.round((correctWords / (correctWords + mistakes)) * 100) : 0;

  useEffect(() => {
    if (!done || recorded.current) return;
    recorded.current = true;
    playGameOver();
    recordGameSession({
      kidId,
      gameType: "spelling-bee",
      subject: "reading",
      skillTag: "word-builder",
      startedAt: startedAt.current,
      score: correctWords,
      accuracy,
    });
  }, [done, kidId, correctWords, accuracy]);

  function tapTile(tile: Tile) {
    if (tile.used || done) return;
    const needed = word.word[built.length];

    if (tile.letter !== needed) {
      playHurt();
      setMistakes((m) => m + 1);
      setWrongTileId(tile.id);
      setTimeout(() => setWrongTileId(null), 300);
      return;
    }

    const nextBuilt = [...built, tile.letter];
    setBuilt(nextBuilt);
    setTiles((ts) => ts.map((t) => (t.id === tile.id ? { ...t, used: true } : t)));

    if (nextBuilt.length === word.word.length) {
      playCorrect();
      const nextRound = round + 1;
      setCorrectWords((c) => c + 1);
      setTimeout(() => {
        if (nextRound >= TOTAL_ROUNDS) {
          setRound(nextRound);
          setDone(true);
          return;
        }
        const nextWord = pickWord(bank, word);
        setRound(nextRound);
        setWord(nextWord);
        setTiles(makeTiles(nextWord.word));
        setBuilt([]);
      }, 700);
    }
  }

  function reset() {
    const firstWord = pickWord(bank);
    setRound(0);
    setWord(firstWord);
    setTiles(makeTiles(firstWord.word));
    setBuilt([]);
    setCorrectWords(0);
    setMistakes(0);
    setDone(false);
    startedAt.current = new Date();
    recorded.current = false;
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-2xl font-bold text-slate-800">
          {correctWords}/{TOTAL_ROUNDS} words spelled ({accuracy}% accuracy) 🎉
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
        Word {round + 1} of {TOTAL_ROUNDS} · Spelled: {correctWords}
      </p>

      <span className="text-7xl">{word.emoji}</span>

      <div className="flex gap-2">
        {word.word.split("").map((_, i) => (
          <div
            key={i}
            className="flex h-14 w-12 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-2xl font-bold uppercase text-slate-800"
          >
            {built[i] ?? ""}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            onClick={() => tapTile(tile)}
            disabled={tile.used}
            className={`flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold uppercase shadow transition-colors ${
              tile.used
                ? "bg-slate-100 text-slate-300"
                : wrongTileId === tile.id
                  ? "bg-red-200 text-red-700"
                  : "bg-white text-slate-700 hover:bg-sky-50"
            }`}
          >
            {tile.letter}
          </button>
        ))}
      </div>
    </div>
  );
}
